# 🚀 Партнерская Программа 2.0 - Полный План Модернизации

> **Дата создания:** 2 декабря 2025  
> **Статус:** В разработке  
> **Цель:** Создать прозрачную, автоматизированную и мотивирующую партнерскую программу для блогеров и автошкол

---

## 📊 Текущее Состояние (Что уже есть)

### ✅ Реализовано:
- ✅ Базовая таблица `partners` с полями статуса и типов
- ✅ Система `premium_keys` (бартер - раздача ключей)
- ✅ Партнерские ссылки (`partner_link_activations`) с лимитами
- ✅ Кабинет партнера (`PartnerDashboard.tsx`) с QR-кодами
- ✅ Админ-панель для модерации заявок (`AdminPartners.tsx`)
- ✅ Функция `activate_partner_premium` (30 дней Premium при регистрации по ссылке)
- ✅ Anti-fraud базовый (daily/monthly limits, IP tracking)
- ✅ Таблица `partner_referrals` (заготовка для revenue share)
- ✅ Marketing materials (рекламные материалы для партнеров)

### ❌ Чего НЕТ (согласно ТЗ 2025):
- ❌ **Автоматический Premium для партнеров** (догфудинг)
- ❌ **Прозрачная воронка конверсий** (Клики → Установки → Регистрации → Покупки)
- ❌ **Генератор Deep Links** с UTM-метками
- ❌ **Промокоды** для Revenue Share модели (со скидками)
- ❌ **Баланс с холдом** (hold period для возвратов платежей)
- ❌ **Система выплат** (payout requests) с PayPal/SEPA
- ❌ **Когортный анализ** (LTV партнеров)
- ❌ **Self-billing** система (генерация счетов для Испании)
- ❌ **B2B кабинет для автошкол** (мониторинг прогресса студентов)
- ❌ **Антифрод 2.0** (детектор накрутки, self-referral блок)
- ❌ **RevShare интеграция** с реальными платежами

---

## 🎯 План Улучшений (Поэтапно)

### 🔥 ЭТАП 0: Premium для Партнеров (СРОЧНО!)
**Цель:** Партнер получает полный доступ к продукту для создания качественного контента.

**Почему это критично:**
1. **Догфудинг:** Нельзя продавать то, чего не видел
2. **Качество контента:** Партнер должен показывать Premium-функции в рилсах
3. **Психология VIP-статуса:** Чувство привилегии = больше мотивации

#### Реализация:

**Вариант А: Partner Premium Status (Рекомендовано)**
```sql
ALTER TABLE public.partners
ADD COLUMN is_partner_premium BOOLEAN DEFAULT true; -- Автоматически true при одобрении

-- При одобрении партнера автоматически даем Premium
CREATE OR REPLACE FUNCTION grant_partner_premium_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registration_status = 'approved' AND OLD.registration_status != 'approved' THEN
    -- Если у партнера есть user_id, даем ему Premium Forever
    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET 
        subscription_type = 'partner',
        subscription_status = 'pro',
        premium_until = NULL, -- NULL = бессрочно (пока is_partner_premium = true)
        partner_premium_active = true
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grant_partner_premium
AFTER UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION grant_partner_premium_on_approval();
```

**Вариант Б: NFR-ключи (6 месяцев)**
- Выдаем специальный ключ со сроком действия 6 месяцев
- При истечении партнер пишет для продления → повод обсудить результаты

#### Особый случай: Автошколы

**Режим "Инструктор"** (Фича на будущее):
```sql
ALTER TABLE public.profiles
ADD COLUMN instructor_mode BOOLEAN DEFAULT false;

-- Только партнеры-автошколы могут включить режим инструктора
CREATE POLICY "Partners can enable instructor mode"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.user_id = profiles.id
    AND partners.partner_type = 'autoschool'
    AND partners.registration_status = 'approved'
  )
);
```

