# 🧪 Партнерская Программа 2.0 - Полный Гайд по Тестированию

> **Дата:** 2 декабря 2025  
> **Время тестирования:** ~45 минут  
> **Статус:** Готово к тестированию

---

## ✅ Prerequisite: Миграции Применены

**КРИТИЧНО:** Убедитесь, что все 6 миграций применены:
- ✅ `20251202100000_partner_premium_access.sql`
- ✅ `20251202100001_partner_conversions_funnel.sql`
- ✅ `20251202100002_partner_deep_links_promo.sql`
- ✅ `20251202100003_partner_balance_payouts.sql`
- ✅ `20251202100004_partner_antifraud.sql`
- ✅ `20251202100005_autoschool_b2b.sql`
- ✅ `20251202100006_fix_function_search_path.sql` (security)

---

## 🎯 Тестовый План (7 этапов)

### ЭТАП 1: Premium для Партнеров (Догфудинг) ✅

#### Цель:
Проверить, что при одобрении партнера автоматически активируется Premium Forever.

#### Шаги:

**1.1. Создать тестового пользователя:**
```sql
-- В Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password)
VALUES ('testpartner@example.com', crypt('testpassword123', gen_salt('bf')));

-- Создать профиль
INSERT INTO profiles (id, full_name, email)
SELECT id, 'Test Partner', 'testpartner@example.com'
FROM auth.users WHERE email = 'testpartner@example.com';
```

**1.2. Создать партнера:**
```sql
INSERT INTO partners (
  name,
  email,
  user_id,
  partner_type,
  partner_code,
  registration_status,
  status
) 
SELECT 
  'Test Partner Blog',
  'testpartner@example.com',
  id,
  'barter',
  'TESTBLOG',
  'pending',
  'active'
FROM auth.users WHERE email = 'testpartner@example.com';
```

**1.3. Одобрить партнера (ТРИГГЕР!):**
```sql
UPDATE partners
SET registration_status = 'approved'
WHERE partner_code = 'TESTBLOG';
```

**1.4. Проверить результат:**
```sql
-- Проверить, что Premium активирован
SELECT 
  p.partner_code,
  p.is_partner_premium,
  pr.subscription_type,
  pr.subscription_status,
  pr.partner_premium_active
FROM partners p
JOIN profiles pr ON p.user_id = pr.id
WHERE p.partner_code = 'TESTBLOG';
```

**✅ Ожидаемый результат:**
```
partner_code: TESTBLOG
is_partner_premium: true
subscription_type: partner
subscription_status: pro
partner_premium_active: true
```

**🎉 Успех если:** Триггер сработал и Premium активирован!

---

### ЭТАП 2: Воронка Конверсий 📊

#### Цель:
Проверить трекинг событий Click → Registration → Purchase.

#### Шаги:

**2.1. Создать тестовые конверсии:**
```sql
-- Клик
SELECT track_partner_conversion(
  p_partner_code := 'TESTBLOG',
  p_event_type := 'click',
  p_session_id := 'test-session-001',
  p_utm_campaign := 'youtube-test',
  p_ip_address := '192.168.1.100'::INET,
  p_user_agent := 'Mozilla/5.0...',
  p_device_type := 'mobile',
  p_os := 'ios'
);

-- Регистрация (через 5 минут)
SELECT track_partner_conversion(
  p_partner_code := 'TESTBLOG',
  p_event_type := 'registration',
  p_user_id := (SELECT id FROM profiles LIMIT 1), -- любой юзер
  p_session_id := 'test-session-001',
  p_utm_campaign := 'youtube-test'
);

-- Покупка (через 1 час)
SELECT track_partner_conversion(
  p_partner_code := 'TESTBLOG',
  p_event_type := 'purchase',
  p_user_id := (SELECT id FROM profiles LIMIT 1),
  p_session_id := 'test-session-001',
  p_purchase_amount := 9.99,
  p_commission_amount := 3.00,
  p_utm_campaign := 'youtube-test'
);
```

