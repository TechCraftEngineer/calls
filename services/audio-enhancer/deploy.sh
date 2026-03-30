#!/bin/bash

# Audio Enhancer v2.0 - Скрипт для быстрого развертывания

set -e

echo "🚀 Развертывание Audio Enhancer v2.0..."

# Проверка наличия Docker и Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Пожалуйста установите Docker."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose не установлен. Пожалуйста установите Docker Compose."
    exit 1
fi

# Создание необходимых директорий
mkdir -p logs
mkdir -p tmp

# Проверка .env файла
if [ ! -f .env ]; then
    echo "📝 Создание .env файла из шаблона..."
    cp .env.example .env
    echo "⚠️  Пожалуйста отредактируйте .env файл, особенно HF_TOKEN для диаризации"
fi

# Сборка и запуск
echo "🔨 Сборка Docker образа..."
docker-compose -f docker-compose.optimized.yml build

echo "🚀 Запуск сервисов..."
docker-compose -f docker-compose.optimized.yml up -d

# Ожидание запуска
echo "⏳ Ожидание запуска сервиса..."
sleep 10

# Проверка здоровья
echo "🔍 Проверка здоровья сервиса..."
if curl -f http://localhost:7860/health &> /dev/null; then
    echo "✅ Audio Enhancer успешно запущен!"
    echo "📖 Документация API: http://localhost:7860/docs"
    echo "🏥 Health check: http://localhost:7860/health"
    echo "📊 Статус моделей: http://localhost:7860/models/status"
    echo ""
    echo "📝 Логи:"
    echo "  docker-compose -f docker-compose.optimized.yml logs -f audio-enhancer"
    echo ""
    echo "🛑 Остановка:"
    echo "  docker-compose -f docker-compose.optimized.yml down"
else
    echo "❌ Сервис не запустился корректно. Проверьте логи:"
    echo "  docker-compose -f docker-compose.optimized.yml logs audio-enhancer"
    exit 1
fi