**Что делает Instructor Mode:**
- Показывает правильные ответы сразу (без клика)
- Режим быстрого пролистывания билетов
- Возможность открыть любой тест без ограничений
- Статистика по всем студентам

---

### ЭТАП 1: Воронка Конверсий и Аналитика (Приоритет: CRITICAL)
**Цель:** Партнер должен видеть КАЖДЫЙ шаг воронки в реальном времени.

#### 1.1 Новая Таблица: `partner_conversions`
Отслеживает путь пользователя:
- **Click** → Пользователь кликает на партнерскую ссылку
- **Install** → Установка приложения (для мобильных)
- **Registration** → Регистрация в приложении
- **Purchase** → Покупка Premium

**Связь событий:** Через `session_id` (генерируется на фронте, хранится в localStorage)

```sql
CREATE TABLE public.partner_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL,
  
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'install', 'registration', 'purchase')),
  
  -- Tracking
  user_id UUID REFERENCES public.profiles(id),
  session_id TEXT, -- Связывает анонимный клик с регистрацией
  device_id TEXT,
  
  -- UTM метки
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Аналитика
  ip_address INET,
  user_agent TEXT,
  country_code TEXT,
  device_type TEXT,
  os TEXT,
  
  -- Для покупок
  purchase_id UUID REFERENCES public.purchases(id),
  purchase_amount DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 1.2 Dashboard: Воронка в реальном времени

**В кабинете партнера:**
```
🔗 Воронка конверсий (последние 30 дней)

1️⃣ Клики:         1,234  (100%)
   ↓
2️⃣ Установки:       892  (72.3%) ← Клик в установку
   ↓
3️⃣ Регистрации:     567  (63.6%) ← Установка в регистрацию
   ↓
4️⃣ Покупки:          45  (7.9%)  ← Регистрация в покупку 🎯

💰 Доход: €450.00
💸 Ваша комиссия: €135.00 (30%)
```

#### 1.3 График по дням
Показывает динамику конверсий за последние 30 дней (для выявления пиков после постов).

---

### ЭТАП 2: Генератор Deep Links и Промокоды
**Цель:** Партнер создает ссылки "в два клика".

#### 2.1 UI: Генератор ссылок

**В кабинете партнера → вкладка "🔗 Генератор ссылок"**

```
┌─────────────────────────────────────┐
│ Куда вести пользователя?            │
│ ○ Главная страница                  │
│ ● Страница Premium                  │
│ ○ Конкретный тест: [выбрать тест ▼] │
│ ○ Страница оплаты (для разогретых)  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Название кампании (для вашей аналитики) │
│ [youtube-review-20dec        ]      │
└─────────────────────────────────────┘

[✨ Сгенерировать ссылку]

Результат:
┌──────────────────────────────────────┐
│ https://skily.app/go/MIGUEL-A3F2     │
│ [📋 Копировать] [🔗 Открыть]         │
└──────────────────────────────────────┘

