# 🚀 Применение Миграций для Партнерской Программы 2.0

## 📋 Список Миграций

Миграции применяются **строго в указанном порядке**:

1. `20251202100000_partner_premium_access.sql` - Premium для партнеров (догфудинг)
2. `20251202100001_partner_conversions_funnel.sql` - Воронка конверсий
3. `20251202100002_partner_deep_links_promo.sql` - Deep Links и промокоды
4. `20251202100003_partner_balance_payouts.sql` - Баланс и выплаты
5. `20251202100004_partner_antifraud.sql` - Антифрод система
6. `20251202100005_autoschool_b2b.sql` - B2B для автошкол

---

## 🛠️ Способ 1: Через Supabase Dashboard (Рекомендовано для продакшена)

### Шаги:

1. Открыть [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбрать свой проект
3. Перейти в **SQL Editor**
4. Скопировать содержимое **первой миграции** `20251202100000_partner_premium_access.sql`
5. Вставить в редактор и нажать **Run**
6. Проверить результат (не должно быть ошибок)
7. Повторить для оставшихся 5 миграций **по порядку**

### ✅ Проверка после каждой миграции:

```sql
-- Проверить, что таблицы созданы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'partner%'
ORDER BY table_name;

-- Должны появиться:
-- partner_commission_releases
-- partner_conversions
-- partner_fraud_alerts
-- partner_link_activations (уже есть)
-- partner_links
-- partner_payouts
-- partner_referrals (уже есть)
-- partners (уже есть)
```

---

## 🖥️ Способ 2: Через Supabase CLI (Для локальной разработки)

### Предварительные требования:

```bash
# Установить Supabase CLI (если еще не установлен)
brew install supabase/tap/supabase

# Войти в аккаунт
supabase login
```

### Шаги:

```bash
# 1. Перейти в директорию проекта
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep

# 2. Связать проект (если еще не связан)
supabase link --project-ref your-project-ref

# 3. Применить миграции
supabase db push

# Альтернативно: применить конкретную миграцию
supabase db push --file supabase/migrations/20251202100000_partner_premium_access.sql
```

### ✅ Проверка:

```bash
# Проверить статус миграций
supabase migration list

# Проверить подключение к БД
supabase db remote status
```

---

## 🔬 Способ 3: Через psql (Прямое подключение)

### Получить строку подключения:

1. Supabase Dashboard → Settings → Database
2. Скопировать **Connection String** (формат: `postgresql://...`)

### Применить миграции:

```bash
# Подключиться к базе
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Применить миграцию вручную (пример)
\i supabase/migrations/20251202100000_partner_premium_access.sql

# Выйти
\q
```

---

## 📊 Проверка Успешности Миграций

После применения всех миграций запустить эту проверку в SQL Editor:

```sql
-- 1. Проверить новые таблицы
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
  'partner_conversions',
  'partner_links',
  'partner_payouts',
  'partner_commission_releases',
  'fraud_blacklist',
  'partner_fraud_alerts',
  'autoschool_students'
)
ORDER BY table_name;

-- 2. Проверить новые функции
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%partner%'
ORDER BY routine_name;

-- 3. Проверить новые поля в partners
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'partners'
AND column_name IN (
  'is_partner_premium',
  'partner_premium_activated_at',
  'balance_available',
  'balance_hold',
  'balance_paid',
  'promo_code_discount',
  'promo_code_commission',
  'instructor_mode_enabled'
)
ORDER BY column_name;

-- 4. Проверить новые поля в profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN (
  'partner_premium_active',
  'instructor_mode'
)
ORDER BY column_name;
```

### ✅ Ожидаемый результат:

```
Таблицы:
- partner_conversions (14 колонок)
- partner_links (13 колонок)
- partner_payouts (15 колонок)
- partner_commission_releases (5 колонок)
- fraud_blacklist (7 колонок)
- partner_fraud_alerts (12 колонок)
- autoschool_students (11 колонок)

Функции: ~30 новых функций (track_partner_conversion, apply_partner_promo_code, и т.д.)
```

---

## 🧪 Тестирование После Миграций

### 1. Тест Premium для партнеров:

```sql
-- Создать тестового партнера и одобрить его
INSERT INTO public.partners (
  name,
  email,
  user_id,
  partner_type,
  partner_code,
  registration_status,
  status
) VALUES (
  'Test Partner',
  'test@example.com',
  '00000000-0000-0000-0000-000000000000', -- Замените на реальный UUID пользователя
  'barter',
  'TEST',
  'pending',
  'active'
) RETURNING id;

-- Одобрить партнера (триггер должен активировать Premium)
UPDATE public.partners 
SET registration_status = 'approved'
WHERE partner_code = 'TEST';

-- Проверить, что Premium активирован
SELECT 
  p.partner_code,
  pr.subscription_type,
  pr.subscription_status,
  pr.partner_premium_active
FROM public.partners p
JOIN public.profiles pr ON p.user_id = pr.id
WHERE p.partner_code = 'TEST';

-- Ожидается:
-- subscription_type = 'partner'
-- subscription_status = 'pro'
-- partner_premium_active = true
```

### 2. Тест воронки конверсий:

```sql
-- Записать тестовый клик
SELECT track_partner_conversion(
  p_partner_code := 'TEST',
  p_event_type := 'click',
  p_session_id := 'test-session-123',
  p_utm_campaign := 'test-campaign'
);

-- Проверить статистику
SELECT * FROM get_partner_funnel_stats(
  (SELECT id FROM public.partners WHERE partner_code = 'TEST'),
  7
);
```

### 3. Тест генерации ссылки:

```sql
-- Сгенерировать партнерскую ссылку
SELECT * FROM generate_partner_link(
  (SELECT id FROM public.partners WHERE partner_code = 'TEST'),
  'premium',
  'test-campaign'
);

-- Проверить созданную ссылку
SELECT * FROM public.partner_links
WHERE partner_id = (SELECT id FROM public.partners WHERE partner_code = 'TEST');
```

### 4. Тест промокода:

```sql
-- Применить промокод
SELECT * FROM apply_partner_promo_code(
  '00000000-0000-0000-0000-000000000000', -- Замените на реальный UUID
  'TEST',
  10.00
);

-- Должно вернуть:
-- success = true
-- final_price = 8.00 (при 20% скидке)
-- discount_amount = 2.00
```

---

## 🔄 Откат Миграций (Если что-то пошло не так)

**⚠️ ВНИМАНИЕ: Откат удалит все данные в новых таблицах!**

```sql
-- Откат в обратном порядке

-- 5. Откат autoschool
DROP TABLE IF EXISTS public.autoschool_students CASCADE;
ALTER TABLE public.partners DROP COLUMN IF EXISTS instructor_mode_enabled;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS instructor_mode;

-- 4. Откат antifraud
DROP TABLE IF EXISTS public.partner_fraud_alerts CASCADE;
DROP TABLE IF EXISTS public.fraud_blacklist CASCADE;
DROP FUNCTION IF EXISTS is_fraudulent CASCADE;
DROP FUNCTION IF EXISTS check_self_referral CASCADE;
-- ... и т.д.

-- 3. Откат payouts
DROP TABLE IF EXISTS public.partner_commission_releases CASCADE;
DROP TABLE IF EXISTS public.partner_payouts CASCADE;
ALTER TABLE public.partners DROP COLUMN IF EXISTS balance_available;
ALTER TABLE public.partners DROP COLUMN IF EXISTS balance_hold;
ALTER TABLE public.partners DROP COLUMN IF EXISTS balance_paid;
-- ... и т.д.

-- 2. Откат deep links
DROP TABLE IF EXISTS public.partner_links CASCADE;
ALTER TABLE public.partners DROP COLUMN IF EXISTS promo_code_discount;
ALTER TABLE public.partners DROP COLUMN IF EXISTS promo_code_commission;

-- 1. Откат conversions
DROP TABLE IF EXISTS public.partner_conversions CASCADE;

-- 0. Откат partner premium
ALTER TABLE public.partners DROP COLUMN IF EXISTS is_partner_premium;
ALTER TABLE public.partners DROP COLUMN IF EXISTS partner_premium_activated_at;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS partner_premium_active;
```

---

## 📝 Чеклист После Миграций

- [ ] Все миграции применены без ошибок
- [ ] Проверочные запросы выполнены успешно
- [ ] Тесты пройдены (Premium, воронка, ссылки, промокоды)
- [ ] В логах Supabase нет ошибок
- [ ] RLS политики работают корректно (проверить от имени партнера)
- [ ] Обновить Frontend для использования новых функций

---

## 🎯 Следующие Шаги

После успешного применения миграций:

1. **Обновить Frontend:**
   - `PartnerDashboard.tsx` - добавить воронку конверсий
   - Добавить генератор ссылок
   - Добавить UI для баланса и выплат
   - Добавить промокоды в PaymentModal

2. **Настроить Cron Jobs:**
   - `release_partner_commissions_from_hold()` - каждый день в 00:00
   - `detect_partner_fraud_patterns()` - каждые 6 часов

3. **Обновить Edge Functions:**
   - `process-purchase` - трекинг покупок в воронку
   - Создать `partner-payout-webhook` для уведомлений

4. **Тестирование:**
   - E2E тесты для партнерских ссылок
   - Тесты антифрода
   - Тесты B2B для автошкол

---

**Документ создан:** 2 декабря 2025  
**Автор:** Dimka + AI Assistant  
**Статус:** ✅ Готово к применению






