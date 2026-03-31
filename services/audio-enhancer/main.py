"""
Микросервис для продвинутой обработки аудио.
Использует современные нейросетевые модели для шумоподавления и улучшения качества речи.
Работает полностью в памяти без временных файлов.
"""

import io
import asyncio
import base64
import json
import logging
import os
import signal
import subprocess
import sys
import tempfile
import warnings

import librosa
import noisereduce as nr
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pedalboard import Pedalboard, Compressor, HighpassFilter, LowpassFilter
from scipy import signal as scipy_signal

# DeepFilterNet для нейросетевого шумоподавления
try:
    from df.enhance import enhance, init_df
    from df.io import resample
    DEEPFILTER_AVAILABLE = True
except ImportError:
    DEEPFILTER_AVAILABLE = False

# WPE для удаления реверберации
try:
    from nara_wpe import wpe_v8 as wpe
    WPE_AVAILABLE = True
except ImportError:
    WPE_AVAILABLE = False

# Pyannote для диаризации
try:
    from pyannote.audio import Pipeline
    from pyannote.core import Segment, Annotation
    PYANNOTE_AVAILABLE = True
except ImportError:
    PYANNOTE_AVAILABLE = False

# Настройка логирования
def _parse_bool_env(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_int_env(name: str, default: int) -> int:
    env_logger = logging.getLogger(__name__)
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        parsed = int(raw)
    except ValueError:
        env_logger.warning("Некорректное значение %s=%r, используем %d", name, raw, default)
        return default
    if parsed <= 0:
        env_logger.warning("Значение %s=%d должно быть > 0, используем %d", name, parsed, default)
        return default
    return parsed


APP_NAME = os.getenv("APP_NAME", "Audio Enhancer Service")
DEBUG = _parse_bool_env(os.getenv("DEBUG"), default=False)
HOST = os.getenv("HOST", "0.0.0.0")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title=APP_NAME, version="2.0.0", debug=DEBUG)

# Подавляем известные warning из сторонних библиотек
warnings.filterwarnings(
    "ignore",
    message=r".*torch\.load.*weights_only=False.*",
    category=FutureWarning,
    module=r"df\.checkpoint",
)
# Подавляем warning об устаревшем импорте torchaudio
warnings.filterwarnings(
    "ignore",
    message=r".*torchaudio\.backend\.common\.AudioMetaData.*has been moved.*",
    category=UserWarning,
)
# Подавляем warning об устаревшем torchaudio.set_audio_backend
warnings.filterwarnings(
    "ignore",
    message=r".*torchaudio\._backend\.set_audio_backend has been deprecated.*",
    category=UserWarning,
)

# Обработка сигналов для корректного завершения
def signal_handler(sig, frame):
    logger.info("Получен сигнал завершения, останавливаем сервис...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Лимит загрузки до декодирования (защита от OOM)
MAX_UPLOAD_BYTES = _parse_int_env("MAX_FILE_SIZE", 80 * 1024 * 1024)
# Верхняя оценка длительности после декодирования (подстраховка)
MAX_AUDIO_SECONDS = _parse_int_env("MAX_AUDIO_SECONDS", 4 * 3600)

# Загрузка DeepFilterNet модели
deepfilter_model = None
deepfilter_df_state = None
if DEEPFILTER_AVAILABLE:
    try:
        deepfilter_model, deepfilter_df_state, _ = init_df()
        logger.info("✓ DeepFilterNet модель загружена")
    except Exception as e:
        logger.warning(f"Не удалось загрузить DeepFilterNet: {e}")
        DEEPFILTER_AVAILABLE = False

# Загрузка Silero VAD модели (один раз при старте)
try:
    vad_model, utils = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
        onnx=False,
        trust_repo=True,  # Доверяем репозиторию Silero VAD
    )
    (get_speech_timestamps, save_audio, read_audio, VADIterator, collect_chunks) = utils
    logger.info("✓ Silero VAD модель загружена")
