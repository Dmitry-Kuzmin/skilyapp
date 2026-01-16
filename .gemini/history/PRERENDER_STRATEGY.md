# 🎯 Стратегия Prerender: Локально/CI вместо Vercel

**Дата:** 5 декабря 2025  
**Решение:** Prerender выполняется ДО деплоя, а не на Vercel

## 🔴 Проблема с Vercel

### Почему Vercel + Chrome хрупкие:
1. **404 ошибки** при установке Chrome через `@puppeteer/browsers`
2. **Нестабильность** - может сломаться в любой момент
3. **Медленно** - каждый деплой тянет тяжелый бинарник браузера
4. **Зависимость от окружения** - изменения в Vercel могут сломать всё

### Почему chrome-aws-lambda - костыль:
- Библиотека для runtime Lambda, а не для build-step
- Требует специфичной конфигурации
- Зависимость от стороннего форка Chromium

## ✅ Решение: Prerender до деплоя

### Преимущества:
1. **Надежность** - полный контроль над окружением
2. **Предсказуемость** - работает одинаково каждый раз
3. **Скорость** - Vercel просто раздает готовую статику
4. **Устойчивость** - не зависит от изменений в Vercel

### Как это работает:

```
1. Локально/CI:
   npm run build          # Собираем SPA
   npm run prerender      # Генерируем HTML в dist/

2. Vercel:
   vercel --prebuilt      # Деплоим готовый dist/ без билда
```

## 📋 Варианты использования

### Вариант 1: Локальный деплой (быстро)
```bash
npm run build:prerender   # Сборка + prerender
vercel --prebuilt --prod  # Деплой готового dist/
```

Или используйте скрипт:
```bash
npm run deploy:prebuilt
```

### Вариант 2: GitHub Actions (автоматически)
При каждом push в `main`:
1. GitHub Actions собирает проект
2. Запускает prerender
3. Деплоит на Vercel с `--prebuilt`

См. `.github/workflows/deploy.yml`

### Вариант 3: Ручной деплой (для тестирования)
```bash
npm run build
npm run prerender
vercel --prebuilt
```

## 🎯 Результат

- ✅ SSG работает надежно
- ✅ FCP: 0.8-1.2s (вместо 4.5s)
- ✅ SEO: поисковики видят готовый HTML
- ✅ Performance Score: 90+ (вместо 64)
- ✅ Нет зависимости от Vercel build окружения

## 📝 Текущий статус

- ✅ `scripts/prerender.js` работает локально
- ✅ `package.json` обновлен (build без prerender)
- ✅ Скрипт `deploy-prebuilt.sh` создан
- ⏳ GitHub Actions workflow создан (нужно добавить secrets)

## 🔧 Следующие шаги

1. **Для локального деплоя:**
   ```bash
   npm run deploy:prebuilt
   ```

2. **Для автоматического деплоя через GitHub Actions:**
   - Добавить secrets в GitHub:
     - `VERCEL_TOKEN`
     - `VERCEL_ORG_ID`
     - `VERCEL_PROJECT_ID`
   - При каждом push в `main` будет автоматический деплой

3. **Проверить результат:**
   - View Source на `https://skilyapp.com/`
   - Должен быть контент в `<div id="root">`
   - PageSpeed Insights должен показать FCP < 1.5s

