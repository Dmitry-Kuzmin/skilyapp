# 🔧 Настройка GitHub Actions для Vercel

## ❌ Проблема

GitHub Actions workflow падает с ошибкой:
```
Error: Input required and not supplied: vercel-token
```

## ✅ Решение

Нужно добавить секреты в GitHub репозиторий.

### Шаг 1: Получить Vercel токены

1. **VERCEL_TOKEN:**
   - Зайди на https://vercel.com/account/tokens
   - Создай новый токен (или используй существующий)
   - Скопируй токен

2. **VERCEL_ORG_ID и VERCEL_PROJECT_ID:**
   - Зайди в настройки проекта на Vercel
   - Или выполни локально:
   ```bash
   vercel link
   ```
   - ID будут в `.vercel/project.json`

### Шаг 2: Добавить секреты в GitHub

1. Зайди в репозиторий на GitHub
2. Settings → Secrets and variables → Actions
3. Добавь три секрета:
   - `VERCEL_TOKEN` - токен из шага 1
   - `VERCEL_ORG_ID` - ID организации из `.vercel/project.json`
   - `VERCEL_PROJECT_ID` - ID проекта из `.vercel/project.json`

### Шаг 3: Проверить workflow

После добавления секретов workflow должен работать автоматически при push в `main`.

## 🔄 Альтернатива: Отключить автоматический деплой

Если не хочешь настраивать GitHub Actions, можно:
1. Отключить workflow (удалить или закомментировать)
2. Использовать только локальный деплой: `npm run deploy:prebuilt`

## 📝 Текущий статус

- ✅ Build работает
- ✅ Prerender работает
- ❌ Deploy не работает (нет секретов)

После добавления секретов всё будет работать автоматически!

