# 🚀 Интеграция AdsGram SDK в приложение

## 📋 Обзор

AdsGram SDK позволяет показывать Rewarded Video рекламу в Telegram Mini Apps. Пользователь смотрит рекламу и получает награду (монеты, восстановление streak и т.д.).

**Документация:** https://docs.adsgram.ai/publisher/reward-interstitial-integration

## 📦 Что нужно получить от AdsGram

1. **blockId** — ID вашего рекламного блока (Rewarded Video)
   - У вас уже есть: `19051` (из созданного блока)
   - Это ID, который нужно использовать при инициализации

2. **Reward URL** — уже настроен в AdsGram:
   - `https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=[userId]`
   - AdsGram будет вызывать этот URL после просмотра рекламы

## 🔧 Шаг 1: Подключение SDK

### Вариант 1: Через скрипт (рекомендуется)

Добавьте скрипт AdsGram в `index.html` внутри тега `<head>`:

```html
<!-- AdsGram SDK -->
<script src="https://sad.adsgram.ai/js/sad.min.js"></script>
```

**Важно:** Правильный URL — `sad.adsgram.ai/js/sad.min.js` (не adsgram.min.js!)

### Вариант 2: Через npm (для React)

Если предпочитаете npm пакет:

```bash
npm install @adsgram/react
```

Но для нашего случая достаточно скрипта в `index.html`.

## 🔧 Шаг 2: Инициализация SDK

Создайте новый файл `src/lib/adsgram.ts`:

```typescript
/**
 * AdsGram SDK интеграция
 * 
 * Документация: https://docs.adsgram.ai/publisher/reward-interstitial-integration
 */

interface ShowPromiseResult {
  done: boolean; // true если пользователь досмотрел до конца
  description: string; // описание события
  state: 'load' | 'render' | 'playing' | 'destroy'; // состояние рекламы
  error: boolean; // true если была ошибка
}

interface AdsGramAdController {
  show: () => Promise<ShowPromiseResult>;
}

declare global {
  interface Window {
    Adsgram?: {
      init: (config: { blockId: string }) => AdsGramAdController;
    };
  }
}

// Конфигурация
const ADSGRAM_CONFIG = {
  // Block ID из вашего кабинета AdsGram
  REWARDED_VIDEO_BLOCK_ID: '19051', // Ваш созданный блок
};

let adController: AdsGramAdController | null = null;

/**
 * Инициализация AdsGram SDK
 * Должна быть вызвана один раз при загрузке приложения
 */
export function initAdsGram(): AdsGramAdController | null {
  if (typeof window === 'undefined') {
    console.warn('[AdsGram] Window is not available');
    return null;
  }

  if (!window.Adsgram) {
    console.error('[AdsGram] SDK not loaded. Make sure script is included in index.html');
    return null;
  }

  if (adController) {
    console.log('[AdsGram] Already initialized');
    return adController;
  }

  try {
    // Инициализация с blockId
    adController = window.Adsgram.init({
      blockId: ADSGRAM_CONFIG.REWARDED_VIDEO_BLOCK_ID,
    });

    console.log('[AdsGram] SDK initialized successfully with blockId:', ADSGRAM_CONFIG.REWARDED_VIDEO_BLOCK_ID);
    return adController;
  } catch (error) {
    console.error('[AdsGram] Initialization error:', error);
    return null;
  }
}

/**
 * Показать Rewarded Video рекламу
 * 
 * Promise резолвится, если пользователь досмотрел рекламу до конца
 * Promise реджектится, если была ошибка или пользователь пропустил рекламу
 */
export function showAdsGramRewardedVideo(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!adController) {
      // Пытаемся инициализировать, если еще не инициализировано
      const controller = initAdsGram();
      if (!controller) {
        reject(new Error('AdsGram SDK not initialized'));
        return;
      }
    }

    const controller = adController!;

    controller
      .show()
      .then((result: ShowPromiseResult) => {
        // result.done === true означает, что пользователь досмотрел рекламу до конца
        if (result.done) {
          console.log('[AdsGram] Rewarded video completed:', result);
          resolve(true);
        } else {
          console.warn('[AdsGram] Rewarded video not completed:', result);
          reject(new Error(result.description || 'Ad not completed'));
        }
      })
      .catch((result: ShowPromiseResult) => {
        // Ошибка или пользователь пропустил рекламу
        console.error('[AdsGram] Rewarded video error:', result);
        reject(new Error(result.description || 'Ad error'));
      });
  });
}

/**
 * Получить текущий контроллер рекламы
 */
export function getAdsGramController(): AdsGramAdController | null {
  if (!adController) {
    return initAdsGram();
  }
  return adController;
}

export { ADSGRAM_CONFIG, type ShowPromiseResult };
```
```

## 🔧 Шаг 3: Обновить хук `useRewardedAd`

Обновите `src/hooks/useRewardedAd.ts` для использования реального SDK:

```typescript
import { useState, useCallback, useEffect } from 'react';
import { isTelegramMiniApp } from '@/lib/telegram';
import { usePremium } from './usePremium';
import { initAdsGram, showAdsGramRewardedVideo } from '@/lib/adsgram';

/**
 * Типы наград за просмотр рекламы
 */
export type RewardType = 
  | 'coins'           // Монеты
  | 'restore_streak'  // Восстановление streak
  | 'test_attempt';   // Дополнительная попытка теста

/**
 * Хук для работы с Rewarded Video рекламой (AdsGram)
 * 
 * Поддерживает:
 * - Реальный SDK AdsGram
 * - Автоматическую проверку Premium (скрывает рекламу для Premium)
 */
