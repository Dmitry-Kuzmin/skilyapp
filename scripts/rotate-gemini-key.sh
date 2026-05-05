#!/bin/bash
# Безопасная ротация GEMINI_API_KEY во всех местах проекта.
# Запуск: bash scripts/rotate-gemini-key.sh
# Ключ вводится в терминале — не отображается и никуда не логируется.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
SUPABASE="$ROOT/../../../../../../opt/homebrew/bin/supabase"
PROJECT_REF="yffjnqegeiorunyvcxkn"

echo ""
echo "🔑  GEMINI API KEY ROTATION"
echo "──────────────────────────────────────────"
echo "Обновит:"
echo "  1. .env.local (скрипты)"
echo "  2. video-automation/.env (видео-скрипты)"
echo "  3. Supabase secrets (Edge Functions)"
echo ""

# Читаем ключ без эха (не отображается в терминале)
read -r -s -p "Введите новый GEMINI_API_KEY: " NEW_KEY
echo ""

if [ -z "$NEW_KEY" ]; then
  echo "❌ Ключ не может быть пустым."
  exit 1
fi

# Минимальная проверка формата (Gemini ключи начинаются на AIzaSy)
if [[ "$NEW_KEY" != AIzaSy* ]]; then
  echo "⚠️  Предупреждение: ключ не начинается с 'AIzaSy'. Продолжить? (y/n)"
  read -r CONFIRM
  [[ "$CONFIRM" != "y" ]] && echo "Отменено." && exit 0
fi

echo ""
echo "Обновляю..."

# ── 1. .env.local ─────────────────────────────────────────────────────────────
ENV_LOCAL="$ROOT/.env.local"
if [ -f "$ENV_LOCAL" ]; then
  if grep -q "^GEMINI_API_KEY=" "$ENV_LOCAL"; then
    sed -i '' "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=$NEW_KEY|" "$ENV_LOCAL"
    echo "  ✅ .env.local — обновлён"
  else
    echo "GEMINI_API_KEY=$NEW_KEY" >> "$ENV_LOCAL"
    echo "  ✅ .env.local — добавлен"
  fi
else
  echo "GEMINI_API_KEY=$NEW_KEY" > "$ENV_LOCAL"
  echo "  ✅ .env.local — создан"
fi

# ── 2. video-automation/.env ──────────────────────────────────────────────────
VIDEO_ENV="$ROOT/video-automation/.env"
if [ -f "$VIDEO_ENV" ]; then
  if grep -q "^GEMINI_API_KEY=" "$VIDEO_ENV"; then
    sed -i '' "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=$NEW_KEY|" "$VIDEO_ENV"
    echo "  ✅ video-automation/.env — обновлён"
  else
    echo "GEMINI_API_KEY=$NEW_KEY" >> "$VIDEO_ENV"
    echo "  ✅ video-automation/.env — добавлен"
  fi
else
  echo "  ⚠️  video-automation/.env не найден, пропущен"
fi

# ── 3. Supabase secrets ───────────────────────────────────────────────────────
SUPA_BIN=""
if [ -x "/opt/homebrew/bin/supabase" ]; then
  SUPA_BIN="/opt/homebrew/bin/supabase"
elif command -v supabase &>/dev/null; then
  SUPA_BIN="supabase"
fi

if [ -n "$SUPA_BIN" ]; then
  "$SUPA_BIN" secrets set "GEMINI_API_KEY=$NEW_KEY" --project-ref "$PROJECT_REF" 2>&1
  if [ $? -eq 0 ]; then
    echo "  ✅ Supabase secrets — обновлён"
  else
    echo "  ❌ Supabase secrets — ошибка (проверь логин: supabase login)"
  fi
else
  echo "  ⚠️  supabase CLI не найден, Supabase secrets не обновлены"
  echo "     Запусти вручную:"
  echo "     supabase secrets set GEMINI_API_KEY=<KEY> --project-ref $PROJECT_REF"
fi

# Очищаем переменную из памяти
unset NEW_KEY

echo ""
echo "──────────────────────────────────────────"
echo "✅  Готово. Перезапусти validator-server и"
echo "   задеплой функции если менял Supabase:"
echo "   supabase functions deploy telegram-bot"
echo "   supabase functions deploy ai-chat"
echo "   supabase functions deploy generate-flashcards"
echo ""
