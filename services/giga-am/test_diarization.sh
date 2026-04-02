#!/bin/bash

# Скрипт для тестирования диаризации
# Версия: 3.0 (Pyannote Diarization → GigaAM ASR, SOTA 2024-2026)

AUDIO_FILE="${1:-test_demo.mp3}"
API_URL="${2:-https://vnggncb-giga-am.hf.space}"
PROXY="${3:-127.0.0.1:2080}"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Тестирование Speaker Diarization v3.0              ║"
echo "║      Pyannote Diarization → GigaAM ASR (SOTA 2024-2026)    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ ! -f "$AUDIO_FILE" ]; then
    echo "❌ Ошибка: Файл $AUDIO_FILE не найден"
    echo "Использование: $0 <audio_file> [api_url] [proxy]"
    exit 1
fi

echo "📁 Файл: $AUDIO_FILE"
echo "🌐 API: $API_URL"
echo "🔌 Прокси: $PROXY"
echo ""

# Проверка доступности jq
if ! command -v jq &> /dev/null; then
    echo "⚠️  Предупреждение: jq не установлен. Вывод будет в сыром JSON формате."
    echo "   Установите jq для красивого форматирования: https://stedolan.github.io/jq/"
    echo ""
    USE_JQ=false
else
    USE_JQ=true
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎤 Транскрипция с диаризацией"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\n%{http_code}" -x "$PROXY" -X POST "$API_URL/api/transcribe" \
  -F "file=@$AUDIO_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Ошибка: HTTP $HTTP_CODE"
    echo "$BODY"
else
    if [ "$USE_JQ" = true ]; then
        echo "=== Результат ==="
        echo "$BODY" | jq -r '
            "Success: \(.success)",
            "Pipeline: \(.pipeline)",
            "Total Segments: \(.segments | length)",
            "Unique Speakers: \([.segments[].speaker] | unique | length)",
            "Speakers: \([.segments[].speaker] | unique | join(", "))",
            "Total Duration: \(.total_duration // "N/A")s"'
        
        echo ""
        echo "=== Timeline по спикерам ==="
        echo "$BODY" | jq -r '.speaker_timeline[]? | 
            "\(.speaker): \(.start)s - \(.end)s (\(.end - .start | floor)s)",
            "  Text: \(.text[:80])\(if (.text | length) > 80 then "..." else "" end)",
            ""'
        
        echo ""
        echo "=== Статистика ==="
        TOTAL_SPEAKERS=$(echo "$BODY" | jq '[.segments[].speaker] | unique | length')
        if [ "$TOTAL_SPEAKERS" -eq 1 ]; then
            echo "⚠️  Обнаружен только 1 спикер"
            echo ""
            echo "Возможные причины:"
            echo "  1. В аудио действительно один человек"
            echo "  2. Pyannote не загружен (проверьте HF_TOKEN)"
            echo "  3. Низкое качество аудио (< 16kHz)"
        else
            echo "✅ Обнаружено спикеров: $TOTAL_SPEAKERS"
            
            # Показываем статистику по каждому спикеру
            for speaker in $(echo "$BODY" | jq -r '[.segments[].speaker] | unique | .[]'); do
                COUNT=$(echo "$BODY" | jq "[.segments[] | select(.speaker == \"$speaker\")] | length")
                DURATION=$(echo "$BODY" | jq "[.segments[] | select(.speaker == \"$speaker\") | (.end - .start)] | add")
                echo "  $speaker: $COUNT сегментов, ${DURATION}s"
            done
        fi
    else
        echo "$BODY"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Рекомендации"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Для лучшего качества диаризации:"
echo ""
echo "1. Настройте Pyannote (обязательно):"
echo "   export HF_TOKEN=your_token_here"
echo "   # Получите токен: https://huggingface.co/settings/tokens"
echo "   # Примите условия: https://huggingface.co/pyannote/speaker-diarization-3.1"
echo ""
echo "2. Качество аудио:"
echo "   - Минимум 16kHz sample rate (автоматический апсемплинг включен)"
echo "   - Чистое аудио без шума и эха"
echo "   - Явно разные голоса (мужской/женский, разные возраста)"
echo ""
echo "3. Укажите количество спикеров (если известно):"
echo "   export DIARIZATION_NUM_SPEAKERS=2"
echo "   # Или диапазон:"
echo "   export DIARIZATION_MIN_SPEAKERS=2"
echo "   export DIARIZATION_MAX_SPEAKERS=4"
echo ""
echo "🔄 После изменений перезапустите сервис:"
echo "   docker-compose restart giga-am"
echo ""
echo "📚 Документация:"
echo "   services/giga-am/DIARIZATION_PIPELINE.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Тестирование завершено"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Нажмите Enter для выхода..."
read -r
