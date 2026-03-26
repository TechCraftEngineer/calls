# GigaAM API - Быстрый старт

## Локальный запуск

### Через Docker

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd giga-am

# Создайте .env файл
copy .env.example .env
# Отредактируйте .env и добавьте HF_TOKEN

# Запустите через Docker Compose
docker compose up -d --build

# Проверьте статус
curl http://localhost:7860/api/health
```

### Через Python

```bash
# Создайте виртуальное окружение
python -m venv venv
venv\Scripts\activate

# Установите зависимости
pip install -r requirements.txt

# Установите GigaAM
git clone https://github.com/salute-developers/GigaAM.git
cd GigaAM
pip install -e .
cd ..

# Создайте .env файл
copy .env.example .env
# Добавьте HF_TOKEN

# Запустите приложение
python main.py
```

## Использование API

### Распознавание аудио

```bash
curl -X POST "http://localhost:7860/api/transcribe" -F "file=@audio.mp3"
```

### Проверка работоспособности

```bash
curl http://localhost:7860/api/health
```

### Swagger документация

Откройте в браузере: http://localhost:7860/docs

## Поддерживаемые форматы

MP3, WAV, FLAC, M4A, AAC, OGG, WEBM (макс. 100MB)
