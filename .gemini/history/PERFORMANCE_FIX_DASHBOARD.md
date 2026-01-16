# Исправление производительности: Dashboard lazy loading

**Дата:** 5 декабря 2025  
**Проблема:** Performance упал с 65 до 64 после lazy loading Dashboard

## 🔴 Проблема

После того как мы сделали Dashboard lazy loaded, Performance Score упал с **65 до 64**.

**Причина:**
- Dashboard содержит **LCP элемент** (hero section с большим текстом и кнопкой)
- Lazy loading Dashboard означает, что hero section появляется **поздно**
- Это ухудшает **LCP (Largest Contentful Paint)**, что критично для Performance Score

## ✅ Решение

Вернули Dashboard в **синхронный импорт**:

```typescript
// БЫЛО (lazy):
const Dashboard = lazy(() => import("@/components/dashboard-new/Dashboard").then(m => ({ default: m.Dashboard })));

// СТАЛО (синхронный):
import { Dashboard } from "@/components/dashboard-new/Dashboard";
```

## 💡 Почему это правильно

1. **LCP элемент критичен** - hero section должен появиться сразу
2. **FCP vs LCP trade-off** - лучше немного ухудшить FCP, но улучшить LCP
3. **Framer-motion уже lazy** - внутри Dashboard компонента framer-motion уже lazy loaded

## 📊 Ожидаемый эффект

- **Performance: вернётся к 65+**
- **LCP: улучшится** (hero section появляется сразу)
- **FCP: может немного ухудшиться** (но LCP важнее для Performance Score)

## 🎯 Выводы

**Не все компоненты нужно lazy load:**
- ✅ Lazy load: компоненты, которые не видны сразу (модалки, виджеты)
- ❌ НЕ lazy load: компоненты с LCP элементами (hero sections, главный контент)

**Правило:**
Если компонент содержит LCP элемент, он должен быть синхронным, даже если это увеличивает initial bundle.

