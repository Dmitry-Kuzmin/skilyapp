#!/bin/bash

# Скрипт для развертывания Edge Functions
# Использование: ./deploy_functions.sh YOUR_PROJECT_REF

PROJECT_REF=$1

if [ -z "$PROJECT_REF" ]; then
  echo "❌ Ошибка: Укажите PROJECT_REF"
  echo "Использование: ./deploy_functions.sh YOUR_PROJECT_REF"
  echo ""
  echo "PROJECT_REF можно найти в Supabase Dashboard:"
  echo "Settings → General → Reference ID"
  exit 1
fi

echo "🚀 Развертывание Edge Functions для проекта: $PROJECT_REF"
echo ""

# Связываем проект (если еще не связан)
echo "📎 Связывание проекта..."
supabase link --project-ref "$PROJECT_REF" || echo "Проект уже связан или ошибка связи"

echo ""
echo "📦 Развертывание функций монетизации..."

# Развертываем функции монетизации
supabase functions deploy coins-earn
supabase functions deploy coins-spend
supabase functions deploy premium-status
supabase functions deploy purchase-create
supabase functions deploy purchase-webhook
supabase functions deploy duel-pass-xp
supabase functions deploy duel-pass-claim
supabase functions deploy assistant-suggest

echo ""
echo "✅ Развертывание завершено!"
echo ""
echo "⚠️  Не забудьте настроить секреты в Supabase Dashboard:"
echo "   Edge Functions → Settings → Secrets"
echo ""
echo "   Нужные секреты:"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo "   - STRIPE_SUCCESS_URL"
echo "   - STRIPE_CANCEL_URL"



