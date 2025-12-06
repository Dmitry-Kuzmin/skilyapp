# 🔍 Анализ Bundle и исправление проблем

## Проблема 1: Supabase все еще в initial bundle

**Причина:** `UserContext` использует статический импорт Supabase и подключен в `main.tsx` (entry point).

**Решение:** Сделать Supabase в `UserContext` динамическим импортом (как в `referralService`).

## Проблема 2: GitHub Actions не передает переменные окружения

**Причина:** В `.github/workflows/deploy.yml` нет шага для установки `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`.

**Решение:** Добавить шаг с переменными окружения из GitHub Secrets.

## Текущие размеры bundle:

- `vendor-3Lezgfwt.js`: 1,020.45 kB (314.88 kB gzipped) ❌ **Слишком большой!**
- `index-D-iw5gzg.js`: 295.83 kB (100.65 kB gzipped)
- `AppProviders-YtKp_asT.js`: 2.3 KB ✅ **Отдельный chunk!**
- `AppRoutes-CSK6_Smq.js`: 16 KB ✅ **Отдельный chunk!**

## Ожидаемый результат после исправления:

- `vendor.js`: ~700-800 KB (200-250 KB gzipped) - без Supabase/Query
- Initial bundle для лендинга: ~150-200 KB
- PSI Mobile: 66 → 75-80

