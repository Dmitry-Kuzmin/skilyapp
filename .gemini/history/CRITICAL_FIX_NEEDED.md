# 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Supabase все еще в initial bundle

## Проблема

`vendor.js` все еще **1,020 KB (314.88 KB gzipped)** - это значит, что Supabase и Query **НЕ ушли** из initial bundle.

## Причина

`UserContext` использует **статический импорт** Supabase:
```typescript
import { supabase } from "@/integrations/supabase/client";
```

И `UserContext` подключен в `main.tsx` (entry point), поэтому Supabase попадает в vendor.js.

## Решение

Нужно сделать Supabase в `UserContext` **динамическим импортом**, но это сложно, так как:
- `UserContext` используется для проверки `isAuthenticated` на лендинге
- Supabase нужен для web users (не для Telegram)

### Варианты:

1. **Создать легкий `LandingUserContext`** без Supabase для лендинга
2. **Сделать Supabase условным** - загружать только для web users
3. **Вынести `UserProvider` в lazy load** - но это сломает проверку `isAuthenticated`

### Рекомендация:

Создать **легкий `LandingUserContext`** который:
- Работает только с Telegram (без Supabase)
- Используется на лендинге
- Полный `UserContext` с Supabase загружается только в приложении

Это даст максимальный эффект: лендинг будет без Supabase вообще.

