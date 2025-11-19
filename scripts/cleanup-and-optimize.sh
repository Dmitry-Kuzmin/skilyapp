#!/bin/bash

# Скрипт автоматической очистки и оптимизации для Cursor/проекта
# Запускается автоматически несколько раз в день через launchd

LOG_FILE="$HOME/Library/Logs/cursor-cleanup.log"
PROJECT_DIR="$HOME/Desktop/Sdadim/sdadim-dgt-prep"
CURSOR_LOGS="$HOME/Library/Application Support/Cursor/logs"
MAX_LOG_SIZE=100M  # Максимальный размер лога перед очисткой

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Начало очистки и оптимизации ==="

# Проверка существования директории проекта
if [ ! -d "$PROJECT_DIR" ]; then
    log "ОШИБКА: Директория проекта не найдена: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1

# 1. Остановка зависших процессов Node/Vite
log "1. Остановка зависших процессов Node/Vite..."
pkill -f "vite|npm.*dev" 2>/dev/null
sleep 2
# Принудительная остановка, если процесс все еще работает
pgrep -f "vite|npm.*dev" | xargs kill -9 2>/dev/null
log "   ✓ Процессы остановлены"

# 2. Очистка логов Cursor (осторожно - только старые файлы)
log "2. Очистка логов Cursor..."
if [ -d "$CURSOR_LOGS" ]; then
    # Удаляем только старые логи (> 7 дней) и ограничиваем размер
    find "$CURSOR_LOGS" -type f -name "*.log" -mtime +7 -delete 2>/dev/null
    # Очищаем большие логи (оставляем только последние 1000 строк)
    find "$CURSOR_LOGS" -type f -name "*.log" -size +$MAX_LOG_SIZE -exec sh -c 'tail -1000 "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \; 2>/dev/null
    log "   ✓ Логи Cursor очищены"
else
    log "   ⚠ Директория логов Cursor не найдена"
fi

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

# 10. Финализация - проверка размера лога очистки
log "10. Проверка размера лога очистки..."
if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)
    MAX_LOG_BYTES=10485760  # 10MB
    if [ "$LOG_SIZE" -gt "$MAX_LOG_BYTES" ]; then
        tail -5000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
        log "   Лог очистки был слишком большим, обрезан до последних 5000 строк"
    fi
fi

log "=== Очистка завершена успешно ==="
log ""

exit 0

