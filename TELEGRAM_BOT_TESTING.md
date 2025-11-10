# 🤖 Telegram Bot - Руководство по деплою и тестированию

## 📋 Обзор системы

Система состоит из 3 компонентов:

1. **telegram-bot** — обработка команд и callback от пользователей
2. **notification-sender** — умная отправка уведомлений с AI-персонализацией
3. **notification-cron** — автоматические напоминания неактивным пользователям

---

## 🚀 Деплой (Шаг за шагом)

### Шаг 1: Применить миграции базы данных

```bash
# Убедитесь, что у вас установлен Supabase CLI
# brew install supabase/tap/supabase (для macOS)

# Применить миграции
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
supabase db push
```

Или применить через Supabase Dashboard:
1. Перейти в SQL Editor
2. Скопировать содержимое файлов:
   - `supabase/migrations/20251110222842_notification_system.sql`
   - `supabase/migrations/20251110222843_seed_notification_templates.sql`
3. Выполнить SQL

### Шаг 2: Настроить Environment Variables в Supabase

Перейти в Supabase Dashboard → Settings → Edge Functions → Secrets

Добавить секреты:

```bash
TELEGRAM_BOT_TOKEN=8065301889:AAHiLExEVl-KJFZxcUzaDwbFsUOJNBb_Vaw
TELEGRAM_WEBHOOK_SECRET=random_secret_string_here
MINI_APP_URL=https://sdadim-dgt-prep.lovable.app
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
```

Команда для установки через CLI:

```bash
# Установить все секреты
supabase secrets set TELEGRAM_BOT_TOKEN=8065301889:AAHiLExEVl-KJFZxcUzaDwbFsUOJNBb_Vaw
supabase secrets set MINI_APP_URL=https://sdadim-dgt-prep.lovable.app

# Проверить установленные секреты
supabase secrets list
```

### Шаг 3: Задеплоить Edge Functions

```bash
# Деплой telegram-bot
supabase functions deploy telegram-bot

# Деплой notification-sender
supabase functions deploy notification-sender

# Деплой notification-cron
supabase functions deploy notification-cron

# Обновить duel-manager с новой интеграцией
supabase functions deploy duel-manager
```

**Альтернатива: деплой всех функций сразу**

```bash
# Деплой всех функций
supabase functions deploy
```

### Шаг 4: Настроить Telegram Webhook

```bash
# Установить webhook
npm run telegram:setup

# Или с явным указанием токена
node scripts/setup-telegram-webhook.js 8065301889:AAHiLExEVl-KJFZxcUzaDwbFsUOJNBb_Vaw

# Проверить информацию о webhook
npm run telegram:info

# Удалить webhook (если нужно переустановить)
npm run telegram:delete
```

**Что делает скрипт:**
- Устанавливает webhook URL на `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/telegram-bot`
- Настраивает allowed_updates для оптимизации
- Показывает информацию о боте и webhook

### Шаг 5: Настроить CRON расписание

CRON уже настроен в `supabase/config.toml`:

```toml
[functions.notification-cron]
verify_jwt = false
schedule = "0 */6 * * *"  # каждые 6 часов
```

Проверить, что CRON работает можно через Supabase Dashboard → Edge Functions → notification-cron → Logs

---

## ✅ Чек-лист готовности

Перед тестированием убедитесь:

- [x] Миграции применены (4 новых таблицы созданы)
- [x] 20 шаблонов уведомлений загружены в БД
- [x] Environment variables установлены в Supabase
- [x] Edge Functions задеплоены:
  - [x] telegram-bot
  - [x] notification-sender
  - [x] notification-cron
  - [x] duel-manager (обновлён)
- [x] Telegram webhook настроен
- [x] CRON расписание активно

---

## 🧪 Тестирование

### 1. Тест команд бота

#### 1.1 Команда /start

1. Откройте бота в Telegram: https://t.me/<ваш_бот_username>
2. Отправьте `/start`
3. **Ожидаемый результат:**
   - Приветственное сообщение
   - Inline клавиатура с кнопками:
     - 🚀 Открыть приложение
     - 📊 Моя статистика
     - 🔥 Серия дней
     - ⚔️ Начать дуэль
     - 📚 Прогресс
     - ⚙️ Настройки
     - ❓ Помощь

#### 1.2 Команда /stats

1. Отправьте `/stats`
2. **Ожидаемый результат:**
   - Статистика пользователя:
     - Готовность к экзамену (%)
     - Серия дней
     - Количество тестов
     - Количество дуэлей
     - Точность ответов

#### 1.3 Команда /duel

1. Отправьте `/duel`
2. **Ожидаемый результат:**
   - Меню дуэлей с кнопками
   - Объяснение, как работают дуэли

#### 1.4 Команда /streak

