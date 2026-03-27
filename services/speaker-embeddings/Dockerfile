FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/appuser \
    TORCH_HOME=/home/appuser/.cache/torch \
    TRANSFORMERS_CACHE=/home/appuser/.cache/huggingface/transformers \
    HF_HOME=/home/appuser/.cache/huggingface

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py
RUN mkdir -p /home/appuser \
    && adduser --disabled-password --gecos "" --home /home/appuser --shell /usr/sbin/nologin appuser \
    && mkdir -p /home/appuser/.cache/torch \
    && mkdir -p /home/appuser/.cache/huggingface/transformers \
    && chown -R appuser:appuser /home/appuser /app

EXPOSE 7860

USER appuser

CMD ["python", "app.py"]