Статистика по этой ссылке:
Кликов: 234 | Регистраций: 12 | Покупок: 2
```

#### 2.2 Промокоды (Revenue Share)

**Таблица в профиле партнера:**
```sql
ALTER TABLE public.partners
ADD COLUMN promo_code TEXT UNIQUE, -- 'MIGUEL20'
ADD COLUMN promo_code_discount INTEGER DEFAULT 20, -- 20% скидка для юзера
ADD COLUMN promo_code_commission DECIMAL(5,2) DEFAULT 0.30; -- 30% партнеру
```

**Логика:**
1. Пользователь вводит `MIGUEL20` на странице оплаты
2. Цена: ~~€10~~ → **€8** (-20%)
3. Партнер получает: €8 × 30% = **€2.40**

**Где вводить промокод:**
- В `PaymentModal.tsx` добавить поле "Промокод"
- При вводе проверять через `apply_partner_promo_code()`
- Показывать зеленую галочку: "✅ Промокод применен! Скидка -20%"

---

### ЭТАП 3: Баланс, Hold Period и Система Выплат
**Цель:** Партнер видит доступные деньги и может запросить вывод.

#### 3.1 Структура Баланса

```sql
ALTER TABLE public.partners
ADD COLUMN balance_available DECIMAL(10,2) DEFAULT 0.00, -- Доступно к выводу
ADD COLUMN balance_hold DECIMAL(10,2) DEFAULT 0.00, -- Заморожено (14 дней)
ADD COLUMN balance_paid DECIMAL(10,2) DEFAULT 0.00, -- Всего выплачено
ADD COLUMN hold_period_days INTEGER DEFAULT 14, -- Период заморозки
ADD COLUMN min_payout_amount DECIMAL(10,2) DEFAULT 50.00; -- Минимум для вывода (€50)
```

**Почему Hold Period:**
- App Store/Google Play могут вернуть платеж в течение 14 дней
- Защита от возвратов и споров

**Логика:**
1. Пользователь покупает Premium → комиссия идет в `balance_hold`
2. Через 14 дней автоматически переходит в `balance_available`
3. Партнер может вывести деньги когда `balance_available >= 50`

#### 3.2 Таблица: `partner_payouts`
```sql
CREATE TABLE public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  payout_method TEXT NOT NULL CHECK (payout_method IN ('paypal', 'sepa', 'usdt', 'wise')),
  payout_details JSONB, -- {email: "partner@example.com"} or {iban: "ES..."}
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  invoice_number TEXT,
  invoice_url TEXT,
  
  admin_notes TEXT,
  rejection_reason TEXT
);
```

#### 3.3 UI: Вывод средств

**В кабинете партнера → вкладка "💰 Баланс"**

```
┌─────────────────────────────────────────┐
│ Доступно к выводу:     €156.50         │
│ В холде (14 дней):     €42.00          │
│ Всего выплачено:       €890.00         │
└─────────────────────────────────────────┘

[💸 Запросить вывод средств]

История выплат:
┌──────────────────────────────────────────┐
│ 15.11.2025 | €120.00 | PayPal | ✅ Оплачено │
│ 10.10.2025 | €85.50  | SEPA   | ✅ Оплачено │
│ 02.12.2025 | €156.50 | PayPal | ⏳ Ожидает  │
└──────────────────────────────────────────┘
```

**Диалог "Запрос выплаты":**
```
Сумма к выводу: [€156.50] (Минимум: €50)

Способ выплаты:
○ PayPal (самый быстрый, комиссия 2%)
○ SEPA (банковский перевод, 3-5 дней)
○ USDT (крипта, для опытных)

Email/IBAN: [partner@gmail.com]

[✅ Запросить выплату]
```

---

### ЭТАП 4: Антифрод 2.0 (Advanced)
**Цель:** Детектировать ботов, накрутку и self-referral.

#### 4.1 Self-Referral Detection
**Проблема:** Партнер использует свой промокод для получения скидки.

**Решение:**
```sql
CREATE OR REPLACE FUNCTION check_self_referral(
  p_partner_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.partners
    WHERE id = p_partner_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Добавить проверку в функцию покупки
IF check_self_referral(v_partner_id, p_user_id) THEN
  RAISE EXCEPTION 'Self-referral is not allowed';
END IF;
```

#### 4.2 Bot Detection (IP/User-Agent Analysis)
**Паттерны ботов:**
- 100+ кликов с одного IP за час
- User-Agent содержит "bot", "curl", "python"
- Одинаковые session_id с разных IP

**Таблица:**
```sql
CREATE TABLE public.fraud_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('ip', 'user_agent', 'device_id')),
  value TEXT NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4.3 Админ-панель: Fraud Alerts
**В AdminPartners.tsx → вкладка "🛡️ Антифрод"**

