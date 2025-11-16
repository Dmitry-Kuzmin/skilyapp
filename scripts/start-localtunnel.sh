#!/bin/bash

# Скрипт для запуска Localtunnel для локальной разработки Telegram Web App
# Использование: ./scripts/start-localtunnel.sh

set -e

PORT=${1:-8080}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-""}

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
if ! command -v lt &> /dev/null && ! command -v npx &> /dev/null; then
    echo "❌ localtunnel не установлен"
    echo "💡 Установите: npm install -g localtunnel"
    echo "   Или используйте через npx (автоматически установится)"
    exit 1
fi

echo "🌐 Запуск Localtunnel..."
echo ""

# Используем npx для запуска localtunnel (установится автоматически если нужно)
if command -v lt &> /dev/null; then
    LT_CMD="lt"
else
    LT_CMD="npx localtunnel"
fi

# Запускаем localtunnel
$LT_CMD --port $PORT 2>&1 | while IFS= read -r line; do
    # Ищем строку с URL
    if [[ $line == *"https://"*".loca.lt"* ]] || [[ $line == *"your url is:"* ]]; then
        TUNNEL_URL=$(echo "$line" | grep -oE 'https://[a-zA-Z0-9-]+\.loca\.lt' | head -1)
        if [ -z "$TUNNEL_URL" ]; then
            TUNNEL_URL=$(echo "$line" | grep -oE 'https://[a-zA-Z0-9-]+\.loca\.lt' | head -1)
        fi
        if [ -n "$TUNNEL_URL" ]; then
            echo ""
            echo "✅ Localtunnel запущен!"
            echo "🌐 URL: $TUNNEL_URL"
            echo ""
            echo "📱 Следующие шаги:"
            echo "1. Обновите Web App URL в BotFather:"
            echo "   /setmenubutton -> выберите бота -> укажите URL: $TUNNEL_URL"
            echo ""
            echo "2. Или используйте скрипт:"
            echo "   TELEGRAM_BOT_TOKEN=your_token node scripts/set-telegram-webapp-url.js $TUNNEL_URL"
            echo ""
            
            # Если указан токен, автоматически обновляем URL
            if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
                echo "🔄 Автоматическое обновление Web App URL..."
                node scripts/set-telegram-webapp-url.js "$TUNNEL_URL" "$TELEGRAM_BOT_TOKEN" || echo "⚠️  Не удалось обновить URL автоматически"
            fi
            
            echo ""
            echo "💡 Туннель будет работать пока вы не остановите его (Ctrl+C)"
            echo ""
        fi
    fi
    echo "$line"
done


