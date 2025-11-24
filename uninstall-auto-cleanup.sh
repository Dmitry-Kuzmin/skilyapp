#!/bin/bash
# Удаление автоматической очистки

PLIST_NAME="com.dimka.cursor-cleanup.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "🗑️  Удаление автоматической очистки Cursor..."

if [ -f "$PLIST_DEST" ]; then
    # Остановить задачу
    launchctl unload "$PLIST_DEST" 2>/dev/null
    
    # Удалить plist файл
    rm -f "$PLIST_DEST"
    
    echo "✅ Автоматическая очистка удалена"
else
    echo "ℹ️  Автоматическая очистка не установлена"
fi

