#!/bin/bash

# Скрипт для установки Supabase CLI

echo "🚀 Установка Supabase CLI..."

# Скачиваем последнюю версию
echo "📥 Скачивание Supabase CLI..."
curl -L -o /tmp/supabase.tar.gz "https://github.com/supabase/cli/releases/latest/download/supabase_darwin_amd64.tar.gz"

# Распаковываем
echo "📦 Распаковка..."
cd /tmp
tar -xzf supabase.tar.gz

# Проверяем, есть ли файл
if [ -f "/tmp/supabase" ]; then
    echo "✅ Файл скачан успешно"
    
    # Делаем исполняемым
    chmod +x /tmp/supabase
    
    # Пытаемся установить в /usr/local/bin (требует sudo)
    echo "🔧 Установка в /usr/local/bin (требует пароль)..."
    sudo mv /tmp/supabase /usr/local/bin/supabase
    
    if [ $? -eq 0 ]; then
        echo "✅ Supabase CLI установлен успешно!"
        echo "📍 Расположение: /usr/local/bin/supabase"
        echo ""
        echo "Проверка установки:"
        /usr/local/bin/supabase --version
        echo ""
        echo "🎉 Готово! Теперь можно использовать:"
        echo "   supabase login"
        echo "   supabase link --project-ref ваш-project-ref"
        echo "   supabase functions deploy ai-chat"
    else
        echo "❌ Ошибка при установке. Попробуй вручную:"
        echo "   sudo mv /tmp/supabase /usr/local/bin/supabase"
    fi
else
    echo "❌ Ошибка: файл не найден"
    exit 1
fi

