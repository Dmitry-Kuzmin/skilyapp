#!/bin/bash

# Скрипт для запуска Cloudflare Tunnel с сохранением URL в файл
# Использование: ./scripts/start-tunnel-with-persistent-url.sh

set -e

PORT=${1:-8080}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-""}
URL_FILE="/tmp/cloudflare-tunnel-url.txt"

echo "🚀 Запуск Cloudflare Tunnel с сохранением URL"
echo "=============================================="
echo "📍 Порт: $PORT"
echo "📄 URL будет сохранён в: $URL_FILE"
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

# Очищаем старый URL файл
rm -f "$URL_FILE"

# Запускаем cloudflared tunnel
echo "🌐 Запуск Cloudflare Tunnel..."
echo ""

cloudflared tunnel --url http://localhost:$PORT 2>&1 | while IFS= read -r line; do
    # Ищем строку с URL
    if [[ $line == *"https://"*".trycloudflare.com"* ]]; then
        TUNNEL_URL=$(echo "$line" | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1)
        if [ -n "$TUNNEL_URL" ]; then
            # Сохраняем URL в файл
            echo "$TUNNEL_URL" > "$URL_FILE"
            
            echo ""
            echo "✅ Cloudflare Tunnel запущен!"
            echo "🌐 URL: $TUNNEL_URL"
            echo "💾 URL сохранён в: $URL_FILE"
            echo ""
            echo "📱 Следующие шаги:"
            echo "1. Обновите Web App URL в BotFather:"
            echo "   /setmenubutton -> выберите бота -> укажите URL: $TUNNEL_URL"
            echo ""
            echo "2. Или используйте скрипт:"
            echo "   TELEGRAM_BOT_TOKEN=your_token node scripts/set-telegram-webapp-url.js $TUNNEL_URL"
            echo ""
            echo "3. Или получите URL позже:"
            echo "   cat $URL_FILE"
            echo ""
            
            # Если указан токен, автоматически обновляем URL
            if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
                echo "🔄 Автоматическое обновление Web App URL..."
                node scripts/set-telegram-webapp-url.js "$TUNNEL_URL" "$TELEGRAM_BOT_TOKEN" || echo "⚠️  Не удалось обновить URL автоматически"
                echo ""
            fi
            
            echo "💡 Туннель будет работать пока вы не остановите его (Ctrl+C)"
            echo "💡 URL меняется при каждом перезапуске tunnel"
            echo ""
        fi
    fi
    echo "$line"
done

