"""API эндпоинты для телефонии."""

import asyncio
import base64
import io
import logging
import numpy as np
import soundfile as sf
import librosa
from fastapi import File, Form, HTTPException, UploadFile

from main import (
    MAX_UPLOAD_BYTES, TELEPHONY_AVAILABLE, DEEPFILTER_AVAILABLE, 
    deepfilter_model, deepfilter_df_state, pyloudnorm as pyln
)
from utils.audio_utils import read_upload_bytes_capped

logger = logging.getLogger(__name__)

# Импортируем процессор для телефонии
try:
    from services.telephony_service import TelephonyProcessor
except ImportError:
    TelephonyProcessor = None


async def enhance_telephony_audio(
    file: UploadFile = File(...),
    format_type: str = Form("auto"),
    duplex: bool = Form(False),
    apply_telephony_filters: bool = Form(True),
    target_sample_rate: int = Form(16000, ge=800, le=48000),
):
    """
    Улучшение телефонного аудио с поддержкой кодеков.
    
    Args:
        file: Аудио файл (G.711, G.729, Opus, WAV)
        format_type: Тип формата ('auto', 'g711', 'g729', 'opus', 'wav')
        duplex: Дуплексное аудио (два канала)
        apply_telephony_filters: Применять телефонные фильтры
        target_sample_rate: Целевая частота дискретизации
        
    Returns:
        JSON с улучшенным аудио и метаданными
    """
    if not TELEPHONY_AVAILABLE or TelephonyProcessor is None:
        raise HTTPException(
            status_code=503,
            detail="Telephony service не доступен"
        )
    
    try:
        audio_bytes = await read_upload_bytes_capped(file, MAX_UPLOAD_BYTES)
        return await asyncio.to_thread(
            process_telephony_enhance, 
            audio_bytes, format_type, duplex, apply_telephony_filters, target_sample_rate
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка обработки телефонного аудио", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Telephony processing failed",
        ) from e


async def convert_telephony_format(
    file: UploadFile = File(...),
    from_format: str = Form("auto"),
    to_format: str = Form("wav"),
    sample_rate: int = Form(16000, ge=800, le=48000),
):
    """
    Конвертация телефонного формата в стандартный.
    
    Args:
        file: Аудио файл
        from_format: Исходный формат ('auto', 'g711', 'g729', 'opus')
        to_format: Целевой формат ('wav', 'mp3')
        sample_rate: Частота дискретизации
        
    Returns:
        WAV файл с конвертированным аудио
    """
    if not TELEPHONY_AVAILABLE or TelephonyProcessor is None:
        raise HTTPException(
            status_code=503,
            detail="Telephony service не доступен"
        )
    
    try:
        audio_bytes = await read_upload_bytes_capped(file, MAX_UPLOAD_BYTES)
        return await asyncio.to_thread(
            process_telephony_convert,
            audio_bytes, from_format, to_format, sample_rate
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка конвертации телефонного формата", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Format conversion failed",
        ) from e


async def split_telephony_duplex(
    file: UploadFile = File(...),
    format_type: str = Form("auto"),
):
    """
    Разделение дуплексного аудио на два канала.
    
    Args:
        file: Стерео аудио файл (канал 1 - caller, канал 2 - callee)
        format_type: Тип формата
        
    Returns:
        JSON с разделенными каналами
    """
    if not TELEPHONY_AVAILABLE or TelephonyProcessor is None:
        raise HTTPException(
            status_code=503,
            detail="Telephony service не доступен"
        )
    
    try:
        audio_bytes = await read_upload_bytes_capped(file, MAX_UPLOAD_BYTES)
        return await asyncio.to_thread(
            process_telephony_split,
            audio_bytes, format_type
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка разделения дуплексного аудио", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Duplex split failed",
        ) from e


