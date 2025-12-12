# Кастомизация Paddle Checkout

## Ограничения

Paddle Checkout имеет **ограниченные возможности кастомизации** через SDK из-за требований безопасности PCI DSS. Paddle контролирует дизайн формы для защиты данных карт.

## Что можно настроить через SDK (программно)

### Текущие настройки (уже реализованы):

```typescript
paddleInstance.Checkout.open({
  transactionId: data.transaction_id,
  settings: {
    displayMode: "overlay", // "overlay" | "inline"
    successUrl: `${window.location.origin}/purchase/success?transaction_id={transaction_id}`,
    theme: "dark", // "light" | "dark"
    locale: "ru", // "en" | "es" | "ru" | и др.
  },
});
```

### Доступные опции:

- ✅ **theme**: `"light"` | `"dark"` - тема оформления
- ✅ **locale**: язык интерфейса (ru, en, es, и др.)
- ✅ **displayMode**: `"overlay"` (попап) | `"inline"` (встроенный)
- ✅ **successUrl**: URL после успешной оплаты
- ✅ **frameInitialHeight**: высота iframe (только для inline mode)
- ✅ **frameTarget**: ID контейнера (только для inline mode)

### ❌ Что НЕЛЬЗЯ сделать через SDK:

- Изменить цвета кнопок, полей ввода
- Добавить кастомные CSS классы
- Изменить структуру формы
- Изменить шрифты
- Добавить кастомные элементы

## Основной способ кастомизации: Paddle Dashboard

Для полной кастомизации внешнего вида используйте **Paddle Dashboard**:

### Шаги настройки:

1. **Войдите в Paddle Dashboard**: https://vendors.paddle.com/
2. **Перейдите в настройки брендинга**:
   - Settings → Branding → Checkout appearance
3. **Настройте**:
   - **Логотип компании** - загрузите логотип SkilyApp
   - **Цвета брендинга** - установите фиолетовые/мятные цвета (#8B5CF6, #10B981)
   - **Цвет кнопки оплаты** - можно настроить под ваш бренд
   - **Фон checkout** - можно настроить цвет фона

### Рекомендуемые настройки для SkilyApp:

- **Primary Color**: `#8B5CF6` (violet-500) - основной цвет бренда
- **Secondary Color**: `#10B981` (emerald-500) - акцентный цвет
- **Button Color**: `#8B5CF6` или `#10B981` - цвет кнопки "Продолжить"
- **Logo**: Загрузите логотип SkilyApp (SVG или PNG, прозрачный фон)

## Альтернативные решения

Если нужна полная кастомизация дизайна:

### 1. Использовать Paddle Elements (более гибкий вариант)

Paddle Elements позволяет создать полностью кастомную форму оплаты, но требует больше работы:

```typescript
// Пример (не реализовано, требует дополнительной настройки)
import { PaddleElements } from '@paddle/paddle-js';

const elements = paddleInstance.Elements.create({
  appearance: {
    theme: 'dark',
    variables: {
      colorPrimary: '#8B5CF6',
      colorBackground: '#0B0E14',
      colorText: '#E4E4E7',
      borderRadius: '12px',
    },
  },
});
```

**Минусы**: 
- Требует больше кода
- Нужно создавать форму с нуля
- Сложнее поддерживать

### 2. Использовать Stripe (если нужна полная кастомизация)

Stripe Checkout имеет больше возможностей кастомизации через CSS и настройки.

## Текущая реализация

Сейчас используется **Paddle Checkout Overlay** с темной темой - это оптимальный баланс между:
- ✅ Безопасностью (Paddle контролирует PCI DSS)
- ✅ Скоростью разработки
- ✅ Премиальным UX (темная тема, overlay)

## Рекомендации

1. **Настройте брендинг в Paddle Dashboard** - это даст максимальный эффект при минимальных усилиях
2. **Используйте темную тему** (уже настроено) - она лучше сочетается с вашим дизайном
3. **Добавьте логотип** в Paddle Dashboard - это повысит доверие пользователей
4. **Настройте цвета** в Paddle Dashboard под ваш бренд (фиолетовый/мятный)

## Ссылки

- [Paddle Dashboard](https://vendors.paddle.com/)
- [Paddle JS SDK Documentation](https://developer.paddle.com/paddlejs/overview)
- [Paddle Checkout Settings](https://developer.paddle.com/paddlejs/reference/paddle-checkout)

