# 🌐 Информация о Cloudflare Tunnel

## ⚠️ Важно: URL меняется при каждом перезапуске!

**Quick Tunnel** (который мы используем) создаёт **новый URL** каждый раз при запуске.

### Почему URL меняется?

Cloudflare Tunnel работает в двух режимах:
1. **Quick Tunnel** (быстрый) — бесплатный, но URL меняется при каждом запуске
2. **Named Tunnel** (именованный) — требует аккаунт Cloudflare, но URL постоянный

Мы используем Quick Tunnel, потому что он:
- ✅ Не требует регистрации
- ✅ Работает сразу
- ✅ Бесплатный
- ❌ Но URL меняется при перезапуске

## 🔗 Как получить текущий URL

### Способ 1: Через скрипт (самый простой)

```bash
npm run tunnel:url
```

### Способ 2: Из логов

```bash
grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' /tmp/cloudflared-tunnel.log | tail -1
```

### Способ 3: В терминале, где запущен tunnel

После запуска tunnel вы увидите строку:
```
https://abc123.trycloudflare.com
```

### Способ 4: Сохранить URL в файл

Запустите tunnel с сохранением URL:
```bash
npm run tunnel:start:save
```

Затем получите URL:
```bash
cat /tmp/cloudflare-tunnel-url.txt
```

## 📋 Типичный workflow

1. **Запустите dev сервер:**
   ```bash
   npm run dev
   ```

2. **Запустите tunnel:**
   ```bash
   npm run tunnel:start
   ```

3. **Скопируйте URL** из вывода (или используйте `npm run tunnel:url`)

4. **Обновите URL в Telegram Bot:**
   ```bash
   TELEGRAM_BOT_TOKEN=your_token npm run tunnel:set-url <URL>
   ```

5. **Или вручную через BotFather:**
   - Откройте [@BotFather](https://t.me/BotFather)
   - `/setmenubutton` → выберите бота → вставьте URL

## 💡 Автоматизация

Если указан `TELEGRAM_BOT_TOKEN`, URL обновляется автоматически:

```bash
export TELEGRAM_BOT_TOKEN=your_token
npm run dev:telegram
```

## 🔄 Что делать при перезапуске tunnel?

1. Получите новый URL: `npm run tunnel:url`
2. Обновите в BotFather или через скрипт
3. Готово!

## 🎯 Постоянный URL (если нужно)

Если нужен URL, который не меняется:

1. Зарегистрируйтесь на [Cloudflare](https://dash.cloudflare.com/)
2. Создайте named tunnel
3. Используйте: `cloudflared tunnel run <tunnel-name>`

Но для локальной разработки quick tunnel обычно достаточно.

