#!/bin/bash

# Скрипт для быстрого деплоя на Vercel
# Использование: ./deploy.sh

echo "🚀 Начинаю деплой на Vercel..."

# Проверка что vercel CLI установлен
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI не установлен!"
    echo "Установи через: npm install -g vercel"
    exit 1
fi

# Проверка что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ package.json не найден. Запусти скрипт из корня проекта!"
    exit 1
fi

# Деплой в production
echo "📦 Деплою в production..."
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo "✅ Деплой успешно завершён!"
else
    echo "❌ Ошибка при деплое!"
    echo "💡 Если ошибка 'Not logged in' - выполни: vercel login"
    echo "💡 Если ошибка 'Project not found' - выполни: vercel link"
    exit 1
fi

