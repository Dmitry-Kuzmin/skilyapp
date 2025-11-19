#!/bin/bash

# Безопасная очистка только старых скриншотов (> 14 дней)
# Можно запускать без закрытия Cursor

CURSOR_USER_DATA="$HOME/Library/Application Support/Cursor/User"
WORKSPACE_STORAGE="$CURSOR_USER_DATA/workspaceStorage"

echo "=== Очистка старых скриншотов (> 14 дней) ==="
echo ""

if [ ! -d "$WORKSPACE_STORAGE" ]; then
    echo "❌ WorkspaceStorage не найдена"
    exit 1
fi

TOTAL_IMAGES=0
DELETED_IMAGES=0
TOTAL_SIZE_BEFORE=0
TOTAL_SIZE_AFTER=0

# Подсчитываем размер до очистки
if [ -d "$WORKSPACE_STORAGE" ]; then
    TOTAL_SIZE_BEFORE=$(du -sk "$WORKSPACE_STORAGE" 2>/dev/null | cut -f1)
fi

# Очищаем старые скриншоты
for IMAGES_DIR in "$WORKSPACE_STORAGE"/*/images; do
    if [ -d "$IMAGES_DIR" ]; then
        COUNT=$(find "$IMAGES_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
        TOTAL_IMAGES=$((TOTAL_IMAGES + COUNT))
        
        OLD_COUNT=$(find "$IMAGES_DIR" -type f -mtime +14 2>/dev/null | wc -l | tr -d ' ')
        if [ "$OLD_COUNT" -gt 0 ]; then
            # Подсчитываем размер удаляемых файлов
            OLD_SIZE=$(find "$IMAGES_DIR" -type f -mtime +14 -exec du -sk {} + 2>/dev/null | awk '{sum+=$1} END {print sum}')
            DELETED_IMAGES=$((DELETED_IMAGES + OLD_COUNT))
            
            find "$IMAGES_DIR" -type f -mtime +14 -delete 2>/dev/null
            echo "   ✓ Удалено ${OLD_COUNT} скриншотов ($(numfmt --to=iec-i --suffix=B $((OLD_SIZE * 1024)) 2>/dev/null || echo "${OLD_SIZE}KB"))"
        fi
    fi
done

# Подсчитываем размер после очистки
if [ -d "$WORKSPACE_STORAGE" ]; then
    TOTAL_SIZE_AFTER=$(du -sk "$WORKSPACE_STORAGE" 2>/dev/null | cut -f1)
    FREED_SPACE=$((TOTAL_SIZE_BEFORE - TOTAL_SIZE_AFTER))
fi

echo ""
echo "=== Результаты ==="
echo "   Всего скриншотов: ${TOTAL_IMAGES}"
if [ "$DELETED_IMAGES" -gt 0 ]; then
    echo "   ✓ Удалено старых скриншотов: ${DELETED_IMAGES}"
    echo "   ✓ Освобождено места: $(numfmt --to=iec-i --suffix=B $((FREED_SPACE * 1024)) 2>/dev/null || echo "${FREED_SPACE}KB")"
else
    echo "   ✓ Старые скриншоты не найдены (все скриншоты младше 14 дней)"
fi

CURRENT_SIZE=$(du -sh "$WORKSPACE_STORAGE" 2>/dev/null | cut -f1)
echo "   Текущий размер workspaceStorage: ${CURRENT_SIZE}"
echo ""
echo "✅ Очистка завершена!"

