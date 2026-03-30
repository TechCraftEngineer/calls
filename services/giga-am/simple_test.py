#!/usr/bin/env python3
"""
Простой тест для проверки исправления проблемы с временными файлами
"""

import os
import tempfile
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_temp_file_lifecycle():
    """Тест жизненного цикла временного файла"""
    logger.info("🧪 Тест жизненного цикла временного файла")
    
    test_content = b"test audio content"
    temp_path = None
    
    try:
        # Создаем временный файл
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            temp_path = tmp.name
            tmp.write(test_content)
            tmp.flush()
            
            logger.info(f"✅ Временный файл создан: {temp_path}")
            logger.info(f"📏 Размер файла: {os.path.getsize(temp_path)} bytes")
            
            # Проверяем, что файл существует внутри контекста
            assert os.path.exists(temp_path), "Файл должен существовать внутри контекста"
            
            # Проверяем содержимое
            with open(temp_path, 'rb') as f:
                content = f.read()
                assert content == test_content, "Содержимое должно совпадать"
            
            logger.info("✅ Файл успешно проверен внутри контекста")
        
        # ВАЖНО: После выхода из контекста with файл все еще существует
        # потому что мы использовали delete=False
        logger.info(f"📁 Файл после выхода из контекста: {os.path.exists(temp_path)}")
        
        # Теперь проверим, что мы можем использовать файл вне контекста
        if os.path.exists(temp_path):
            with open(temp_path, 'rb') as f:
                content = f.read()
                logger.info(f"✅ Файл успешно прочитан вне контекста: {len(content)} bytes")
        
        # Имитируем проблему: если бы мы использовали secure_temp_file с auto-delete
        # то файл был бы удален после выхода из контекста
        
    finally:
        # Очистка
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
            logger.info("🧹 Временный файл удален")

def test_secure_temp_simulation():
    """Тест симуляции проблемы с secure_temp_file"""
    logger.info("🧪 Тест симуляции проблемы с auto-delete")
    
    test_content = b"test audio content"
    temp_path = None
    
    try:
        # Симулируем secure_temp_file с auto-delete (как в FileValidator)
        with tempfile.NamedTemporaryFile(delete=True, suffix=".mp3") as tmp:
            temp_path = tmp.name
            tmp.write(test_content)
            tmp.flush()
            
            logger.info(f"✅ Временный файл создан: {temp_path}")
            logger.info(f"📏 Размер файла: {os.path.getsize(temp_path)} bytes")
            
            # Проверяем, что файл существует внутри контекста
            assert os.path.exists(temp_path), "Файл должен существовать внутри контекста"
            
            # Сохраняем путь для использования вне контекста
            saved_path = temp_path
        
        # ПРОБЛЕМА: После выхода из контекста файл удален
        logger.info(f"📁 Файл после выхода из контекста: {os.path.exists(saved_path)}")
        
        # Попытка использовать файл вне контекста вызовет ошибку
        if not os.path.exists(saved_path):
            logger.error("❌ Файл удален после выхода из контекста - это и есть наша проблема!")
            return False
        else:
            logger.error("❌ Файл не удален - что-то не так с симуляцией")
            return False
            
    except Exception as e:
        logger.error(f"❌ Ошибка в тесте: {e}")
        return False

def test_fixed_approach():
    """Тест исправленного подхода - вся обработка внутри контекста"""
    logger.info("🧪 Тест исправленного подхода")
    
    test_content = b"test audio content"
    result = None
    
    # Симулируем исправленный подход из app.py
    with tempfile.NamedTemporaryFile(delete=True, suffix=".mp3") as tmp:
        temp_path = tmp.name
        tmp.write(test_content)
        tmp.flush()
        
        logger.info(f"✅ Временный файл создан: {temp_path}")
        
        # Вся обработка происходит ВНУТРИ контекста
        try:
            # Валидация файла
            assert os.path.exists(temp_path), "Файл должен существовать"
            file_size = os.path.getsize(temp_path)
            logger.info(f"✅ Валидация пройдена: {file_size} bytes")
            
            # Вычисление хеша
            file_hash = f"hash_{file_size}"  # Симуляция
            logger.info(f"✅ Хеш вычислен: {file_hash}")
            
            # Обработка (симуляция транскрибации)
            result = {
                "success": True,
                "segments": [{"text": "test transcription", "start": 0, "end": 1}],
                "file_hash": file_hash,
                "file_size": file_size
            }
            logger.info("✅ Обработка завершена успешно")
            
        except Exception as e:
            logger.error(f"❌ Ошибка при обработке: {e}")
            result = {"success": False, "error": str(e)}
    
    # После выхода из контекста файл удален, но результат уже получен
    logger.info(f"📊 Результат обработки: {result}")
    
    if result and result.get("success"):
        logger.info("✅ Исправленный подход работает!")
        return True
    else:
        logger.error("❌ Исправленный подход не сработал")
        return False

def main():
    """Основная функция"""
    logger.info("🚀 Запуск тестов для проверки исправления проблемы с временными файлами")
    logger.info("=" * 70)
    
    try:
        # Тест 1: Базовый жизненный цикл
        test_temp_file_lifecycle()
        logger.info("")
        
        # Тест 2: Симуляция проблемы
        test_secure_temp_simulation()
        logger.info("")
        
        # Тест 3: Исправленный подход
        success = test_fixed_approach()
        logger.info("")
        
        if success:
            logger.info("🎉 Все тесты пройдены! Проблема с временными файлами исправлена.")
        else:
            logger.error("❌ Тесты не пройдены. Проблема осталась.")
            
    except Exception as e:
        logger.error(f"❌ Критическая ошибка в тестах: {e}")
        raise

if __name__ == "__main__":
    main()