```
🚨 Подозрительная активность:

⚠️ Партнер: Miguel Santos
   Причина: 100 кликов с одного IP за 1 час
   IP: 192.168.1.1
   [🔍 Подробнее] [🚫 Заблокировать IP]

⚠️ Партнер: AutoEscuela Madrid
   Причина: Конверсия <0.1% (вероятно боты)
   [📊 Посмотреть статистику] [💬 Связаться]
```

---

### ЭТАП 5: B2B для Автошкол (Killer Feature)
**Цель:** Автошкола видит прогресс своих студентов в реальном времени.

#### 5.1 Таблица: `autoschool_students`
```sql
CREATE TABLE public.autoschool_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  student_name TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(partner_id, user_id)
);
```

#### 5.2 UI: "Мои Студенты"

**В кабинете автошколы:**

```
🎓 Мои Студенты (24 человека)

┌─────────────────────────────────────────────────────────┐
│ Имя            │ Тестов │ Точность │ Готовность        │
├─────────────────────────────────────────────────────────┤
│ Иван Петров    │   45   │   94%    │ ✅ Готов к экзамену│
│ Мария Сидорова │   12   │   78%    │ ⚠️ Нужна подготовка│
│ Алексей Смирнов│    3   │   45%    │ ❌ Только начал    │
└─────────────────────────────────────────────────────────┘

Критерии готовности:
✅ Готов: >10 тестов, >90% точность
⚠️ Почти готов: >5 тестов, >80% точность
❌ Не готов: <5 тестов или <80% точность
```

**Киллер-фича:** Автошкола может планировать экзамены, глядя на статистику!

#### 5.3 Режим "Инструктор"
**В настройках профиля автошколы:**

```
⚙️ Настройки аккаунта

[x] Режим инструктора
    Показывает правильные ответы сразу, без клика.
    Для использования на занятиях с учениками.
```

**Что меняется в UI:**
- В тестах правильные ответы подсвечены зеленым (без клика)
- Кнопка "Следующий вопрос" вместо "Проверить"
- Режим "Быстрый просмотр" (все вопросы билета одним списком)

---

## 📅 Приоритизация (Roadmap)

### 🔥 WEEK 1: ЭТАП 0 (Критично - Догфудинг)
- [x] Создать миграцию для автоматической выдачи Premium партнерам
- [ ] Добавить поле `is_partner_premium` в таблицу `partners`
- [ ] Триггер на одобрение партнера → автоматическая активация Premium
- [ ] UI: Показывать бейдж "Partner Premium" в профиле

### 🚀 WEEK 2-3: ЭТАП 1 (Воронка конверсий)
- [ ] Создать таблицу `partner_conversions`
- [ ] Функция `track_partner_conversion()`
- [ ] Добавить трекинг кликов в `DeepLinkHandler.tsx`
- [ ] Трекинг регистраций в `AuthModal.tsx`
- [ ] Трекинг покупок в `process-purchase` Edge Function
- [ ] UI: Воронка в кабинете партнера с графиком

### 💡 WEEK 4-5: ЭТАП 2 (Deep Links + Промокоды)
- [ ] Таблица `partner_links`
- [ ] Функция `generate_partner_link()`
- [ ] UI: Генератор ссылок в кабинете
- [ ] Добавить промокоды в `PaymentModal.tsx`
- [ ] Функция `apply_partner_promo_code()`
- [ ] UI: Поле ввода промокода + применение скидки

### 💰 WEEK 6-7: ЭТАП 3 (Баланс и Выплаты)
- [ ] Расширить `partners` полями баланса
- [ ] Таблица `partner_payouts`
- [ ] Функция `request_partner_payout()`
- [ ] Cron-job для перевода из hold в available (14 дней)
- [ ] UI: Вкладка "Баланс" в кабинете
- [ ] UI: Диалог запроса выплаты
- [ ] Админка: Обработка запросов на выплаты

### 🛡️ WEEK 8: ЭТАП 4 (Антифрод)
- [ ] Таблица `fraud_blacklist`
- [ ] Функция `check_self_referral()`
- [ ] Функция `is_fraudulent()`
- [ ] Алерты в админке
- [ ] Автоматическая блокировка по паттернам

