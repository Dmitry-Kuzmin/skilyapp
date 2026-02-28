#!/bin/bash

# Скрипт автоматической очистки и оптимизации для Cursor/проекта
# Запускается автоматически несколько раз в день через launchd

LOG_FILE="$HOME/Library/Logs/cursor-cleanup.log"
PROJECT_DIR="$HOME/Desktop/Sdadim/sdadim-dgt-prep"
CURSOR_LOGS="$HOME/Library/Application Support/Cursor/logs"
CURSOR_USER_DATA="$HOME/Library/Application Support/Cursor/User"
ANTIGRAVITY_LOGS="$HOME/Library/Application Support/Antigravity/logs"
ANTIGRAVITY_USER_DATA="$HOME/Library/Application Support/Antigravity/User"
MAX_LOG_SIZE=50M  # Уменьшил лимит логов


# Функция логирования
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Функция жесткого удаления процессов по имени
force_kill() {
    log "🎯 Уничтожение процессов: $1..."
    pkill -9 -f "$1" 2>/dev/null
}

log "=== Начало очистки и оптимизации ==="

# Проверка существования директории проекта
if [ ! -d "$PROJECT_DIR" ]; then
    log "ОШИБКА: Директория проекта не найдена: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1

# 1. Агрессивная остановка всего лишнего
log "1. Остановка фонового мусора..."
force_kill "vite"
force_kill "npm.*dev"
force_kill "Google Chrome Helper"
force_kill "Safari"
force_kill "com.apple.WebKit.WebContent"
log "   ✓ Сторонние процессы остановлены"

# 2. Очистка логов Cursor/Antigravity (осторожно - только старые файлы)
log "2. Очистка логов..."
for LOG_DIR in "$CURSOR_LOGS" "$ANTIGRAVITY_LOGS"; do
    if [ -d "$LOG_DIR" ]; then
        find "$LOG_DIR" -type f -name "*.log" -mtime +3 -delete 2>/dev/null
        find "$LOG_DIR" -type f -name "*.log" -size +$MAX_LOG_SIZE -exec sh -c 'tail -500 "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \; 2>/dev/null
    fi
done
log "   ✓ Логи очищены"

# 3. Очистка кешей Vite
log "3. Очистка кешей Vite..."
rm -rf .vite node_modules/.vite dist 2>/dev/null
log "   ✓ Кеши Vite очищены"

# 4. Очистка npm кеша (только старого, не весь)
log "4. Оптимизация npm кеша..."
npm cache verify 2>/dev/null || true
log "   ✓ npm кеш проверен"

# 5. Очистка временных файлов проекта
log "5. Очистка временных файлов..."
find . -type f -name "*.tmp" -mtime +1 -delete 2>/dev/null
find . -type f -name ".DS_Store" -delete 2>/dev/null
find . -type d -name ".DS_Store" -exec rm -rf {} + 2>/dev/null
log "   ✓ Временные файлы очищены"

# 6. Проверка использования диска
log "6. Проверка использования диска..."
DISK_USAGE=$(df -h "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
log "   Использование диска: ${DISK_USAGE}%"

# 7. Очистка старых сборок (старше 7 дней)
log "7. Очистка старых сборок..."
if [ -d "dist" ]; then
    find dist -type f -mtime +7 -delete 2>/dev/null
    log "   ✓ Старые сборки очищены"
fi

# 8. Очистка node_modules/.cache (если есть)
log "8. Очистка кешей node_modules..."
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache 2>/dev/null
    log "   ✓ Кеши node_modules очищены"
fi

# 9. Очистка старых логов проекта
log "9. Очистка старых логов проекта..."
find . -type f -name "*.log" -mtime +7 -delete 2>/dev/null
log "   ✓ Логи проекта очищены"

# 10. Очистка больших файлов Cursor/Antigravity
log "10. Очистка больших файлов приложений..."
for USER_DATA in "$CURSOR_USER_DATA" "$ANTIGRAVITY_USER_DATA"; do
    if [ -d "$USER_DATA" ]; then
        APP_NAME=$(basename $(dirname "$USER_DATA"))
        log "   Обработка $APP_NAME..."
        
        # Удаляем backup базы данных
        BACKUP_DB="$USER_DATA/globalStorage/state.vscdb.backup"
        if [ -f "$BACKUP_DB" ]; then
            rm -f "$BACKUP_DB" 2>/dev/null
        fi
        
        # Очищаем старые workspaceStorage (> 14 дней)
        WORKSPACE_STORAGE="$USER_DATA/workspaceStorage"
        if [ -d "$WORKSPACE_STORAGE" ]; then
            find "$WORKSPACE_STORAGE" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} \; 2>/dev/null
        fi
        
        # Очистка Code Cache и GPU Cache
        APP_ROOT=$(dirname "$USER_DATA")
        rm -rf "$APP_ROOT/Code Cache"/* 2>/dev/null
        rm -rf "$APP_ROOT/GPUCache"/* 2>/dev/null
    fi
done

# 11. Сброс системных служб (мини-ребут без ребута)
log "11. Сброс системных служб macOS..."
# Сброс кэша DNS
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder 2>/dev/null || log "   (пропущено: DNS)"
# Сброс кэша иконок (частая причина лагов Finder/UI)
sudo rm -rf /Library/Caches/com.apple.iconservices.store 2>/dev/null || log "   (пропущено: Icons)"

# 12. Финальный сброс памяти
log "12. Финальный удар по RAM (Purge)..."
sync && sudo purge 2>/dev/null || purge 2>/dev/null

log "=== Очистка завершена успешно ==="
log ""

exit 0