**2.2. Проверить статистику:**
```sql
SELECT * FROM get_partner_funnel_stats(
  (SELECT id FROM partners WHERE partner_code = 'TESTBLOG'),
  30
);
```

**✅ Ожидаемый результат:**
```
clicks: 1
installs: 0 (мы не создавали)
registrations: 1
purchases: 1
reg_to_purchase_rate: 100.00
total_revenue: 9.99
total_commission: 3.00
```

**2.3. Открыть Frontend:**
- Войти как партнер `testpartner@example.com`
- Перейти в кабинет `/partner-dashboard`
- Открыть вкладку **"Воронка конверсий"**

**✅ Ожидается:**
```
🔗 Воронка конверсий (последние 30 дней)

1️⃣ Клики:         1  (100%)
   ↓
2️⃣ Регистрации:   1  (100%)
   ↓
3️⃣ Покупки:       1  (100%)

💰 Доход: €9.99
💸 Ваша комиссия: €3.00
```

---

### ЭТАП 3: Генератор Deep Links 🔗

#### Цель:
Создать партнерскую ссылку через UI.

#### Шаги:

**3.1. Открыть вкладку "Генератор ссылок"**
- В `/partner-dashboard`
- Перейти на вкладку **"Генератор ссылок"**

**3.2. Заполнить форму:**
```
Куда вести пользователя? → ⭐ Страница Premium
Название кампании → youtube-review-20dec
```

**3.3. Нажать "Сгенерировать ссылку"**

**✅ Ожидается:**
```
Ваша партнерская ссылка готова! 🎉
https://skily.app/go/TESTBLOG-A3F2

[QR-код отображается]
[Кнопка "Скопировать ссылку"]
```

**3.4. Проверить в БД:**
```sql
SELECT * FROM partner_links
WHERE partner_id = (SELECT id FROM partners WHERE partner_code = 'TESTBLOG')
ORDER BY created_at DESC
LIMIT 1;
```

**✅ Ожидается:**
```
link_code: TESTBLOG-A3F2
destination: premium
utm_campaign: youtube-review-20dec
clicks_count: 0
is_active: true
```

**3.5. Открыть ссылку:**
- Скопировать `https://skily.app/go/TESTBLOG-A3F2`
- Открыть в новой вкладке

**✅ Ожидается:**
- Редирект на страницу Premium
- В БД `clicks_count` увеличился до 1

---

### ЭТАП 4: Промокоды 🎟️

#### Цель:
Применить промокод и получить скидку при покупке.

#### Шаги:

**4.1. Создать промокод в БД:**
```sql
UPDATE partners
SET 
  promo_code = 'TEST20',
  promo_code_discount = 20,
  promo_code_commission = 0.30
WHERE partner_code = 'TESTBLOG';
```

**4.2. Открыть модалку покупки:**
- Войти как обычный пользователь (НЕ партнер)
- Открыть Premium Plan Selector
- Выбрать любой план (например, Monthly €9.99)

**4.3. Ввести промокод:**
```
Поле "Введите промокод" → TEST20
Нажать "Применить"
```

**✅ Ожидается:**
```
✅ Промокод активирован! TEST20
💰 Скидка: 20%
💳 Итого: €7.99 (было €9.99)
```

**4.4. Проверить в БД:**
```sql
SELECT * FROM apply_partner_promo_code(
  (SELECT id FROM profiles WHERE email != 'testpartner@example.com' LIMIT 1),
  'TEST20',
  9.99
);
```

**✅ Ожидается:**
```
success: true
final_price: 7.99
discount_amount: 2.00
discount_percent: 20
partner_id: [UUID партнера]
commission_rate: 0.30
```

**4.5. Проверка Self-Referral Protection:**
```sql
-- Попробовать применить промокод от имени самого партнера
SELECT * FROM apply_partner_promo_code(
  (SELECT user_id FROM partners WHERE partner_code = 'TESTBLOG'),
  'TEST20',
  9.99
);
```

