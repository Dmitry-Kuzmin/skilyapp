# ✅ Чеклист диагностики проблем PageSpeed

**Дата:** 5 декабря 2025

## 🔍 Быстрая диагностика

### 1. Проверка деплоя ✅
```bash
# Проверить версию bundle в production
curl -s https://skilyapp.com/ | grep -E "index-.*\.js|vendor-.*\.js"

# Сравнить с локальной версией
npm run build
ls -lh dist/assets/*.js | head -5
```

### 2. Проверка preload ✅
```bash
# Проверить preload ссылки
curl -s https://skilyapp.com/ | grep -E "modulepreload|preload"

# Должны быть:
# - <link rel="modulepreload" href="/assets/vendor-*.js" crossorigin fetchpriority="high">
# - <link rel="modulepreload" href="/assets/index-*.js" crossorigin fetchpriority="high">
# - <link rel="preload" as="image" href="https://grainy-gradients.vercel.app/noise.svg" fetchpriority="high">
```

### 3. Проверка bundle размеров ✅
```bash
# Локально
npm run build:analyze

# Проверить размеры:
# - vendor.js: ~1.17 MB (gzip: ~363 KB)
# - index.js: ~302 KB (gzip: ~103 KB)
```

### 4. Проверка изображений ✅
```bash
# Проверить LCP элемент в Dashboard.tsx
# Должен быть: <img fetchPriority="high" loading="eager" decoding="async">
```

### 5. Проверка CSS ✅
```bash
# Проверить размер CSS
# Должен быть: ~470 KB (gzip: ~58 KB)
```

## 🚨 Типичные проблемы

### Проблема 1: Старая версия в production
**Симптомы:**
- Метрики не улучшились
- Изменения не видны

**Решение:**
- Проверить деплой в Vercel
- Очистить кэш CDN
- Принудительная пересборка

### Проблема 2: Preload не работает
**Симптомы:**
- Warnings в консоли
- Медленная загрузка JS

**Решение:**
- Проверить пути в preload
- Проверить crossorigin
- Убедиться, что fetchpriority="high"

### Проблема 3: Bundle не разделён
**Симптомы:**
- Большой initial bundle
- Медленная загрузка

**Решение:**
- Проверить vite.config.ts
- Проверить manualChunks
- Убедиться, что нет конфликтов

### Проблема 4: LCP ухудшился
**Симптомы:**
- LCP > 5.9s
- Изображения загружаются медленно

**Решение:**
- Проверить fetchPriority="high"
- Проверить внешние изображения
- Проверить preload для изображений

## 📊 Метрики для проверки

### Критичные:
- Performance Score: 67 → цель 90+
- FCP: ~4.5s → цель <2.0s
- LCP: ~5.9s → цель <2.5s

### Хорошие (не трогать):
- TBT: 10ms ✅
- CLS: 0 ✅

## 🎯 Вопросы для экспертов

1. **Деплой:**
   - Как проверить версию в production?
   - Как очистить кэш Vercel/CDN?
   - Нужен ли cache busting?

2. **Preload:**
   - Правильно ли настроены preload ссылки?
   - Нужны ли crossorigin атрибуты?
   - Как проверить эффективность preload?

3. **Bundle:**
   - Правильно ли настроен manualChunks?
   - Могут ли быть конфликты?
   - Как оптимизировать vendor chunk?

4. **LCP:**
   - Правильно ли настроен fetchPriority?
   - Влияют ли внешние изображения?
   - Как оптимизировать LCP элемент?

5. **CSS:**
   - Как уменьшить unused CSS?
   - Правильно ли настроен Tailwind purge?
   - Нужны ли дополнительные оптимизации?

