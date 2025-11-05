# Как проверить консоль на iPhone

## Способ 1: Safari Remote Debugging (рекомендуется)

### На iPhone:
1. Откройте **Settings** (Настройки)
2. Перейдите в **Safari** → **Advanced** (Дополнительно)
3. Включите **Web Inspector** (Веб-инспектор)

### На Mac:
1. Подключите iPhone к Mac через USB кабель
2. Откройте **Safari** на Mac
3. В меню выберите **Develop** (Разработка) → **Ваше iPhone** → **Ваш WebApp**
4. Откроется консоль с логами

## Способ 2: Через ngrok (если используете)

1. Откройте приложение в Telegram на iPhone
2. На Mac откройте Safari
3. В меню **Develop** (Разработка) найдите ваше устройство
4. Выберите открытую вкладку с вашим приложением

## Способ 3: Eruda (для быстрой проверки)

Можно временно добавить Eruda для отладки прямо на iPhone:

```html
<script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>
```

## Что искать в консоли:

Ищите логи:
- `[TelegramNavigation] contentSafeAreaInset: ...`
- `[TelegramNavigation] safeAreaInset: ...`
- `[TelegramNavigation] Setting safe area insets: ...`

Если видите `topInset: 80` - значит fallback работает!
Если видите `topInset: 0` - значит API не возвращает значения.

