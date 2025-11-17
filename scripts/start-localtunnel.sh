#!/bin/bash

# Скрипт для запуска Localtunnel (более короткие URL чем Cloudflare)
# Использование: ./scripts/start-localtunnel.sh [subdomain]
# Пример: ./scripts/start-localtunnel.sh myapp

set -e

PORT=${1:-8080}
SUBDOMAIN=${2:-""}
TUNNEL_LOG="/tmp/localtunnel.log"

echo "🚀 Запуск Localtunnel для локальной разработки"
echo "================================================"
echo "📍 Порт: $PORT"
echo ""

# Проверяем, запущен ли dev сервер
if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Dev сервер не запущен на порту $PORT"
    echo "💡 Запустите в другом терминале: npm run dev"
    echo ""
    read -p "Продолжить всё равно? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Проверяем наличие localtunnel
if ! command -v lt &> /dev/null && ! command -v localtunnel &> /dev/null; then
    echo "📦 Localtunnel не установлен"
    echo "💡 Устанавливаю через npm..."
    npm install -g localtunnel
    echo ""
fi

# Останавливаем старые процессы
pkill -f "lt --port" 2>/dev/null || true
pkill -f "localtunnel --port" 2>/dev/null || true
sleep 1

# Запускаем localtunnel
echo "🌐 Запуск Localtunnel..."
echo ""

if [ -n "$SUBDOMAIN" ]; then
    echo "📝 Использование поддомена: $SUBDOMAIN"
    lt --port $PORT --subdomain $SUBDOMAIN > "$TUNNEL_LOG" 2>&1 &
else
    echo "📝 Генерация случайного поддомена..."
    lt --port $PORT > "$TUNNEL_LOG" 2>&1 &
fi

TUNNEL_PID=$!
echo "✅ Localtunnel запущен (PID: $TUNNEL_PID)"
echo ""

# Ждем получения URL
echo "⏳ Ожидание публичного URL..."
for i in {1..10}; do
    TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.loca\.lt' "$TUNNEL_LOG" 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then
        echo ""
        echo "✅ Localtunnel готов!"
        echo ""
        echo "🌐 Локальный URL: http://localhost:$PORT"
        echo "🌐 Публичный URL: $TUNNEL_URL"
        echo ""
        echo "📱 Для Telegram Web App:"
        echo "   TELEGRAM_BOT_TOKEN=your_token node scripts/set-telegram-webapp-url.js $TUNNEL_URL"
        echo ""
        echo "💡 Для остановки нажмите Ctrl+C или выполните:"
        echo "   kill $TUNNEL_PID"
        echo ""
        exit 0
    fi
    sleep 1
done

echo "⚠️  Не удалось получить URL за 10 секунд"
echo "💡 Проверьте логи: tail -f $TUNNEL_LOG"
echo ""

