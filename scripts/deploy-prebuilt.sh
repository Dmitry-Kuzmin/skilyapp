#!/bin/bash

# Скрипт для локального билда, prerender и деплоя на Vercel
# Использование: ./scripts/deploy-prebuilt.sh

set -e

echo "🚀 Building and deploying to Vercel (prebuilt mode)"
echo "===================================================="
echo ""

# Проверяем наличие Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found"
    echo "💡 Install it: npm install -g vercel"
    exit 1
fi

# Шаг 1: Сборка приложения
echo "📦 Step 1: Building application..."
npm run build

# Шаг 2: Prerender статических страниц
echo "🎨 Step 2: Prerendering static pages..."
npm run prerender

# Шаг 3: Проверяем, что prerender сработал
if [ ! -f "dist/index.html" ] || ! grep -q '<div id="root">' dist/index.html || [ $(grep -o '<div id="root">' dist/index.html | wc -l) -eq 1 ] && ! grep -q 'Сдай теорию DGT' dist/index.html; then
    echo "⚠️  WARNING: Prerender might not have worked correctly"
    echo "⚠️  dist/index.html might be empty or not contain content"
    echo "⚠️  Continuing anyway..."
fi

# Шаг 4: Деплой на Vercel (просто задеплоим dist/)
echo "🚀 Step 3: Deploying to Vercel..."
echo "💡 Note: Vercel will automatically detect static files from dist/"
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "📊 Check your deployment at: https://skilyapp.com"

