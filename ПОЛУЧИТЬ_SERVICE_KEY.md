# 🔑 Как получить Service Key

## Шаг 1: Открой Supabase Dashboard

1. Перейди на: https://supabase.com/dashboard
2. Выбери проект **sdadim-dgt-prep**

---

## Шаг 2: Открой настройки API

1. В меню слева найди **Settings** (⚙️ настройки)
2. Нажми на **Settings**
3. В подменю найди **API**
4. Нажми на **API**

---

## Шаг 3: Скопируй Service Role Key

1. Прокрути вниз до раздела **"Project API keys"**
2. Найди секцию **"service_role"** (НЕ anon!)
3. Нажми на **"Reveal"** или иконку глаза 👁️
4. Скопируй ключ (он очень длинный, начинается с `eyJ...`)

⚠️ **ВАЖНО**: Это секретный ключ! Не публикуй его нигде!

---

## Шаг 4: Создай файл .env

1. В проекте создай файл **`.env`** в корне (рядом с `package.json`)
2. Вставь:
   ```
   SUPABASE_SERVICE_KEY=твой_скопированный_ключ_здесь
   ```

Замени `твой_скопированный_ключ_здесь` на ключ из шага 3.

---

## Проверка

Файл `.env` должен выглядеть так:
```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ0MTYxMywiZXhwIjoyMDQ1MDE3NjEzfQ...
```

(Это пример, у тебя будет другой ключ)

---

## Готово! ✅

После создания `.env` можешь запустить обработку PDF:
```bash
npm run process-pdf
```

