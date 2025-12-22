# 🚀 Следующие шаги после регистрации в AdsGram

## ✅ Что уже сделано:

- [x] Приложение создано в AdsGram
- [x] PlatformID: 17830
- [x] Telegram direct link: https://t.me/skilyapp_bot/dashboard
- [x] Web app url: https://skilyapp.com/
- [x] Bot ID: 8065301889

---

## 📋 Шаг 1: Создать Ad Block (Rewarded Video)

### 1.1. Нажмите кнопку "+ Block"

В разделе "Ad blocks" нажмите кнопку **"+ Block"** справа.

### 1.2. Заполните форму создания блока:

1. **Block Name (Название блока):**
   - Например: `Rewarded Video - Coins`
   - Или: `Rewarded Video - Main`

2. **Block Type (Тип блока):**
   - Выберите: **"Rewarded Video"** ✅
   - Это формат рекламы, где пользователь смотрит видео за награду

3. **Settings (Настройки):**
   - Можете оставить по умолчанию
   - Или настроить под свои нужды

4. **Нажмите "Create" / "Создать"**

### 1.3. После создания вы получите:

- **Unit ID** - это уникальный идентификатор рекламного блока
- Формат может быть: `ca-app-pub-xxxxxxxxxxxx/xxxxxxxxx` или другой
- **Важно:** Сохраните этот Unit ID! Он понадобится для интеграции

---

## 📋 Шаг 2: Интегрировать AdsGram SDK в код

### 2.1. Получить SDK скрипт

AdsGram должен предоставить JavaScript SDK. Обычно это:
- Ссылка на скрипт для подключения
- Или npm пакет
- Или инструкция по загрузке

**Проверьте:**
- Документацию: https://docs.adsgram.ai
- Раздел "SDK" или "Integration" в кабинете
- Или свяжитесь с поддержкой через Telegram: https://t.me/AdsGram_ai

### 2.2. Добавить SDK в проект

После получения SDK, нужно добавить его в `index.html` или подключить через npm.

**Вариант A: Через script tag (если есть CDN):**
```html
<!-- В index.html -->
<script src="https://adsgram.ai/sdk.js"></script>
```

**Вариант B: Через npm (если есть пакет):**
```bash
npm install @adsgram/sdk
```

### 2.3. Обновить useRewardedAd.ts

Когда получите SDK, обновите файл `src/hooks/useRewardedAd.ts`:

1. **Раскомментируйте код SDK** (строки 93-102 и 142-162)
2. **Замените тестовый режим:**
   ```typescript
   const TEST_MODE_CONFIG = {
     enabled: false, // Отключить тестовый режим
     testUnitId: 'YOUR_TEST_UNIT_ID', // Тестовый Unit ID (если есть)
     // ...
   };
   ```

3. **Добавьте Unit ID в конфигурацию:**
   ```typescript
   // Добавьте константу с Unit ID
   const REWARDED_VIDEO_UNIT_ID = 'YOUR_UNIT_ID_FROM_ADSGRAM';
   
   // Используйте в loadAd и showAd:
   await sdk.loadRewardedVideo(REWARDED_VIDEO_UNIT_ID);
   ```

### 2.4. Добавить Unit ID в переменные окружения (рекомендуется)

Создайте файл `.env.local`:
```env
VITE_ADSGRAM_UNIT_ID_REWARDED=your_unit_id_here
```

И используйте в коде:
```typescript
const REWARDED_VIDEO_UNIT_ID = import.meta.env.VITE_ADSGRAM_UNIT_ID_REWARDED || 'fallback_unit_id';
```

---

## 📋 Шаг 3: Тестирование

### 3.1. Тест в Telegram Mini App

1. Откройте ваше приложение через Telegram
2. Попробуйте просмотреть рекламу:
   - DailyBonus → Восстановить streak через рекламу
   - Shop → Получить монеты бесплатно (20 монет)
3. Проверьте, что реклама показывается
4. Проверьте, что монеты начисляются после просмотра

### 3.2. Проверка в AdsGram кабинете

В разделе "Monitoring" или "Statistics" проверьте:
- Количество показов (Impressions)
- Количество кликов (Clicks)
- Заработок (Earned)

---

## 📋 Шаг 4: Переход на Production

Когда убедитесь, что всё работает:

1. **Создайте Production Ad Block:**
   - В AdsGram создайте новый блок без тестового флага
   - Получите Production Unit ID

2. **Обновите Unit ID:**
   - Замените тестовый Unit ID на production в `.env.local`
   - Или используйте разные Unit ID для разных сред

3. **Мониторинг:**
   - Следите за статистикой в AdsGram
   - Проверяйте логи Edge Function: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions/ad-reward/logs

---

## 🔍 Если SDK еще не получен

Если AdsGram еще не предоставил SDK:

1. **Обратитесь в поддержку:**
   - Telegram канал: https://t.me/AdsGram_ai
   - Email: support@adsgram.ai
   - Скажите, что зарегистрировались и нужен SDK для Rewarded Video

2. **Проверьте документацию:**
   - https://docs.adsgram.ai/publisher/monetize-app/
   - Поищите разделы "SDK", "Integration", "Quick Start"

3. **Используйте тестовый режим:**
   - Пока SDK не получен, тестовый режим уже работает
   - Можете тестировать весь функционал (начисление монет, UI и т.д.)

---

## ✅ Чеклист

- [ ] Создан Ad Block типа "Rewarded Video"
- [ ] Получен Unit ID от AdsGram
- [ ] Получен SDK от AdsGram
- [ ] SDK добавлен в проект (index.html или npm)
- [ ] Обновлен useRewardedAd.ts (отключен тестовый режим)
- [ ] Unit ID добавлен в переменные окружения
- [ ] Протестировано в Telegram Mini App
- [ ] Проверена статистика в AdsGram кабинете
- [ ] Создан Production Ad Block (после тестирования)

---

## 📞 Контакты для помощи

- **Telegram канал:** https://t.me/AdsGram_ai
- **Тестовый бот:** https://t.me/AdsGram_test_app_bot/AdsGram_test_app
- **Документация:** https://docs.adsgram.ai

