#!/bin/bash

# Скрипт для одноразовой очистки больших файлов Cursor
# ВНИМАНИЕ: Этот скрипт удаляет данные, которые могут быть восстановлены только частично

CURSOR_USER_DATA="$HOME/Library/Application Support/Cursor/User"

echo "=== Очистка больших файлов Cursor ==="
echo ""

# Проверяем, не запущен ли Cursor
if pgrep -f "Cursor.app" > /dev/null; then
    echo "⚠️  ВНИМАНИЕ: Cursor запущен!"
    echo "Рекомендуется закрыть Cursor перед очисткой."
    echo ""
    echo "💡 Подсказка: введите 'y' (латиница) для продолжения или 'N' для отмены"
    read -p "Продолжить? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Отменено. Для безопасной очистки только скриншотов используйте:"
        echo "   ./scripts/cleanup-screenshots.sh"
        exit 1
    fi
fi

# 1. Удаление backup базы данных (безопасно)
BACKUP_DB="$CURSOR_USER_DATA/globalStorage/state.vscdb.backup"
if [ -f "$BACKUP_DB" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DB" | cut -f1)
    echo "1. Удаление backup базы данных (${BACKUP_SIZE})..."
    rm -f "$BACKUP_DB" 2>/dev/null
    echo "   ✓ Удалено"
else
    echo "1. Backup базы данных не найден"
fi

# 2. Очистка старой истории (> 30 дней)
HISTORY_DIR="$CURSOR_USER_DATA/History"
if [ -d "$HISTORY_DIR" ]; then
    echo "2. Очистка старой истории (> 30 дней)..."
    OLD_FILES=$(find "$HISTORY_DIR" -type f -mtime +30 | wc -l | tr -d ' ')
    find "$HISTORY_DIR" -type f -mtime +30 -delete 2>/dev/null
    echo "   ✓ Удалено файлов: ${OLD_FILES}"
else
    echo "2. История не найдена"
fi

# 3. Очистка старых workspaceStorage (> 30 дней)
WORKSPACE_STORAGE="$CURSOR_USER_DATA/workspaceStorage"
if [ -d "$WORKSPACE_STORAGE" ]; then
    echo "3. Очистка старых рабочих областей (> 30 дней)..."
    OLD_WORKSPACES=$(find "$WORKSPACE_STORAGE" -mindepth 1 -maxdepth 1 -type d -mtime +30 | wc -l | tr -d ' ')
    if [ "$OLD_WORKSPACES" -gt 0 ]; then
        find "$WORKSPACE_STORAGE" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null
        echo "   ✓ Удалено рабочих областей: ${OLD_WORKSPACES}"
    else
        echo "   ✓ Старые рабочие области не найдены"
    fi
    
    # Очистка старых скриншотов (> 14 дней)
    echo "3.1. Очистка старых скриншотов (> 14 дней)..."
    TOTAL_IMAGES=0
    DELETED_IMAGES=0
    for IMAGES_DIR in "$WORKSPACE_STORAGE"/*/images; do
        if [ -d "$IMAGES_DIR" ]; then
            COUNT=$(find "$IMAGES_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
            TOTAL_IMAGES=$((TOTAL_IMAGES + COUNT))
            OLD_COUNT=$(find "$IMAGES_DIR" -type f -mtime +14 2>/dev/null | wc -l | tr -d ' ')
            if [ "$OLD_COUNT" -gt 0 ]; then
                find "$IMAGES_DIR" -type f -mtime +14 -delete 2>/dev/null
                DELETED_IMAGES=$((DELETED_IMAGES + OLD_COUNT))
            fi
        fi
    done
    echo "   Всего скриншотов: ${TOTAL_IMAGES}"
    if [ "$DELETED_IMAGES" -gt 0 ]; then
        echo "   ✓ Удалено старых скриншотов: ${DELETED_IMAGES}"
    else
        echo "   ✓ Старые скриншоты не найдены"
    fi
else
    echo "3. WorkspaceStorage не найдена"
fi

# 4. ОПЦИОНАЛЬНО: Удаление основной базы данных (восстановится частично)
MAIN_DB="$CURSOR_USER_DATA/globalStorage/state.vscdb"
if [ -f "$MAIN_DB" ]; then
    DB_SIZE=$(du -h "$MAIN_DB" | cut -f1)
    echo ""
    echo "4. ОСНОВНАЯ БАЗА ДАННЫХ обнаружена: ${DB_SIZE}"
    echo "   ⚠️  ВНИМАНИЕ: Это удалит некоторые настройки и историю!"
    echo "   Файл пересоздастся, но некоторые данные будут потеряны."
    read -p "   Удалить основную базу данных? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Делаем резервную копию на всякий случай
        cp "$MAIN_DB" "${MAIN_DB}.old.$(date +%Y%m%d_%H%M%S)" 2>/dev/null
        rm -f "$MAIN_DB" 2>/dev/null
        echo "   ✓ База данных удалена (резервная копия сохранена)"
    else
        echo "   ✗ Пропущено"
    fi
fi

# 5. Проверка результата
echo ""
echo "=== Проверка результатов ==="
TOTAL_SIZE=$(du -sh "$CURSOR_USER_DATA" 2>/dev/null | cut -f1)
echo "Общий размер данных Cursor: ${TOTAL_SIZE}"
echo ""
echo "✅ Очистка завершена!"
echo ""
echo "💡 Рекомендации:"
echo "   - Перезапусти Cursor для применения изменений"
echo "   - Если база данных все еще большая, рассмотри возможность"
echo "     полного удаления state.vscdb (с потерей некоторых настроек)"

