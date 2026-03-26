import os
import logging
from typing import Optional
from fastapi import UploadFile, HTTPException, Request
from config import settings

logger = logging.getLogger(__name__)

class FileValidator:
    @staticmethod
    def validate_audio_file(file: UploadFile, content_length: Optional[int] = None) -> bool:
        """
        Валидация аудиофайла
        
        Args:
            file: Загруженный файл
            content_length: Content-Length заголовок для проверки размера
            
        Returns:
            True если файл валидный
            
        Raises:
            HTTPException: Если файл невалидный
        """
        # Проверка наличия файла
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="Файл не загружен")
        
        # Проверка безопасности имени файла
        if not FileValidator.is_safe_filename(file.filename):
            raise HTTPException(
                status_code=400, 
                detail="Небезопасное имя файла"
            )
        
        # Проверка размера файла через Content-Length (приоритет)
        if content_length and content_length > settings.max_file_size:
            raise HTTPException(
                status_code=413, 
                detail=f"Размер файла превышает лимит {settings.max_file_size // (1024*1024)}MB"
            )
        
        # Проверка размера файла через атрибут size (fallback)
        if hasattr(file, 'size') and file.size and file.size > settings.max_file_size:
            raise HTTPException(
                status_code=413, 
                detail=f"Размер файла превышает лимит {settings.max_file_size // (1024*1024)}MB"
            )
        
        # Проверка расширения файла
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in settings.allowed_audio_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Неподдерживаемый формат файла. Разрешенные форматы: {', '.join(settings.allowed_audio_formats)}"
            )
        
        # Проверка MIME типа
        allowed_mime_types = {
            '.mp3': ['audio/mpeg', 'audio/mp3'],
            '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave'],
            '.flac': ['audio/flac', 'audio/x-flac'],
            '.m4a': ['audio/mp4', 'audio/x-m4a'],
            '.aac': ['audio/aac', 'audio/x-aac'],
            '.ogg': ['audio/ogg', 'audio/x-ogg'],
            '.webm': ['audio/webm']
        }
        
        if file.content_type:
            expected_mimes = allowed_mime_types.get(file_extension, [])
            if expected_mimes and file.content_type not in expected_mimes:
                logger.warning(f"MIME тип {file.content_type} не соответствует расширению {file_extension}")
        
        return True
    
    @staticmethod
    def get_file_info(file: UploadFile) -> dict:
        """
        Получение информации о файле
        
        Args:
            file: Загруженный файл
            
        Returns:
            Словарь с информацией о файле
        """
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": getattr(file, 'size', 0),
            "extension": os.path.splitext(file.filename)[1].lower() if file.filename else None
        }
    
    @staticmethod
    def is_safe_filename(filename: str) -> bool:
        """
        Проверка безопасности имени файла
        
        Args:
            filename: Имя файла
            
        Returns:
            True если имя файла безопасное
        """
        if not filename:
            return False
        
        # Проверка на опасные символы
        dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
        for char in dangerous_chars:
            if char in filename:
                return False
        
        # Проверка длины имени
        if len(filename) > 255:
            return False
        
        return True