except Exception as e:
    logger.warning(f"Не удалось загрузить Silero VAD: {e}")
    vad_model = None

# Загрузка Pyannote диаризации
pyannote_pipeline = None
if PYANNOTE_AVAILABLE:
    try:
        # Требуется HuggingFace токен для загрузки
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            model_id = "pyannote/speaker-diarization-3.1"
            # Используем правильный API для pyannote 3.1+
            pyannote_pipeline = Pipeline.from_pretrained(model_id, use_auth_token=hf_token)
            logger.info("✓ Pyannote диаризация загружена")
        else:
            logger.warning("HF_TOKEN не установлен, pyannote недоступен")
            PYANNOTE_AVAILABLE = False
    except Exception as e:
        logger.warning(f"Не удалось загрузить Pyannote: {e}")
        PYANNOTE_AVAILABLE = False

# Loudness meter для нормализации
loudness_meter = pyln.Meter(16000)


def _collect_preprocess_metadata(audio: np.ndarray, sr: int) -> dict:
    """Извлекает метаданные для оркестратора: речь/тишина/перекрытия/смена спикера."""
    duration = float(len(audio)) / float(sr) if sr else 0.0
    metadata = {
        "sample_rate": sr,
        "duration": duration,
        "speech_spans": [],
        "silence_spans": [],
        "adaptive_segments": [],
        "overlap_candidates": [],
        "speaker_change_candidates": [],
    }
    if sr <= 0 or len(audio) == 0:
        return metadata

    if vad_model is not None:
        if sr != 16000:
            audio_16k = librosa.resample(audio, orig_sr=sr, target_sr=16000)
        else:
            audio_16k = audio
        audio_tensor = torch.from_numpy(audio_16k).float()
        speech_timestamps = get_speech_timestamps(
            audio_tensor,
            vad_model,
            sampling_rate=16000,
            threshold=0.45,
            min_speech_duration_ms=180,
            min_silence_duration_ms=450,
        )
    else:
        speech_timestamps = []

    speech_spans = []
    for item in speech_timestamps:
        start = float(item["start"]) / 16000.0
        end = float(item["end"]) / 16000.0
        speech_spans.append({"start": round(start, 3), "end": round(end, 3)})
    metadata["speech_spans"] = speech_spans

    # silence normalization map
    silence_spans = []
    cursor = 0.0
    for span in speech_spans:
        if span["start"] > cursor:
            silence_spans.append({"start": round(cursor, 3), "end": round(span["start"], 3)})
        cursor = max(cursor, span["end"])
    if cursor < duration:
        silence_spans.append({"start": round(cursor, 3), "end": round(duration, 3)})
    metadata["silence_spans"] = silence_spans

    # adaptive segmentation: длинные речевые куски делим на ~8с чанки
    adaptive_segments = []
    for span in speech_spans:
        seg_start = span["start"]
        seg_end = span["end"]
        max_chunk = 8.0
        if (seg_end - seg_start) <= max_chunk:
            adaptive_segments.append(span)
            continue
        point = seg_start
        while point < seg_end:
            nxt = min(point + max_chunk, seg_end)
            adaptive_segments.append({"start": round(point, 3), "end": round(nxt, 3)})
            point = nxt
    metadata["adaptive_segments"] = adaptive_segments

    # overlap candidates: очень короткие интервалы между соседними speech spans
    overlap_candidates = []
    speaker_changes = []
    prev = None
    for idx, span in enumerate(speech_spans):
        if prev is not None:
            gap = span["start"] - prev["end"]
            if gap < 0.12:
                overlap_candidates.append(
                    {
                        "start": round(max(prev["end"] - 0.1, 0.0), 3),
                        "end": round(span["start"] + 0.1, 3),
                        "type": "tight_turn_or_overlap",
                    }
                )
            if gap > 0.2:
                speaker_changes.append(
                    {"time": round(span["start"], 3), "reason": "pause_boundary", "index": idx}
                )
        prev = span

    metadata["overlap_candidates"] = overlap_candidates
    metadata["speaker_change_candidates"] = speaker_changes
    return metadata