### 🎓 WEEK 9+: ЭТАП 5 (B2B Автошколы)
- [ ] Таблица `autoschool_students`
- [ ] Функция `get_autoschool_students_progress()`
- [ ] UI: Вкладка "Мои Студенты"
- [ ] Режим "Инструктор" в настройках
- [ ] Адаптация UI тестов для режима инструктора

---

## 🎯 Метрики Успеха
- **Активных партнеров:** +50 в первые 3 месяца
- **Конверсия клик → покупка:** >5% (цель: 7%)
- **LTV партнера:** >€500 за первые 6 месяцев
- **Fraud Rate:** <2% от всех конверсий
- **Payout Time:** <48 часов после запроса
- **Partner Satisfaction:** >4.5/5 (опрос)

---

## 💡 Идеи Бизнес-Моделей для Разных Партнеров

### Модель 1: "Амбассадор" (Для блогеров-иммигрантов)
**Оффер:**  
- Твои подписчики получают -20% по промокоду `MIGUEL20`
- Ты получаешь 30% от **первого** платежа (€3 за каждую продажу)

**Почему сработает:**  
- Блогеру не стыдно (дает скидку)
- Тебе выгодно (платишь только с реальных денег)

**Выплата:** Раз в месяц, от €50

---

### Модель 2: "Автошкола PRO" (B2B SaaS)
**Оффер:**  
- Купи 50 ключей Premium со скидкой 60% (€4 вместо €10)
- Включи их в цену обучения (продай за €20 или дари бонусом)
- Получи доступ к кабинету с прогрессом студентов

**Почему сработает:**  
- Автошкола экономит на разработке своего приложения
- Получает IT-продукт под своим брендом
- Ты получаешь сразу 50 продаж (€200)

---

### Модель 3: "Бартерный Лид" (Для страховых агентов)
**Оффер:**  
- В приложении баннер: "Сдал на права? Застрахуй машину у партнера X"
- Ты передаешь лид агенту
- Агент платит €10-20 за лид

**Когда запускать:** Когда будет >10,000 активных пользователей

---

## 💳 Система Выплат (Техническая Часть)

### Способы вывода:
1. **PayPal** (самый популярный для блогеров)
   - Комиссия: 2%
   - Время: мгновенно
   
2. **SEPA** (для юрлиц в Испании)
   - Комиссия: 0€
   - Время: 3-5 дней
   - Требуется: IBAN, имя получателя
   
3. **Wise** (для международных партнеров)
   - Комиссия: 1%
   - Время: 1-2 дня
   
4. **USDT** (для продвинутых номадов)
   - Комиссия: gas fee
   - Время: 10-30 минут

### Self-Billing (Генерация счетов для Испании)
**Проблема:** В Испании строгая налоговая. Нужны "Facturas".

**Решение:**  
Партнер заполняет налоговые данные (NIE/CIF) в кабинете.  
При выводе система генерирует PDF-инвойс от имени партнера к тебе.

**Таблица:**
```sql
ALTER TABLE public.partners
ADD COLUMN tax_id TEXT, -- NIE/CIF
ADD COLUMN tax_address TEXT, -- Адрес для счета
ADD COLUMN tax_name TEXT; -- Юр. имя (для компаний)
```

**NPM библиотеки для генерации PDF:**
- `pdfkit` (Node.js)
- `jspdf` (Frontend)

---

## 🔗 Интеграции (Будущее)

### 1. Telegram Bot для партнеров
**Что делает:**
- Уведомления о конверсиях в реальном времени
- Команда `/stats` → статистика за сегодня
- Команда `/balance` → доступный баланс

### 2. Webhook система
**Для крупных партнеров:**
- Отправка события `purchase` на URL партнера
- Формат: JSON с данными о покупке
- Подпись HMAC для безопасности

