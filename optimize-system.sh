#!/bin/bash
# Скрипт для оптимизации системы при работе с проектом

echo "🔧 Оптимизация системы для работы с проектом..."

# 1. Остановить все dev server'ы
echo "📦 Остановка всех dev server'ов..."
pkill -f "vite" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
sleep 2

# 2. Очистить кэш Vite
echo "🧹 Очистка кэша Vite..."
cd "$(dirname "$0")"
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist

# 3. Удалить .DS_Store файлы
echo "🗑️  Удаление .DS_Store файлов..."
find . -name ".DS_Store" -delete 2>/dev/null

# 4. Очистить кэш TypeScript (если есть)
echo "📝 Очистка кэша TypeScript..."
rm -rf node_modules/.cache 2>/dev/null

# 5. Проверить использование памяти
echo ""
echo "📊 Текущее использование памяти:"
ps aux | grep -E "(Cursor|node|vite)" | grep -v grep | awk '{sum+=$6} END {print "Всего памяти: " sum/1024 " MB"}'

# 6. Проверить Load Average
echo ""
echo "⚡ Load Average:"
uptime | awk -F'load averages:' '{print $2}'

echo ""
echo "✅ Оптимизация завершена!"
echo ""
echo "💡 Рекомендации:"
echo "   - Закройте один из редакторов (Cursor или Antigravity)"
echo "   - Перезапустите dev server: npm run dev"
echo "   - Если проблемы продолжаются, перезагрузите Mac"

