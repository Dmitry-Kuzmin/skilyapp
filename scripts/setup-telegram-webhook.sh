#!/bin/bash

# Скрипт для настройки Telegram Bot Webhook
# Использование: ./scripts/setup-telegram-webhook.sh YOUR_BOT_TOKEN

set -e

TELEGRAM_BOT_TOKEN="${1:-$TELEGRAM_BOT_TOKEN}"
SUPABASE_PROJECT_REF="yffjnqegeiorunyvcxkn"
WEBHOOK_URL="https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/telegram-bot"

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Ошибка: TELEGRAM_BOT_TOKEN не указан"
  echo "Использование: $0 YOUR_BOT_TOKEN"
  echo "Или установите переменную окружения: export TELEGRAM_BOT_TOKEN=your_token"
  exit 1
fi

echo "🔧 Настройка Telegram Bot Webhook..."
echo "Bot Token: ${TELEGRAM_BOT_TOKEN:0:10}..."
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Установить webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"allowed_updates\": [\"message\", \"callback_query\", \"inline_query\", \"pre_checkout_query\", \"poll_answer\"]
  }")

echo "Ответ от Telegram API:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Проверить webhook
echo "🔍 Проверка webhook..."
CHECK_RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")
echo "$CHECK_RESPONSE" | jq '.' 2>/dev/null || echo "$CHECK_RESPONSE"

echo ""
echo "✅ Готово! Webhook настроен."
