FROM python:3.11-slim

# Установка переменных окружения для HF Spaces
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    JOBS_DIR=/home/user/app/temp/jobs \
    AUDIO_ENHANCER_URL=""

# Создание пользователя для HF Spaces
RUN useradd -m -u 1000 user

WORKDIR $HOME/app

# Установка системных зависимостей
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Обновление pip
RUN pip install --upgrade pip setuptools wheel

# Копирование и установка зависимостей Python
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Ревизия GigaAM (tag/branch/commit) передается как build-arg.
ARG GIGAAM_REV=main

# Установка GigaAM из GitHub репозитория (фиксированная ревизия)
RUN git clone https://github.com/salute-developers/GigaAM.git /tmp/GigaAM && \
    cd /tmp/GigaAM && \
    git checkout "$GIGAAM_REV" && \
    pip install --no-cache-dir . && \
    rm -rf /tmp/GigaAM

# Копирование исходного кода
COPY --chown=user:user . .

# Создание необходимых директорий
RUN mkdir -p temp logs && \
    mkdir -p temp/jobs && \
    chown -R user:user $HOME/app

# Переключение на пользователя
USER user

# Открытие порта для HF Spaces
EXPOSE 7860

# Настройка health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7860/api/health || exit 1

# Запуск приложения через main.py для HF Spaces
CMD ["python", "main.py"]
