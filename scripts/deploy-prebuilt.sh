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

# Шаг 1: Сборка приложения, prerender и SEO-проверка
echo "📦 Step 1: Building application with prerender..."
npm run build

# Шаг 2: Создаём .vercel/output вручную (без vercel build, который пересобирает)
echo "📦 Step 2: Creating .vercel/output structure..."
echo "💡 This preserves prerendered HTML from dist/"

# Создаём структуру .vercel/output
mkdir -p .vercel/output/static

# Копируем весь dist/ в .vercel/output/static
cp -r dist/* .vercel/output/static/

# Создаём config.json для Vercel
cat > .vercel/output/config.json <<EOF
{
  "version": 3,
  "routes": [
    {
      "src": "/curso",
      "dest": "/curso.html"
    },
    {
      "src": "/about",
      "dest": "/about.html"
    },
    {
      "src": "/pricing",
      "dest": "/pricing.html"
    },
    {
      "src": "/help",
      "dest": "/help.html"
    },
    {
      "src": "/features",
      "dest": "/features.html"
    },
    {
      "src": "/partners",
      "dest": "/partners.html"
    },
    {
      "src": "/assets/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/blog",
      "dest": "/blog.html"
    },
    {
      "src": "/guides",
      "dest": "/guides.html"
    },
    {
      "src": "/tests",
      "dest": "/tests.html"
    },
    {
      "src": "/games",
      "dest": "/games.html"
    },
    {
      "src": "/road-signs",
      "dest": "/road-signs.html"
    },
    {
      "src": "/dictionary",
      "dest": "/dictionary.html"
    },
    {
      "src": "/learning-map",
      "dest": "/learning-map.html"
    },
    {
      "src": "/achievements",
      "dest": "/achievements.html"
    },
    {
      "src": "/referrals",
      "dest": "/referrals.html"
    },
    {
      "src": "/dgt-tests",
      "dest": "/dgt-tests.html"
    },
    {
      "src": "/article/(.*)",
      "dest": "/article/$1.html"
    },
    {
      "src": "/blog/(.*)",
      "dest": "/article/$1.html"
    },
    {
      "src": "/guides/(.*)",
      "dest": "/guides/$1.html"
    },
    {
      "src": "/legal/(.*)",
      "dest": "/legal/$1.html"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
EOF

echo "✅ .vercel/output created with prerendered HTML"

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
