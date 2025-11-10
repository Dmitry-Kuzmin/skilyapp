# 🚀 Быстрое тестирование Telegram Mini App

## Проблема
- Каждый раз пушить в Git → долго
- Подписка на туннель кончилась
- Нужно быстро тестировать на телефоне

---

## ✅ Решение 1: LocalTunnel (рекомендую, бесплатно)

### Установка (один раз):
```bash
npm install -g localtunnel
```

### Использование:
```bash
# 1. Запусти приложение локально
npm run dev

# 2. В другом терминале запусти туннель
npx localtunnel --port 8080

# Получишь ссылку типа:
# https://brave-goats-12345.loca.lt
```

### В Telegram BotFather:
```
/setmenubutton
Вставь ссылку: https://brave-goats-12345.loca.lt
```

**Преимущества:**
- ✅ Бесплатно
- ✅ Не требует регистрации
- ✅ Работает сразу
- ⚠️ Ссылка меняется при каждом запуске

---

## ✅ Решение 2: Cloudflare Tunnel (стабильнее)

### Установка:
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Использование:
```bash
cloudflared tunnel --url http://localhost:8080
```

Получишь стабильную ссылку.

---

## ✅ Решение 3: IP в локальной сети (самый быстрый!)

### Узнай свой IP:
```bash
ifconfig | grep "inet "
```

Найди строку типа: `inet 192.168.1.100`

### Запусти с доступом из сети:
```bash
npm run dev -- --host 0.0.0.0
```

### Открой на телефоне:
```
http://192.168.1.100:8080
```

**Преимущества:**
- ⚡ Мгновенно
- ✅ Не нужен интернет
- ✅ Стабильно
- ⚠️ Работает только в той же WiFi сети

---

## ✅ Решение 4: Telegram Web K (для десктопа)

Открой Telegram Web в браузере:
```
https://web.telegram.org/k/
```

Открой бота → Mini App будет как на телефоне, но в браузере!

**Преимущества:**
- ⚡ Мгновенно
- ✅ DevTools работают
- ✅ Удобно дебажить
- ⚠️ Не 100% как на телефоне (но близко)

---

## 🔍 Отладка Safe Area

### 1. Открой DevTools в браузере телефона

**Android:**
- Chrome → `chrome://inspect`
- Найди своё устройство

**iOS:**
- Safari → Разработка → Устройство

### 2. Проверь CSS переменные

В консоли:
```javascript
// Проверь значения safe area
console.log({
  top: getComputedStyle(document.documentElement).getPropertyValue('--tg-content-safe-area-inset-top'),
  bottom: getComputedStyle(document.documentElement).getPropertyValue('--tg-content-safe-area-inset-bottom'),
  telegram: window.Telegram?.WebApp?.contentSafeAreaInset
});
```

### 3. Временно добавь визуальную индикацию

В `AIExplanationDialog.tsx` header добавь временно:
```tsx
<div className="absolute top-0 left-0 right-0 bg-red-500/20 text-xs text-center">
  Safe area top: {getComputedStyle(document.documentElement).getPropertyValue('--tg-content-safe-area-inset-top')}
</div>
```

Увидишь какой отступ применяется!

---

## 📊 Мой рабочий процесс (рекомендую)

### Для быстрой разработки:
1. **LocalTunnel** — открыл туннель, держишь весь день
2. Изменения в коде → автоперезагрузка (Vite HMR)
3. Обновил Telegram → увидел изменения
4. Повторяй без пушей!

### Для финального теста:
1. Запуш в Git
2. Деплой в продакшен
3. Полный тест

---

## ⚡ Самый быстрый способ СЕЙЧАС

```bash
# Терминал 1:
npm run dev

# Терминал 2:
npx localtunnel --port 8080

# Скопируй ссылку в Telegram BotFather
```

**Готово!** Каждое изменение в коде → автоперезагрузка в Telegram!

---

## 🐛 Отладка safe area

После запуска туннеля:
1. Открой Mini App на телефоне
2. В консоли браузера (DevTools) посмотри логи `[TelegramNavigation]`
3. Увидишь значения safe area
4. Исправь если нужно

---

**Хочешь попробовать LocalTunnel прямо сейчас?**