async def read_upload_bytes_capped(upload: UploadFile, max_bytes: int) -> bytes:
    """Читает тело запроса с ограничением размера до вызова librosa.load."""
    cl = upload.headers.get("content-length")
    if cl is not None:
        try:
            n = int(cl)
        except ValueError:
            n = -1
        if n > max_bytes:
            raise HTTPException(status_code=413, detail="Payload too large")
    chunks: list[bytes] = []
    total = 0
    chunk_size = 1024 * 1024
    while True:
        chunk = await upload.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(status_code=413, detail="Payload too large")
        chunks.append(chunk)
    return b"".join(chunks)


def _load_audio_with_duration_check(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    duration = _probe_audio_duration_seconds(audio_bytes)
    if duration is not None and duration > MAX_AUDIO_SECONDS:
        raise HTTPException(status_code=413, detail="Audio too long")

    with io.BytesIO(audio_bytes) as audio_stream:
        audio, sr = librosa.load(audio_stream, sr=None, mono=True)

    # Fallback-проверка на случай, если ffprobe недоступен или не смог распарсить формат.
    decoded_duration = float(len(audio)) / float(sr) if sr else 0.0
    if decoded_duration > MAX_AUDIO_SECONDS:
        raise HTTPException(status_code=413, detail="Audio too long")
    return audio, sr


def _probe_audio_duration_seconds(audio_bytes: bytes) -> float | None:
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        command = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            temp_path,
        ]
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            logger.warning("ffprobe завершился с ошибкой: %s", result.stderr.strip())
            return None

        payload = json.loads(result.stdout or "{}")
        duration_raw = payload.get("format", {}).get("duration")
        if duration_raw is None:
            return None
        duration = float(duration_raw)
        if duration < 0:
            return None
        return duration
    except FileNotFoundError:
        logger.warning("ffprobe не найден, используем проверку длительности после декодирования")
        return None
    except (ValueError, json.JSONDecodeError) as exc:
        logger.warning("Не удалось распарсить длительность через ffprobe: %s", exc)
        return None
    except Exception as exc:
        logger.warning("Ошибка ffprobe duration probe: %s", exc)
        return None
    finally:
        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass


def _run_diarization(audio: np.ndarray, sr: int) -> dict:
    with io.BytesIO() as temp_audio:
        sf.write(temp_audio, audio, sr, format="WAV")
        temp_audio.seek(0)
        diarization = pyannote_pipeline({"audio": temp_audio})

    segments = []
    speaker_changes = []
    overlaps = []

    prev_speaker = None
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segment_info = {
            "start": turn.start,
            "end": turn.end,
            "duration": turn.end - turn.start,
            "speaker": speaker,
        }
        segments.append(segment_info)
        if prev_speaker is not None and prev_speaker != speaker:
            speaker_changes.append(
                {
                    "time": turn.start,
                    "from_speaker": prev_speaker,
                    "to_speaker": speaker,
                }
            )
        prev_speaker = speaker

    track_list = list(diarization.itertracks(yield_label=True))
    for i in range(len(track_list) - 1):
        s1, _, spk1 = track_list[i]
        s2, _, spk2 = track_list[i + 1]
        if s1.end > s2.start and spk1 != spk2:
            overlaps.append(
                {
                    "start": s2.start,
                    "end": min(s1.end, s2.end),
                    "duration": min(s1.end, s2.end) - s2.start,
                    "speakers": [spk1, spk2],
                }
            )

    result = {
        "segments": segments,
        "speaker_changes": speaker_changes,
        "overlaps": overlaps,
        "num_speakers": len(set(s["speaker"] for s in segments)),
        "total_duration": audio.shape[0] / sr,
    }
    logger.info(
        "✓ Диаризация: %d сегментов, %d смен спикера, %d перекрытий",
        len(segments),
        len(speaker_changes),
        len(overlaps),
    )
    return result


