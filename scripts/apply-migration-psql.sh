#!/bin/bash

# Применение миграции через прямой SQL запрос к базе данных
# Использует psql для прямого подключения к PostgreSQL

PROJECT_ID="yffjnqegeiorunyvcxkn"
DB_PASSWORD="345556Ff@?"
DB_HOST="aws-1-eu-north-1.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.${PROJECT_ID}"

# URL для подключения
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# Путь к миграции
MIGRATION_FILE="${1:-supabase/migrations/20251107150000_fix_source_id_unique_constraint.sql}"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Файл миграции не найден: $MIGRATION_FILE"
  exit 1
fi

echo "🚀 Применение миграции: $MIGRATION_FILE"
echo "=================================================================================="
echo ""

# Проверяем наличие psql
if ! command -v psql &> /dev/null; then
  echo "❌ psql не установлен. Установите PostgreSQL client:"
  echo "   brew install postgresql"
  exit 1
fi

# Применяем миграцию
echo "📝 Применяю SQL..."
psql "$DB_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "=================================================================================="
  echo "✅ Миграция применена успешно!"
else
  echo ""
  echo "=================================================================================="
  echo "❌ Ошибка применения миграции"
  echo ""
  echo "📝 Попробуйте применить миграцию вручную через SQL Editor:"
  echo "   https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new"
  exit 1
fi
