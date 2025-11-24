#!/bin/bash
# Автоматическая очистка кэша каждый час (легкая версия)
# Не останавливает Cursor, только очищает кэш

LOG_FILE="$HOME/Library/Logs/cursor-auto-cleanup.log"
PROJECT_DIR="/Users/dimka/Desktop/Sdadim/sdadim-dgt-prep"

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "🧹 Начало автоматической очистки..."

# 1. Очистить кэш TypeScript (легко и безопасно)
if [ -d "$HOME/Library/Caches/typescript" ]; then
    TS_CACHE_SIZE=$(du -sm "$HOME/Library/Caches/typescript" 2>/dev/null | cut -f1)
    if [ "$TS_CACHE_SIZE" -gt 50 ]; then
        log "📝 Очистка кэша TypeScript (${TS_CACHE_SIZE}MB)..."
        rm -rf "$HOME/Library/Caches/typescript"/* 2>/dev/null
        log "✅ Кэш TypeScript очищен"
    fi
fi

# 2. Очистить кэш проекта (только Vite, не трогаем node_modules)
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR" || exit
    
    # Очистить кэш Vite
    if [ -d "node_modules/.vite" ]; then
        VITE_CACHE_SIZE=$(du -sm "node_modules/.vite" 2>/dev/null | cut -f1)
        if [ "$VITE_CACHE_SIZE" -gt 100 ]; then
            log "🗂️  Очистка кэша Vite (${VITE_CACHE_SIZE}MB)..."
            rm -rf node_modules/.vite 2>/dev/null
            log "✅ Кэш Vite очищен"
        fi
    fi
    
    # Удалить .DS_Store файлы
    DS_COUNT=$(find . -name ".DS_Store" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$DS_COUNT" -gt 0 ]; then
        log "🗑️  Удаление .DS_Store файлов ($DS_COUNT)..."
        find . -name ".DS_Store" -delete 2>/dev/null
        log "✅ .DS_Store файлы удалены"
    fi
    
    # Удалить tsbuildinfo файлы
    TSINFO_COUNT=$(find . -name "*.tsbuildinfo" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$TSINFO_COUNT" -gt 0 ]; then
        log "📦 Удаление .tsbuildinfo файлов ($TSINFO_COUNT)..."
        find . -name "*.tsbuildinfo" -delete 2>/dev/null
        log "✅ .tsbuildinfo файлы удалены"
    fi
fi

# 3. Очистить кэш Cursor (только если он очень большой)
CURSOR_CACHE_DIR="$HOME/Library/Application Support/Cursor/Cache"
if [ -d "$CURSOR_CACHE_DIR" ]; then
    CURSOR_CACHE_SIZE=$(du -sm "$CURSOR_CACHE_DIR" 2>/dev/null | cut -f1)
    # Очищаем только если кэш больше 2GB
    if [ "$CURSOR_CACHE_SIZE" -gt 2048 ]; then
        log "📦 Очистка кэша Cursor (${CURSOR_CACHE_SIZE}MB - очень большой!)..."
        rm -rf "$CURSOR_CACHE_DIR"/* 2>/dev/null
        log "✅ Кэш Cursor очищен"
    fi
fi

# 4. Очистить GPUCache если большой
CURSOR_GPU_CACHE="$HOME/Library/Application Support/Cursor/GPUCache"
if [ -d "$CURSOR_GPU_CACHE" ]; then
    GPU_CACHE_SIZE=$(du -sm "$CURSOR_GPU_CACHE" 2>/dev/null | cut -f1)
    if [ "$GPU_CACHE_SIZE" -gt 500 ]; then
        log "🎮 Очистка GPU кэша Cursor (${GPU_CACHE_SIZE}MB)..."
        rm -rf "$CURSOR_GPU_CACHE"/* 2>/dev/null
        log "✅ GPU кэш очищен"
    fi
fi

log "✅ Автоматическая очистка завершена"
log "---"