**✅ Ожидается:**
```
success: false
message: "You cannot use your own promo code"
```

---

### ЭТАП 5: Баланс и Выплаты 💰

#### Цель:
Проверить систему баланса с hold period.

#### Шаги:

**5.1. Добавить тестовую комиссию в hold:**
```sql
SELECT add_partner_commission_to_hold(
  (SELECT id FROM partners WHERE partner_code = 'TESTBLOG'),
  15.50, -- €15.50
  NULL
);
```

**5.2. Проверить баланс:**
```sql
SELECT 
  balance_available,
  balance_hold,
  balance_paid
FROM partners
WHERE partner_code = 'TESTBLOG';
```

**✅ Ожидается:**
```
balance_available: 0.00 (еще в холде)
balance_hold: 15.50
balance_paid: 0.00
```

**5.3. Открыть Frontend:**
- Войти как партнер
- Перейти на вкладку **"Баланс"**

**✅ Ожидается:**
```
Доступно к выводу: €0.00
В холде (14 дней): €15.50
Всего выплачено: €0.00

[Кнопка "Запросить вывод" НЕАКТИВНА]
Минимальная сумма: €50
```

**5.4. Симулировать перевод из hold (cron job):**
```sql
-- Вручную изменить дату конверсии на 15 дней назад
UPDATE partner_conversions
SET created_at = NOW() - INTERVAL '15 days'
WHERE partner_id = (SELECT id FROM partners WHERE partner_code = 'TESTBLOG')
AND commission_amount > 0;

-- Запустить функцию перевода
SELECT * FROM release_partner_commissions_from_hold();
```

**✅ Ожидается:**
```
partner_id: [UUID]
amount_released: 15.50
purchases_count: 1
```

**5.5. Проверить баланс после:**
```sql
SELECT 
  balance_available,
  balance_hold
FROM partners
WHERE partner_code = 'TESTBLOG';
```

**✅ Ожидается:**
```
balance_available: 15.50 (переведено из hold!)
balance_hold: 0.00
```

**5.6. Запросить выплату через UI:**
- Обновить страницу
- Кнопка "Запросить вывод" теперь НЕАКТИВНА (€15.50 < €50 минимум)
- Добавить еще комиссии, чтобы было ≥€50:

```sql
SELECT add_partner_commission_to_hold(
  (SELECT id FROM partners WHERE partner_code = 'TESTBLOG'),
  40.00,
  NULL
);

-- Сразу перевести в available (для теста)
UPDATE partners
SET 
  balance_available = balance_available + 40.00,
  balance_hold = balance_hold - 40.00
WHERE partner_code = 'TESTBLOG';
```

**5.7. Запросить выплату:**
- Обновить страницу
- Нажать "Запросить вывод средств"
- Заполнить форму:
  ```
  Сумма: €55.50
  Способ: PayPal
  Email: testpartner@example.com
  ```
- Нажать "Запросить выплату"

**✅ Ожидается:**
```
✅ "Запрос на выплату создан. Мы обработаем его в течение 48 часов"
```

**5.8. Проверить в БД:**
```sql
SELECT * FROM partner_payouts
WHERE partner_id = (SELECT id FROM partners WHERE partner_code = 'TESTBLOG')
ORDER BY requested_at DESC
LIMIT 1;
```

**✅ Ожидается:**
```
amount: 55.50
payout_method: paypal
status: pending
payout_details: {"email": "testpartner@example.com"}
```

---

### ЭТАП 6: Антифрод 🛡️

#### Цель:
Проверить детектирование мошеннических паттернов.

#### Шаги:

**6.1. Self-Referral Test:**
```sql
-- Попытка партнера использовать свою ссылку
SELECT check_self_referral(
  (SELECT id FROM partners WHERE partner_code = 'TESTBLOG'),
  (SELECT user_id FROM partners WHERE partner_code = 'TESTBLOG')
);
```

