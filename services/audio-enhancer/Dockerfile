# Python микросервис для продвинутой обработки аудио
FROM python:3.12-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    wget \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Установка Rust через rustup (для DeepFilterNet)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Создание пользователя
RUN groupadd -r audio_user && useradd -r -g audio_user -d /home/audio_user -m audio_user

# Настройка окружения для Numba и Torch
ENV NUMBA_DISABLE_CACHE=1
ENV NUMBA_CACHE_DIR=/tmp/numba_cache
ENV TORCH_HOME=/tmp/torch_cache
ENV TRANSFORMERS_CACHE=/tmp/transformers_cache
ENV HF_TOKEN=""

# Создание директорий для кэша
RUN mkdir -p /tmp/numba_cache /tmp/torch_cache /tmp/transformers_cache && \
    chown -R audio_user:audio_user /tmp/numba_cache /tmp/torch_cache /tmp/transformers_cache

# Копирование и установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Предзагрузка Silero VAD модели (чтобы не загружать при каждом запуске)
RUN python -c "import torch; torch.hub.load(repo_or_dir='snakers4/silero-vad', model='silero_vad', force_reload=False, onnx=False, trust_repo=True)" || true

# Копирование приложения
COPY . .

RUN chown -R audio_user:audio_user /app

EXPOSE 7860

USER audio_user

# Запуск uvicorn напрямую для лучшей производительности
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