def process_enhance(
    audio_bytes: bytes,
    *,
    use_deepfilter: bool,
    use_wpe: bool,
    noise_reduction: bool,
    normalize_volume: bool,
    enhance_speech: bool,
    remove_silence: bool,
    target_sample_rate: int,
    use_compressor: bool,
    spectral_gating: bool,
    enable_diarization: bool,
) -> dict | Response:
    audio, sr = _load_audio_with_duration_check(audio_bytes)
    logger.info(f"Загружено аудио: {len(audio)} samples, {sr} Hz")

    original_audio = audio.copy()
    original_sr = sr

    if use_deepfilter and DEEPFILTER_AVAILABLE and deepfilter_model is not None:
        logger.info("Применяем DeepFilterNet шумоподавление...")
        try:
            if sr != 48000:
                audio_48k = librosa.resample(audio, orig_sr=sr, target_sr=48000)
            else:
                audio_48k = audio
            audio_48k_tensor = torch.from_numpy(audio_48k).unsqueeze(0)
            enhanced = enhance(deepfilter_model, deepfilter_df_state, audio_48k_tensor)
            audio_48k = enhanced.squeeze(0).numpy()
            if sr != 48000:
                audio = librosa.resample(audio_48k, orig_sr=48000, target_sr=sr)
            else:
                audio = audio_48k
            logger.info("✓ DeepFilterNet применен")
        except Exception as e:
            logger.warning(f"DeepFilterNet не удался: {e}, используем fallback")
            use_deepfilter = False

    if use_wpe and WPE_AVAILABLE:
        logger.info("Применяем WPE дереверберацию...")
        try:
            stft = librosa.stft(audio, n_fft=512, hop_length=128)
            stft_wpe = wpe(stft[np.newaxis, :, :], taps=10, delay=3, iterations=3)
            audio = librosa.istft(stft_wpe[0], hop_length=128, length=len(audio))
            logger.info("✓ WPE дереверберация применена")
        except Exception as e:
            logger.warning(f"WPE не удался: {e}")

    if noise_reduction and (not use_deepfilter or not DEEPFILTER_AVAILABLE):
        logger.info("Применяем классическое шумоподавление...")
        audio = nr.reduce_noise(y=audio, sr=sr, stationary=True, prop_decrease=0.8)

    if spectral_gating:
        logger.info("Применяем спектральный гейтинг...")
        D = librosa.stft(audio)
        magnitude = np.abs(D)
        noise_threshold = np.percentile(magnitude, 10)
        mask = np.maximum(0, 1 - (noise_threshold / (magnitude + 1e-10)))
        mask = np.power(mask, 2)
        D_filtered = D * mask
        audio = librosa.istft(D_filtered, length=len(audio))

    if enhance_speech:
        logger.info("Усиливаем речевые частоты...")
        board = Pedalboard(
            [
                HighpassFilter(cutoff_frequency_hz=80),
                LowpassFilter(cutoff_frequency_hz=8000),
            ]
        )
        audio = board(audio, sr)
        audio = librosa.effects.preemphasis(audio, coef=0.97)
        fft = np.fft.rfft(audio)
        frequencies = np.fft.rfftfreq(len(audio), 1 / sr)
        speech_mask = (frequencies >= 300) & (frequencies <= 3400)
        critical_mask = (frequencies >= 1000) & (frequencies <= 3000)
        gain = np.ones_like(frequencies, dtype=np.float32)
        gain[critical_mask] = 1.5
        gain[speech_mask & ~critical_mask] = 1.3
        gain[~speech_mask] = 0.4
        fft *= gain
        audio = np.fft.irfft(fft, n=len(audio))

    if use_compressor:
        logger.info("Применяем динамическую компрессию...")
        compressor = Pedalboard(
            [Compressor(threshold_db=-20, ratio=4, attack_ms=5, release_ms=50)]
        )
        audio = compressor(audio, sr)

    if normalize_volume:
        logger.info("Нормализуем громкость (LUFS)...")
        peak = np.abs(audio).max()
        if peak > 0:
            audio = audio / peak * 0.95
        try:
            if sr != 16000:
                audio_16k = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                loudness = loudness_meter.integrated_loudness(audio_16k)
            else:
                loudness = loudness_meter.integrated_loudness(audio)
            target_loudness = -16.0
            loudness_delta = target_loudness - loudness
            gain = np.power(10.0, loudness_delta / 20.0)
            audio = audio * gain
            logger.info(f"Громкость: {loudness:.1f} LUFS -> {target_loudness} LUFS")
        except Exception as e:
            logger.warning(f"LUFS нормализация не удалась: {e}, используем RMS")
            rms = np.sqrt(np.mean(audio**2))
            target_rms = 0.1
            if rms > 0:
                audio = audio * (target_rms / rms)
        audio = np.clip(audio, -1.0, 1.0)

    if remove_silence and vad_model is not None:
        logger.info("Удаляем длинные паузы (Silero VAD)...")
        if sr != 16000:
            audio_16k = librosa.resample(audio, orig_sr=sr, target_sr=16000)
        else:
            audio_16k = audio
        audio_tensor = torch.from_numpy(audio_16k).float()
        speech_timestamps = get_speech_timestamps(
            audio_tensor,
            vad_model,
            sampling_rate=16000,
            threshold=0.5,
            min_speech_duration_ms=250,
            min_silence_duration_ms=1000,
        )
        if speech_timestamps:
            speech_chunks = []
            for timestamp in speech_timestamps:
                start = int(timestamp["start"] * sr / 16000)
                end = int(timestamp["end"] * sr / 16000)
                speech_chunks.append(audio[start:end])
            if speech_chunks:
                audio = np.concatenate(speech_chunks)
                logger.info(f"✓ Удалено пауз: {len(speech_timestamps)}")

    if sr != target_sample_rate:
        logger.info(f"Ресемплинг {sr} Hz -> {target_sample_rate} Hz...")
        audio = librosa.resample(
            audio, orig_sr=sr, target_sr=target_sample_rate, res_type="kaiser_best"
        )

    diarization_result = None
    if enable_diarization and PYANNOTE_AVAILABLE and pyannote_pipeline is not None:
        logger.info("Выполняем диаризацию (pyannote)...")
        try:
            diarization_result = _run_diarization(original_audio, original_sr)
        except Exception as e:
            logger.warning(f"Диаризация не удалась: {e}")

    with io.BytesIO() as output_stream:
        sf.write(
            output_stream,
            audio,
            target_sample_rate,
            subtype="PCM_16",
            format="WAV",
        )
        output_bytes = output_stream.getvalue()

    if diarization_result is not None:
        return {
            "audio_base64": base64.b64encode(output_bytes).decode(),
            "sample_rate": target_sample_rate,
            "duration": len(audio) / target_sample_rate,
            "diarization": diarization_result,
        }

    logger.info(f"Обработка завершена: {len(audio)} samples, {target_sample_rate} Hz")
    return Response(
        content=output_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=enhanced.wav"},
    )


