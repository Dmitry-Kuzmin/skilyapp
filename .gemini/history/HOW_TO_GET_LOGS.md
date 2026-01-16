# 📊 Как получить логи Edge Function из Supabase

## 🎯 Где смотреть логи

### Способ 1: Через Supabase Dashboard (самый простой)

1. **Откройте Supabase Dashboard:**
   - Перейдите: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn

2. **Перейдите в Edge Functions:**
   - В левом меню найдите **"Edge Functions"**
   - Или прямая ссылка: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions

3. **Откройте функцию ad-reward:**
   - Найдите **"ad-reward"** в списке
   - Нажмите на неё
   - Или прямая ссылка: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/ad-reward

4. **Откройте вкладку "Logs":**
   - Вверху будут вкладки: Overview, Logs, Settings
   - Нажмите **"Logs"**
   - Или прямая ссылка: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/ad-reward/logs

5. **Просмотрите логи:**
   - Вы увидите все запросы к функции
   - Найдите последние записи (они вверху)
   - Ищите записи с временем, когда вы смотрели рекламу

---

## 🔍 Что искать в логах

### Успешный запрос выглядит так:
```
[ad-reward] GET request received: userid=8065301889
[ad-reward] Profile found: profile_id=xxx
[ad-reward] Rate limit check: 1 views in last hour
[ad-reward] Coins awarded: 20
[ad-reward] Transaction logged
```

### Ошибка будет выглядеть так:
```
ERROR [ad-reward] Error: ...
или
[ad-reward] Profile not found for telegram_id: ...
или
[ad-reward] Error awarding coins: ...
```

---

## 📋 Как скопировать логи

### Вариант 1: Скриншот
1. Сделайте скриншот раздела с ошибкой
2. Пришлите скриншот

### Вариант 2: Скопировать текст
1. Найдите строку с ошибкой
2. Скопируйте текст ошибки (можно несколько строк вокруг)
3. Пришлите текст

### Вариант 3: Экспорт логов
1. В правом верхнем углу логов есть кнопка экспорта
2. Или просто скопируйте нужные строки

---

## 🔍 Что еще можно проверить

### 1. В консоли браузера (в Telegram Desktop):

**Как открыть:**
- Telegram Desktop: View → Developer Tools
- Или нажмите `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

**Что искать:**
- Ошибки в консоли
- Сообщения типа `[RewardedAdModal]`, `[useRewardedAd]`, `[BoostShop]`
- Red ошибки (они самые важные)

---

### 2. Проверить транзакции в базе:

Откройте SQL Editor в Supabase и выполните:
```sql
SELECT * FROM transactions 
WHERE transaction_type = 'coins_earned_ad' 
ORDER BY created_at DESC 
LIMIT 10;
```

Посмотрите:
- Создались ли транзакции?
- Какие ошибки в metadata (если есть)?

---

### 3. Проверить профиль пользователя:

```sql
SELECT id, telegram_id, coins, user_id 
FROM profiles 
WHERE telegram_id = 8065301889;  -- Замените на ваш Telegram ID
```

Проверьте:
- Существует ли профиль?
- Правильный ли telegram_id?

---

## 📝 Что мне прислать для диагностики

Для быстрой диагностики пришлите:

1. **Логи из Supabase Dashboard:**
   - Скриншот или текст ошибки
   - Время, когда произошла ошибка

2. **Информацию о запросе:**
   - Ваш Telegram ID (можно найти через @userinfobot)
   - Сколько монет должно было начислиться

3. **Консоль браузера (если есть):**
   - Red ошибки из консоли
   - Сообщения, связанные с рекламой

---

## 🚨 Частые ошибки

### Ошибка 1: "Profile not found"
**Причина:** Пользователь не найден по Telegram ID  
**Решение:** Убедитесь, что пользователь зарегистрирован в приложении

### Ошибка 2: "Rate limit exceeded"
**Причина:** Превышен лимит 10 просмотров/час  
**Решение:** Подождите час или проверьте, действительно ли было 10 просмотров

### Ошибка 3: "Error awarding coins"
**Причина:** Ошибка при вызове RPC функции  
**Решение:** Проверьте, что функция `increment_profile_value` существует и работает

---

## 🔗 Полезные ссылки

- **Логи Edge Function:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/ad-reward/logs
- **Все Edge Functions:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions
- **SQL Editor:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/sql/new

