# Monetag Telegram Mini App Integration Guide

## Текущая ситуация

У нас есть:
- **AdsGram** для Telegram Mini App (Rewarded Video) ✅
- **Monetag Native Banner (Interstitial)** для веб-версии (Zone ID: 10323437) ✅

## Что нужно сделать

Согласно инструкциям Monetag, для Telegram Mini App нужно создать отдельный блок **Rewarded Interstitial**.

### Шаги:

1. **В кабинете Monetag:**
   - Перейди в раздел "Telegram Mini Apps"
   - Создай новый блок с форматом **"Rewarded Interstitial"**
   - Получи новый **Zone ID** (например, `10323438`)

2. **Добавь тег в `index.html`:**
   ```html
   <!-- Monetag Rewarded Interstitial для Telegram Mini App -->
   <!-- Zone ID: [НОВЫЙ_ZONE_ID] -->
   <script>
     (function(s){
       s.dataset.zone='[НОВЫЙ_ZONE_ID]';
       s.src='https://groleegni.net/vignette.min.js';
       s.dataset.sdk='show_[НОВЫЙ_ZONE_ID]';
     })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));
   </script>
   ```

3. **Обнови `src/lib/monetag.ts`:**
   - Добавь константу для Telegram Mini App Zone ID
   - Создай функцию `showMonetagRewardedInterstitial()` для TMA
   - Используй `isTelegramMiniApp()` для определения платформы

4. **Обнови `src/hooks/useRewardedAd.ts`:**
   - В Telegram Mini App используй AdsGram (как сейчас)
   - В веб-версии используй Monetag Native Banner (как сейчас)
   - Опционально: добавь поддержку Monetag Rewarded Interstitial для TMA

## Важно

- **AdsGram** остается основным для Telegram Mini App (уже работает)
- **Monetag Rewarded Interstitial** для TMA - это дополнительная опция
- **Monetag Native Banner** для веб-версии - уже работает

## Вопросы

1. Нужен ли отдельный блок Rewarded Interstitial для Telegram Mini App?
2. Или оставляем AdsGram для TMA и Monetag только для веб-версии?