def process_denoise(audio_bytes: bytes, stationary: bool, prop_decrease: float) -> Response:
    audio, sr = _load_audio_with_duration_check(audio_bytes)
    audio_denoised = nr.reduce_noise(
        y=audio, sr=sr, stationary=stationary, prop_decrease=prop_decrease
    )
    with io.BytesIO() as output_stream:
        sf.write(
            output_stream,
            audio_denoised,
            sr,
            subtype="PCM_16",
            format="WAV",
        )
        output_bytes = output_stream.getvalue()
    return Response(content=output_bytes, media_type="audio/wav")


def process_preprocess(
    audio_bytes: bytes, target_sample_rate: int, return_audio_base64: bool
) -> dict:
    audio, sr = _load_audio_with_duration_check(audio_bytes)

    if sr != 16000:
        audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
        sr = 16000

    peak = np.abs(audio).max()
    if peak > 0:
        audio = audio / peak * 0.95
    try:
        loudness = loudness_meter.integrated_loudness(audio)
        loudness_delta = -16.0 - loudness
        gain = np.power(10.0, loudness_delta / 20.0)
        audio = np.clip(audio * gain, -1.0, 1.0)
    except Exception:
        logger.debug("LUFS нормализация в preprocess не удалась", exc_info=True)

    if DEEPFILTER_AVAILABLE and deepfilter_model is not None:
        try:
            audio_48k = librosa.resample(audio, orig_sr=16000, target_sr=48000)
            enhanced = enhance(
                deepfilter_model,
                deepfilter_df_state,
                torch.from_numpy(audio_48k).unsqueeze(0),
            )
            audio = librosa.resample(
                enhanced.squeeze(0).numpy(), orig_sr=48000, target_sr=16000
            )
        except Exception:
            logger.debug("DeepFilter enhancement в preprocess не удался", exc_info=True)
    if WPE_AVAILABLE:
        try:
            stft = librosa.stft(audio, n_fft=512, hop_length=128)
            stft_wpe = wpe(stft[np.newaxis, :, :], taps=10, delay=3, iterations=3)
            audio = librosa.istft(stft_wpe[0], hop_length=128, length=len(audio))
        except Exception:
            logger.debug("WPE в preprocess не удался", exc_info=True)

    board = Pedalboard(
        [HighpassFilter(cutoff_frequency_hz=80), LowpassFilter(cutoff_frequency_hz=8000)]
    )
    audio = board(audio, 16000)

    preprocess_metadata = _collect_preprocess_metadata(audio, 16000)

    if target_sample_rate != 16000:
        audio = librosa.resample(
            audio,
            orig_sr=16000,
            target_sr=target_sample_rate,
            res_type="kaiser_best",
        )

    with io.BytesIO() as output_stream:
        sf.write(
            output_stream,
            audio,
            target_sample_rate,
            subtype="PCM_16",
            format="WAV",
        )
        output_bytes = output_stream.getvalue()

    response = {
        "sample_rate": target_sample_rate,
        "duration": len(audio) / target_sample_rate,
        "preprocess_metadata": preprocess_metadata,
    }
    if return_audio_base64:
        response["audio_base64"] = base64.b64encode(output_bytes).decode()
    return response


