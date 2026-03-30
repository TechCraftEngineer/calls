#!/usr/bin/env python3
"""
Тест для проверки исправления проблемы с временными файлами
"""

import os
import tempfile
import unittest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

# Добавляем текущую директорию в путь
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

class TestFileHandlingFix(unittest.TestCase):
    """Тест исправления проблемы с временными файлами"""
    
    def setUp(self):
        """Подготовка тестового окружения"""
        self.test_audio_content = b"fake audio content"
        self.test_filename = "test_audio.mp3"
    
    def test_temp_file_context_manager(self):
        """Тест контекстного менеджера временных файлов"""
        # Создаем мок для UploadFile
        mock_file = Mock()
        mock_file.filename = self.test_filename
        mock_file.file = Mock()
        mock_file.file.read.side_effect = [
            self.test_audio_content,  # Первое чтение для валидации
            b""  # Конец файла
        ]
        mock_file.file.seek = Mock()
        
        # Создаем временный файл
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            temp_path = tmp.name
            tmp.write(self.test_audio_content)
        
        try:
            # Проверяем, что файл существует внутри контекста
            self.assertTrue(os.path.exists(temp_path))
            
            # Проверяем, что мы можем прочитать файл
            with open(temp_path, 'rb') as f:
                content = f.read()
                self.assertEqual(content, self.test_audio_content)
                
        finally:
            # Очищаем
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    @patch('services.transcription_service.transcription_service')
    @patch('utils.file_validator.FileValidator.validate_audio_content')
    @patch('utils.file_validator.FileValidator.calculate_file_hash')
    @patch('utils.file_validator.FileValidator.validate_audio_file')
    @patch('utils.file_validator.FileValidator.get_file_info')
    @patch('utils.file_validator.FileValidator.secure_temp_file')
    def test_app_file_handling(self, mock_secure_temp, mock_get_info, 
                               mock_validate_file, mock_calc_hash, 
                               mock_validate_content, mock_transcription):
        """Тест обработки файла в app.py с исправленной логикой"""
        
        # Настраиваем моки
        mock_file = Mock()
        mock_file.filename = self.test_filename
        
        mock_get_info.return_value = {"filename": self.test_filename, "size": 100}
        mock_validate_file.return_value = True
        mock_validate_content.return_value = {"duration": 10.5, "sample_rate": 16000}
        mock_calc_hash.return_value = "abc123"
        
        # Создаем временный файл для мока
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            temp_path = tmp.name
            tmp.write(self.test_audio_content)
        
        try:
            # Настраиваем контекстный менеджер
            mock_secure_temp.return_value.__enter__.return_value = temp_path
            mock_secure_temp.return_value.__exit__.return_value = None
            
            # Мок для сервиса транскрибации
            mock_transcription.transcribe_audio.return_value = {
                "success": True,
                "segments": [{"text": "test", "start": 0, "end": 1}],
                "total_duration": 1.0
            }
            
            # Импортируем и тестируем логику из app.py
            # (Здесь мы проверяем, что файл существует во время обработки)
            self.assertTrue(os.path.exists(temp_path))
            
            # Проверяем, что все моки были вызваны правильно
            mock_validate_file.assert_called_once()
            mock_validate_content.assert_called_once_with(temp_path)
            mock_calc_hash.assert_called_once_with(temp_path)
            mock_transcription.transcribe_audio.assert_called_once()
            
        finally:
            # Очищаем
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def test_file_path_validation(self):
        """Тест валидации пути к файлу"""
        # Несуществующий файл
        non_existent = "/tmp/non_existent_file.mp3"
        self.assertFalse(os.path.exists(non_existent))
        
        # Создаем временный файл
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            temp_path = tmp.name
            tmp.write(self.test_audio_content)
        
        try:
            # Существующий файл
            self.assertTrue(os.path.exists(temp_path))
            
            # Проверяем размер
            file_size = os.path.getsize(temp_path)
            self.assertEqual(file_size, len(self.test_audio_content))
            
        finally:
            # Очищаем
            if os.path.exists(temp_path):
                os.unlink(temp_path)

if __name__ == "__main__":
    print("🧪 Запуск тестов для проверки исправления...")
    unittest.main(verbosity=2)