def process_telephony_enhance(audio_bytes: bytes, format_type: str, duplex: bool, 
                           apply_filters: bool, target_sr: int) -> dict:
    """Обработка телефонного аудио с улучшением."""
    telephony = TelephonyProcessor()
    
    # Обработка телефонного аудио
    result = telephony.enhance_telephony_audio(
        audio_bytes, format_type, duplex
    )
    
    # Применение стандартных фильтров если нужно
    if apply_filters:
        for channel_name, channel_data in result.items():
            audio = channel_data['audio']
            sr = channel_data['sample_rate']
            
            # Применяем DeepFilterNet если доступен
            if DEEPFILTER_AVAILABLE and deepfilter_model is not None:
                try:
                    audio = enhance(
                        model=deepfilter_model,
                        df_state=deepfilter_df_state,
                        audio=audio.reshape(1, -1),
                        sample_rate=sr
                    )[0]
                except Exception as e:
                    logger.warning(f"DeepFilterNet обработка не удалась: {e}")
            
            # Нормализация громкости
            try:
                meter = pyln.Meter(sr)
                loudness = meter.integrated_loudness(audio)
                if loudness > -16:
                    audio = pyln.normalize.loudness(audio, -16)
            except Exception:
                pass
            
            # Ресемплинг если нужно
            if sr != target_sr:
                audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
            
            result[channel_name]['audio'] = audio
            result[channel_name]['sample_rate'] = target_sr
    
    # Конвертация в байты для ответа
    response = {}
    for channel_name, channel_data in result.items():
        audio = channel_data['audio']
        sr = channel_data['sample_rate']
        
        # Конвертируем в 16-bit PCM
        audio_int16 = (audio * 32767).astype(np.int16)
        
        # Сохраняем в WAV
        with io.BytesIO() as buffer:
            sf.write(buffer, audio_int16, sr, format='WAV', subtype='PCM_16')
            response[channel_name] = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "channels": response,
        "metadata": {
            "original_format": format_type,
            "duplex": duplex,
            "sample_rate": target_sr,
            "duration": max(data['duration'] for data in result.values()),
            "telephony_filters_applied": apply_filters
        }
    }


def process_telephony_convert(audio_bytes: bytes, from_format: str, 
                         to_format: str, sample_rate: int) -> bytes:
    """Конвертация телефонного формата."""
    telephony = TelephonyProcessor()
    
    # Конвертируем в стандартный формат
    audio, sr = telephony.convert_telephony_format(audio_bytes, from_format)
    
    # Ресемплинг если нужно
    if sr != sample_rate:
        audio = librosa.resample(audio, orig_sr=sr, target_sr=sample_rate)
    
    # Конвертируем в 16-bit PCM
    audio_int16 = (audio * 32767).astype(np.int16)
    
    # Сохраняем в нужном формате
    with io.BytesIO() as buffer:
        if to_format.lower() == "wav":
            sf.write(buffer, audio_int16, sample_rate, format='WAV', subtype='PCM_16')
        elif to_format.lower() == "mp3":
            # Используем pydub для MP3
            from pydub import AudioSegment
            audio_seg = AudioSegment(
                audio_int16.tobytes(), 
                frame_rate=sample_rate, 
                sample_width=2, 
                channels=1
            )
            audio_seg.export(buffer, format="mp3")
        else:
            raise ValueError(f"Unsupported target format: {to_format}")
        
        return buffer.getvalue()


def process_telephony_split(audio_bytes: bytes, format_type: str) -> dict:
    """Разделение дуплексного аудио."""
    telephony = TelephonyProcessor()
    
    # Конвертируем в стандартный формат
    audio, sr = telephony.convert_telephony_format(audio_bytes, format_type)
    
    # Разделяем каналы
    caller_audio, callee_audio = telephony.split_channels(audio)
    
    # Конвертируем в байты
    def audio_to_bytes(audio_data, name):
        audio_int16 = (audio_data * 32767).astype(np.int16)
        with io.BytesIO() as buffer:
            sf.write(buffer, audio_int16, sr, format='WAV', subtype='PCM_16')
            return base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "caller": {
            "audio": audio_to_bytes(caller_audio, "caller"),
            "sample_rate": sr,
            "duration": len(caller_audio) / sr
        },
        "callee": {
            "audio": audio_to_bytes(callee_audio, "callee"), 
            "sample_rate": sr,
            "duration": len(callee_audio) / sr
        },
        "metadata": {
            "original_format": format_type,
            "channels_separated": True
        }
    }
