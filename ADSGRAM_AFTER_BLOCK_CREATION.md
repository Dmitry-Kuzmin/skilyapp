# 🎉 Ad Block создан! Следующие шаги

## ✅ Что уже сделано:

- [x] Приложение создано в AdsGram (PlatformID: 17830)
- [x] Ad Block создан: **"Rewarded Video - Coins"**
- [x] **Unit ID получен: 24504** ✅
- [x] Reward URL настроен (нужно исправить опечатку)

---

## ⚠️ Важно: Исправить опечатку в Reward URL

В вашем Reward URL есть опечатка: `[userld]` вместо `[userId]`

**Текущий URL (с опечаткой):**
```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=[userld]&reward_type=coins&amount=20
```

**Правильный URL:**
```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=[userId]&reward_type=coins&amount=20
```

### Как исправить:

1. В AdsGram нажмите кнопку **"Edit"** (справа от названия блока)
2. Найдите поле **"Reward URL"**
3. Замените `[userld]` на `[userId]`
4. Сохраните изменения

---

## 📋 Следующие шаги:

### Шаг 1: Получить SDK от AdsGram

**Вариант A: Через поддержку**
- Напишите в Telegram канал: https://t.me/AdsGram_ai
- Скажите: "Создал Ad Block (UnitID: 24504), нужен SDK для интеграции Rewarded Video в Telegram Mini App"

**Вариант B: Через документацию**
- Проверьте: https://docs.adsgram.ai/publisher/monetize-app/
- Ищите разделы: "SDK", "Integration", "Quick Start"

**Вариант C: В кабинете AdsGram**
- Поищите раздел "SDK" или "Documentation" в меню
- Может быть вкладка "Integration" или "Setup"

---

### Шаг 2: Интегрировать SDK в код

После получения SDK:

1. **Добавьте SDK в проект:**
   - Через `<script>` тег в `index.html` (если это CDN)
   - Или через npm пакет (если есть)

2. **Обновите `src/hooks/useRewardedAd.ts`:**
   - Раскомментируйте код SDK (строки 93-102 и 142-162)
   - Замените `TEST_MODE_CONFIG.enabled = false`
   - Добавьте Unit ID: `24504`

3. **Добавьте Unit ID в конфигурацию:**
   ```typescript
   // В useRewardedAd.ts
   const REWARDED_VIDEO_UNIT_ID = '24504'; // Ваш Unit ID от AdsGram
   ```

4. **Или через переменные окружения:**
   ```env
   # .env.local
   VITE_ADSGRAM_UNIT_ID_REWARDED=24504
   ```

---

### Шаг 3: Протестировать интеграцию

1. **Откройте приложение в Telegram**
2. **Попробуйте просмотреть рекламу:**
   - DailyBonus → Восстановить streak через рекламу
   - Shop → Получить монеты бесплатно (20 монет)
3. **Проверьте:**
   - Реклама показывается
   - После просмотра монеты начисляются
   - В AdsGram кабинете появляется статистика

---

### Шаг 4: Мониторинг и оптимизация

1. **Проверяйте статистику в AdsGram:**
   - Раздел "Monitoring" или "Earnings"
   - Количество показов (Impressions)
   - Заработок (Earned)

2. **Проверяйте логи Edge Function:**
   - https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/ad-reward/logs
   - Убедитесь, что запросы приходят корректно

3. **Проверяйте транзакции в базе:**
   ```sql
   SELECT * FROM transactions 
   WHERE transaction_type = 'coins_earned_ad' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## 🔍 Что делать, если SDK еще нет?

Пока SDK не получен, **тестовый режим уже работает**! 

Можете:
- ✅ Тестировать UI рекламы
- ✅ Проверять начисление монет
- ✅ Тестировать восстановление streak
- ✅ Проверять rate limiting

Как только получите SDK - просто отключите тестовый режим и подключите реальный.

---

## ✅ Чеклист:

- [ ] Исправить опечатку в Reward URL: `[userld]` → `[userId]`
- [ ] Получить SDK от AdsGram
- [ ] Добавить SDK в проект (index.html или npm)
- [ ] Обновить `useRewardedAd.ts` (отключить тестовый режим)
- [ ] Добавить Unit ID: `19051` в код
- [ ] Протестировать просмотр рекламы в Telegram
- [ ] Проверить начисление монет
- [ ] Проверить статистику в AdsGram
- [ ] Проверить логи Edge Function

---

## 📞 Контакты:

- **Telegram канал:** https://t.me/AdsGram_ai
- **Тестовый бот:** https://t.me/AdsGram_test_app_bot/AdsGram_test_app
- **Документация:** https://docs.adsgram.ai
- **Ваш Unit ID:** 19051

---

## 💡 Важная информация:

**Unit ID: 19051** - сохраните его, он понадобится для интеграции SDK.

**Reward URL:** После исправления опечатки должен быть:
```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=[userId]&reward_type=coins&amount=20
```

**Edge Function готова** и задеплоена - она автоматически начислит монеты когда AdsGram отправит GET запрос после просмотра рекламы.

