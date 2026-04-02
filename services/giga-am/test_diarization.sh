#!/bin/bash

# Скрипт для тестирования диаризации с разными параметрами

AUDIO_FILE="${1:-test_demo.mp3}"
API_URL="${2:-https://vnggncb-giga-am.hf.space}"

if [ ! -f "$AUDIO_FILE" ]; then
    echo "Ошибка: Файл $AUDIO_FILE не найден"
    echo "Использование: $0 <audio_file> [api_url]"
    exit 1
fi

echo "=== Тестирование диаризации ==="
echo "Файл: $AUDIO_FILE"
echo "API: $API_URL"
echo ""

# Проверка доступности jq
if ! command -v jq &> /dev/null; then
    echo "Предупреждение: jq не установлен. Вывод будет в сыром JSON формате."
    echo "Установите jq для красивого форматирования: https://stedolan.github.io/jq/"
    echo ""
    USE_JQ=false
else
    USE_JQ=true
fi

# 1. Диагностика эмбеддингов
echo "1. Диагностика эмбеддингов..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/debug-embeddings" \
  -F "file=@$AUDIO_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo "Ошибка: HTTP $HTTP_CODE"
    echo "$BODY"
else
    if [ "$USE_JQ" = true ]; then
        echo "$BODY" | jq '{
            segments_count,
            valid_embeddings,
            statistics,
            recommendations
        }'
    else
        echo "$BODY"
    fi
fi

echo ""
echo "2. Полная транскрипция с текущими параметрами..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/transcribe" \
  -F "file=@$AUDIO_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo "Ошибка: HTTP $HTTP_CODE"
    echo "$BODY"
else
    if [ "$USE_JQ" = true ]; then
        echo "$BODY" | jq '{
            success,
            segments: .segments | length,
            speakers: [.segments[].speaker] | unique,
            speaker_timeline
        }'
    else
        echo "$BODY"
    fi
fi

echo ""
echo "=== Рекомендации ==="
echo "Если все сегменты получили SPEAKER_01:"
echo "1. Проверьте pyannote_loaded в диагностике"
echo "2. Проверьте avg_cosine_distance:"
echo "   - Если < 0.2: export CLUSTERING_BASE_THRESHOLD=0.30"
echo "   - Если 0.2-0.3: export CLUSTERING_BASE_THRESHOLD=0.35"
echo "   - Если > 0.5: export CLUSTERING_BASE_THRESHOLD=0.45"
echo "3. Перезапустите сервис и повторите тест"
echo ""
echo "Нажмите любую клавишу для выхода..."
read -n 1 -s
