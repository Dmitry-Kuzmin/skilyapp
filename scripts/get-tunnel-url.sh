#!/bin/bash

# Скрипт для получения текущего URL Cloudflare Tunnel
# Использование: ./scripts/get-tunnel-url.sh

TUNNEL_LOG="/tmp/cloudflared-tunnel.log"

echo "🔍 Поиск URL Cloudflare Tunnel..."
echo ""

# Проверяем, запущен ли cloudflared
if ! pgrep -f "cloudflared tunnel" > /dev/null; then
    echo "❌ Cloudflare Tunnel не запущен"
    echo ""
    echo "💡 Запустите tunnel:"
    echo "   npm run tunnel:start"
    echo "   или"
    echo "   ./scripts/start-cloudflare-tunnel.sh"
    exit 1
fi

# Ищем URL в логах
TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "⚠️  URL не найден в логах"
    echo ""
    echo "💡 Попробуйте:"
    echo "1. Проверьте вывод cloudflared в терминале, где он запущен"
    echo "2. Перезапустите tunnel: npm run tunnel:start"
    exit 1
fi

echo "✅ Найден URL Cloudflare Tunnel:"
echo ""
echo "🌐 $TUNNEL_URL"
echo ""
echo "📋 Для обновления в Telegram Bot:"
echo "   TELEGRAM_BOT_TOKEN=your_token node scripts/set-telegram-webapp-url.js $TUNNEL_URL"
echo ""