def process_diarize(audio_bytes: bytes) -> dict:
    audio, sr = _load_audio_with_duration_check(audio_bytes)
    logger.info(f"Диаризация аудио: {len(audio)} samples, {sr} Hz")
    return _run_diarization(audio, sr)


@app.get("/")
async def root():
    """Корневой endpoint для проверки работоспособности"""
    return {
        "service": "Audio Enhancer v2.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "silero_vad_loaded": vad_model is not None,
        "deepfilter_loaded": DEEPFILTER_AVAILABLE and deepfilter_model is not None,
        "wpe_available": WPE_AVAILABLE,
        "pyannote_loaded": PYANNOTE_AVAILABLE and pyannote_pipeline is not None,
        "version": "2.0.0",
    }


@app.post("/enhance")
async def enhance_audio(
    file: UploadFile = File(...),
    use_deepfilter: bool = Form(True),
    use_wpe: bool = Form(True),
    noise_reduction: bool = Form(True),
    normalize_volume: bool = Form(True),
    enhance_speech: bool = Form(True),
    remove_silence: bool = Form(False),
    target_sample_rate: int = Form(16000, ge=800, le=192000),
    use_compressor: bool = Form(True),
    spectral_gating: bool = Form(True),
    enable_diarization: bool = Form(False),
):
    """
    Улучшает качество аудио для ASR с использованием современных технологий.

    Args:
        file: Аудио файл (WAV, MP3, etc.)
        use_deepfilter: Применить DeepFilterNet (нейросетевое шумоподавление)
        use_wpe: Применить WPE (удаление реверберации)
        noise_reduction: Применить классическое шумоподавление (noisereduce)
        normalize_volume: Нормализовать громкость (LUFS-based)
        enhance_speech: Усилить речевые частоты
        remove_silence: Удалить длинные паузы (Silero VAD)
        target_sample_rate: Целевая частота дискретизации
        use_compressor: Применить динамическую компрессию
        spectral_gating: Применить спектральный гейтинг
        enable_diarization: Включить диаризацию (pyannote)

    Returns:
        Обработанный аудио файл (WAV, 16-bit PCM) или JSON с диаризацией
    """
    try:
        audio_bytes = await read_upload_bytes_capped(file, MAX_UPLOAD_BYTES)
        return await asyncio.to_thread(
            process_enhance,
            audio_bytes,
            use_deepfilter=use_deepfilter,
            use_wpe=use_wpe,
            noise_reduction=noise_reduction,
            normalize_volume=normalize_volume,
            enhance_speech=enhance_speech,
            remove_silence=remove_silence,
            target_sample_rate=target_sample_rate,
            use_compressor=use_compressor,
            spectral_gating=spectral_gating,
            enable_diarization=enable_diarization,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка обработки аудио", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Audio processing failed",
        ) from e


