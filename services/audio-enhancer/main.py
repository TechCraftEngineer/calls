"""
Микросервис для продвинутой обработки аудио.
Использует современные нейросетевые модели для шумоподавления и улучшения качества речи.
Работает полностью в памяти без временных файлов.
"""

import io
import logging

import librosa
import noisereduce as nr
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pedalboard import Pedalboard, Compressor, HighpassFilter, LowpassFilter
from scipy import signal

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audio Enhancer Service", version="2.0.0")

# Лимит загрузки до декодирования (защита от OOM)
MAX_UPLOAD_BYTES = 80 * 1024 * 1024
# Верхняя оценка длительности после декодирования (подстраховка)
MAX_AUDIO_SECONDS = 4 * 3600

# Загрузка Silero VAD модели (один раз при старте)
try:
    vad_model, utils = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
        onnx=False,
    )
    (get_speech_timestamps, save_audio, read_audio, VADIterator, collect_chunks) = utils
    logger.info("✓ Silero VAD модель загружена")
except Exception as e:
    logger.warning(f"Не удалось загрузить Silero VAD: {e}")
    vad_model = None

# Загрузка DeepFilterNet (state-of-the-art шумоподавление)
deepfilter_model = None
try:
    from df.enhance import enhance as df_enhance, init_df
    deepfilter_model, df_state, _ = init_df()
    logger.info("✓ DeepFilterNet модель загружена")
except Exception as e:
    logger.warning(f"DeepFilterNet недоступен: {e}")

# Loudness meter для нормализации
loudness_meter = pyln.Meter(16000)


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
        "silero_vad_loaded": vad_model is not None,
        "deepfilter_loaded": deepfilter_model is not None,
        "version": "2.0.0",
    }


@app.post("/enhance")
async def enhance_audio(
    file: UploadFile = File(...),
    noise_reduction: bool = Form(True),
    normalize_volume: bool = Form(True),
    enhance_speech: bool = Form(True),
    remove_silence: bool = Form(False),
    target_sample_rate: int = Form(16000, ge=800, le=192000),
    use_deepfilter: bool = Form(True),
    use_compressor: bool = Form(True),
    spectral_gating: bool = Form(True),
):
    """
    Улучшает качество аудио для ASR с использованием современных технологий.

    Args:
        file: Аудио файл (WAV, MP3, etc.)
        noise_reduction: Применить классическое шумоподавление (noisereduce)
        normalize_volume: Нормализовать громкость (LUFS-based)
        enhance_speech: Усилить речевые частоты
        remove_silence: Удалить длинные паузы (Silero VAD)
        target_sample_rate: Целевая частота дискретизации
        use_deepfilter: Использовать DeepFilterNet (нейросетевое шумоподавление)
        use_compressor: Применить динамическую компрессию
        spectral_gating: Применить спектральный гейтинг

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

            # 1. DeepFilterNet (нейросетевое шумоподавление) - самое эффективное
            if use_deepfilter and deepfilter_model is not None:
                logger.info("Применяем DeepFilterNet (нейросетевое шумоподавление)...")
                try:
                    # DeepFilterNet работает с 48kHz
                    if sr != 48000:
                        audio_48k = librosa.resample(audio, orig_sr=sr, target_sr=48000)
                    else:
                        audio_48k = audio
                    
                    # Применяем DeepFilterNet
                    audio_tensor = torch.from_numpy(audio_48k).unsqueeze(0)
                    enhanced = df_enhance(deepfilter_model, df_state, audio_tensor)
                    audio_48k = enhanced.squeeze().numpy()
                    
                    # Возвращаем к исходной частоте
                    if sr != 48000:
                        audio = librosa.resample(audio_48k, orig_sr=48000, target_sr=sr)
                    else:
                        audio = audio_48k
                    
                    logger.info("✓ DeepFilterNet применен")
                except Exception as e:
                    logger.warning(f"DeepFilterNet ошибка: {e}, используем fallback")
                    use_deepfilter = False

            # 2. Классическое шумоподавление (если DeepFilterNet недоступен или отключен)
            if noise_reduction and not use_deepfilter:
                logger.info("Применяем классическое шумоподавление...")
                audio = nr.reduce_noise(
                    y=audio,
                    sr=sr,
                    stationary=True,
                    prop_decrease=0.8,
                )

            # 3. Спектральный гейтинг (дополнительная очистка)
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

            # 4. Улучшение речевых частот
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
                
                fft[speech_mask] *= 1.3
                fft[critical_mask] *= 1.5  # Максимальное усиление критичного диапазона
                fft[~speech_mask] *= 0.4   # Сильнее подавляем нерелевантные частоты

                audio = np.fft.irfft(fft, n=len(audio))

            # 5. Динамическая компрессия (улучшает разборчивость тихих участков)
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

            # 6. Нормализация громкости (LUFS-based, профессиональный стандарт)
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

            # 7. Удаление пауз (Silero VAD)
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

            # 8. Финальный ресемплинг (высококачественный)
            if sr != target_sample_rate:
                logger.info(f"Ресемплинг {sr} Hz -> {target_sample_rate} Hz...")
                audio = librosa.resample(
                    audio, 
                    orig_sr=sr, 
                    target_sr=target_sample_rate,
                    res_type='kaiser_best'  # Лучшее качество
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
