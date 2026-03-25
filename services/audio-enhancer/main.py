"""
Микросервис для продвинутой обработки аудио.
Использует Python библиотеки для шумоподавления и улучшения качества речи.
Работает полностью в памяти без временных файлов.
"""

import io
import logging
from typing import Optional

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
    target_sample_rate: int = Form(16000),
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
        # Читаем аудио в память
        audio_bytes = await file.read()
        
        # Используем io.BytesIO вместо временных файлов
        with io.BytesIO(audio_bytes) as audio_stream:
            # Загружаем аудио с помощью librosa из памяти
            audio, sr = librosa.load(audio_stream, sr=None, mono=True)
            logger.info(f"Загружено аудио: {len(audio)} samples, {sr} Hz")
            
            # 1. Шумоподавление (noisereduce)
            if noise_reduction:
                logger.info("Применяем шумоподавление...")
                audio = nr.reduce_noise(
                    y=audio,
                    sr=sr,
                    stationary=True,  # Для стационарного шума
                    prop_decrease=0.8,  # Агрессивность (0-1)
                )
            
            # 2. Усиление речевых частот (300Hz-3400Hz)
            if enhance_speech:
                logger.info("Усиливаем речевые частоты...")
                # Highpass фильтр (убираем низкие частоты)
                audio = librosa.effects.preemphasis(audio, coef=0.97)
                
                # Bandpass фильтр для речевого диапазона
                # (librosa не имеет встроенного bandpass, используем FFT)
                fft = np.fft.rfft(audio)
                frequencies = np.fft.rfftfreq(len(audio), 1 / sr)
                
                # Создаем маску для речевых частот (300-3400 Hz)
                speech_mask = (frequencies >= 300) & (frequencies <= 3400)
                boost_mask = (frequencies >= 800) & (frequencies <= 2000)
                
                # Усиливаем речевые частоты
                fft[speech_mask] *= 1.2
                fft[boost_mask] *= 1.3
                
                # Ослабляем нерелевантные частоты
                fft[~speech_mask] *= 0.5
                
                audio = np.fft.irfft(fft, n=len(audio))
            
            # 3. Нормализация громкости
            if normalize_volume:
                logger.info("Нормализуем громкость...")
                # Пиковая нормализация
                peak = np.abs(audio).max()
                if peak > 0:
                    audio = audio / peak * 0.95  # Оставляем небольшой запас
                
                # RMS нормализация (выравнивание средней громкости)
                rms = np.sqrt(np.mean(audio**2))
                target_rms = 0.1  # Целевой RMS
                if rms > 0:
                    audio = audio * (target_rms / rms)
                
                # Ограничение пиков после нормализации
                audio = np.clip(audio, -1.0, 1.0)
            
            # 4. Удаление длинных пауз (Silero VAD)
            if remove_silence and model is not None:
                logger.info("Удаляем длинные паузы...")
                
                # Ресемплинг для Silero VAD (требует 16kHz)
                if sr != 16000:
                    audio_16k = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                else:
                    audio_16k = audio
                
                # Конвертируем в torch tensor
                audio_tensor = torch.from_numpy(audio_16k).float()
                
                # Получаем временные метки речи
                speech_timestamps = get_speech_timestamps(
                    audio_tensor,
                    model,
                    sampling_rate=16000,
                    threshold=0.5,
                    min_speech_duration_ms=250,
                    min_silence_duration_ms=1000,  # Удаляем паузы >1 сек
                )
                
                if speech_timestamps:
                    # Собираем только фрагменты с речью
                    speech_chunks = []
                    for timestamp in speech_timestamps:
                        start = int(timestamp["start"] * sr / 16000)
                        end = int(timestamp["end"] * sr / 16000)
                        speech_chunks.append(audio[start:end])
                    
                    if speech_chunks:
                        audio = np.concatenate(speech_chunks)
                        logger.info(f"Удалено {len(speech_timestamps)} пауз")
            
            # 5. Ресемплинг в целевую частоту
            if sr != target_sample_rate:
                logger.info(f"Ресемплинг {sr} Hz -> {target_sample_rate} Hz...")
                audio = librosa.resample(
                    audio, orig_sr=sr, target_sr=target_sample_rate
                )
            
            # Сохраняем результат в память
            with io.BytesIO() as output_stream:
                sf.write(
                    output_stream,
                    audio,
                    target_sample_rate,
                    subtype="PCM_16",  # 16-bit PCM
                    format="WAV"
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
    
    except Exception as e:
        logger.error(f"Ошибка обработки аудио: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/denoise")
async def denoise_only(
    file: UploadFile = File(...),
    stationary: bool = Form(True),
    prop_decrease: float = Form(0.8),
):
    """
    Только шумоподавление (быстрый endpoint). Работает в памяти.
    
    Args:
        file: Аудио файл
        stationary: Стационарный шум (True) или нестационарный (False)
        prop_decrease: Агрессивность шумоподавления (0-1)
    """
    try:
        audio_bytes = await file.read()
        
        # Используем io.BytesIO вместо временных файлов
        with io.BytesIO(audio_bytes) as audio_stream:
            audio, sr = librosa.load(audio_stream, sr=None, mono=True)
            
            # Шумоподавление
            audio_denoised = nr.reduce_noise(
                y=audio,
                sr=sr,
                stationary=stationary,
                prop_decrease=prop_decrease,
            )
            
            # Сохраняем результат в память
            with io.BytesIO() as output_stream:
                sf.write(output_stream, audio_denoised, sr, subtype="PCM_16", format="WAV")
                output_bytes = output_stream.getvalue()
            
            return Response(
                content=output_bytes,
                media_type="audio/wav",
            )
    
    except Exception as e:
        logger.error(f"Ошибка шумоподавления: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(app, host="0.0.0.0", port=8080)