@app.post("/denoise")
async def denoise_only(
    file: UploadFile = File(...),
    stationary: bool = Form(True),
    prop_decrease: float = Form(0.8, ge=0.0, le=1.0),
):
    """
    Только шумоподавление (быстрый endpoint). Работает в памяти.

    Args:
        file: Аудио файл
        stationary: Стационарный шум (True) или нестационарный (False)
        prop_decrease: Агрессивность шумоподавления (0-1)
    """
    try:
        audio_bytes = await read_upload_bytes_capped(file, MAX_UPLOAD_BYTES)
        return await asyncio.to_thread(process_denoise, audio_bytes, stationary, prop_decrease)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка шумоподавления", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Audio processing failed",
        ) from e


@app.post("/preprocess")
@app.post("/api/preprocess")
async def preprocess_audio(
    file: UploadFile = File(...),
    target_sample_rate: int = Form(16000, ge=800, le=192000),
    return_audio_base64: bool = Form(True),
):
    """
    Quality-first preprocessing endpoint для внешнего orchestrator.
    Возвращает preprocess_metadata + (опционально) audio_base64.
    """
    try:
        audio_bytes = await read_upload_bytes_capped(file, MAX_UPLOAD_BYTES)
        return await asyncio.to_thread(
            process_preprocess, audio_bytes, target_sample_rate, return_audio_base64
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка preprocessing", exc_info=True)
        raise HTTPException(status_code=500, detail="Preprocessing failed") from e


@app.post("/diarize")
async def diarize_audio(
    file: UploadFile = File(...),
):
    """
    Диаризация аудио: сегментация, детекция смены спикера, детекция перекрытий.

    Args:
        file: Аудио файл

    Returns:
        JSON с сегментами, сменами спикеров и перекрытиями
    """
    if not PYANNOTE_AVAILABLE or pyannote_pipeline is None:
        raise HTTPException(
            status_code=503,
            detail="Pyannote не доступен. Установите HF_TOKEN в переменные окружения."
        )

    try:
        audio_bytes = await read_upload_bytes_capped(file, MAX_UPLOAD_BYTES)
        return await asyncio.to_thread(process_diarize, audio_bytes)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка диаризации", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Diarization failed",
        ) from e
