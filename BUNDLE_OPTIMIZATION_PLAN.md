# План оптимизации Bundle

## 🔴 Критические проблемы (найдены в stats.html)

### 1. **vendor chunk 1.9MB** - основная проблема FCP 6.4s

**Что внутри:**
- `xlsx/xlsx.mjs` - **ОГРОМНЫЙ коричневый прямоугольник** (хотя есть lazy loader!)
- `@tiptap/*` - много компонентов (используется только в админке)
- `recharts` - через `chart.tsx` (используется только в админке)
- `lucide-react/dist/esm` - **ОЧЕНЬ много иконок** (все иконки загружаются)
- `prosemirror-*` - зависимости @tiptap
- `@radix-ui/*` - много компонентов
- `zod`, `date-fns`, и другие

### 2. **charts chunk отсутствует**
- `recharts` должен быть в отдельном chunk, но попадает в vendor
- Причина: `chart.tsx` импортирует `recharts` синхронно, и этот компонент используется в админке

### 3. **xlsx в vendor chunk**
- Хотя есть `xlsxLoader.ts` с lazy loading, xlsx всё равно попадает в vendor
- Нужно исключить из vendor chunk

## ✅ Решения

### Шаг 1: Обновить vite.config.ts

1. **Создать отдельный chunk для @tiptap:**
```typescript
if (id.includes('node_modules/@tiptap') || 
    id.includes('node_modules/prosemirror')) {
  return 'tiptap-vendor';
}
```

2. **Исключить xlsx из vendor:**
```typescript
// xlsx должен быть в отдельном chunk или вообще не попадать в vendor
if (id.includes('node_modules/xlsx')) {
  return 'xlsx-vendor'; // или вообще не возвращать (будет в отдельном динамическом chunk)
}
```

3. **Убедиться что charts chunk работает:**
```typescript
// Уже есть, но проверить что recharts действительно попадает туда
if (id.includes('node_modules/recharts')) {
  return 'charts';
}
```

### Шаг 2: Lazy-load chart компонент

`chart.tsx` используется только в админке, но импортируется синхронно. Нужно:
- Создать `LazyChart.tsx` wrapper
- Или lazy-load страницы которые используют chart

### Шаг 3: Оптимизировать lucide-react

- Проверить tree-shaking (возможно все иконки импортируются)
- Использовать named imports вместо `import * as Icons`
- Или lazy-load иконки

## 📊 Ожидаемый результат

**До:**
- vendor: 1.9MB
- index: 661KB

**После:**
- vendor: ~800-900KB (убрали xlsx, @tiptap, recharts)
- tiptap-vendor: ~200-300KB
- charts: ~150-200KB
- xlsx-vendor: ~150KB (или динамический chunk)
- index: ~500KB (убрали chart.tsx)

**FCP: 6.4s → 3.5-4.0s** (на Slow 4G)

