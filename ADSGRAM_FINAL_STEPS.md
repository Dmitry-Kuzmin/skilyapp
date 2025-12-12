# ✅ Финальные шаги для AdsGram

## ✅ Что уже сделано:

1. ✅ Edge Function `ad-reward` обновлена для поддержки **GET запросов** от AdsGram
2. ✅ Функция теперь:
   - Принимает GET запросы с параметром `userid` (Telegram ID)
   - Находит профиль пользователя по `telegram_id`
   - Начисляет монеты и логирует транзакции
   - Поддерживает rate limiting (10 просмотров/час)

---

## 📋 Что указать в Reward URL (в форме AdsGram):

### ✅ Правильный формат:

```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=[userId]&reward_type=coins&amount=20
```

**Где:**
- `[userId]` - шаблон, который AdsGram заменит на Telegram ID пользователя
- `reward_type=coins` - тип награды (монеты)
- `amount=20` - количество монет

### 📝 В форме AdsGram:

**Поле "Reward URL" (первое):**
```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=[userId]&reward_type=coins&amount=20
```

**Второе поле Reward URL:**
- Оставьте пустым (если не обязательно)
- Или используйте для другого типа награды:
  ```
  https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=[userId]&reward_type=restore_streak
  ```

---

## 🎯 Что происходит при просмотре рекламы:

1. Пользователь смотрит рекламу в вашем приложении (через AdsGram SDK)
2. AdsGram отправляет GET запрос на ваш Reward URL:
   ```
   GET https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=8065301889&reward_type=coins&amount=20
   ```
3. Edge Function:
   - Находит профиль пользователя по `telegram_id = 8065301889`
   - Проверяет rate limiting (макс 10 просмотров/час)
   - Начисляет 20 монет
   - Логирует транзакцию
   - Возвращает успех

---

## ✅ Теперь можно:

1. **Заполнить Reward URL** в форме AdsGram с форматом выше
2. **Нажать "Create ad unit"**
3. **Получить Unit ID** от AdsGram
4. **Протестировать** просмотр рекламы
5. **Проверить логи:** https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/ad-reward/logs

---

## 🔍 Проверка работы:

После создания блока и первого просмотра рекламы:

1. **Проверьте логи Edge Function:**
   - Перейдите: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/ad-reward/logs
   - Должны увидеть запросы от AdsGram
   - Проверьте, что монеты начисляются

2. **Проверьте транзакции в базе:**
   ```sql
   SELECT * FROM transactions 
   WHERE transaction_type = 'coins_earned_ad' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **Проверьте баланс пользователя:**
   - Монеты должны увеличиться на 20 после просмотра рекламы

---

## 📞 Если что-то не работает:

1. **Проверьте логи Edge Function** - там будут детали ошибок
2. **Убедитесь, что Telegram ID правильный** - AdsGram должен передавать реальный Telegram ID
3. **Проверьте, что профиль существует** - пользователь должен быть зарегистрирован в вашем приложении

---

## 🚀 Следующий шаг:

После получения **Unit ID** от AdsGram:
1. Получите SDK от AdsGram
2. Интегрируйте SDK в код (`useRewardedAd.ts`)
3. Используйте Unit ID для показа рекламы

