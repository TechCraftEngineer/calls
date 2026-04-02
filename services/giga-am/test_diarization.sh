#!/bin/bash

# Скрипт для тестирования диаризации с разными параметрами
# Версия: 2.0 (обновлено для 512-мерных эмбеддингов)

AUDIO_FILE="${1:-test_demo.mp3}"
API_URL="${2:-https://vnggncb-giga-am.hf.space}"
PROXY="${3:-127.0.0.1:2080}"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Тестирование Speaker Diarization v2.0              ║"
echo "║    (512-dim pyannote embeddings + acoustic features)       ║"
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

# 1. Диагностика эмбеддингов
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Шаг 1: Диагностика эмбеддингов"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\n%{http_code}" -x "$PROXY" -X POST "$API_URL/api/debug-embeddings" \
  -F "file=@$AUDIO_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo "Ошибка: HTTP $HTTP_CODE"
    echo "$BODY"
else
    if [ "$USE_JQ" = true ]; then
        echo "=== Качество аудио ==="
        echo "$BODY" | jq -r '.audio_quality | 
            "Sample Rate: \(.original_sample_rate)Hz → \(.processed_sample_rate)Hz",
            "Quality: \(.quality)",
            "Auto Resample: \(.auto_resample_enabled)",
            "Was Resampled: \(.was_resampled)",
            "Recommendation: \(.recommendation)"'
        
        echo ""
        echo "=== Статистика эмбеддингов ==="
        echo "$BODY" | jq -r '.statistics | 
            "Pyannote Loaded: \(.pyannote_loaded)",
            "Remote URL: \(.remote_url)",
            "Avg Embedding Norm: \(.avg_embedding_norm)",
            "Avg Cosine Distance: \(.avg_cosine_distance)",
            "Clustering Threshold: \(.clustering_threshold)"'
        
        echo ""
        echo "=== Результаты ==="
        echo "$BODY" | jq '{
            segments_count,
            valid_embeddings,
            recommendations
        }'
    else
        echo "$BODY"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎤 Шаг 2: Полная транскрипция с диаризацией"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\n%{http_code}" -x "$PROXY" -X POST "$API_URL/api/transcribe" \
  -F "file=@$AUDIO_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo "Ошибка: HTTP $HTTP_CODE"
    echo "$BODY"
else
    if [ "$USE_JQ" = true ]; then
        echo "=== Результат транскрипции ==="
        echo "$BODY" | jq -r '
            "Success: \(.success)",
            "Total Segments: \(.segments | length)",
            "Unique Speakers: \([.segments[].speaker] | unique | length)",
            "Speakers: \([.segments[].speaker] | unique | join(", "))",
            "Processing Time: \(.processing_time // "N/A")s",
            "Cached: \(.cached // false)"'
        
        echo ""
        echo "=== Timeline по спикерам ==="
        echo "$BODY" | jq -r '.speaker_timeline[] | 
            "\(.speaker): \(.start)s - \(.end)s (\(.end - .start | floor)s)",
            "  Text: \(.text[:80])\(if (.text | length) > 80 then "..." else "" end)",
            ""'
        
        echo ""
        echo "=== Статистика ==="
        TOTAL_SPEAKERS=$(echo "$BODY" | jq '[.segments[].speaker] | unique | length')
        if [ "$TOTAL_SPEAKERS" -eq 1 ]; then
            echo "⚠️  Обнаружен только 1 спикер"
            echo "Возможные причины:"
            echo "  - В аудио действительно один человек"
            echo "  - Эмбеддинги идентичны (проверьте диагностику выше)"
            echo "  - Низкое качество аудио"
        else
            echo "✅ Обнаружено спикеров: $TOTAL_SPEAKERS"
        fi
    else
        echo "$BODY"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Анализ результатов и рекомендации"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Проверьте диагностику:"
echo "1. pyannote_loaded: должно быть true"
echo "2. remote_url: должен быть настроен или пустой"
echo "3. avg_cosine_distance:"
echo "   - < 0.01: ❌ ПРОБЛЕМА - эмбеддинги идентичны (проверьте модель)"
echo "   - 0.01-0.20: ⚠️  Очень похожие голоса (возможно один спикер)"
echo "   - 0.20-0.40: ✅ Хорошее различие (2+ спикера)"
echo "   - > 0.40: ✅ Отличное различие (явно разные голоса)"
echo ""
echo "Если все сегменты получили SPEAKER_01:"
echo ""
echo "📌 Вариант 1: В аудио действительно один спикер"
echo "  → Это нормально, попробуйте другое аудио с разными голосами"
echo ""
echo "📌 Вариант 2: Эмбеддинги идентичны (avg_distance < 0.01)"
echo "  → Проверьте что pyannote_loaded=true"
echo "  → Проверьте что используется полная размерность (512, не 192)"
echo "  → Перезапустите speaker-embeddings сервис"
echo ""
echo "📌 Вариант 3: Низкое качество аудио"
echo "  → Проверьте sample_rate в audio_quality"
echo "  → Должен быть >= 16000 Hz (или auto_resample_enabled=true)"
echo ""
echo "⚙️  Настройка порога кластеризации:"
echo "  - Если avg_distance 0.20-0.30: export CLUSTERING_BASE_THRESHOLD=0.25"
echo "  - Если avg_distance 0.30-0.40: export CLUSTERING_BASE_THRESHOLD=0.30 (по умолчанию)"
echo "  - Если avg_distance > 0.40: export CLUSTERING_BASE_THRESHOLD=0.35"
echo ""
echo "🔄 После изменений перезапустите сервис:"
echo "  docker-compose restart giga-am"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Тестирование завершено"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Нажмите Enter для выхода..."
read -r
