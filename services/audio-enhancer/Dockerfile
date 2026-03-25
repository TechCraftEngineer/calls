# Python микросервис для продвинутой обработки аудио
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    wget \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r audio_user && useradd -r -g audio_user -d /home/audio_user -m audio_user

# Numba may fail when it tries to create a compilation cache inside containers.
# Disabling cache avoids startup-time RuntimeError from librosa/noisereduce.
RUN mkdir -p /tmp/numba_cache && chown -R audio_user:audio_user /tmp/numba_cache
ENV NUMBA_DISABLE_CACHE=1
ENV NUMBA_CACHE_DIR=/tmp/numba_cache

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chown -R audio_user:audio_user /app

EXPOSE 7860

USER audio_user

CMD ["python", "main.py"]
