# 🔧 КРИТИЧНО: Исправление Menu Button для Fullscreen

## Проблема

В логах видно:
```
[Telegram.WebView] > postEvent web_app_expand
[App] ✅ expand() called
```

Код **вызывает** `expand()`, но Telegram **игнорирует** его, потому что приложение открывается через **именованное приложение** `/dashboard`, которое **не поддерживает fullscreen**.

## ✅ Решение

### Шаг 1: Измените URL в Menu Button

1. Откройте **@BotFather** в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота (`@sdadimtutbot`)
4. Выберите **Bot Settings** → **Menu Button**
5. **ВАЖНО:** Измените URL на **корневой** (без `/dashboard`):
   ```
   https://skilyapp.com?v=menu_fix_v1
   ```
   **НЕ** используйте:
   - ❌ `https://skilyapp.com/dashboard`
   - ❌ `t.me/sdadimtutbot/dashboard`
   
6. Нажмите **Save**

### Шаг 2: Перезагрузите Telegram

1. **Полностью закройте Telegram** на телефоне (не просто сверните)
2. Откройте Telegram заново
3. Откройте приложение через Menu Button

### Шаг 3: Проверьте результат

Приложение должно открыться **на весь экран** без шторки.

## 🔍 Почему это работает?

- **Именованные приложения** (`/dashboard`, `/duels`, и т.д.) открываются как "шторка" и **не поддерживают** программный `expand()`
- **Главное приложение** (корневой URL) поддерживает `expand()` и может открываться на весь экран
- Приложение само редиректит на `/dashboard` при наличии сессии, но открывается из корневого URL

## 📋 Альтернатива: Используйте Inline Button

Если Menu Button все равно не работает, используйте **Inline Button** в сообщениях бота:

```python
# В keyboards.ts уже правильно настроено:
{ 
  text: '🚀 Открыть Skilyapp', 
  web_app: { url: 'https://skilyapp.com' } 
}
```

Inline Button **всегда** открывает как Mini App с поддержкой fullscreen.

## ⚠️ Важно

После изменения URL в BotFather:
- Подождите 1-2 минуты для синхронизации
- Полностью перезагрузите Telegram
- Проверьте, что используется корневой URL, а не `/dashboard`

## ✅ Чеклист

- [ ] Menu Button URL изменен на `https://skilyapp.com?v=menu_fix_v1` (корневой)
- [ ] Telegram полностью перезагружен
- [ ] Приложение открывается на весь экран
- [ ] В консоли нет ошибки `[Telegram Expand] ❌❌❌ NOT A MINI APP!`

