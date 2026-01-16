# ✅ ngrok установлен и готов к использованию!

## 📍 Где установлен ngrok

ngrok установлен в папке проекта:
```
/Users/dimka/.cursor/worktrees/sdadim-dgt-prep/gqCtX/ngrok
```

## 🔑 Шаг 1: Авторизация ngrok

Для работы ngrok нужен authtoken. Выполните:

```bash
cd /Users/dimka/.cursor/worktrees/sdadim-dgt-prep/gqCtX
./ngrok config add-authtoken <ВАШ_AUTHTOKEN>
```

**Где взять authtoken:**
1. Откройте https://dashboard.ngrok.com/get-started/your-authtoken
2. Скопируйте ваш authtoken
3. Замените `<ВАШ_AUTHTOKEN>` в команде выше на ваш токен

**Пример:**
```bash
./ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu
```

---

## 🚀 Шаг 2: Запуск с ngrok

### Вариант 1: Использовать скрипт (рекомендуется)

```bash
cd /Users/dimka/.cursor/worktrees/sdadim-dgt-prep/gqCtX
./start-with-ngrok.sh
```

Скрипт автоматически:
- Запустит dev сервер
- Запустит ngrok
- Покажет URL для использования в BotFather

### Вариант 2: Запустить вручную

**Терминал 1 - Dev сервер:**
```bash
cd /Users/dimka/.cursor/worktrees/sdadim-dgt-prep/gqCtX
npm run dev
```

**Терминал 2 - ngrok:**
```bash
cd /Users/dimka/.cursor/worktrees/sdadim-dgt-prep/gqCtX
./ngrok http 8080
```

---

## 📋 Шаг 3: Настройка BotFather

1. Скопируйте **HTTPS URL** из вывода ngrok (например: `https://abc123.ngrok-free.app`)

2. Откройте [@BotFather](https://t.me/BotFather) в Telegram

3. Отправьте команду: `/setmenubutton`

4. Выберите вашего бота

5. Введите название кнопки (например: "Открыть приложение")

6. Вставьте HTTPS URL из ngrok

7. Готово!

---

## ✅ Проверка установки

```bash
cd /Users/dimka/.cursor/worktrees/sdadim-dgt-prep/gqCtX
./ngrok version
```

Должно показать: `ngrok version 3.32.0`

---

## 🎯 Готово к использованию!

После авторизации ngrok готов к работе. Запустите `./start-with-ngrok.sh` и следуйте инструкциям выше.

