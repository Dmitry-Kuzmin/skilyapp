# 🔧 Исправление GitHub Actions для Vercel

## ❌ Проблема

GitHub Actions workflow падает с ошибкой:
```
Error: Input required and not supplied: vercel-token
```

## ✅ Это нормально!

Это ожидаемая ошибка при первом запуске - просто не настроены секреты в GitHub.

## 🎯 Решение: Добавить секреты в GitHub

### Шаг 1: Получить VERCEL_TOKEN

1. Зайди на https://vercel.com/account/tokens
2. Нажми кнопку **"Create Token"** (НЕ используй существующие CLI сессии!)
3. Дай токену имя, например: `GitHub Actions Deploy`
4. Выбери срок действия (рекомендую "No expiration" для автоматического деплоя)
5. Скопируй токен **сразу** (он показывается только один раз!)

**⚠️ ВАЖНО:** 
- CLI сессии (как на скриншоте) НЕ подходят для GitHub Actions
- Нужен именно **Token** (создаётся через кнопку "Create Token")
- Токен показывается только один раз - сохрани его сразу!

### Шаг 2: Добавить секреты в GitHub

1. Зайди в репозиторий на GitHub
2. Settings → Secrets and variables → Actions → New repository secret
3. Добавь три секрета:

   **VERCEL_TOKEN:**
   - Name: `VERCEL_TOKEN`
   - Value: токен из шага 1

   **VERCEL_ORG_ID:**
   - Name: `VERCEL_ORG_ID`
   - Value: `team_HlZX3EXzjTMTJ8LHMi6CarNo` (из `.vercel/project.json`)

   **VERCEL_PROJECT_ID:**
   - Name: `VERCEL_PROJECT_ID`
   - Value: `prj_tjowkZGpnTAgPHiUOnf9ykWPHI4v` (из `.vercel/project.json`)

### Шаг 3: Проверить workflow

После добавления секретов:
1. Перезапусти workflow (Actions → Re-run all jobs)
2. Или сделай новый commit в `main` - workflow запустится автоматически

## 📊 Текущий статус

- ✅ **Build:** Работает (24s)
- ✅ **Prerender:** Работает (56s) 
- ❌ **Deploy:** Не работает (нет секретов)

**После добавления секретов всё будет работать автоматически!**

## 💡 Альтернатива

Если не хочешь настраивать GitHub Actions, можно:
- Использовать только локальный деплой: `npm run deploy:prebuilt`
- Отключить автоматический деплой (закомментировать шаг в workflow)
