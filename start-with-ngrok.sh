#!/bin/bash

# Скрипт для запуска dev сервера и ngrok одновременно
# Использование: ./start-with-ngrok.sh

cd "$(dirname "$0")"

echo "🚀 Запуск dev сервера и ngrok..."
echo ""

# Проверяем, установлен ли ngrok
NGROK_CMD=""
if command -v ngrok &> /dev/null; then
    NGROK_CMD="ngrok"
elif [ -f "./ngrok" ]; then
    NGROK_CMD="./ngrok"
else
    echo "❌ ngrok не найден!"
    echo ""
    echo "Установите ngrok одним из способов:"
    echo "1. Скачайте с https://ngrok.com/download и поместите в папку проекта"
    echo "2. Или установите Homebrew и выполните: brew install ngrok"
    echo ""
    exit 1
fi

# Проверяем, установлены ли зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install --legacy-peer-deps
    echo ""
fi

# Проверяем, не занят ли порт 8080
if lsof -ti:8080 > /dev/null 2>&1; then
    echo "⚠️  Порт 8080 уже занят!"
    echo "   Остановите предыдущий процесс или используйте другой порт."
    echo ""
    read -p "Остановить процесс на порту 8080? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $(lsof -ti:8080)
        echo "✅ Процесс остановлен"
        echo ""
    else
        echo "❌ Запуск отменен"
        exit 1
    fi
fi

# Запуск dev сервера в фоне
echo "📦 Запуск dev сервера на http://localhost:8080..."
npm run dev &
DEV_PID=$!

# Ждем запуска сервера
echo "⏳ Ожидание запуска сервера..."
sleep 8

# Проверяем, что сервер запустился
if ! lsof -ti:8080 > /dev/null 2>&1; then
    echo "❌ Сервер не запустился!"
    kill $DEV_PID 2>/dev/null
    exit 1
fi

echo "✅ Dev сервер запущен"
echo ""
echo "🌐 Запуск ngrok..."
echo ""
echo "📋 Скопируйте HTTPS URL из вывода ngrok ниже"
echo "📋 Затем используйте этот URL в BotFather:"
echo "   1. Откройте @BotFather в Telegram"
echo "   2. Отправьте /setmenubutton"
echo "   3. Выберите вашего бота"
echo "   4. Введите название кнопки"
echo "   5. Введите HTTPS URL из ngrok"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

# Запуск ngrok (в foreground, чтобы видеть URL)
$NGROK_CMD http 8080

# При остановке ngrok, остановим и dev сервер
echo ""
echo "🛑 Остановка dev сервера..."
kill $DEV_PID 2>/dev/null
echo "✅ Готово"

