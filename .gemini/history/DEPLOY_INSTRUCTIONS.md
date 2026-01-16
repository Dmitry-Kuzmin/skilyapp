# Инструкция по деплою на Vercel

## Проблема с автоматическим деплоем

Если автоматический деплой через GitHub не работает, можно задеплоить напрямую через Vercel CLI.

## Вариант 1: Деплой через Vercel CLI (рекомендуется)

### 1. Установка Vercel CLI (если не установлен)
```bash
npm i -g vercel
```

### 2. Логин в Vercel
```bash
vercel login
```

### 3. Деплой production
```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
vercel --prod
```

## Вариант 2: Проверка GitHub токена

Если деплой не проходит из-за истекающего токена:

1. Перейдите на https://github.com/settings/tokens/2761735439/regenerate
2. Сгенерируйте новый токен
3. Обновите токен в настройках Vercel:
   - Vercel Dashboard → Settings → Git
   - Обновите GitHub интеграцию

## Вариант 3: Проверка vercel.json

Текущий `vercel.json` использует regex паттерн для исключения статических файлов. Если есть проблемы, можно упростить:

```json
{
  "rewrites": [
    {
      "source": "/assets/:path*",
      "destination": "/assets/:path*"
    },
    {
      "source": "/(.*\\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp|json|map|sw\\.js|workbox-.*\\.js))",
      "destination": "/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Проверка после деплоя

1. Откройте https://skilyapp.com/
2. Проверьте консоль браузера на ошибки
3. Убедитесь что lazy-loaded модули загружаются правильно
