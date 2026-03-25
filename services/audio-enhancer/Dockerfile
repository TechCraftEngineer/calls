# Python микросервис для продвинутой обработки аудио
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r audio_user && useradd -r -g audio_user -d /home/audio_user -m audio_user

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chown -R audio_user:audio_user /app

EXPOSE 8080

USER audio_user

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
