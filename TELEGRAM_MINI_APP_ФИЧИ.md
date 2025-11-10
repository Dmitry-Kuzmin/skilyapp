# 🚀 Telegram Mini App - Полезные фичи

## ✅ Уже реализовано

### 1. Базовая инициализация
- `webApp.ready()` — готовность приложения
- `webApp.expand()` — развернуть на весь экран
- `webApp.disableVerticalSwipes()` — не сворачивать при скролле ✅ НОВОЕ!

### 2. Safe Area Insets
- Автоматическое определение
- CSS переменные: `--tg-content-safe-area-inset-top/bottom/left/right`
- Учитывается в Layout и диалогах

### 3. BackButton
- Автоматически показывается на всех страницах кроме главной
- navigate(-1) при клике

### 4. Визуальная отладка
- Компонент `TelegramSafeAreaDebug` ✅ НОВОЕ!
- Показывает красные зоны safe area
- Инфо-панель с значениями

---

## 💡 Полезные фичи которые можно добавить

### 1. 🎨 Темная тема из Telegram
```typescript
const theme = webApp.themeParams;
// {
//   bg_color: "#ffffff",
//   text_color: "#000000",
//   hint_color: "#999999",
//   link_color: "#2481cc",
//   button_color: "#2481cc",
//   button_text_color: "#ffffff"
// }

// Применяем цвета Telegram в приложение
document.documentElement.style.setProperty('--background', theme.bg_color);
document.documentElement.style.setProperty('--foreground', theme.text_color);
```

**Преимущества:**
- Приложение выглядит нативно в Telegram
- Автоматически подстраивается под тему пользователя
- Dark/Light mode из Telegram

### 2. 🔔 Haptic Feedback (вибрация)
```typescript
// При правильном ответе
webApp.HapticFeedback.notificationOccurred('success');

// При неправильном
webApp.HapticFeedback.notificationOccurred('error');

// При клике на кнопку
webApp.HapticFeedback.impactOccurred('light');

// При важном действии
webApp.HapticFeedback.impactOccurred('medium');
```

**Где применить:**
- Правильный/неправильный ответ в тесте
- Завершение теста
- Получение достижения
- Клики на кнопки

### 3. 📱 MainButton (нижняя кнопка Telegram)
```typescript
// Показать кнопку "Завершить тест"
webApp.MainButton.setText('Завершить тест');
webApp.MainButton.show();
webApp.MainButton.onClick(() => {
  // Завершить тест
});

// Прогресс
webApp.MainButton.showProgress(); // Показать loader
webApp.MainButton.hideProgress();
```

**Где применить:**
- Завершить тест
- Отправить ответ
- Начать дуэль
- Купить премиум

### 4. 🎯 CloudStorage (хранилище Telegram)
```typescript
// Сохранить настройки в облаке Telegram
await webApp.CloudStorage.setItem('settings', JSON.stringify({
  notifications: true,
  sound: false
}));

// Загрузить
const settings = await webApp.CloudStorage.getItem('settings');
```

**Преимущества:**
- Синхронизация между устройствами
- Не нужен Supabase для настроек
- Работает для неавторизованных

### 5. 📤 Share (поделиться)
```typescript
// Кнопка "Поделиться результатом"
webApp.shareUrl('https://t.me/YourBot?start=test_result_12345', 'Я прошёл тест на 95%! Попробуй и ты! 🚗');
```

**Где применить:**
- Поделиться результатом теста
- Пригласить друга на дуэль
- Поделиться достижением

### 6. 🔗 Deep Links
```typescript
// Обработка startParam
const startParam = webApp.initDataUnsafe?.start_param;

if (startParam === 'duel_12345') {
  // Открыть конкретную дуэль
  navigate('/duel/12345');
}

if (startParam === 'test_topic_1') {
  // Открыть тест по теме 1
  navigate('/test/topic/1');
}
```

**Где применить:**
- Прямая ссылка на дуэль
- Ссылка на конкретный тест
- Реферальная система

### 7. 📊 ViewportStableHeight (для клавиатуры)
```typescript
// Отслеживаем высоту без клавиатуры
webApp.onEvent('viewportChanged', () => {
  const isKeyboardOpen = webApp.viewportHeight < webApp.viewportStableHeight;
  
  if (isKeyboardOpen) {
    // Клавиатура открыта - адаптируем UI
    document.body.style.height = `${webApp.viewportHeight}px`;
  }
});
```

**Где применить:**
- AI чат (когда печатаешь вопрос)
- Формы ввода
- Комментарии

### 8. 🎨 HeaderColor (цвет шапки)
```typescript
// Меняем цвет header Telegram под страницу
webApp.setHeaderColor('#6366f1'); // Фиолетовый на главной
webApp.setHeaderColor('#10b981'); // Зелёный в тесте при правильном ответе
webApp.setHeaderColor('#ef4444'); // Красный при ошибке
```

### 9. 🔐 BiometricManager (Face ID / Touch ID)
```typescript
// Проверка доступности
if (webApp.BiometricManager.isInited && webApp.BiometricManager.isBiometricAvailable) {
  // Запросить аутентификацию
  webApp.BiometricManager.authenticate({
    reason: 'Вход в личный кабинет'
  }, (success) => {
    if (success) {
      // Авторизовать пользователя
    }
  });
}
```

**Где применить:**
- Вход в личный кабинет
- Покупка премиума
- Доступ к результатам

### 10. 📲 QR Scanner
```typescript
// Сканировать QR код
webApp.showScanQrPopup({
  text: 'Отсканируй QR код билета'
}, (data) => {
  if (data) {
    // Обработать данные QR
  }
});
```

**Где применить:**
- Сканировать код с реального экзаменационного билета
- Добавить друга по QR
- Активация промокода

---

## 🎯 Что рекомендую добавить СЕЙЧАС

### Приоритет 1 (легко и эффектно):
1. ✅ **disableVerticalSwipes** (уже добавлено!)
2. ✅ **Визуальная отладка** (уже добавлено!)
3. 🔔 **Haptic Feedback** (5 минут)
4. 🎨 **HeaderColor** (5 минут)

### Приоритет 2 (очень полезно):
5. 📤 **Share** кнопка для результатов (10 минут)
6. 🎯 **MainButton** для завершения теста (10 минут)
7. 🎨 **ThemeParams** для нативного вида (15 минут)

### Приоритет 3 (для премиум фич):
8. 💾 **CloudStorage** для синхронизации (20 минут)
9. 🔗 **Deep Links** для дуэлей (20 минут)
10. 🔐 **BiometricManager** для безопасности (30 минут)

---

## 📚 Официальная документация

https://core.telegram.org/bots/webapps

**Ключевые разделы:**
- Web App Methods
- Theme Parameters
- Haptic Feedback
- Cloud Storage
- BiometricManager

---

**Хочешь добавлю Haptic Feedback и HeaderColor прямо сейчас?** 

Это займёт 10 минут и сделает приложение намного приятнее! 🎉

