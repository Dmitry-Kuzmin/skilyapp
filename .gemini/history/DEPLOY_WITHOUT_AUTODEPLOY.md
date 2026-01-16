# 🔧 Альтернатива: Деплой без автодеплоя

## ⚠️ Проблема
Приватный репозиторий - Vercel не может автоматически деплоить через GitHub интеграцию.

## ✅ Решение: Vercel CLI (работает с приватными репозиториями!)

### Шаг 1: Установить Vercel CLI

```bash
npm install -g vercel
```

Или через Homebrew (macOS):
```bash
brew install vercel-cli
```

### Шаг 2: Войти в Vercel

```bash
vercel login
```

Откроется браузер, нужно будет авторизоваться.

### Шаг 3: Привязать проект к Vercel

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
vercel link
```

Выбери:
- Existing project: `sdadim-dgt-prep`
- Override settings: No (оставить как есть)

### Шаг 4: Деплой!

```bash
# Production деплой
vercel --prod

# Или просто деплой в preview
vercel
```

**Готово!** Проект задеплоится напрямую, без GitHub интеграции.

---

## 🔄 Автоматизация через GitHub Actions

Если хочешь автоматический деплой, можно настроить через GitHub Actions:

### Создать workflow:

```yaml
# .github/workflows/deploy-vercel.yml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Vercel CLI
        run: npm install -g vercel@latest
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Настроить секреты в GitHub:

1. Vercel Dashboard → **Settings** → **General**
2. Скопируй:
   - **Team ID** (или **Org ID**)
   - **Project ID**
3. GitHub → **Settings** → **Secrets and variables** → **Actions**
4. Добавь секреты:
   - `VERCEL_TOKEN` - получи через `vercel tokens create`
   - `VERCEL_ORG_ID` - из Vercel Settings
   - `VERCEL_PROJECT_ID` - из Vercel Settings

---

## 💡 Самое простое решение

**Используй Vercel CLI** (Шаг 1-4 выше):
- ✅ Работает с приватными репозиториями
- ✅ Не требует GitHub интеграции
- ✅ Быстро деплоить: `vercel --prod`
- ✅ Можно автоматизировать через скрипт

---

## 📋 Быстрая команда для деплоя

После настройки CLI, просто:

```bash
vercel --prod
```

И проект задеплоится! 🚀

