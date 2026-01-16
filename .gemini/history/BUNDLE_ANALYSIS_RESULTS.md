# Результаты Bundle-анализа

**Дата:** 6 декабря 2025  
**Инструмент:** rollup-plugin-visualizer  
**Файл:** `dist/stats.html`

---

## 📊 Ключевые находки

### 1. `vendor-CRloSt8r.js` - Главный виновник (314.44 KB gzipped)

**Содержит:**
- ✅ **`@supabase`** - supabase-js, postgrest-js, realtime-js, auth-js, GoTrueAdminApi
- ✅ **`@tanstack/react-query`** - query-core/build/modern
- ✅ **`@radix-ui`** - множество компонентов (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip)
- ✅ **`react`** и **`react-dom`** - cjs/react-dom.production.min.js
- ✅ **`zod`** - v3, types.js
- ✅ **`@floating-ui`** - core/dist/floating-ui.core.mjs
- ✅ **`unified`**, **`vfile`**, **`micromark`** - markdown парсеры
- ✅ **`qr.js`**, **`QRCode.js`** - генерация QR кодов
- ✅ **`vaul`** - drawer компонент
- ✅ **`rollbar`** - error tracking
- ✅ **`linkifyjs`** - парсинг ссылок

**Вердикт:** ❌ Все эти зависимости грузятся в **initial chunk**, даже для лендинга!

---

### 2. `index-okTCVOXV.js` - Главный entry point (102.76 KB gzipped)

**Содержит:**
- ✅ **`App.tsx`** - главный компонент с роутингом
- ✅ **`main.tsx`** - точка входа
- ✅ **`hooks`**, **`contexts`**, **`lib`** - утилиты
- ✅ **`components/ui`** - UI компоненты
- ✅ **`LanguageContext.tsx`** - контекст языка
- ✅ **`translations/helpCenter.ts`** - переводы

**Вердикт:** ⚠️ `App.tsx` синхронно импортирует Query/Supabase провайдеры

---

### 3. Уже разделенные chunks (хорошо!)

✅ **`router-vendor-B3q1J7b_js`** - react-router-dom (уже lazy)  
✅ **`icons-vendor-D1ELq7-f.js`** - lucide-react (уже lazy)  
✅ **`date-vendor-CM9OVzDF.js`** - date-fns (уже lazy)  
✅ **`toast-vendor-50Khf6-vjs`** - sonner (уже lazy)  
✅ **`ui-vendor-BJDZq2al.js`** - framer-motion (уже lazy)  
✅ **`xlsx-vendor-TISOFDq1.js`** - xlsx (уже lazy)  
✅ **`tiptap-vendor-jMy0h9As.js`** - tiptap/prosemirror (уже lazy)

**Вердикт:** ✅ Code splitting работает для этих библиотек!

---

### 4. Application chunks (уже lazy loaded)

✅ **`index-6jDKPDfa.js`** - содержит `pages/Index.tsx` и `components/landing`  
✅ **`Duel-C3rtmid4.js`** - Duel компоненты  
✅ **`TestSession-DvDPVRcx.js`** - TestSession  
✅ **`LearningMap-BUkzi24Q.js`** - LearningMap  
✅ **`Dashboard-new-Cyniwwdag.js`** - Dashboard  
✅ **`Article-BUxM81xv.js`** - Article

**Вердикт:** ✅ Страницы уже lazy loaded!

---

## 🎯 ПРОБЛЕМА

### Что не так:

1. **`vendor.js` содержит Supabase/Query/Radix в initial chunk**
   - Эти зависимости грузятся даже для лендинга
   - Пользователь на `/` не нуждается в Supabase/Query
   - Это убивает PSI Score

2. **`App.tsx` синхронно импортирует провайдеры**
   - `QueryClient`, `PersistQueryClientProvider` импортируются в `App.tsx`
   - Это тянет весь `@tanstack/react-query` в initial bundle
   - Это тянет весь `@supabase/supabase-js` в initial bundle

3. **`@radix-ui` в vendor.js**
   - Все компоненты Radix UI в initial chunk
   - Даже если они не используются на лендинге

---

## ✅ РЕШЕНИЕ: Этап 3 (Lazy Providers)

### Что нужно сделать:

1. **Создать `AppProviders.tsx`** - обертка для Query/Supabase провайдеров
2. **Lazy load `AppProviders`** - загружать только для `/app/*` или после авторизации
3. **Условная загрузка** - на лендинге (`/`) не грузить провайдеры

### Ожидаемый результат:

- **Initial bundle для лендинга:** 417 KB → 150-200 KB
- **PSI Mobile для лендинга:** 66 → 75-80
- **Приложение (`/app`):** остается 417 KB (это нормально)

---

## 📋 ПЛАН ДЕЙСТВИЙ

### Сейчас (сегодня):

1. ✅ Bundle-анализ выполнен
2. ✅ Проблема подтверждена: Supabase/Query/Radix в initial chunk
3. ⏭️ **Следующий шаг:** Реализовать Этап 3 (Lazy Providers)

### На этой неделе:

4. ⏭️ Создать `AppProviders.tsx`
5. ⏭️ Lazy load провайдеров в `App.tsx`
6. ⏭️ Условная загрузка только для `/app/*` или после авторизации
7. ⏭️ Протестировать и измерить результат

### Если нужен 90+ PSI:

8. ⏭️ Разделение лендинга (Этап 4)
9. ⏭️ Легкий лендинг без Supabase/Query/Radix
10. ⏭️ Ожидаемый результат: PSI Mobile 85-90+

---

## 🔍 ДЕТАЛИ ДЛЯ РЕАЛИЗАЦИИ

### Структура `AppProviders.tsx`:

```typescript
// src/components/providers/AppProviders.tsx
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@/lib/queryPersister";
// ... другие провайдеры

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  // Вся логика провайдеров здесь
  return (
    <PersistQueryClientProvider ...>
      {/* Другие провайдеры */}
      {children}
    </PersistQueryClientProvider>
  );
};
```

### Изменения в `App.tsx`:

```typescript
// Lazy load провайдеров
const AppProviders = lazy(() => 
  import("@/components/providers/AppProviders").then(m => ({ default: m.AppProviders }))
);

// Условная загрузка только для /app/*
<Route path="/app/*" element={
  <Suspense fallback={<PageLoader />}>
    <AppProviders>
      {/* Приложение */}
    </AppProviders>
  </Suspense>
} />
```

---

## 📊 МЕТРИКИ ДЛЯ ИЗМЕРЕНИЯ

После реализации Этапа 3 нужно проверить:

1. **Bundle-анализ:**
   - `vendor.js` должен уменьшиться
   - Supabase/Query/Radix должны быть в отдельном chunk
   - Initial bundle для `/` должен быть ~150-200 KB

2. **PageSpeed Insights:**
   - PSI Mobile для `/` должен быть 75-80
   - PSI Mobile для `/app` может остаться 66-70 (это нормально)

3. **Реальный UX:**
   - Лендинг должен загружаться быстрее
   - Приложение должно работать как раньше

---

## ✅ ВЫВОДЫ

1. **Bundle-анализ подтвердил проблему:** Supabase/Query/Radix в initial chunk
2. **Решение ясно:** Lazy load провайдеров (Этап 3)
3. **Ожидаемый результат:** PSI Mobile 66 → 75-80 для лендинга
4. **Если нужен 90+:** Разделение лендинга (Этап 4)

**Готовы к реализации Этапа 3!** 🚀
