"""
Микросервис для продвинутой обработки аудио.
Использует современные нейросетевые модели для шумоподавления и улучшения качества речи.
Работает полностью в памяти без временных файлов.
"""

import io
import base64
import logging
import signal
import sys

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
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audio Enhancer Service", version="2.0.0")

# Обработка сигналов для корректного завершения
def signal_handler(sig, frame):
    logger.info("Получен сигнал завершения, останавливаем сервис...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Лимит загрузки до декодирования (защита от OOM)
MAX_UPLOAD_BYTES = 80 * 1024 * 1024
# Верхняя оценка длительности после декодирования (подстраховка)
MAX_AUDIO_SECONDS = 4 * 3600

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
        import os
        hf_token = os.environ.get("HF_TOKEN")
        if hf_token:
            pyannote_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
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

        with io.BytesIO(audio_bytes) as audio_stream:
            audio, sr = librosa.load(audio_stream, sr=None, mono=True)
            duration = float(len(audio)) / float(sr) if sr else 0.0
            if duration > MAX_AUDIO_SECONDS:
                raise HTTPException(
                    status_code=413,
                    detail="Audio too long",
                )
            logger.info(f"Загружено аудио: {len(audio)} samples, {sr} Hz")

            # Сохраняем оригинал для диаризации
            original_audio = audio.copy()
            original_sr = sr

            # 1. DeepFilterNet шумоподавление (работает на 48kHz)
            if use_deepfilter and DEEPFILTER_AVAILABLE and deepfilter_model is not None:
                logger.info("Применяем DeepFilterNet шумоподавление...")
                try:
                    # Ресемплируем в 48kHz для DeepFilterNet
                    if sr != 48000:
                        audio_48k = librosa.resample(audio, orig_sr=sr, target_sr=48000)
                    else:
                        audio_48k = audio
                    
                    # Применяем DeepFilterNet
                    audio_48k_tensor = torch.from_numpy(audio_48k).unsqueeze(0)
                    enhanced = enhance(deepfilter_model, deepfilter_df_state, audio_48k_tensor)
                    audio_48k = enhanced.squeeze(0).numpy()
                    
                    # Возвращаем к исходной частоте
                    if sr != 48000:
                        audio = librosa.resample(audio_48k, orig_sr=48000, target_sr=sr)
                    else:
                        audio = audio_48k
                    
                    logger.info("✓ DeepFilterNet применен")
                except Exception as e:
                    logger.warning(f"DeepFilterNet не удался: {e}, используем fallback")
                    use_deepfilter = False

            # 2. WPE дереверберация (удаление эха)
            if use_wpe and WPE_AVAILABLE:
                logger.info("Применяем WPE дереверберацию...")
                try:
                    # WPE работает с STFT
                    stft = librosa.stft(audio, n_fft=512, hop_length=128)
                    
                    # Применяем WPE (требует shape: [channels, freq, time])
                    stft_wpe = wpe(stft[np.newaxis, :, :], taps=10, delay=3, iterations=3)
                    
                    # Обратное преобразование
                    audio = librosa.istft(stft_wpe[0], hop_length=128, length=len(audio))
                    logger.info("✓ WPE дереверберация применена")
                except Exception as e:
                    logger.warning(f"WPE не удался: {e}")

            # 3. Классическое шумоподавление (fallback или дополнительная очистка)
            if noise_reduction and (not use_deepfilter or not DEEPFILTER_AVAILABLE):
                logger.info("Применяем классическое шумоподавление...")
                audio = nr.reduce_noise(
                    y=audio,
                    sr=sr,
                    stationary=True,
                    prop_decrease=0.8,
                )

            # 4. Спектральный гейтинг (дополнительная очистка)
            if spectral_gating:
                logger.info("Применяем спектральный гейтинг...")
                # Вычисляем STFT
                D = librosa.stft(audio)
                magnitude = np.abs(D)
                
                # Оцениваем шумовой порог (нижние 10% энергии)
                noise_threshold = np.percentile(magnitude, 10)
                
                # Создаем маску (мягкий гейтинг)
                mask = np.maximum(0, 1 - (noise_threshold / (magnitude + 1e-10)))
                mask = np.power(mask, 2)  # Квадратичная маска для плавности
                
                # Применяем маску
                D_filtered = D * mask
                audio = librosa.istft(D_filtered, length=len(audio))

            # 5. Улучшение речевых частот
            if enhance_speech:
                logger.info("Усиливаем речевые частоты...")
                
                # Применяем фильтры через Pedalboard (профессиональное качество)
                board = Pedalboard([
                    HighpassFilter(cutoff_frequency_hz=80),  # Убираем низкие частоты
                    LowpassFilter(cutoff_frequency_hz=8000),  # Убираем высокие частоты
                ])
                audio = board(audio, sr)
                
                # Pre-emphasis для усиления высоких частот речи
                audio = librosa.effects.preemphasis(audio, coef=0.97)

                # Частотное усиление (оптимизировано для речи)
                fft = np.fft.rfft(audio)
                frequencies = np.fft.rfftfreq(len(audio), 1 / sr)

                # Речевой диапазон: 300-3400 Hz (телефонное качество)
                # Критичный диапазон: 1000-3000 Hz (разборчивость)
                speech_mask = (frequencies >= 300) & (frequencies <= 3400)
                critical_mask = (frequencies >= 1000) & (frequencies <= 3000)

                # Применяем усиления за один проход, чтобы диапазоны не умножались дважды.
                gain = np.ones_like(frequencies, dtype=np.float32)
                gain[critical_mask] = 1.5  # Максимальное усиление критичного диапазона
                gain[speech_mask & ~critical_mask] = 1.3  # Усиление речевого диапазона (кроме критичного)
                gain[~speech_mask] = 0.4  # Сильнее подавляем нерелевантные частоты
                fft *= gain

                audio = np.fft.irfft(fft, n=len(audio))

            # 6. Динамическая компрессия (улучшает разборчивость тихих участков)
            if use_compressor:
                logger.info("Применяем динамическую компрессию...")
                compressor = Pedalboard([
                    Compressor(
                        threshold_db=-20,
                        ratio=4,
                        attack_ms=5,
                        release_ms=50,
                    )
                ])
                audio = compressor(audio, sr)

            # 7. Нормализация громкости (LUFS-based, профессиональный стандарт)
            if normalize_volume:
                logger.info("Нормализуем громкость (LUFS)...")
                
                # Пиковая нормализация (предотвращение клиппинга)
                peak = np.abs(audio).max()
                if peak > 0:
                    audio = audio / peak * 0.95

                # LUFS нормализация (перцептивная громкость)
                try:
                    # Ресемплируем для loudness meter если нужно
                    if sr != 16000:
                        audio_16k = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                        loudness = loudness_meter.integrated_loudness(audio_16k)
                    else:
                        loudness = loudness_meter.integrated_loudness(audio)
                    
                    # Целевая громкость: -16 LUFS (оптимально для речи)
                    target_loudness = -16.0
                    loudness_delta = target_loudness - loudness
                    gain = np.power(10.0, loudness_delta / 20.0)
                    audio = audio * gain
                    
                    logger.info(f"Громкость: {loudness:.1f} LUFS -> {target_loudness} LUFS")
                except Exception as e:
                    logger.warning(f"LUFS нормализация не удалась: {e}, используем RMS")
                    # Fallback: RMS нормализация
                    rms = np.sqrt(np.mean(audio**2))
                    target_rms = 0.1
                    if rms > 0:
                        audio = audio * (target_rms / rms)

                # Финальное ограничение
                audio = np.clip(audio, -1.0, 1.0)

            # 8. Удаление пауз (Silero VAD)
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

            # 9. Финальный ресемплинг (высококачественный)
            if sr != target_sample_rate:
                logger.info(f"Ресемплинг {sr} Hz -> {target_sample_rate} Hz...")
                audio = librosa.resample(
                    audio, 
                    orig_sr=sr, 
                    target_sr=target_sample_rate,
                    res_type='kaiser_best'  # Лучшее качество
                )

            # 10. Диаризация (опционально, возвращает JSON с сегментами)
            diarization_result = None
            if enable_diarization and PYANNOTE_AVAILABLE and pyannote_pipeline is not None:
                logger.info("Выполняем диаризацию (pyannote)...")
                try:
                    # Сохраняем во временный буфер для pyannote
                    with io.BytesIO() as temp_audio:
                        sf.write(temp_audio, original_audio, original_sr, format='WAV')
                        temp_audio.seek(0)
                        
                        # Применяем диаризацию
                        diarization = pyannote_pipeline({"audio": temp_audio})
                        
                        # Извлекаем результаты
                        segments = []
                        speaker_changes = []
                        overlaps = []
                        
                        prev_speaker = None
                        for turn, _, speaker in diarization.itertracks(yield_label=True):
                            segment_info = {
                                "start": turn.start,
                                "end": turn.end,
                                "duration": turn.end - turn.start,
                                "speaker": speaker
                            }
                            segments.append(segment_info)
                            
                            # Детекция смены спикера
                            if prev_speaker is not None and prev_speaker != speaker:
                                speaker_changes.append({
                                    "time": turn.start,
                                    "from_speaker": prev_speaker,
                                    "to_speaker": speaker
                                })
                            prev_speaker = speaker
                        
                        # Детекция перекрытий (overlap detection)
                        for (s1, t1, spk1), (s2, t2, spk2) in zip(
                            list(diarization.itertracks(yield_label=True))[:-1],
                            list(diarization.itertracks(yield_label=True))[1:]
                        ):
                            if t1.end > t2.start and spk1 != spk2:
                                overlaps.append({
                                    "start": t2.start,
                                    "end": min(t1.end, t2.end),
                                    "duration": min(t1.end, t2.end) - t2.start,
                                    "speakers": [spk1, spk2]
                                })
                        
                        diarization_result = {
                            "segments": segments,
                            "speaker_changes": speaker_changes,
                            "overlaps": overlaps,
                            "num_speakers": len(set(s["speaker"] for s in segments)),
                            "total_duration": original_audio.shape[0] / original_sr
                        }
                        
                        logger.info(f"✓ Диаризация: {len(segments)} сегментов, "
                                  f"{len(speaker_changes)} смен спикера, "
                                  f"{len(overlaps)} перекрытий")
                except Exception as e:
                    logger.warning(f"Диаризация не удалась: {e}")

            # Если включена диаризация, возвращаем JSON с аудио и метаданными
            if diarization_result is not None:
                with io.BytesIO() as output_stream:
                    sf.write(
                        output_stream,
                        audio,
                        target_sample_rate,
                        subtype="PCM_16",
                        format="WAV",
                    )
                    audio_base64 = __import__('base64').b64encode(output_stream.getvalue()).decode()
                
                return {
                    "audio_base64": audio_base64,
                    "sample_rate": target_sample_rate,
                    "duration": len(audio) / target_sample_rate,
                    "diarization": diarization_result
                }

            # Обычный возврат аудио файла
            with io.BytesIO() as output_stream:
                sf.write(
                    output_stream,
                    audio,
                    target_sample_rate,
                    subtype="PCM_16",
                    format="WAV",
                )
                output_bytes = output_stream.getvalue()

            logger.info(
                f"Обработка завершена: {len(audio)} samples, {target_sample_rate} Hz"
            )

            return Response(
                content=output_bytes,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": "attachment; filename=enhanced.wav",
                },
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

        with io.BytesIO(audio_bytes) as audio_stream:
            audio, sr = librosa.load(audio_stream, sr=None, mono=True)
            duration = float(len(audio)) / float(sr) if sr else 0.0
            if duration > MAX_AUDIO_SECONDS:
                raise HTTPException(
                    status_code=413,
                    detail="Audio too long",
                )

            audio_denoised = nr.reduce_noise(
                y=audio,
                sr=sr,
                stationary=stationary,
                prop_decrease=prop_decrease,
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

            return Response(
                content=output_bytes,
                media_type="audio/wav",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка шумоподавления", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Audio processing failed",
        ) from e


@app.post("/preprocess")
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
        with io.BytesIO(audio_bytes) as audio_stream:
            audio, sr = librosa.load(audio_stream, sr=None, mono=True)
            duration = float(len(audio)) / float(sr) if sr else 0.0
            if duration > MAX_AUDIO_SECONDS:
                raise HTTPException(status_code=413, detail="Audio too long")

        # Конвертация в 16k mono для унифицированного пайплайна
        if sr != 16000:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
            sr = 16000

        # Loudness normalization to -16 LUFS
        peak = np.abs(audio).max()
        if peak > 0:
            audio = audio / peak * 0.95
        try:
            loudness = loudness_meter.integrated_loudness(audio)
            loudness_delta = -16.0 - loudness
            gain = np.power(10.0, loudness_delta / 20.0)
            audio = np.clip(audio * gain, -1.0, 1.0)
        except Exception:
            pass

        # speech enhancement + dereverb + bandpass через reuse основного endpoint logic (кратко)
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
                pass
        if WPE_AVAILABLE:
            try:
                stft = librosa.stft(audio, n_fft=512, hop_length=128)
                stft_wpe = wpe(stft[np.newaxis, :, :], taps=10, delay=3, iterations=3)
                audio = librosa.istft(stft_wpe[0], hop_length=128, length=len(audio))
            except Exception:
                pass

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

        with io.BytesIO(audio_bytes) as audio_stream:
            audio, sr = librosa.load(audio_stream, sr=None, mono=True)
            duration = float(len(audio)) / float(sr) if sr else 0.0
            if duration > MAX_AUDIO_SECONDS:
                raise HTTPException(
                    status_code=413,
                    detail="Audio too long",
                )

            logger.info(f"Диаризация аудио: {len(audio)} samples, {sr} Hz")

            # Сохраняем во временный буфер для pyannote
            with io.BytesIO() as temp_audio:
                sf.write(temp_audio, audio, sr, format='WAV')
                temp_audio.seek(0)
                
                # Применяем диаризацию
                diarization = pyannote_pipeline({"audio": temp_audio})
                
                # Извлекаем результаты
                segments = []
                speaker_changes = []
                overlaps = []
                
                prev_speaker = None
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    segment_info = {
                        "start": turn.start,
                        "end": turn.end,
                        "duration": turn.end - turn.start,
                        "speaker": speaker
                    }
                    segments.append(segment_info)
                    
                    # Детекция смены спикера
                    if prev_speaker is not None and prev_speaker != speaker:
                        speaker_changes.append({
                            "time": turn.start,
                            "from_speaker": prev_speaker,
                            "to_speaker": speaker
                        })
                    prev_speaker = speaker
                
                # Детекция перекрытий (overlap detection)
                track_list = list(diarization.itertracks(yield_label=True))
                for i in range(len(track_list) - 1):
                    s1, t1, spk1 = track_list[i]
                    s2, t2, spk2 = track_list[i + 1]
                    
                    if t1.end > t2.start and spk1 != spk2:
                        overlaps.append({
                            "start": t2.start,
                            "end": min(t1.end, t2.end),
                            "duration": min(t1.end, t2.end) - t2.start,
                            "speakers": [spk1, spk2]
                        })
                
                result = {
                    "segments": segments,
                    "speaker_changes": speaker_changes,
                    "overlaps": overlaps,
                    "num_speakers": len(set(s["speaker"] for s in segments)),
                    "total_duration": audio.shape[0] / sr
                }
                
                logger.info(f"✓ Диаризация: {len(segments)} сегментов, "
                          f"{len(speaker_changes)} смен спикера, "
                          f"{len(overlaps)} перекрытий")
                
                return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка диаризации", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Diarization failed",
        ) from e


if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
