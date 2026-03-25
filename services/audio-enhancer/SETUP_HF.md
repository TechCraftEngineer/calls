# Деплой Audio Enhancer на Hugging Face Space

## Шаг 1: Создание Space

1. Перейдите на https://huggingface.co/spaces
2. Нажмите "Create new Space"
3. Заполните форму:
   - **Space name**: `audio-enhancer` (или любое другое имя)
   - **License**: Apache 2.0
   - **Select the Space SDK**: Docker
   - **Space hardware**: CPU basic (бесплатно) или CPU upgrade для лучшей производительности
   - **Visibility**: Public или Private

## Шаг 2: Загрузка файлов

Загрузите следующие файлы в корень Space:

```
audio-enhancer/
├── main.py              # FastAPI backend
├── app.py               # Gradio интерфейс
├── requirements.txt     # Зависимости Python
├── Dockerfile          # Docker конфигурация
├── README.md           # Документация (с YAML frontmatter)
├── .env.example        # Пример конфигурации
└── api_example.py      # Примеры использования API
```

## Шаг 3: Проверка README.md

Убедитесь, что README.md содержит YAML frontmatter в начале файла:

```yaml
---
title: Audio Enhancer
emoji: 🎵
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
---
```

## Шаг 4: Деплой

1. Загрузите все файлы через веб-интерфейс или Git:

```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/audio-enhancer
cd audio-enhancer
# Скопируйте файлы из services/audio-enhancer/
git add .
git commit -m "Initial commit"
git push
```

2. Hugging Face автоматически начнет сборку Docker образа
3. Процесс займет 5-10 минут
4. После завершения Space будет доступен по адресу:
   `https://huggingface.co/spaces/YOUR_USERNAME/audio-enhancer`

## Шаг 5: Проверка работы

### Веб-интерфейс

Откройте URL вашего Space в браузере. Вы увидите Gradio интерфейс с возможностью:
- Загрузки аудио файлов
- Записи с микрофона
- Настройки параметров обработки
- Прослушивания результата

### REST API

API доступен по эндпоинтам:

```bash
# Health check
curl https://YOUR_USERNAME-audio-enhancer.hf.space/api/health

# Полная обработка
curl -X POST "https://YOUR_USERNAME-audio-enhancer.hf.space/api/enhance" \
  -F "file=@audio.mp3" \
  -F "noise_reduction=true" \
  -F "normalize_volume=true" \
  -F "enhance_speech=true" \
  -F "remove_silence=true" \
  -F "target_sample_rate=16000" \
  -o enhanced.wav

# Быстрое шумоподавление
curl -X POST "https://YOUR_USERNAME-audio-enhancer.hf.space/api/denoise" \
  -F "file=@audio.mp3" \
  -F "prop_decrease=0.8" \
  -o denoised.wav
```

## Настройка производительности

### CPU Basic (бесплатно)
- 2 vCPU, 16GB RAM
- Подходит для тестирования
- Обработка может быть медленной для больших файлов

### CPU Upgrade ($0.03/час)
- 8 vCPU, 32GB RAM
- Рекомендуется для продакшена
- Быстрая обработка аудио

Для изменения hardware:
1. Settings → Resource configuration
2. Выберите нужный тип
3. Сохраните изменения

## Мониторинг

### Логи

Просмотр логов в реальном времени:
1. Откройте ваш Space
2. Перейдите на вкладку "Logs"
3. Следите за процессом обработки

### Метрики

Hugging Face автоматически собирает:
- Количество запросов
- Время обработки
- Использование ресурсов

## Troubleshooting

### Space не запускается

1. Проверьте логи на наличие ошибок
2. Убедитесь, что все файлы загружены
3. Проверьте синтаксис Dockerfile
4. Попробуйте пересобрать: Settings → Factory reboot

### Ошибки при обработке

1. Проверьте размер файла (макс 80MB)
2. Проверьте формат файла (MP3, WAV, FLAC и т.д.)
3. Увеличьте hardware если нужно больше памяти

### Медленная обработка

1. Используйте CPU Upgrade
2. Уменьшите target_sample_rate
3. Отключите remove_silence (самая медленная операция)

## Интеграция в ваш проект

### Python

```python
import requests

def enhance_audio(audio_path: str) -> bytes:
    url = "https://YOUR_USERNAME-audio-enhancer.hf.space/api/enhance"
    
    with open(audio_path, "rb") as f:
        response = requests.post(
            url,
            files={"file": f},
            data={
                "noise_reduction": True,
                "normalize_volume": True,
                "enhance_speech": True,
                "remove_silence": False,
                "target_sample_rate": 16000,
            }
        )
    
    return response.content

# Использование
enhanced = enhance_audio("audio.mp3")
with open("enhanced.wav", "wb") as f:
    f.write(enhanced)
```

### TypeScript/JavaScript

```typescript
async function enhanceAudio(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('noise_reduction', 'true');
  formData.append('normalize_volume', 'true');
  formData.append('enhance_speech', 'true');
  formData.append('remove_silence', 'false');
  formData.append('target_sample_rate', '16000');

  const response = await fetch(
    'https://YOUR_USERNAME-audio-enhancer.hf.space/api/enhance',
    {
      method: 'POST',
      body: formData,
    }
  );

  return response.blob();
}
```

## Ограничения Hugging Face Spaces

- Максимальное время выполнения запроса: 60 секунд (CPU basic)
- Максимальный размер загрузки: определяется вашим кодом (80MB в нашем случае)
- Space засыпает после 48 часов неактивности (бесплатный tier)
- Для постоянной работы используйте платный hardware

## Дополнительные возможности

### Приватный Space

Если нужен приватный доступ:
1. Settings → Visibility → Private
2. Добавьте пользователей в Settings → Collaborators

### Custom Domain

Для использования своего домена:
1. Upgrade до платного hardware
2. Settings → Custom domain
3. Настройте DNS записи

## Полезные ссылки

- [Hugging Face Spaces Documentation](https://huggingface.co/docs/hub/spaces)
- [Docker SDK Guide](https://huggingface.co/docs/hub/spaces-sdks-docker)
- [Gradio Documentation](https://gradio.app/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
