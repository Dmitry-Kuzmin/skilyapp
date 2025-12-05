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

# Шаг 1: Сборка приложения и prerender
echo "📦 Step 1: Building application and prerendering..."
npm run build:prerender

# Шаг 2: Сборка для Vercel (использует готовый dist/)
echo "📦 Step 2: Building for Vercel (using pre-rendered dist/)..."
echo "💡 This will create .vercel/output with prerendered HTML"
vercel build --prod

# Шаг 2: Проверяем, что build сработал
if [ ! -d ".vercel/output" ]; then
    echo "❌ ERROR: .vercel/output directory not found"
    echo "❌ vercel build failed"
    exit 1
fi

echo "✅ Build complete! .vercel/output created"

# Шаг 3: Деплой готового результата (без билда на Vercel)
echo "🚀 Step 2: Deploying prebuilt output to Vercel..."
echo "💡 Vercel will NOT run build, just deploy .vercel/output"
vercel deploy --prebuilt --prod

echo ""
echo "✅ Deployment complete!"
echo "📊 Check your deployment at: https://skilyapp.com"