1. Отправьте `/streak`
2. **Ожидаемый результат:**
   - Информация о текущей серии дней
   - Прогресс к milestone (7, 14, 30 дней)

#### 1.5 Команда /help

1. Отправьте `/help`
2. **Ожидаемый результат:**
   - Список всех команд
   - Краткое описание приложения

### 2. Тест Inline клавиатуры

#### 2.1 Кнопка "Открыть приложение"

1. Нажмите кнопку "🚀 Открыть приложение"
2. **Ожидаемый результат:**
   - Открывается Mini App внутри Telegram
   - Пользователь автоматически авторизован

#### 2.2 Кнопка "Моя статистика"

1. Нажмите "📊 Моя статистика"
2. **Ожидаемый результат:**
   - Показывается статистика в боте
   - Формат красивый с эмодзи

#### 2.3 Кнопка "Настройки"

1. Нажмите "⚙️ Настройки"
2. Попробуйте переключить уведомления
3. Попробуйте сменить язык
4. **Ожидаемый результат:**
   - Настройки меняются
   - Изменения сохраняются в БД

### 3. Тест уведомлений о дуэлях

#### 3.1 Уведомление при начале дуэли

1. Создайте дуэль через Mini App
2. Попросите друга присоединиться
3. **Ожидаемый результат:**
   - Оба игрока получают уведомление в Telegram
   - Уведомление содержит:
     - Иконку ⚔️
     - Заголовок "Дуэль началась!"
     - Имя соперника
     - Кнопку "Открыть дуэль"

#### 3.2 Уведомление при завершении дуэли

1. Завершите дуэль (оба игрока ответят на все вопросы)
2. **Ожидаемый результат:**
   - Оба игрока получают уведомление
   - Победитель видит: "Победа! 🏆" + AI-персонализированный текст
   - Проигравший видит: "Почти получилось 💪" + мотивационный текст
   - Кнопка "Посмотреть результаты"

#### 3.3 Проверка AI-персонализации

1. Проверьте текст уведомления о завершении дуэли
2. **Ожидаемый результат:**
   - Текст уникален и персонализирован
   - Упоминается конкретный счёт
   - Мотивирующий тон
   - Без emoji (только в иконке)

### 4. Тест Deep Links

#### 4.1 Deep Link на дуэль

1. Получите уведомление с кнопкой "Открыть дуэль"
2. Нажмите кнопку
3. **Ожидаемый результат:**
   - Mini App открывается
   - Автоматическая навигация на страницу дуэли
   - Дуэль загружается и готова к игре

#### 4.2 Deep Link на обучение

1. Получите уведомление о новой теме
2. Нажмите "Начать изучение"
3. **Ожидаемый результат:**
   - Mini App открывается на странице конкретной темы

### 5. Тест CRON напоминаний

#### 5.1 Напоминание неактивным (3 дня)

**Подготовка:**
1. Найдите пользователя, который не заходил 3+ дней
2. Или измените `last_login_at` в БД для тестирования:

```sql
UPDATE user_metrics
SET last_login_at = NOW() - INTERVAL '4 days'
WHERE user_id = 'your_test_user_id';
```

3. Запустите CRON вручную:

```bash
curl -X POST https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/notification-cron \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Ожидаемый результат:**
- Пользователь получает уведомление "Прогресс ждёт! 🎯"
- Текст персонализирован с процентом прогресса
- Кнопка "Продолжить обучение"

#### 5.2 Напоминание о серии

**Подготовка:**
1. Установите серию 5+ дней:

```sql
UPDATE user_metrics
SET streak_days = 5,
    last_streak_date = CURRENT_DATE - 1
WHERE user_id = 'your_test_user_id';
```

2. Запустите CRON

**Ожидаемый результат:**
- Уведомление о поддержании серии
- "Не потеряй серию из 5 дней!"

### 6. Тест настроек уведомлений

#### 6.1 Тихие часы

1. Установите тихие часы 22:00 - 09:00 через бота
2. Попробуйте отправить уведомление в это время
3. **Ожидаемый результат:**
   - Уведомление НЕ отправляется
   - В логах: `skipped: quiet_hours`

#### 6.2 Cooldown

1. Отправьте одно и то же уведомление дважды подряд
2. **Ожидаемый результат:**
   - Первое отправляется
   - Второе пропускается (cooldown active)

#### 6.3 Отключение уведомлений

1. Отключите уведомления через бота
2. Попробуйте отправить уведомление
3. **Ожидаемый результат:**
   - Уведомление НЕ отправляется
   - В логах: `skipped: notifications_disabled`

---

## 📊 Мониторинг и логи

### Просмотр логов Edge Functions

```bash
# Логи telegram-bot
supabase functions logs telegram-bot

# Логи notification-sender
supabase functions logs notification-sender

