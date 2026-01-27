# 🎨 Rich Push Notifications (Payload Example)

Чтобы отправлять красивые уведомления с картинками и кнопками (как в Duolingo), нужно отправлять правильный JSON payload в Edge Function `send-push`.

## Структура Payload

Этот JSON нужно отправлять в `body` при вызове функции `send-push`:

```json
{
  "userId": "UUID-ПОЛЬЗОВАТЕЛЯ",
  "title": "Новый вызов! ⚔️",
  "body": "Дмитрий бросил вам вызов в Дуэли! У вас 24 часа.",
  "icon": "/icon-192.png",
  "image": "https://ващ-сайт.com/images/duel-invite.jpg", 
  "badge": "/badge-72.png",
  "tag": "duel-invite-123",
  "url": "/games/duel/123",
  "actions": [
    {
      "action": "open",
      "title": "⚔️ Принять бой"
    },
    {
      "action": "close",
      "title": "Позже"
    }
  ],
  "data": {
    "duelId": "123",
    "challenger": "Dmitry"
  }
}
```

## Ключевые поля для "Вау-эффекта" (iOS PWA)

| Поле | Описание | Эффект на iOS |
|------|----------|---------------|
| **`image`** | URL картинки (jpg/png/webp) | **Самое важное!** Показывает миниатюру справа. При долгом нажатии (Haptic Touch) разворачивается на пол-экрана. |
| **`actions`** | Массив кнопок | Добавляет кнопки под уведомлением (при долгом нажатии). |
| **`body`** | Текст сообщения | Основной текст. Emoji работают отлично ✨ |
| **`title`** | Заголовок | Жирный текст сверху. |

## Пример вызова из JS (Frontend/Console)

```javascript
await supabase.functions.invoke('send-push', {
  body: {
    userId: "ВАШ-USER-ID", // UUID
    title: "🔥 Ударный режим!",
    body: "Ты занимаешься 5 дней подряд. Не останавливайся!",
    image: window.location.origin + "/images/streak-fire.png", // Полный путь лучше
    actions: [{ action: "open", title: "Заниматься" }]
  }
})
```

## Где это работает?

*   **iOS 16.4+ (PWA)**: ✅ Картинки, Кнопки, Бэджи (если добавлено на Home Screen)
*   **Android (Chrome/Samsung)**: ✅ Всё работает отлично
*   **Desktop (Chrome/Edge/Safari)**: ✅ Всё работает

## ⚠️ Важно

*   Картинка `image` должна быть доступна публично (public bucket или public folder).
*   Размер картинки лучше держать до 1-2 МБ, чтобы загрузилась мгновенно.
*   Соотношение сторон лучше **2:1** (ландшафт) для красивого отображения в развернутом виде.
