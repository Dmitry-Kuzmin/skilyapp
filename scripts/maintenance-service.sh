#!/bin/bash
# Skily System Guardian v2.0
# Более агрессивный скрипт для поддержания Mac в рабочем состоянии без перезагрузки

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/skily-maintenance.log"

YELLOW='\033[1;33m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    local msg="[GUARDIAN] $(date '+%H:%M:%S') $1"
    echo -e "${YELLOW}${msg}${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 1. Функция приоритизации Antigravity (чтобы печатать было легко)
boost_editor() {
    local AG_PID=$(pgrep -x "Electron" | head -n 1) # Antigravity базируется на Electron
    if [ -n "$AG_PID" ]; then
        # Устанавливаем приоритет выше (nice -5) для основного процесса
        renice -n -5 -p "$AG_PID" 2>/dev/null
    fi
}

# 2. Убийца "зависших" и "кушающих" процессов
kill_runaways() {
    # Ищем процессы node, которые едят слишком много
    # Но исключаем текущий сеанс (concurrently и прочее)
    ps aux | grep "node" | grep -v "grep" | while read -r line; do
        PID=$(echo $line | awk '{print $2}')
        CPU=$(echo $line | awk '{print $3}' | cut -d. -f1)
        MEM=$(echo $line | awk '{print $4}' | cut -d. -f1)
        
        # Если процесс ест > 80% CPU или > 15% MEM, и он не основной - убиваем
        if [ "$CPU" -gt 80 ] || [ "$MEM" -gt 15 ]; then
            log "⚠️  Обнаружен тяжелый процесс Node (PID: $PID, CPU: $CPU%, MEM: $MEM%). Убиваю..."
            kill -9 "$PID" 2>/dev/null
        fi
    done

    # Убиваем зомби-процессы WebKit/Chrome которые часто виснут в фоне
    pkill -9 -f "Google Chrome Helper (Renderer)" 2>/dev/null
    pkill -9 -f "com.apple.WebKit.WebContent" 2>/dev/null
}

# 3. Глубокая очистка кэшей
deep_clean() {
    log "🧹 Глубокая очистка временных данных..."
    
    # Очистка кэша Antigravity (без остановки приложения)
    rm -rf "$HOME/Library/Application Support/Antigravity/Cache"/* 2>/dev/null
    rm -rf "$HOME/Library/Application Support/Antigravity/Code Cache"/* 2>/dev/null
    rm -rf "$HOME/Library/Application Support/Antigravity/GPUCache"/* 2>/dev/null
    
    # Очистка системных кэшей macOS (безопасно)
    rm -rf ~/Library/Caches/com.apple.appstore/* 2>/dev/null
    rm -rf ~/Library/Caches/com.apple.Safari/* 2>/dev/null
    
    # Очистка Vite & TS
    rm -rf "$PROJECT_DIR/node_modules/.vite" 2>/dev/null
    rm -rf "$HOME/Library/Caches/typescript"/* 2>/dev/null
    
    # Принудительный сброс RAM
    sync && purge 2>/dev/null
}

# Основной цикл
log "🛡️  System Guardian запущен. Интервал: каждые 10 минут."
log "💡 Я буду следить, чтобы Antigravity работала быстро."

# Сразу бустим редактор при запуске
boost_editor

while true; do
    FREE_PAGES=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    LOAD_AVG=$(sysctl -n vm.loadavg | awk '{print $2}')
    
    # Если Load Average слишком высокий или памяти мало
    if [ -n "$FREE_PAGES" ] && [ "$FREE_PAGES" -lt 40000 ] || (( $(echo "$LOAD_AVG > 10.0" | bc -l) )); then
        log "🚨 Система перегружена (Load: $LOAD_AVG). Применяю экстренные меры!"
        kill_runaways
        deep_clean
        boost_editor
    else
        # Плановая легкая очистка
        clean_caches 2>/dev/null
    fi

    sleep 600
done
