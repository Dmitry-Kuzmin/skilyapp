# 🔗 Настройка Reward URL для AdsGram

## ✅ Текущее состояние формы:

- **Name:** Rewarded Video - Coins ✅
- **Ad platform:** Skilyapp ✅
- **Block type:** Reward ✅
- **Reward URL:** ⚠️ **Нужно заполнить!**

---

## 📋 Что указать в Reward URL?

**Reward URL** - это URL, который AdsGram вызовет после успешного просмотра рекламы, чтобы начислить награду пользователю.

### URL вашей Edge Function:

```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward
```

### Вариант 1: Один Reward URL (рекомендуется для начала)

Укажите в **первом поле Reward URL**:
```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward
```

**Второе поле Reward URL** можно оставить пустым (если AdsGram не требует обязательного заполнения).

### Вариант 2: Два Reward URL (если AdsGram требует)

Если AdsGram требует два разных URL (например, для разных типов наград):

**Первое поле (для монет):**
```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?reward_type=coins&amount=20
```

**Второе поле (для восстановления streak):**
```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?reward_type=restore_streak
```

---

## 🔍 Как AdsGram вызывает Reward URL?

**AdsGram отправляет GET запрос** (не POST!) со следующими параметрами:

### Формат запроса:

```
GET https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=123456789&reward_type=coins&amount=20
```

Где:
- `userid` - **Telegram ID пользователя** (AdsGram заменяет `[userId]` на реальный ID)
- `reward_type` - тип награды (coins, restore_streak, test_attempt)
- `amount` - количество монет (опционально, по умолчанию 20)

### Пример реального запроса от AdsGram:

```
GET https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=8065301889&reward_type=coins&amount=20
```

**Edge Function `ad-reward` обновлена для поддержки GET запросов!** ✅

---

## ⚠️ Важно

1. **Авторизация:**
   - AdsGram должен будет отправлять запросы с авторизацией
   - Возможно, нужно будет настроить API ключ или токен
   - Проверьте документацию AdsGram, как они авторизуют запросы к Reward URL

2. **CORS:**
   - Ваша Edge Function уже настроена с CORS headers
   - Должна работать из браузера и от AdsGram сервера

3. **Тестирование:**
   - После создания блока протестируйте, что Reward URL вызывается корректно
   - Проверьте логи Edge Function: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/ad-reward/logs

---

## ✅ Рекомендуемые действия:

1. **Укажите в первом Reward URL:**
   ```
   https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward
   ```

2. **Второе поле:**
   - Оставьте пустым (если не обязательно)
   - Или укажите тот же URL

3. **Нажмите "Create ad unit"**

4. **После создания:**
   - Сохраните Unit ID
   - Протестируйте просмотр рекламы
   - Проверьте логи Edge Function

---

## 🔍 Если AdsGram требует другие параметры:

Возможно, AdsGram использует другой формат запросов. В этом случае:

1. **Создайте тестовый блок** и посмотрите, какие запросы приходят
2. **Проверьте логи** Edge Function после первого просмотра рекламы
3. **При необходимости адаптируйте** `ad-reward` функцию под формат AdsGram

Но скорее всего, стандартный формат с `user_id`, `reward_type`, `amount` должен работать! ✅

