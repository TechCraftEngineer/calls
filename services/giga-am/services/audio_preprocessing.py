"""
Сервис предобработки аудио для улучшения качества диаризации.
"""
import logging
import os

import librosa
import soundfile as sf

from config import settings

logger = logging.getLogger(__name__)


def preprocess_audio_for_diarization(audio_path: str, request_id: str) -> str:
    """
    Предобработка аудио для улучшения качества диаризации.
    
    Если sample rate < target_sample_rate и auto_resample_enabled=True,
    автоматически апсемплирует аудио.
    
    Args:
        audio_path: Путь к оригинальному аудиофайлу
        request_id: ID запроса для логирования
    
    Returns:
        Путь к обработанному файлу (или оригинальному, если обработка не нужна)
    """
    # Проверяем, включён ли автоматический ресемплинг
    if not settings.auto_resample_enabled:
        logger.debug(f"[{request_id}] Автоматический ресемплинг отключён")
        return audio_path
    
    try:
        # Проверяем метаданные аудио
        info = sf.info(audio_path)
        original_sr = info.samplerate
        target_sr = settings.target_sample_rate
        
        # Если качество достаточное, возвращаем оригинал
        if original_sr >= target_sr:
            logger.info(
                f"[{request_id}] Аудио качество достаточное: {original_sr}Hz "
                f"(target: {target_sr}Hz)"
            )
            return audio_path
        
        # Апсемплинг
        logger.info(
            f"[{request_id}] Низкое качество аудио: {original_sr}Hz. "
            f"Автоматический апсемплинг до {target_sr}Hz для улучшения диаризации..."
        )
        
        # Загружаем и ресемплируем
        audio_data, _ = librosa.load(audio_path, sr=target_sr, mono=True)
        
        # Сохраняем во временный файл
        resampled_path = audio_path.replace('.mp3', f'_{target_sr}hz.wav').replace('.m4a', f'_{target_sr}hz.wav')
        if resampled_path == audio_path:
            resampled_path = audio_path + f'_{target_sr}hz.wav'
        
        sf.write(resampled_path, audio_data, target_sr, subtype='PCM_16')
        
        logger.info(
            f"[{request_id}] Аудио успешно апсемплировано: "
            f"{original_sr}Hz → {target_sr}Hz, сохранено в {os.path.basename(resampled_path)}"
        )
        
        return resampled_path
        
    except Exception as e:
        logger.warning(
            f"[{request_id}] Не удалось предобработать аудио: {e}. "
            f"Используется оригинальный файл."
        )
        return audio_path


def cleanup_processed_audio(audio_path: str, original_path: str, request_id: str) -> None:
    """
    Удаляет временный обработанный файл, если он отличается от оригинала.
    
    Args:
        audio_path: Путь к обработанному файлу
        original_path: Путь к оригинальному файлу
        request_id: ID запроса для логирования
    """
    if audio_path != original_path:
        try:
            os.remove(audio_path)
            logger.debug(f"[{request_id}] Удалён временный файл: {audio_path}")
        except Exception as e:
            logger.warning(f"[{request_id}] Не удалось удалить временный файл: {e}")
