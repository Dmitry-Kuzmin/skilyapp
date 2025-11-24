#!/bin/bash
# Установка автоматической очистки каждый час

SCRIPT_DIR="/Users/dimka/Desktop/Sdadim/sdadim-dgt-prep"
PLIST_NAME="com.dimka.cursor-cleanup.plist"
PLIST_SOURCE="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "🔧 Установка автоматической очистки Cursor..."

# 1. Проверить существование скрипта
if [ ! -f "$SCRIPT_DIR/auto-cleanup-hourly.sh" ]; then
    echo "❌ Ошибка: скрипт auto-cleanup-hourly.sh не найден!"
    exit 1
fi

# 2. Остановить старую задачу если существует
if [ -f "$PLIST_DEST" ]; then
    echo "⏹️  Остановка существующей задачи..."
    launchctl unload "$PLIST_DEST" 2>/dev/null
    rm -f "$PLIST_DEST"
fi

# 3. Копировать plist файл
echo "📦 Копирование конфигурации..."
cp "$PLIST_SOURCE" "$PLIST_DEST"

# 4. Загрузить задачу
echo "🚀 Запуск автоматической очистки..."
launchctl load "$PLIST_DEST"

# 5. Проверить статус
sleep 1
if launchctl list | grep -q "com.dimka.cursor-cleanup"; then
    echo "✅ Автоматическая очистка установлена и запущена!"
    echo ""
    echo "📋 Информация:"
    echo "   - Очистка запускается каждый час"
    echo "   - Логи: ~/Library/Logs/cursor-auto-cleanup.log"
    echo "   - Ошибки: ~/Library/Logs/cursor-auto-cleanup.error.log"
    echo ""
    echo "🛠️  Управление:"
    echo "   Остановить: launchctl unload ~/Library/LaunchAgents/$PLIST_NAME"
    echo "   Запустить:   launchctl load ~/Library/LaunchAgents/$PLIST_NAME"
    echo "   Статус:      launchctl list | grep cursor-cleanup"
    echo "   Удалить:     ./uninstall-auto-cleanup.sh"
else
    echo "❌ Ошибка: не удалось запустить задачу"
    exit 1
fi

