FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py
RUN adduser --disabled-password --gecos "" --home /home/appuser --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appuser /app

EXPOSE 7861

USER appuser

CMD ["python", "app.py"]
