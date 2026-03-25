"""
Микросервис для продвинутой обработки аудио.
Использует Python библиотеки для шумоподавления и улучшения качества речи.
Работает полностью в памяти без временных файлов.
"""

import io
import logging

import librosa
import noisereduce as nr
import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audio Enhancer Service", version="1.0.0")

# Лимит загрузки до декодирования (защита от OOM)
MAX_UPLOAD_BYTES = 80 * 1024 * 1024
# Верхняя оценка длительности после декодирования (подстраховка)
MAX_AUDIO_SECONDS = 4 * 3600

# Загрузка Silero VAD модели (один раз при старте)
try:
    model, utils = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
        onnx=False,
    )
    (get_speech_timestamps, save_audio, read_audio, VADIterator, collect_chunks) = utils
    logger.info("Silero VAD модель загружена")
except Exception as e:
    logger.warning(f"Не удалось загрузить Silero VAD: {e}")
    model = None


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


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "silero_vad_loaded": model is not None,
    }


@app.post("/enhance")
async def enhance_audio(
    file: UploadFile = File(...),
    noise_reduction: bool = Form(True),
    normalize_volume: bool = Form(True),
    enhance_speech: bool = Form(True),
    remove_silence: bool = Form(False),
    target_sample_rate: int = Form(16000, ge=800, le=192000),
):
    """
    Улучшает качество аудио для ASR. Работает полностью в памяти.

    Args:
        file: Аудио файл (WAV, MP3, etc.)
        noise_reduction: Применить шумоподавление (noisereduce)
        normalize_volume: Нормализовать громкость
        enhance_speech: Усилить речевые частоты
        remove_silence: Удалить длинные паузы (Silero VAD)
        target_sample_rate: Целевая частота дискретизации

    Returns:
        Обработанный аудио файл (WAV, 16-bit PCM)
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

            if noise_reduction:
                logger.info("Применяем шумоподавление...")
                audio = nr.reduce_noise(
                    y=audio,
                    sr=sr,
                    stationary=True,
                    prop_decrease=0.8,
                )

            if enhance_speech:
                logger.info("Усиливаем речевые частоты...")
                audio = librosa.effects.preemphasis(audio, coef=0.97)

                fft = np.fft.rfft(audio)
                frequencies = np.fft.rfftfreq(len(audio), 1 / sr)

                speech_mask = (frequencies >= 300) & (frequencies <= 3400)
                boost_mask = (frequencies >= 800) & (frequencies <= 2000)

                fft[speech_mask] *= 1.2
                fft[boost_mask] *= 1.3
                fft[~speech_mask] *= 0.5

                audio = np.fft.irfft(fft, n=len(audio))

            if normalize_volume:
                logger.info("Нормализуем громкость...")
                peak = np.abs(audio).max()
                if peak > 0:
                    audio = audio / peak * 0.95

                rms = np.sqrt(np.mean(audio**2))
                target_rms = 0.1
                if rms > 0:
                    audio = audio * (target_rms / rms)

                audio = np.clip(audio, -1.0, 1.0)

            if remove_silence and model is not None:
                logger.info("Удаляем длинные паузы...")

                if sr != 16000:
                    audio_16k = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                else:
                    audio_16k = audio

                audio_tensor = torch.from_numpy(audio_16k).float()

                speech_timestamps = get_speech_timestamps(
                    audio_tensor,
                    model,
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
                        logger.info(f"Удалено {len(speech_timestamps)} пауз")

            if sr != target_sample_rate:
                logger.info(f"Ресемплинг {sr} Hz -> {target_sample_rate} Hz...")
                audio = librosa.resample(
                    audio, orig_sr=sr, target_sr=target_sample_rate
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
