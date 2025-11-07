#!/bin/bash

# Скрипт для разбиения миграций по маркерам
# Разбивает файл на части по 10 миграций в каждой

INPUT_FILE="ALL_MIGRATIONS_SAFE.sql"
OUTPUT_DIR="migrations-split"
MIGRATIONS_PER_PART=10

# Создаем директорию
mkdir -p "$OUTPUT_DIR"

# Удаляем старые файлы
rm -f "$OUTPUT_DIR"/PART_*.sql

# Используем awk для разбиения по маркерам миграций
awk -v output_dir="$OUTPUT_DIR" -v per_part="$MIGRATIONS_PER_PART" '
BEGIN {
    part_num = 1
    migration_count = 0
    current_file = ""
    in_migration = 0
}

/^-- ============================================$/ {
    if (in_migration) {
        # Закрываем предыдущую миграцию
        print >> current_file
        in_migration = 0
    }
    next
}

/^-- Миграция [0-9]+\/[0-9]+:/ {
    migration_count++
    
    # Если нужно начать новую часть
    if ((migration_count - 1) % per_part == 0) {
        if (current_file != "") {
            close(current_file)
        }
        part_num = int((migration_count - 1) / per_part) + 1
        current_file = output_dir "/PART_" sprintf("%02d", part_num) ".sql"
        print "-- ============================================" > current_file
        print "-- Безопасные миграции для Supabase" > current_file
        print "-- Часть " part_num > current_file
        print "-- ============================================" > current_file
        print "" > current_file
    }
    
    in_migration = 1
}

{
    if (current_file != "") {
        print >> current_file
    }
}

END {
    if (current_file != "") {
        close(current_file)
    }
    print "Создано частей: " part_num
}
' "$INPUT_FILE"

echo "✅ Миграции разбиты на части в директории $OUTPUT_DIR"

