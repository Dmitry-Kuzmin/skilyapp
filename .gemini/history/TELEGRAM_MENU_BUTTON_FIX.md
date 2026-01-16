# 🔧 КРИТИЧНО: Проблема с Menu Button в BotFather

## Проблема

Если приложение открывается через **Menu Button** (кнопка слева от поля ввода в Telegram) и все равно открывается шторкой, это означает, что:

1. **Menu Button настроен неправильно** - открывает как обычный сайт, а не Mini App
2. **Telegram кэширует старую версию** приложения

## ✅ Решение для Menu Button

### Шаг 1: Проверьте настройки Menu Button в BotFather

1. Откройте **@BotFather** в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Выберите **Bot Settings** → **Menu Button**
5. **ВАЖНО:** Убедитесь, что там указан **корневой URL**:
   ```
   https://skilyapp.com?v=expand_fix_v5
   ```
   (НЕ `/dashboard`, а корневой URL)

6. Нажмите **Save**

### Шаг 2: Полностью перезагрузите Telegram

1. **Полностью закройте Telegram** на телефоне (не просто сверните, а закройте из списка приложений)
2. Откройте Telegram заново
3. Откройте приложение через Menu Button

### Шаг 3: Проверьте в консоли

Откройте консоль (через Eruda или Desktop версию Telegram) и проверьте:

```javascript
// Должно быть true
window.Telegram?.WebApp

// Должно быть true (если это Mini App)
window.Telegram?.WebApp?.initData

// Должно быть false (если expand() сработал)
window.Telegram?.WebApp?.isExpanded === false // false означает что НЕ развернуто

// Проверьте логи
window._telegramExpandLogs
```

### Шаг 4: Если все еще не работает

Если в консоли вы видите:
```
[Telegram Expand BODY] ❌❌❌ NOT A MINI APP! This is opened as regular website.
```

Это означает, что **Menu Button открывает приложение как обычный сайт**, а не как Mini App.

**Решение:**
1. В BotFather → Menu Button → **Disable Menu Button**
2. Сохраните
3. Подождите 1-2 минуты
4. Включите Menu Button снова с URL: `https://skilyapp.com?v=expand_fix_v5`
5. Сохраните
6. Перезагрузите Telegram

## 🔍 Альтернативное решение: Используйте Inline Button вместо Menu Button

Если Menu Button не работает, используйте Inline Button в сообщениях бота:

```python
# В коде бота (keyboards.ts уже правильно настроен)
{ 
  text: '🚀 Открыть Skilyapp', 
  web_app: { url: 'https://skilyapp.com' } 
}
```

Inline Button **всегда** открывает как Mini App, в отличие от Menu Button.

## 📋 Чеклист

- [ ] Menu Button URL: `https://skilyapp.com?v=expand_fix_v5` (корневой, не `/dashboard`)
- [ ] Telegram полностью перезагружен
- [ ] В консоли есть `window.Telegram.WebApp` (не undefined)
- [ ] В консоли есть логи `[Telegram Expand]`
- [ ] Если не работает - попробовали Disable/Enable Menu Button

## ⚠️ Важно

**Menu Button в BotFather иногда глючит** и может открывать приложение как обычный сайт даже при правильных настройках. 

Если ничего не помогает:
1. Используйте **Inline Button** в сообщениях бота (он всегда работает правильно)
2. Или отключите Menu Button и используйте команду `/start` с Inline Button

