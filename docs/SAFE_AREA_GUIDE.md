# Руководство по архитектуре Safe Area и Telegram Mini App

Наше приложение поддерживает одновременную работу в нескольких средах: 
1. **Telegram Mini App (Mobile)** iOS/Android
2. **Telegram Mini App (Desktop)**
3. **Standalone PWA** (Добавлено на домашний экран)
4. **Стандартный браузер** (Safari, Chrome)

Из-за различий в том, как эти платформы отображают интерфейс, управление отступами (`safe-area`) разделено на CSS и JS уровни.

## Основной принцип работы с отступами (index.css)

Мы используем подход **CSS-first** с динамическим доопределением через **JS**.

### PWA (Standalone)
В PWA браузере (`display: standalone`) мы полагаемся на нативные системные переменные iOS/Android.
На `body` автоматически ставится:
```css
padding-top: env(safe-area-inset-top, 0px);
```
Это защищает контент от пересечения с "Dynamic Island" (челкой) на iOS.

### Telegram Mini App (Mobile)
Telegram имеет собственный View Controller, который скрывает нативные `safe-area-inset`, поэтому мы используем многоуровневый `fallback`:

```css
:root {
  --app-safe-top: 0px; /* Приходит от Telegram initData */
  /* Телеграм Mobile без Navbar всегда требует отступ хотя бы 48px, 
     а с учетом челки на iOS - 96px. Мы используем функцию max() */
  --app-content-top: max(var(--app-safe-top), 96px); 
}

.telegram-mobile-app .telegram-main-content {
    padding-top: var(--app-content-top);
}
```

## Управление через TypeScript (`TelegramNavigation.tsx`)

В компоненте `TelegramNavigation` происходит:
1. Определение платформы через `window.Telegram`.
2. Запись CSS-переменных.

**Важно**: В течение первых ~200 миллисекунд загрузки API Telegram может не вернуть точные отступы. Поэтому CSS переменная `--app-content-top` всегда оборачивается в `max(..., 96px)`. Это предотвращает визуальные прыжки (layout shifts).

## Идентификация Платформы (`telegram.ts`)

Функция `isTelegramMiniApp()`:
- ❌ **Плохо**: Проверять только `window.Telegram.WebApp`.
- ✅ **Правильно**: Проверять `initData` и `platform !== 'unknown'`.

В обычном браузере (Safari) объект `window.Telegram` может инжектироваться различными расширениями или скриптами (например, TON Connect). Чтобы гарантировать, что пользователь **действительно** в Telegram:

```typescript
export function isTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return false;
  
  // Отсекаем ложные срабатывания в Safari
  if (webApp.platform === 'unknown' && !webApp.initData) return false;
  
  return true;
}
```

## Экраны без отступов (Full Screen)
Игры, режимы тестирования и дуэли должны занимать весь экран (fullscreen).  
В `Layout.tsx` мы проверяем путь (маршрут) и если он совпадает с полноэкранным, мы скрываем `header` и удаляем отступы:

- Дуэли (`/games/duel`)
- Игры (`/games/*`)
- Режим тестов (`/test/*`)

> **Внимание:** В fullscreen режимах ответственность за безопасные отступы (например, для кнопки «Назад») полностью лежит на дочернем компоненте (например с использованием `TelegramBackButton`).

## Платежные методы (Stars vs Stripe/TON)

Из-за ограничений Apple (правила App Store), функция Apple Pay / банковские карты **не могут** использоваться внутри Telegram Mini App.
- **В Telegram**: Оплата через Telegram Stars (или крипто TON, если разрешено).
- **В Браузере/PWA**: Стрип (Stripe) / Банковские карты и TON Connect.

Корректное определение платформы через `isTelegramMiniApp()` гарантирует, что мы не будем предлагать Stars в Safari браузерах.
