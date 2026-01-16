# 🔧 Menu Button vs Main App - Важное различие

## Проблема

Menu Button (устанавливается программно) может **переопределять** настройки Main App, даже если Main App настроен на Fullscreen.

## Разница между Menu Button и Main App

### Main App (в BotFather)
- Настраивается в **Bot Settings → Main App**
- Имеет настройку **Launch Mode: Fullscreen**
- Используется кнопкой **"Open App"** в интерфейсе Telegram
- **Гарантированно** открывается в Fullscreen, если настроено

### Menu Button (программно через код)
- Устанавливается через `setChatMenuButton` API
- Может **игнорировать** настройки Main App
- Открывается в режиме, который Telegram считает подходящим
- **Может открываться в compact/fullsize**, даже если Main App настроен на Fullscreen

## ✅ Решение

### Вариант 1: Использовать только Main App (рекомендуется)

1. **Отключите Menu Button в BotFather:**
   - Bot Settings → Menu Button → **Disable Menu Button**

2. **Настройте Main App:**
   - Bot Settings → Main App
   - URL: `https://skilyapp.com`
   - Launch Mode: **Fullscreen** ✅
   - Сохраните

3. **Отключите программную установку Menu Button:**
   - Код уже обновлен - Menu Button не устанавливается программно
   - Пользователи будут использовать кнопку **"Open App"** в интерфейсе Telegram

### Вариант 2: Использовать Menu Button (если нужно)

Если все равно хотите использовать Menu Button:

1. **Настройте Main App на Fullscreen** (как в Варианте 1)
2. **Включите программную установку Menu Button** (раскомментируйте код в `handleStart`)
3. **Проверьте логи** - возможно Menu Button все равно будет игнорировать Fullscreen

## 📋 Текущее состояние

- ✅ Main App настроен на Fullscreen
- ✅ Menu Button отключен программно (код обновлен)
- ✅ Пользователи используют кнопку "Open App" → открывается в Fullscreen

## ⚠️ Важно

**Menu Button и Main App - это разные вещи:**
- Menu Button = кнопка слева от поля ввода (может игнорировать Fullscreen)
- Main App = кнопка "Open App" в интерфейсе Telegram (соблюдает Fullscreen)

**Для гарантированного Fullscreen используйте Main App, а не Menu Button.**

