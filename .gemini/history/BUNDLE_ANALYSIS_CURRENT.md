# 📊 Текущий анализ bundle

**Дата:** 5 декабря 2025

## 📦 Размеры chunks (после оптимизации)

### Основные chunks:
- `vendor.js`: ~1.17 MB (gzip: ~363 KB) - React, Supabase, TanStack
- `index.js`: ~302 KB (gzip: ~103 KB) - основной код приложения
- `tiptap-vendor.js`: ~416 KB (gzip: ~127 KB) - редактор (только админка)
- `xlsx-vendor.js`: ~454 KB (gzip: ~153 KB) - импорт данных (только админка)
- `ui-vendor.js`: ~121 KB (gzip: ~41 KB) - MUI, framer-motion

### Оптимизированные chunks:
- ✅ `tiptap-vendor` - вынесен отдельно (lazy load)
- ✅ `xlsx-vendor` - вынесен отдельно (lazy load)
- ✅ `ui-vendor` - вынесен отдельно (MUI, framer-motion)

## 🔍 Анализ использования

### framer-motion:
- Используется в ~96 файлах
- В основном для анимаций UI
- Уже в отдельном chunk (`ui-vendor`)
- Замена на CSS анимации - рискованно (много кода)

### recharts:
- Используется только в админке
- Уже в отдельном chunk (`charts`)
- Lazy loaded через админские роуты

### @tiptap/prosemirror:
- Используется только в админке
- Уже в отдельном chunk (`tiptap-vendor`)
- Lazy loaded через админские роуты

## ✅ Что уже оптимизировано:

1. **Code splitting:**
   - Тяжёлые библиотеки вынесены в отдельные chunks
   - Админка lazy loaded
   - Тяжёлые компоненты lazy loaded

2. **Lazy loading:**
   - Dashboard (синхронный - содержит LCP)
   - PaywallModal (lazy)
   - WelcomeOverlay (lazy)
   - PerformanceMonitor (lazy)
   - GlobalModalManager (lazy)
   - PasskeyOnboardingWrapper (lazy)

3. **Tree-shaking:**
   - `date-fns` локали оптимизированы
   - `lucide-react` использует named imports

## 🎯 Возможные улучшения:

### 1. Дальнейший lazy loading компонентов
- Проверить, можно ли lazy load больше компонентов
- Особенно модалки и тяжёлые виджеты

### 2. Оптимизация vendor chunk
- `vendor.js` всё ещё большой (1.17 MB)
- Можно попробовать разделить на более мелкие chunks
- Но нужно быть осторожным (проблемы с зависимостями)

### 3. CSS оптимизация
- Проверить unused CSS
- Tailwind purge работает, но можно улучшить

## 📝 Рекомендации:

1. **Не трогать framer-motion** - слишком много кода зависит от него
2. **Продолжить lazy loading** - больше компонентов можно lazy load
3. **Проверить unused code** - PageSpeed показывает 350 KiB unused JS

## 🚀 Следующие шаги:

1. Найти компоненты, которые можно lazy load
2. Проверить, можно ли уменьшить vendor chunk
3. Проверить unused CSS

