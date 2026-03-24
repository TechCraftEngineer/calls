# Python микросервис для продвинутой обработки аудио
FROM python:3.12-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements
COPY requirements.txt .

# Установка Python зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код
COPY . .

# Порт для API
EXPOSE 8080

# Запуск FastAPI сервера
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
