#!/bin/bash

# Автоматическое связывание проекта и применение миграций
# Использует Access Token из переменной окружения или конфига

set -e

export PATH="$HOME/.local/bin:$PATH"

PROJECT_ID="yffjnqegeiorunyvcxkn"

echo "🚀 Автоматическое связывание проекта и применение миграций"
echo ""

# Проверяем наличие Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI не найден"
    echo "📦 Установите через: curl -L https://github.com/supabase/cli/releases/latest/download/supabase_darwin_amd64.tar.gz -o /tmp/supabase.tar.gz && tar -xzf /tmp/supabase.tar.gz -C /tmp && mv /tmp/supabase ~/.local/bin/supabase && chmod +x ~/.local/bin/supabase"
    exit 1
fi

echo "✅ Supabase CLI найден: $(supabase --version)"
echo ""

# Проверяем наличие Access Token
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "✅ SUPABASE_ACCESS_TOKEN найден в переменных окружения"
    export SUPABASE_ACCESS_TOKEN
elif [ -f ~/.supabase/access-token ]; then
    echo "✅ Access Token найден в конфиге"
    export SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token)
else
    echo "❌ Access Token не найден"
    echo ""
    echo "📝 Для продолжения нужно:"
    echo "1. Выполните: supabase login"
    echo "2. Или установите: export SUPABASE_ACCESS_TOKEN=\"ваш-токен\""
    echo ""
    echo "📋 Инструкция: см. GET_ACCESS_TOKEN.md"
    exit 1
fi

# Проверяем авторизацию
echo "🔐 Проверяю авторизацию..."
if supabase projects list &> /dev/null; then
    echo "✅ Авторизация успешна"
else
    echo "❌ Ошибка авторизации"
    echo "📝 Проверьте Access Token"
    exit 1
fi

echo ""

# Связываем проект
echo "🔗 Связываю проект с project_id: $PROJECT_ID..."
if supabase link --project-ref "$PROJECT_ID" &> /dev/null; then
    echo "✅ Проект успешно связан"
else
    echo "⚠️  Проект уже связан или произошла ошибка"
    # Продолжаем, так как проект может быть уже связан
fi

echo ""

# Применяем миграции
echo "📝 Применяю все миграции..."
if supabase db push; then
    echo ""
    echo "✅ Все миграции успешно применены!"
    echo ""
    echo "📊 Проверьте результат в Dashboard:"
    echo "   https://supabase.com/dashboard/project/$PROJECT_ID/database/migrations"
else
    echo ""
    echo "❌ Ошибка при применении миграций"
    echo "📝 Проверьте логи выше"
    exit 1
fi

echo ""
echo "🎉 Готово! Проект связан и все миграции применены!"

