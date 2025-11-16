#!/bin/bash

# Скрипт для автоматического запуска dev сервера и Cloudflare Tunnel
# Использование: ./scripts/dev-telegram.sh

set -e

PORT=8080
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-""}

echo "🚀 Запуск локальной разработки для Telegram Web App"
echo "===================================================="
echo ""

# Проверяем наличие cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared не установлен"
    echo "💡 Установите: brew install cloudflare/cloudflare/cloudflared"
    exit 1
fi

# Функция для очистки при выходе
cleanup() {
    echo ""
    echo "🛑 Остановка процессов..."
    kill $DEV_PID $TUNNEL_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# Запускаем dev сервер в фоне
echo "📦 Запуск dev сервера на порту $PORT..."
npm run dev > /tmp/vite-dev.log 2>&1 &
DEV_PID=$!

# Ждём запуска сервера
echo "⏳ Ожидание запуска сервера..."
sleep 5

# Проверяем, что сервер запустился
if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Не удалось запустить dev сервер"
    cat /tmp/vite-dev.log
    exit 1
fi

echo "✅ Dev сервер запущен"
echo ""

# Запускаем Cloudflare Tunnel
echo "🌐 Запуск Cloudflare Tunnel..."
echo ""

# Используем named pipe для получения URL от cloudflared
TUNNEL_LOG="/tmp/cloudflared-tunnel.log"
cloudflared tunnel --url http://localhost:$PORT > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Ждём получения URL (проверяем несколько раз)
echo "⏳ Ожидание получения Cloudflare Tunnel URL..."
TUNNEL_URL=""
for i in {1..10}; do
    sleep 2
    TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
done

if [ -z "$TUNNEL_URL" ]; then
    echo "⚠️  Не удалось получить URL из логов, проверяем вручную..."
    echo "Последние строки лога:"
    tail -20 "$TUNNEL_LOG" 2>/dev/null || echo "Лог пуст"
    echo ""
    echo "💡 Попробуйте запустить tunnel отдельно:"
    echo "   ./scripts/start-cloudflare-tunnel.sh"
    echo ""
    echo "Или проверьте URL вручную в выводе cloudflared выше"
    # Не выходим, продолжаем работу - пользователь может увидеть URL в выводе
fi

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "✅ Cloudflare Tunnel запущен!"
    echo "🌐 URL: $TUNNEL_URL"
    echo ""
    echo "📱 Обновление Web App URL в Telegram Bot..."

    # Обновляем Web App URL если указан токен
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        node scripts/set-telegram-webapp-url.js "$TUNNEL_URL" "$TELEGRAM_BOT_TOKEN" || {
            echo "⚠️  Не удалось обновить URL автоматически"
            echo "💡 Обновите вручную через BotFather или используйте:"
            echo "   TELEGRAM_BOT_TOKEN=your_token node scripts/set-telegram-webapp-url.js $TUNNEL_URL"
        }
    else
        echo "💡 Для автоматического обновления URL установите:"
        echo "   export TELEGRAM_BOT_TOKEN=your_token"
        echo ""
        echo "Или обновите вручную через BotFather:"
        echo "   /setmenubutton -> выберите бота -> укажите URL: $TUNNEL_URL"
    fi
else
    echo ""
    echo "⚠️  URL не получен автоматически"
    echo "💡 Найдите URL в выводе cloudflared выше (строка с https://...trycloudflare.com)"
    echo "💡 Затем обновите вручную через BotFather или скрипт"
fi

echo ""
echo "===================================================="
echo "✅ Всё готово!"
echo ""
echo "📱 Откройте бота в Telegram и нажмите кнопку меню"
echo "🌐 Локальный URL: http://localhost:$PORT"
echo "🌐 Публичный URL: $TUNNEL_URL"
echo ""
echo "💡 Для остановки нажмите Ctrl+C"
echo "===================================================="
echo ""

# Показываем логи cloudflared в реальном времени
tail -f "$TUNNEL_LOG" &
TAIL_PID=$!

# Ждём завершения
wait $TUNNEL_PID

