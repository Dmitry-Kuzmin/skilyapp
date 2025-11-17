#!/bin/bash

# Скрипт для автоматического запуска dev-сервера и Cloudflare Tunnel
# Использование: ./scripts/start-dev-with-tunnel.sh

set -e

PORT=${1:-8080}
TUNNEL_LOG="/tmp/cloudflared-tunnel.log"

echo "🚀 Запуск dev-сервера и Cloudflare Tunnel"
echo "=========================================="
echo ""

# Останавливаем старые процессы
echo "1️⃣  Остановка старых процессов..."
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1
echo "✅ Старые процессы остановлены"
echo ""

# Запускаем dev-сервер
echo "2️⃣  Запуск dev-сервера на порту $PORT..."
npm run dev > /dev/null 2>&1 &
DEV_PID=$!
echo "✅ Dev-сервер запущен (PID: $DEV_PID)"
echo ""

# Ждем запуска dev-сервера
echo "⏳ Ожидание запуска dev-сервера..."
for i in {1..10}; do
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ Dev-сервер готов!"
        break
    fi
    sleep 1
done
echo ""

# Запускаем Cloudflare Tunnel
echo "3️⃣  Запуск Cloudflare Tunnel..."
cloudflared tunnel --url http://localhost:$PORT > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
echo "✅ Cloudflare Tunnel запущен (PID: $TUNNEL_PID)"
echo ""

# Ждем получения URL туннеля
echo "⏳ Ожидание публичного URL туннеля..."
for i in {1..15}; do
    TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then
        echo ""
        echo "✅ Cloudflare Tunnel готов!"
        echo ""
        echo "🌐 Локальный URL: http://localhost:$PORT"
        echo "🌐 Публичный URL: $TUNNEL_URL"
        echo ""
        echo "📱 Для Telegram Web App:"
        echo "   TELEGRAM_BOT_TOKEN=your_token node scripts/set-telegram-webapp-url.js $TUNNEL_URL"
        echo ""
        echo "💡 Для остановки нажмите Ctrl+C или выполните:"
        echo "   kill $DEV_PID $TUNNEL_PID"
        echo ""
        exit 0
    fi
    sleep 1
done

echo "⚠️  Не удалось получить URL туннеля за 15 секунд"
echo "💡 Проверьте логи: tail -f $TUNNEL_LOG"
echo ""
echo "🌐 Локальный URL: http://localhost:$PORT"
echo ""

