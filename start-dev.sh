#!/bin/bash

# Быстрый запуск dev сервера для локальной разработки
# Использование: ./start-dev.sh

cd "$(dirname "$0")"

echo "🚀 Запуск dev сервера..."
echo "📁 Директория: $(pwd)"
echo ""

# Проверяем, установлены ли зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
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

echo "✅ Запуск сервера на http://localhost:8080"
echo "📱 Приложение будет доступно с моком Telegram WebApp"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

npm run dev