### 3. API для автошкол
**REST API:**
- `GET /api/partner/students` → список студентов с прогрессом
- `POST /api/partner/students/add` → добавить студента
- Для интеграции с их CRM-системой

### 4. Zapier/Make.com
**Автоматизация:**
- Новая покупка → уведомление в Slack админу
- Запрос на выплату → задача в Notion
- Новый партнер → письмо в Mailchimp

---

## 🏆 Киллер-Фичи для Продаж

### 1. "Autopilot Mode"
Партнер настраивает ссылку 1 раз → получает деньги автоматически.  
Никаких ручных действий, просто мониторит статистику.

### 2. "Student Success Dashboard"
Автошкола видит, кто готов к экзамену → может планировать экзамены.  
Это может принести больше денег, чем розничные продажи!

### 3. "Smart Pricing"
Динамическая комиссия:
- 0-10 продаж: 20% комиссии
- 11-50 продаж: 25% комиссии
- 51-100 продаж: 30% комиссии
- 100+ продаж: 35% комиссии

**Мотивация:** Партнер видит, что чем больше продает, тем выгоднее ему.

---

## 📧 Шаблон Письма Одобренному Партнеру

```
Тема: 🎉 Ваша заявка на партнерство одобрена!

Привет, {Имя}!

Рад сообщить, что ваша заявка на партнерскую программу Skily одобрена!

🎁 Что я сделал для вас:
✅ Активировал Partner Premium Forever на вашем аккаунте
✅ Создал вашу персональную партнерскую ссылку
✅ Подготовил рекламные материалы (баннеры, логотипы)

🔗 Ваша партнерская ссылка:
https://skily.app/partner/{КОД}

💰 Условия:
• Ваши подписчики получают Premium на 30 дней бесплатно
• Вы получаете 30% от всех их покупок
• Минимальная сумма для вывода: €50
• Выплаты: PayPal, SEPA, Wise

📊 Кабинет партнера:
https://skily.app/partner-dashboard

Там вы найдете:
• Статистику конверсий в реальном времени
• Генератор персонализированных ссылок
• Рекламные материалы для постов
• QR-код для сторис

💡 Рекомендация:
Изучите все Premium-функции в приложении (у вас полный доступ).
Особенно обратите внимание на "Умную работу над ошибками" и "Экзаменационный режим" — это самые продаваемые фичи.

Если будут вопросы — пишите в любое время!

Успешных продаж! 🚀

{Ваше имя}
Skily Team
```

---

## 📝 Заметки для Разработки

### Frontend файлы для изменения:
- `src/pages/PartnerDashboard.tsx` - основной кабинет партнера
- `src/pages/admin/AdminPartners.tsx` - админка
- `src/components/PartnerRedirect.tsx` - обработка партнерских ссылок
- `src/components/DeepLinkHandler.tsx` - трекинг кликов
- `src/components/AuthModal.tsx` - трекинг регистраций
- `src/components/payment/` - промокоды и оплата

### Backend файлы для изменения:
- `supabase/functions/process-purchase/` - трекинг покупок
- `supabase/functions/partner-payout-request/` - новая функция для выплат
- `supabase/functions/generate-partner-invoice/` - новая функция для счетов

### Миграции в порядке применения:
1. `20251202100000_partner_premium_access.sql` - Premium для партнеров
2. `20251202100001_partner_conversions_funnel.sql` - воронка конверсий
3. `20251202100002_partner_deep_links.sql` - генератор ссылок
4. `20251202100003_partner_promo_codes.sql` - промокоды
5. `20251202100004_partner_payouts.sql` - система выплат
6. `20251202100005_partner_antifraud.sql` - антифрод
7. `20251202100006_autoschool_students.sql` - B2B для автошкол

---

**Документ создан:** 2 декабря 2025  
**Последнее обновление:** 2 декабря 2025  
**Версия:** 2.0  
**Статус:** ✅ Готов к реализации  
**Автор:** Dimka + AI Assistant
































