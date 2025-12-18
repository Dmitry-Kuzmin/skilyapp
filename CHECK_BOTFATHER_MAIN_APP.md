# 🔧 КРИТИЧНО: Проверка Main App в BotFather

## Проблема
Приложение открывается шторкой, несмотря на все вызовы `expand()`.

## Причина
**Main App в BotFather НЕ настроен на Fullscreen режим.**

## ✅ Решение

### 1. Откройте BotFather

1. Откройте **@BotFather** в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота (`@sdadimtutbot`)

### 2. Настройте Main App

1. Выберите **Bot Settings** → **Main App** (НЕ Menu Button!)
2. **ВАЖНО:** Убедитесь, что включен **Fullscreen** режим
3. URL должен быть: `https://skilyapp.com`
4. Сохраните изменения

### 3. Проверьте Menu Button

1. Выберите **Bot Settings** → **Menu Button**
2. **ВАЖНО:** Menu Button должен быть **отключен** (Disabled)
3. Если включен — отключите его
4. Menu Button устанавливается программно через код (через `setChatMenuButton`)

### 4. Проверьте логи

После настройки отправьте `/start` боту и проверьте логи в Supabase:

Должны увидеть:
```
[Telegram Expand] 🔍 Состояние ДО expand(): { isExpanded: false, ... }
[Telegram Expand] ✅✅✅ expand() вызван
[Telegram Expand] 🔍 Состояние ПОСЛЕ expand(): { isExpanded: true, ... }
```

Если `isExpanded: false` после `expand()`:
- Main App не настроен на Fullscreen
- Или Menu Button открывает как обычный сайт

## ⚠️ КРИТИЧНО

**Main App** и **Menu Button** — это разные вещи:

- **Main App** — настройки для Mini App (включая Fullscreen)
- **Menu Button** — кнопка слева от поля ввода

**Menu Button должен быть отключен в BotFather**, потому что он устанавливается программно через код.

## 📋 Чеклист

- [ ] Main App настроен в BotFather
- [ ] Fullscreen режим включен в Main App
- [ ] URL в Main App: `https://skilyapp.com`
- [ ] Menu Button отключен в BotFather (устанавливается программно)
- [ ] Отправлен `/start` боту после настройки
- [ ] Проверены логи — `isExpanded: true` после `expand()`
- [ ] Приложение открывается на весь экран