**✅ Ожидается:** `true` (self-referral detected)

**6.2. Создать подозрительную активность (100 кликов с одного IP):**
```sql
-- Создать 100 кликов за 1 час
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM track_partner_conversion(
      'TESTBLOG',
      'click',
      NULL,
      'session-' || i,
      NULL,
      'test',
      'social',
      'fraud-test',
      NULL,
      NULL,
      '192.168.1.1'::INET,
      'TestBot/1.0'
    );
  END LOOP;
END $$;
```

**6.3. Запустить детектор fraud:**
```sql
SELECT * FROM detect_partner_fraud_patterns();
```

**✅ Ожидается:**
```
partner_id: [UUID TESTBLOG]
alert_type: high_click_volume
severity: high
description: "100 clicks from single IP 192.168.1.1 in last hour"
metadata: {"ip_address": "192.168.1.1", "click_count": 100}
```

**6.4. Проверить алерты в БД:**
```sql
SELECT * FROM partner_fraud_alerts
WHERE partner_id = (SELECT id FROM partners WHERE partner_code = 'TESTBLOG')
ORDER BY created_at DESC;
```

**✅ Ожидается:** Создан fraud alert со статусом `pending`

---

### ЭТАП 7: B2B для Автошкол 🎓

#### Цель:
Проверить функционал отслеживания прогресса студентов.

#### Шаги:

**7.1. Создать автошколу:**
```sql
-- Создать партнера типа autoschool
INSERT INTO partners (
  name,
  email,
  user_id,
  partner_type,
  partner_code,
  registration_status,
  status,
  instructor_mode_enabled
) 
VALUES (
  'AutoEscuela Madrid',
  'autoschool@example.com',
  (SELECT id FROM auth.users WHERE email = 'testpartner@example.com'), -- используем тестового юзера
  'autoschool',
  'AUTOMD',
  'approved',
  'active',
  true
);
```

**7.2. Добавить тестовых студентов:**
```sql
-- Добавить 3 студентов с разным прогрессом
DO $$
DECLARE
  v_autoschool_id UUID;
  v_student_id UUID;
BEGIN
  SELECT id INTO v_autoschool_id FROM partners WHERE partner_code = 'AUTOMD';

  -- Студент 1: Готов к экзамену
  INSERT INTO profiles (full_name, total_tests_taken, total_questions_answered, correct_answers)
  VALUES ('Иван Петров', 20, 600, 570)
  RETURNING id INTO v_student_id;
  
  INSERT INTO autoschool_students (partner_id, user_id, student_group)
  VALUES (v_autoschool_id, v_student_id, 'Группа А');

  -- Студент 2: Почти готов
  INSERT INTO profiles (full_name, total_tests_taken, total_questions_answered, correct_answers)
  VALUES ('Мария Сидорова', 12, 360, 310)
  RETURNING id INTO v_student_id;
  
  INSERT INTO autoschool_students (partner_id, user_id, student_group)
  VALUES (v_autoschool_id, v_student_id, 'Группа А');

  -- Студент 3: Не готов
  INSERT INTO profiles (full_name, total_tests_taken, total_questions_answered, correct_answers)
  VALUES ('Алексей Смирнов', 3, 90, 40)
  RETURNING id INTO v_student_id;
  
  INSERT INTO autoschool_students (partner_id, user_id, student_group)
  VALUES (v_autoschool_id, v_student_id, 'Группа Б');
END $$;
```

**7.3. Проверить функцию прогресса:**
```sql
SELECT * FROM get_autoschool_students_progress(
  (SELECT id FROM partners WHERE partner_code = 'AUTOMD')
);
```