export function useRewardedAd() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isPremium } = usePremium();

  /**
   * Проверяет, доступна ли реклама для пользователя
   */
  const isAvailable = useCallback(() => {
    // Premium пользователи не видят рекламу
    if (isPremium) {
      return false;
    }

    // В Telegram Mini App реклама доступна
    if (isTelegramMiniApp()) {
      return true;
    }

    // В веб-версии пока не поддерживается
    return false;
  }, [isPremium]);

  // Инициализация SDK при монтировании
  useEffect(() => {
    if (isAvailable()) {
      // Ждем загрузки SDK скрипта
      const checkSDK = () => {
        if (typeof window !== 'undefined' && window.Adsgram) {
          initAdsGram();
        } else {
          // Проверяем каждые 100мс до 5 секунд
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if (window.Adsgram || attempts > 50) {
              clearInterval(interval);
              if (window.Adsgram) {
                initAdsGram();
              }
            }
          }, 100);
        }
      };

      // Если DOM уже загружен
      if (document.readyState === 'complete') {
        checkSDK();
      } else {
        window.addEventListener('load', checkSDK);
        return () => window.removeEventListener('load', checkSDK);
      }
    }
  }, [isAvailable]);

  /**
   * Показывает рекламу и возвращает Promise, который резолвится при успешном просмотре
   */
  const showAd = useCallback(async (): Promise<boolean> => {
    if (!isAvailable()) {
      throw new Error('Реклама недоступна для Premium пользователей');
    }

    setLoading(true);
    setError(null);

    try {
      const rewarded = await showAdsGramRewardedVideo();
      setLoading(false);
      return rewarded;
    } catch (err: any) {
      console.error('[useRewardedAd] Error showing ad:', err);
      setError(err.message || 'Не удалось показать рекламу');
      setLoading(false);
      throw err;
    }
  }, [isAvailable]);

  /**
   * Сбрасывает состояние (полезно при ошибках)
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    isAvailable: isAvailable(),
    showAd,
    reset,
  };
}
```

**Важные изменения:**
- ✅ Удален `TEST_MODE_CONFIG` (тестовый режим больше не нужен)
- ✅ Удален `loadAd` (AdsGram SDK загружает рекламу автоматически при `show()`)
- ✅ Упрощен `showAd` — просто вызывает `showAdsGramRewardedVideo()`
- ✅ Добавлена автоматическая инициализация SDK при монтировании компонента

## 🔧 Шаг 4: Добавить скрипт в index.html

Откройте `index.html` и добавьте скрипт AdsGram SDK в секцию `<head>`:

```html
<!-- AdsGram SDK -->
<script src="https://sad.adsgram.ai/js/sad.min.js"></script>
```

**Важно:** Добавьте **перед** скриптом Telegram Web App, чтобы SDK загрузился раньше:

```html
<head>
  <!-- ... другие теги ... -->
  
  <!-- AdsGram SDK (добавить здесь) -->
  <script src="https://sad.adsgram.ai/js/sad.min.js"></script>
  
  <!-- Telegram Web App -->
  <script src="https://telegram.org/js/telegram-web-app.js" defer crossorigin="anonymous"></script>
  
  <!-- ... остальные скрипты ... -->
</head>
```

Инициализация SDK происходит автоматически в хуке `useRewardedAd` при первом использовании.

## ✅ Проверка работы

1. **Откройте приложение в Telegram Mini App**
2. **Перейдите в Shop → Монеты**
3. **Нажмите "Смотреть"**
4. **Должна загрузиться реальная реклама из AdsGram**
5. **После просмотра монеты начисляются автоматически** (через Reward URL)

## 🐛 Отладка

### Проверка загрузки SDK

В консоли браузера выполните:
```javascript
console.log('AdsGram SDK:', window.Adsgram);
```

**Важно:** Объект называется `Adsgram` (с маленькой 'g'), а не `AdsGram`!

Должно вывести объект с методом `init`.

### Логи

Смотрите логи в консоли:
- `[AdsGram] SDK initialized successfully` — SDK загружен
- `[AdsGram] Rewarded video loaded` — реклама загружена
- `[AdsGram] Rewarded video shown and rewarded` — реклама показана и награда начислена

### Проверка Reward URL

В AdsGram кабинете должна быть настроена Reward URL:
```
https://yffjnqegeiorunyvcxkn.supabase.co/functions/v1/ad-reward?userid=[userId]
```

После просмотра рекламы AdsGram вызовет этот URL с `userid` пользователя Telegram.

## 📚 Дополнительная информация

- **Документация AdsGram:** https://docs.adsgram.ai/publisher/monetize-app/
- **Ваш Platform ID:** `17830`
- **Ваш Unit ID (Rewarded Video):** `19051`

## ⚠️ Важные замечания

1. **Тестовый режим:** После интеграции реального SDK отключите тестовый режим в `useRewardedAd`
2. **Reward URL:** Убедитесь, что в AdsGram кабинете правильно настроен Reward URL с `[userId]`
3. **Telegram Mini App:** AdsGram работает только в Telegram Mini Apps, не в веб-версии
4. **Premium пользователи:** Реклама автоматически скрывается для Premium подписчиков

## 🎯 Следующие шаги

1. ✅ Добавить SDK скрипт в `index.html`
2. ✅ Создать `src/lib/adsgram.ts`
3. ✅ Обновить `useRewardedAd.ts`
4. ✅ Протестировать в Telegram Mini App
5. ✅ Отключить тестовый режим

