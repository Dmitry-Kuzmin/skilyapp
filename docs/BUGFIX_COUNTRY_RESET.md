# 🐛 Баг: Сброс страны и категории при входе — ИСПРАВЛЕН

## 🔍 **Проблема**

Пользователь постоянно терял свои настройки **страны** (`preferred_country`) и **категории прав** (`preferred_license_category`) при каждом новом входе.

### **Симптомы:**
- Пользователь выбирает "Россия" и категорию "B"
- Сохраняет через `ContextSettingsSheet`
- Данные сохраняются в **БД** (таблица `profiles`)
- При новом входе — снова "Испания" (дефолт из localStorage)

---

## 🧪 **Диагностика**

### **1. Проверили логику `PDDContext.tsx`:**
```typescript
// Строка 41-52 в PDDContext.tsx
useEffect(() => {
  if (profileData?.preferred_country && profileData?.preferred_license_category) {
    console.log('[PDDContext] Loading preferences from profile:', {
      country: profileData.preferred_country,
      category: profileData.preferred_license_category
    });
    setSelectedCountryState(profileData.preferred_country as CountryCode);
    setSelectedCategoryState(profileData.preferred_license_category as LicenseCategory);
  }
}, [profileData?.preferred_country, profileData?.preferred_license_category]);
```

✅ **Логика правильная** — при загрузке профиля должна применять настройки из БД.

---

### **2. Проверили `useProfileData.ts`:**

**ПРОБЛЕМА НАЙДЕНА!** ❌

На **строке 23** SQL запрос **НЕ загружал** поля `preferred_country` и `preferred_license_category`:

```typescript
// ❌ БЫЛО (строка 43):
.select("id, coins, xp, streak_days, rank, boosts, first_name, last_name, username, photo_url, equipped_avatar, telegram_id")
```

Результат:
- `profileData.preferred_country` **всегда `undefined`**
- `profileData.preferred_license_category` **всегда `undefined`**
- `PDDContext` не мог загрузить настройки из профиля
- Использовались дефолтные значения из localStorage

---

## ✅ **Решение**

### **Исправление 1: Добавили поля в SQL запрос**
**Файл:** `src/hooks/useProfileData.ts` (строка 43)

```diff
- .select("id, coins, xp, ..., telegram_id")
+ .select("id, coins, xp, ..., telegram_id, preferred_country, preferred_license_category")
```

---

### **Исправление 2: Обновили TypeScript интерфейс**
**Файл:** `src/hooks/useProfileData.ts` (строки 5-18)

```diff
interface ProfileData {
  id: string;
  coins: number;
  ...
  telegram_id: number | null;
+ preferred_country?: string | null;
+ preferred_license_category?: string | null;
}
```

---

### **Исправление 3: Добавили debug-логи**
**Файл:** `src/hooks/useProfileData.ts` (строки 54-62)

```typescript
// Debug: проверяем, что загрузились настройки страны и категории
if (import.meta.env.DEV && data) {
  console.log('[useProfileData] Loaded preferences from DB:', {
    country: data.preferred_country,
    category: data.preferred_license_category
  });
}
```

**Теперь в консоли будет видно:**
```
[useProfileData] Loaded preferences from DB: { country: 'russia', category: 'B' }
[PDDContext] Loading preferences from profile: { country: 'russia', category: 'B' }
```

---

## 🧪 **Как протестировать**

1. **Открыть приложение** (localhost или prod)
2. **Выбрать страну и категорию** через кнопку в Header (например, "Россия | B")
3. **Перезагрузить страницу** (F5 или Cmd+R)
4. **Проверить:**
   - Выбранные настройки **должны сохраниться**
   - В консоли должны быть логи `[useProfileData] Loaded preferences from DB`
   - В консоли должен быть лог `[PDDContext] Loading preferences from profile`

---

## 🗂 **Затронутые файлы**

1. ✅ `src/hooks/useProfileData.ts` — добавлены поля в SQL запрос и интерфейс
2. ✅ `src/contexts/PDDContext.tsx` — без изменений (логика была правильная)
3. ✅ `src/components/shared/ContextSettingsSheet.tsx` — без изменений (сохранение работало)

---

## 🎯 **Корневая причина**

**Неполный SELECT в SQL запросе.**

### **Почему это произошло:**
`useProfileData` был создан для оптимизации (один запрос вместо множества), но при добавлении новых полей (`preferred_country`, `preferred_license_category`) в миграции **забыли обновить SELECT** в хуке.

### **Почему не заметили сразу:**
- Миграция добавила поля в БД ✅
- `ContextSettingsSheet` корректно сохранял данные ✅
- Но `useProfileData` их не загружал ❌
- `PDDContext` использовал fallback из localStorage (казалось, что работает)

---

## 🔐 **Проверка БД**

Поля `preferred_country` и `preferred_license_category` существуют в схеме:

**Миграция:** `supabase/migrations/20251228210000_add_preferred_country_license.sql`
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_country text DEFAULT 'russia',
ADD COLUMN IF NOT EXISTS preferred_license_category text DEFAULT 'B';
```

**Индекс:** Для быстрого поиска по стране:
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_country ON profiles(preferred_country);
```

---

## 📊 **Влияние на пользователей**

### **До исправления:**
- ❌ Настройки сбрасывались при каждом входе
- ❌ Пользователь видел дефолтную страну (Spain)
- ❌ Приходилось каждый раз переключать вручную

### **После исправления:**
- ✅ Настройки загружаются из БД при каждом входе
- ✅ Сохраняются между сессиями
- ✅ Синхронизируются с localStorage для офлайн-режима

---

## 🚀 **Деплой**

Изменения в **клиентском коде** (frontend), **НЕ требуют миграции БД**.

**Перезапустить только:**
- ✅ Frontend (автоматически через Vercel при push)

**НЕ нужно:**
- ❌ Миграции БД (поля уже есть)
- ❌ Edge Functions (не затронуты)

---

## 📝 **Коммит**

```
fix: загрузка preferred_country и preferred_license_category из БД

Проблема: Настройки страны и категории сбрасывались при входе
Причина: useProfileData не загружал эти поля из БД
Решение: Добавил preferred_country и preferred_license_category в SELECT

Затронутые файлы:
- src/hooks/useProfileData.ts: добавлены поля в SQL и интерфейс
- Добавлены debug-логи для проверки загрузки

Тестирование:
- Выбрать страну/категорию → Перезагрузить → Проверить сохранение
- В консоли должны появиться логи с настройками из БД
```

---

## ✅ **Статус:** ИСПРАВЛЕНО

**Дата:** 2026-01-28  
**Автор:** AI Assistant  
**Проверено:** Дим (ожидает тестирования на localhost)