**✅ Ожидается:**
```
Иван Петров:
  total_tests_taken: 20
  accuracy_rate: 95.0
  exam_ready: true ✅
  readiness_status: ready

Мария Сидорова:
  total_tests_taken: 12
  accuracy_rate: 86.1
  exam_ready: false
  readiness_status: almost_ready ⚠️

Алексей Смирнов:
  total_tests_taken: 3
  accuracy_rate: 44.4
  exam_ready: false
  readiness_status: not_ready ❌
```

**7.4. Проверить сводку:**
```sql
SELECT * FROM get_autoschool_summary(
  (SELECT id FROM partners WHERE partner_code = 'AUTOMD')
);
```

**✅ Ожидается:**
```
total_students: 3
active_students: 3
ready_for_exam: 1
almost_ready: 1
avg_accuracy: 75.2
avg_tests_per_student: 11.7
```

**7.5. Открыть Frontend:**
- Войти как автошкола
- Перейти на вкладку **"Мои Студенты"**

**✅ Ожидается:**
```
🎓 Мои Студенты (3 человека)

┌────────────────────────────────────────────────────┐
│ Иван Петров    │ 20 │ 95.0% │ ✅ Готов к экзамену  │
│ Мария Сидорова │ 12 │ 86.1% │ ⚠️ Почти готов      │
│ Алексей Смирнов│  3 │ 44.4% │ ❌ Не готов         │
└────────────────────────────────────────────────────┘

Сводка:
• Готовы: 1
• Почти готовы: 1
• Нужна подготовка: 1
```

---

## 📊 Сводная Таблица Результатов

| Этап | Компонент | Ожидаемый Результат | Статус |
|------|-----------|---------------------|--------|
| 1 | Partner Premium | subscription_type = 'partner' | ⏳ |
| 2 | Воронка конверсий | Показывает клики/рег/покупки | ⏳ |
| 3 | Генератор ссылок | Создает ссылку + QR-код | ⏳ |
| 4 | Промокоды | Скидка 20%, блок self-referral | ⏳ |
| 5 | Баланс | Hold → Available через 14 дней | ⏳ |
| 6 | Антифрод | Детектирует 100 кликов с 1 IP | ⏳ |
| 7 | B2B Автошколы | Показывает готовность студентов | ⏳ |

---

## 🐛 Troubleshooting

### Проблема: "Function does not exist"
**Причина:** Миграции не применены  
**Решение:** Применить миграции 0-6 по порядку

### Проблема: "Permission denied"
**Причина:** RLS политики блокируют доступ  
**Решение:** Проверить, что пользователь имеет `user_id` в таблице `partners`

### Проблема: TypeScript ошибки в компонентах
**Причина:** Новые RPC функции не в типах  
**Решение:** Добавить `// @ts-ignore` перед вызовами RPC или обновить типы:
```bash
npx supabase gen types typescript --project-ref YOUR_REF > src/integrations/supabase/types.ts
```

### Проблема: "Недостаточно средств" при выводе
**Причина:** balance_available < min_payout_amount (€50)  
**Решение:** Добавить больше тестовых комиссий через `add_partner_commission_to_hold()`

---

## ✅ Acceptance Criteria

Тестирование считается успешным, если:

- ✅ При одобрении партнера автоматически активируется Premium
- ✅ Воронка конверсий отображает корректную статистику
- ✅ Генератор создает уникальные ссылки с QR-кодами
- ✅ Промокоды применяются и дают скидку
- ✅ Self-referral блокируется
- ✅ Комиссии переводятся из hold в available через 14 дней
- ✅ Fraud alerts создаются при подозрительной активности
- ✅ Автошколы видят прогресс студентов с индикатором готовности
- ✅ Все компоненты загружаются без ошибок

---

## 🎯 После Тестирования

- [ ] Удалить тестовые данные
- [ ] Задокументировать найденные баги
- [ ] Обновить Frontend если нужно
- [ ] Подготовить продакшн

---

**Документ создан:** 2 декабря 2025  
**Автор:** AI Assistant  
**Статус:** ✅ Готов к использованию