# Логи notification-cron
supabase functions logs notification-cron
```

### Проверка логов в БД

```sql
-- Последние 10 отправленных уведомлений
SELECT 
  nl.sent_at,
  p.first_name,
  nl.title,
  nl.message,
  nl.category,
  nl.type,
  nl.was_ai_enhanced,
  nl.clicked
FROM notification_logs nl
JOIN profiles p ON nl.user_id = p.id
ORDER BY nl.sent_at DESC
LIMIT 10;

-- Статистика уведомлений по категориям
SELECT 
  category,
  COUNT(*) as total,
  SUM(CASE WHEN clicked THEN 1 ELSE 0 END) as clicked,
  ROUND(AVG(CASE WHEN clicked THEN 1 ELSE 0 END) * 100, 2) as ctr
FROM notification_logs
GROUP BY category
ORDER BY total DESC;

-- Шаблоны с AI-персонализацией
SELECT 
  type,
  COUNT(*) as used_count,
  AVG(CASE WHEN was_ai_enhanced THEN 1 ELSE 0 END) * 100 as ai_usage_percent
FROM notification_logs
WHERE template_id IS NOT NULL
GROUP BY type
ORDER BY used_count DESC;
```

---

## 🐛 Troubleshooting

### Проблема: Бот не отвечает на команды

**Решение:**
1. Проверьте webhook:
   ```bash
   npm run telegram:info
   ```
2. Проверьте логи:
   ```bash
   supabase functions logs telegram-bot --tail
   ```
3. Убедитесь, что Edge Function задеплоена
4. Переустановите webhook:
   ```bash
   npm run telegram:delete
   npm run telegram:setup
   ```

### Проблема: Уведомления не приходят в Telegram

**Решение:**
1. Проверьте, что у пользователя есть `telegram_id` в profiles
2. Проверьте настройки уведомлений:
   ```sql
   SELECT * FROM user_notification_settings WHERE user_id = 'user_id';
   ```
3. Проверьте логи notification-sender
4. Убедитесь, что BOT_TOKEN корректный

### Проблема: AI-персонализация не работает

**Решение:**
1. Проверьте, что GROQ_API_KEY или GEMINI_API_KEY установлены
2. Проверьте логи ai-chat функции
3. Проверьте, что у шаблона `ai_enhance = true`
4. В случае ошибки AI, используется базовый шаблон

### Проблема: CRON не запускается

**Решение:**
1. Проверьте настройку в `supabase/config.toml`
2. Убедитесь, что функция задеплоена
3. Проверьте логи в Supabase Dashboard
4. Запустите CRON вручную для теста

---

## 📈 Метрики успеха

После внедрения отслеживайте:

### KPI

1. **DAU/MAU** — ежедневные/месячные активные пользователи
2. **Retention Day 1, 7, 30** — возвращаемость
3. **CTR уведомлений** — % кликов на уведомления
4. **Streak completion rate** — % завершивших 7-дневную серию
5. **Time to return** — время от уведомления до возврата в приложение

### SQL запросы для аналитики

```sql
-- DAU (Daily Active Users)
SELECT 
  DATE(last_login_at) as date,
  COUNT(DISTINCT user_id) as dau
FROM user_metrics
WHERE last_login_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(last_login_at)
ORDER BY date DESC;

-- CTR по категориям уведомлений
SELECT 
  category,
  COUNT(*) as sent,
  SUM(CASE WHEN clicked THEN 1 ELSE 0 END) as clicked,
  ROUND(AVG(CASE WHEN clicked THEN 1 ELSE 0 END) * 100, 2) as ctr_percent
FROM notification_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY category
ORDER BY sent DESC;

-- Пользователи с активными сериями
SELECT 
  CASE 
    WHEN streak_days >= 30 THEN '30+ days'
    WHEN streak_days >= 14 THEN '14-29 days'
    WHEN streak_days >= 7 THEN '7-13 days'
    WHEN streak_days >= 3 THEN '3-6 days'
    ELSE '1-2 days'
  END as streak_group,
  COUNT(*) as users
FROM user_metrics
WHERE streak_days > 0
GROUP BY streak_group
ORDER BY MIN(streak_days);
```

---

## 🎯 Следующие шаги

После успешного тестирования:

1. **Мониторинг первых 24 часов:**
   - Отслеживайте логи
   - Проверяйте метрики
   - Собирайте feedback от пользователей

2. **Оптимизация:**
   - Настройте оптимальное время отправки (A/B тесты)
   - Улучшите AI-промпты на основе откликов
   - Добавьте новые шаблоны уведомлений

3. **Расширение функционала:**
   - Персональные челленджи
   - Групповые дуэли
   - Еженедельные отчёты
   - Реферальная программа через бота

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи Edge Functions
2. Проверьте таблицу `notification_logs`
3. Проверьте Telegram webhook info
4. Напишите в саппорт или создайте issue

**Удачи с запуском! 🚀**

