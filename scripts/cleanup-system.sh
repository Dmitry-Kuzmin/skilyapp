#!/bin/bash

# Скрипт для очистки системы и ускорения работы MacBook
# Использование: ./scripts/cleanup-system.sh

echo "🧹 Очистка системы для ускорения работы..."
echo ""

# 1. Очистка логов проекта
echo "1️⃣  Очистка логов проекта..."
find . -name "*.log" -type f -delete 2>/dev/null
find . -name ".DS_Store" -delete 2>/dev/null
echo "✅ Логи и .DS_Store удалены"

# 2. Очистка временных файлов
echo ""
echo "2️⃣  Очистка временных файлов..."
rm -f /tmp/cloudflared-tunnel.log /tmp/*.log 2>/dev/null
echo "✅ Временные файлы очищены"

# 3. Очистка кэша npm (опционально)
echo ""
read -p "Очистить кэш npm? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm cache clean --force
    echo "✅ Кэш npm очищен"
fi

# 4. Очистка кэша Cursor workspace (ОСТОРОЖНО!)
echo ""
echo "⚠️  Кэш Cursor workspace: ~1.4GB"
read -p "Очистить кэш workspace Cursor? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf ~/Library/Application\ Support/Cursor/User/workspaceStorage/*
    echo "✅ Кэш workspace Cursor очищен (перезапустите Cursor)"
fi

# 5. Очистка кэша TypeScript
echo ""
read -p "Очистить кэш TypeScript? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf ~/Library/Caches/typescript/*
    echo "✅ Кэш TypeScript очищен"
fi

echo ""
echo "✅ Очистка завершена!"
echo ""
echo "💡 Рекомендации:"
echo "1. Перезапустите Cursor для применения изменений"
echo "2. Закройте ненужные вкладки в Cursor"
echo "3. Отключите ненужные расширения Cursor"
echo "4. Используйте .cursorignore для исключения больших папок"

