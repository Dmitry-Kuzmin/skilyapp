#!/bin/bash
echo "🧹 Очистка кэша Cursor..."

# Остановить Cursor если запущен
pkill -f "Cursor.app" 2>/dev/null
sleep 2

# Очистить кэш Cursor
echo "📦 Очистка кэша Cursor (9.6GB)..."
rm -rf ~/Library/Application\ Support/Cursor/Cache/* 2>/dev/null
rm -rf ~/Library/Application\ Support/Cursor/CachedData/* 2>/dev/null
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache/* 2>/dev/null
rm -rf ~/Library/Application\ Support/Cursor/GPUCache/* 2>/dev/null
rm -rf ~/Library/Caches/com.todesktop.230313mzl4w4u92/* 2>/dev/null

# Очистить кэш TypeScript
echo "📝 Очистка кэша TypeScript..."
rm -rf ~/Library/Caches/typescript/* 2>/dev/null

# Очистить кэш проекта
echo "🗂️  Очистка кэша проекта..."
cd "$(dirname "$0")"
rm -rf node_modules/.vite 2>/dev/null
rm -rf .vite 2>/dev/null
rm -rf dist 2>/dev/null
find . -name "*.tsbuildinfo" -delete 2>/dev/null

echo ""
echo "✅ Кэш очищен!"
echo ""
echo "⚠️  ВАЖНО: Перезагрузите Mac для полной очистки памяти!"
