#!/bin/bash

# Автоматическое применение миграций через psql
# Использует DB URL для подключения к PostgreSQL

SQL_FILE="${1:-APPLY_NOW.sql}"
DESCRIPTION="${2:-миграцию}"

DB_URL="postgres://postgres:ZfNtylh28w-b7-KlZih-Ama7H6vtJJiN@db.ijijcrucqqnnjbkclqhb.supabase.co:5432/postgres?sslmode=prefer"

echo "🚀 Применяю ${DESCRIPTION}..."
echo ""
echo "📄 Файл: ${SQL_FILE}"
echo "📝 Описание: ${DESCRIPTION}"
echo ""

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Файл ${SQL_FILE} не найден!"
  exit 1
fi

if ! command -v psql &> /dev/null; then
  echo "❌ psql не установлен"
  echo "📦 Установите PostgreSQL клиент:"
  echo "   macOS: brew install postgresql"
  echo "   Linux: sudo apt-get install postgresql-client"
  exit 1
fi

echo "📤 Выполняю SQL через psql..."
echo ""

psql "$DB_URL" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Миграция успешно применена!"
  exit 0
else
  echo ""
  echo "❌ Ошибка при применении миграции"
  exit 1
fi


