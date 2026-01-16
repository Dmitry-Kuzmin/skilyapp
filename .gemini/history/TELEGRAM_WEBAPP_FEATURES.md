# Telegram Web App API - Реализованные и предлагаемые фичи

## ✅ Реализовано

### 1. Вибрация (Haptic Feedback)
**Где используется:** `src/pages/TestSession.tsx` - при ответе на вопрос

**Типы вибрации:**
- `success` - при правильном ответе (notificationOccurred)
- `error` - при неправильном ответе (notificationOccurred)
- `light/medium/heavy/rigid/soft` - тактильная обратная связь (impactOccurred)
- `selection` - при изменении выбора (selectionChanged)

**Пример использования:**
```typescript
import { triggerHapticFeedback } from "@/lib/telegram";

// При правильном ответе
triggerHapticFeedback('success');

// При неправильном ответе
triggerHapticFeedback('error');

// При выборе опции
triggerHapticFeedback('selection');
```

### 2. Всплывающие окна
**Функции:** `showTelegramAlert`, `showTelegramConfirm`, `showTelegramPopup`

**Где можно использовать:**
- Подтверждение выхода из теста
- Уведомления о важных событиях
- Диалоги с выбором действий

**Пример использования:**
```typescript
import { showTelegramAlert, showTelegramConfirm, showTelegramPopup } from "@/lib/telegram";

// Простое уведомление
showTelegramAlert('Тест завершен!');

// Подтверждение
const confirmed = await showTelegramConfirm('Вы уверены, что хотите выйти?');
if (confirmed) {
  // Действие
}

// Окно с кнопками
const buttonId = await showTelegramPopup('Выберите действие:', [
  { id: 'retry', text: 'Повторить', type: 'default' },
  { id: 'exit', text: 'Выйти', type: 'destructive' }
]);
```

## 🚀 Предлагаемые фичи для реализации

### 1. MainButton (Главная кнопка внизу экрана)
**Описание:** Большая кнопка внизу экрана Telegram Web App, которая всегда видна

**Где использовать:**
- В тестах: "Следующий вопрос", "Завершить тест"
- В играх: "Начать игру", "Продолжить"
- В формах: "Отправить", "Сохранить"

**Преимущества:**
- Всегда видна, не нужно скроллить
- Нативный вид Telegram
- Можно менять текст и цвет динамически

**Пример:**
```typescript
const webApp = getTelegramWebApp();
if (webApp?.MainButton) {
  webApp.MainButton.setText('Завершить тест');
  webApp.MainButton.show();
  webApp.MainButton.onClick(() => {
    finishTest();
  });
}
```

### 2. BackButton (Кнопка "Назад")
**Описание:** Кнопка "Назад" в верхней панели Telegram

**Где использовать:**
- В тестах: подтверждение выхода
- В модальных окнах: закрытие
- В навигации: возврат на предыдущий экран

**Преимущества:**
- Нативный UX Telegram
- Автоматическая обработка жеста "назад"

**Пример:**
```typescript
const webApp = getTelegramWebApp();
if (webApp?.BackButton) {
  webApp.BackButton.show();
  webApp.BackButton.onClick(() => {
    // Показать подтверждение выхода
    showTelegramConfirm('Вы уверены, что хотите выйти?').then(confirmed => {
      if (confirmed) {
        navigate('/');
      }
    });
  });
}
```

### 3. CloudStorage (Облачное хранилище)
**Описание:** Хранение данных пользователя в облаке Telegram (до 10KB на ключ)

**Где использовать:**
- Сохранение настроек теста (язык, размер шрифта)
- Сохранение прогресса между устройствами
- Синхронизация закладок Challenge Bank

**Преимущества:**
- Синхронизация между устройствами
- Не требует авторизации
- Быстрый доступ

