# Исправление проблемы с временными файлами в GigaAM

## Описание проблемы

В сервисе GigaAM возникала ошибка `Failed to load audio` при попытке распознавания аудиофайлов. Причиной была неправильная работа с временными файлами.

### Корень проблемы

В файле `app.py` использовался следующий паттерн:

```python
# ПРОБЛЕМНЫЙ КОД
with FileValidator.secure_temp_file(file) as temp_path:
    tmp_path = temp_path
    # ... валидация файла

# Вне контекста - файл уже удален!
result = await run_in_threadpool(
    _run_ultra_pipeline,
    tmp_path,  # ❌ Файл не существует!
    preprocess_metadata,
    request_id,
)
```

Контекстный менеджер `secure_temp_file` автоматически удаляет временный файл после выхода из блока `with`. Но код пытался использовать путь к файлу вне контекста.

## Решение

### 1. Перенос всей обработки внутрь контекста

```python
# ИСПРАВЛЕННЫЙ КОД
with FileValidator.secure_temp_file(file) as tmp_path:
    try:
        # Валидация
        audio_metadata = FileValidator.validate_audio_content(tmp_path)
        file_hash = FileValidator.calculate_file_hash(tmp_path)
        
        # Обработка preprocess_metadata
        preprocess_metadata = ...
        
        # Отслеживание запроса
        with RequestTracker(request_id, file_info.get("size", 0), file_hash) as tracker:
            # Проверка кэша
            cached_result = cache.get(file_hash)
            if cached_result:
                return JSONResponse(content=cached_result)
            
            # Выполнение pipeline
            result = await run_in_threadpool(
                _run_ultra_pipeline,
                tmp_path,  # ✅ Файл существует!
                preprocess_metadata,
                request_id,
            )
            
            # Обработка результата
            if result.get("success"):
                cache.put(file_hash, result, audio_metadata)
                result["file_hash"] = file_hash
                result["audio_metadata"] = audio_metadata
                result["request_id"] = request_id
                result["processing_time"] = tracker.duration
                result["cached"] = False
                return JSONResponse(content=result)
            
            # Обработка ошибок
            ...
```

### 2. Улучшение обработки ошибок в transcription_service.py

Добавлена дополнительная диагностика и fallback-логика:

```python
def _transcribe_sync(self, audio_path: str):
    try:
        # Проверка существования файла
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Аудиофайл не найден: {audio_path}")
        
        # Проверка размера файла
        file_size = os.path.getsize(audio_path)
        logger.info(f"Размер аудиофайла: {file_size} bytes")
        
        # Попытка распознавания по пути к файлу
        try:
            result = self.model.transcribe_longform(audio_path)
            return result
        except Exception as path_error:
            logger.warning(f"Не удалось распознать по пути к файлу: {path_error}")
            
            # Fallback: загрузка аудиоданных
            import librosa
            audio_data, sample_rate = librosa.load(audio_path, sr=16000, mono=True)
            result = self.model.transcribe_longform(audio_data)
            return result
            
    except Exception as e:
        logger.error(f"Ошибка при распознавании аудио: {e}")
        raise
```

## Файлы, измененные при исправлении

1. **`app.py`** - Основное исправление: перенос всей обработки внутрь контекста `with`
2. **`services/transcription_service.py`** - Улучшение диагностики и добавление fallback-логики

## Тестирование

Созданы тесты для проверки исправления:

- **`simple_test.py`** - Базовые тесты жизненного цикла временных файлов
- **`test_fix.py`** - Unit тесты с моками (требует установки зависимостей)

## Результат

✅ **Проблема решена:** Временные файлы теперь корректно обрабатываются  
✅ **Улучшена диагностика:** Добавлено детальное логирование ошибок  
✅ **Добавлен fallback:** Альтернативный способ загрузки аудио при необходимости  
✅ **Сохранена безопасность:** Файлы все еще безопасно удаляются после использования  

## Как запустить тесты

```bash
cd services/giga-am
python simple_test.py
```

Тесты подтверждают, что:
1. Проблема с удалением временных файлов воспроизводится
2. Исправленный подход работает корректно
3. Все операции выполняются внутри контекста, когда файл существует
