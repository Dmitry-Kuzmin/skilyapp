#!/bin/bash

# Скрипт для деплоя Edge Function sync-google-sheets

echo "🚀 Деплой Edge Function sync-google-sheets..."
echo ""

# Проверяем, что мы в корне проекта
if [ ! -f "supabase/config.toml" ]; then
  echo "❌ Ошибка: файл supabase/config.toml не найден"
  echo "   Убедитесь, что вы находитесь в корне проекта"
  exit 1
fi

# Проверяем, установлен ли Supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI не установлен"
  echo "   Установите: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "✅ Supabase CLI установлен"
echo ""

# Проверяем, залогинены ли мы
echo "🔐 Проверка авторизации..."
if ! supabase projects list &> /dev/null; then
  echo "⚠️  Необходимо войти в Supabase"
  echo "   Выполните: supabase login"
  exit 1
fi

echo "✅ Авторизованы в Supabase"
echo ""

# Проверяем, связан ли проект
echo "🔗 Проверка связи с проектом..."
PROJECT_ID=$(grep -oP 'project_id = "\K[^"]+' supabase/config.toml)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Не найден project_id в supabase/config.toml"
  exit 1
fi

echo "✅ Project ID: $PROJECT_ID"
echo ""

# Деплоим функцию
echo "📦 Деплой функции sync-google-sheets..."
supabase functions deploy sync-google-sheets

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Функция успешно задеплоена!"
  echo ""
  echo "📋 Следующие шаги:"
  echo "1. Настройте secrets (переменные окружения):"
  echo "   https://supabase.com/dashboard/project/$PROJECT_ID/functions/sync-google-sheets/settings"
  echo ""
  echo "2. Добавьте следующие secrets:"
  echo "   - SUPABASE_URL = https://$PROJECT_ID.supabase.co"
  echo "   - SUPABASE_SERVICE_ROLE_KEY = (ваш service role key)"
  echo "   - GOOGLE_SHEETS_ID = (ID вашей таблицы Google Sheets)"
  echo ""
  echo "3. Проверьте логи:"
  echo "   https://supabase.com/dashboard/project/$PROJECT_ID/functions/sync-google-sheets/logs"
else
  echo ""
  echo "❌ Ошибка при деплое функции"
  echo "   Проверьте логи выше"
  exit 1
fi

