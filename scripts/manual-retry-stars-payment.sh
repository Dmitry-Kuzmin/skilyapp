#!/bin/bash

# Скрипт для ручного запуска retry начислений Stars Payment
# Использование: ./scripts/manual-retry-stars-payment.sh

set -e

# Получить ANON_KEY из переменной окружения или запросить
ANON_KEY="${SUPABASE_ANON_KEY:-}"

if [ -z "$ANON_KEY" ]; then
  echo "❌ Ошибка: SUPABASE_ANON_KEY не указан"
  echo "Использование: export SUPABASE_ANON_KEY=your_anon_key && $0"
  echo ""
  echo "Как получить ANON_KEY:"
  echo "1. Откройте Supabase Dashboard → Settings → API"
  echo "2. Скопируйте 'anon public' ключ"
  exit 1
fi

FUNCTION_URL="https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/stars-payment-retry"

echo "🔄 Запуск retry начислений Stars Payment..."
echo "URL: $FUNCTION_URL"
echo ""

RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json")

echo "Ответ от функции:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Проверить результат
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Retry выполнен успешно!"
else
  echo "⚠️ Возможны ошибки. Проверьте ответ выше."
fi

