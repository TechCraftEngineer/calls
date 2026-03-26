#!/bin/bash

# Пример использования API через curl

# URL вашего Hugging Face Space
API_URL="https://vnggncb-giga-am.hf.space"

# 1. Проверка работоспособности
echo "1. Проверка статуса API..."
curl -X GET "$API_URL/api/health"
echo -e "\n"

# 2. Информация о приложении
echo "2. Информация о приложении..."
curl -X GET "$API_URL/api/info"
echo -e "\n"

# 3. Отправка аудиофайла для распознавания
echo "3. Отправка аудиофайла..."
curl -X POST "$API_URL/api/transcribe" \
  -F "file=@audio.mp3" \
  -H "accept: application/json"
echo -e "\n"

# Пример с указанием типа файла
# curl -X POST "$API_URL/api/transcribe" \
#   -F "file=@audio.wav;type=audio/wav" \
#   -H "accept: application/json"