**Пример:**
```typescript
const webApp = getTelegramWebApp();
if (webApp?.CloudStorage) {
  // Сохранение
  webApp.CloudStorage.setItem('testSettings', JSON.stringify({
    language: 'es',
    fontSize: 'medium'
  }));

  // Загрузка
  webApp.CloudStorage.getItem('testSettings', (error, value) => {
    if (!error && value) {
      const settings = JSON.parse(value);
      // Применить настройки
    }
  });
}
```

### 4. ThemeParams (Тема приложения)
**Описание:** Получение цветов темы Telegram пользователя

**Где использовать:**
- Адаптация цветов под тему Telegram
- Темная/светлая тема
- Цвета кнопок и акцентов

**Преимущества:**
- Единый стиль с Telegram
- Автоматическая поддержка темной темы

**Пример:**
```typescript
const webApp = getTelegramWebApp();
if (webApp?.themeParams) {
  const bgColor = webApp.themeParams.bg_color || '#ffffff';
  const textColor = webApp.themeParams.text_color || '#000000';
  const buttonColor = webApp.themeParams.button_color || '#3390ec';
  
  // Применить цвета к интерфейсу
  document.documentElement.style.setProperty('--tg-theme-bg-color', bgColor);
  document.documentElement.style.setProperty('--tg-theme-text-color', textColor);
  document.documentElement.style.setProperty('--tg-theme-button-color', buttonColor);
}
```

### 5. Viewport (Управление viewport)
**Описание:** Отслеживание изменений размера экрана (клавиатура, ориентация)

**Где использовать:**
- Адаптация под клавиатуру
- Обработка поворота экрана
- Оптимизация для разных размеров экрана

**Преимущества:**
- Правильная работа с клавиатурой
- Адаптация под разные устройства

**Пример:**
```typescript
const webApp = getTelegramWebApp();
if (webApp) {
  webApp.onEvent('viewportChanged', () => {
    const height = webApp.viewportHeight;
    const stableHeight = webApp.viewportStableHeight;
    
    // Адаптировать интерфейс под новую высоту
    if (height < stableHeight) {
      // Клавиатура открыта
    } else {
      // Клавиатура закрыта
    }
  });
}
```

### 6. BiometricManager (Биометрия)
**Описание:** Аутентификация через Face ID / Touch ID / Fingerprint

**Где использовать:**
- Быстрый вход в приложение
- Подтверждение важных действий (покупка премиума)
- Защита чувствительных данных

**Преимущества:**
- Безопасность
- Удобство для пользователя

**Пример:**
```typescript
const webApp = getTelegramWebApp();
if (webApp?.BiometricManager) {
  webApp.BiometricManager.requestAccess({
    reason: 'Для быстрого входа в приложение'
  }, (granted) => {
    if (granted) {
      // Аутентификация успешна
    }
  });
}
```

### 7. openLink / openTelegramLink
**Описание:** Открытие ссылок внутри Telegram или в браузере

**Где использовать:**
- Ссылки на правила DGT
- Ссылки на документацию
- Ссылки на социальные сети

**Преимущества:**
- Не покидает Telegram
- Правильная обработка ссылок

**Пример:**
```typescript
const webApp = getTelegramWebApp();
if (webApp) {
  // Открыть в Telegram
  webApp.openTelegramLink('https://t.me/your_channel');
  
  // Открыть в браузере
  webApp.openLink('https://example.com', { try_instant_view: true });
}
```

## 📋 Приоритеты внедрения

1. **Высокий приоритет:**
   - ✅ Вибрация (реализовано)
   - MainButton для тестов
   - BackButton для навигации

2. **Средний приоритет:**
   - CloudStorage для синхронизации настроек
   - ThemeParams для адаптации темы
   - Viewport для работы с клавиатурой

3. **Низкий приоритет:**
   - BiometricManager
   - openLink / openTelegramLink

## 🔗 Полезные ссылки

- [Официальная документация Telegram Web App API](https://core.telegram.org/bots/webapps)
- [Telegram Web App API Reference](https://core.telegram.org/bots/webapps#initializing-mini-apps)

