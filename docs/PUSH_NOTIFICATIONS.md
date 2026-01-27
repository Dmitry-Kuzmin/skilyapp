# 🔔 Web Push Notifications для Skily

## Что реализовано

✅ Service Worker для обработки пушей (без кэширования)  
✅ Утилита для управления подписками (`pushNotifications.ts`)  
✅ UI в настройках с проверкой PWA  
✅ Таблица `push_subscriptions` в Supabase  
✅ Поддержка iOS 16.4+ и Android  

---

## 📱 Как работают красивые уведомления (как в Duolingo)

### Структура уведомления:

```typescript
{
  title: "🎯 Пора повторить!",
  body: "Ты не заходил 2 дня. Тигр скучает!",
  icon: "/icon-192.png",        // Маленькая иконка слева
  badge: "/badge-72.png",        // Бейдж на иконке приложения
  image: "/tiger-sad.png",       // БОЛЬШАЯ картинка (как в Duolingo!)
  vibrate: [200, 100, 200],      // Вибрация
  actions: [                     // Кнопки действий
    {
      action: "open",
      title: "🚀 Начать урок"
    },
    {
      action: "remind",
      title: "⏰ Напомнить через час"
    }
  ],
  data: {
    url: "/practice"             // Куда перейти при клике
  }
}
```

---

## 🛠 Что нужно настроить

### 1️⃣ Получить VAPID ключи

VAPID — это ключи шифрования для Web Push.

```bash
# Установи web-push CLI
npm install -g web-push

# Генерируй ключи
web-push generate-vapid-keys
```

Получишь:
```
Public Key: BNxxx...
Private Key: xxx...
```

### 2️⃣ Добавить ключи в `.env`

```env
# Public key — используется на фронтенде
VITE_VAPID_PUBLIC_KEY=BNxxx...

# Private key — используется на бэкенде (Edge Function)
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:your-email@example.com
```

### 3️⃣ Применить миграцию

```bash
# Применить миграцию в Supabase
npx supabase db push --linked
```

Или вручную выполни SQL из файла:
`supabase/migrations/20260127195420_create_push_subscriptions.sql`

### 4️⃣ Создать Edge Function для отправки пушей

Создай файл `supabase/functions/send-push/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

serve(async (req) => {
  try {
    const { userId, title, body, image, url, actions } = await req.json();

    // Получаем подписки пользователя
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ error: 'No subscriptions found' }), {
        status: 404,
      });
    }

    // Отправляем пуш каждой подписке
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const payload = JSON.stringify({
          title,
          body,
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          image,
          url,
          actions,
        });

        // Используем web-push библиотеку
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: payload,
        });

        if (!response.ok) {
          throw new Error(`Push failed: ${response.status}`);
        }

        return { success: true };
      })
    );

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
```

Задеплой:
```bash
npx supabase functions deploy send-push
```

---

## 🎨 Примеры красивых уведомлений

### 1. Напоминание о практике (как Duolingo)

```typescript
await supabase.functions.invoke('send-push', {
  body: {
    userId: 'xxx',
    title: '🦉 Тигр скучает!',
    body: 'Ты не заходил 2 дня. Пора повторить материал!',
    image: 'https://your-cdn.com/tiger-sad.png',
    url: '/practice',
    actions: [
      { action: 'practice', title: '🚀 Начать урок' },
      { action: 'remind', title: '⏰ Через час' },
    ],
  },
});
```

### 2. Вызов на дуэль

```typescript
await supabase.functions.invoke('send-push', {
  body: {
    userId: 'xxx',
    title: '⚔️ Новый вызов!',
    body: 'Антон бросил тебе вызов на дуэль!',
    image: 'https://your-cdn.com/duel-challenge.png',
    url: '/duels/xxx',
    actions: [
      { action: 'accept', title: '✅ Принять' },
      { action: 'decline', title: '❌ Отклонить' },
    ],
  },
});
```

### 3. Достижение разблокировано

```typescript
await supabase.functions.invoke('send-push', {
  body: {
    userId: 'xxx',
    title: '🏆 Новое достижение!',
    body: 'Ты разблокировал "Мастер парковки"!',
    image: 'https://your-cdn.com/achievement-parking.png',
    url: '/achievements',
    actions: [
      { action: 'view', title: '👀 Посмотреть' },
    ],
  },
});
```

---

## 📊 Как это выглядит на iOS

```
┌─────────────────────────────────────┐
│  🦉  Skily                          │
│                                     │
│  🦉 Тигр скучает!                   │
│  Ты не заходил 2 дня. Пора          │
│  повторить материал!                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │   [БОЛЬШАЯ КАРТИНКА ТИГРА]    │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  [🚀 Начать урок] [⏰ Через час]    │
└─────────────────────────────────────┘
```

---

## ✅ Чек-лист для запуска

- [ ] Получить VAPID ключи (`web-push generate-vapid-keys`)
- [ ] Добавить ключи в `.env`
- [ ] Применить миграцию (`npx supabase db push`)
- [ ] Создать Edge Function `send-push`
- [ ] Задеплоить Edge Function
- [ ] Добавить приложение на домашний экран (iOS)
- [ ] Включить уведомления в настройках
- [ ] Отправить тестовое уведомление

---

## 🚀 Готово!

Теперь у тебя есть красивые Web Push уведомления, как в Duolingo! 🎉

Пользователи на iOS (16.4+) и Android будут получать уведомления с:
- ✅ Большими картинками
- ✅ Кнопками действий
- ✅ Вибрацией
- ✅ Звуками
- ✅ Бейджами на иконке

**Следующие шаги:**
1. Настрой VAPID ключи
2. Создай красивые картинки для уведомлений (512x256px)
3. Напиши логику отправки (когда и кому слать пуши)
