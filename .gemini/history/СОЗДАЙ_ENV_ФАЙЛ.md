# 📝 Создание .env файла

## Проблема

Ключ, который ты дал — это **anon** ключ (публичный).
Для загрузки данных нужен **service_role** ключ (секретный).

---

## Как получить правильный ключ

### Шаг 1: Открой Supabase Dashboard

https://supabase.com/dashboard → выбери проект **sdadim-dgt-prep**

### Шаг 2: Перейди в API настройки

**Settings** (⚙️) → **API**

### Шаг 3: Найди Service Role Key

Прокрути вниз до **"Project API keys"**

Там будет **ДВА** ключа:
1. **anon / public** — это у тебя уже есть ✅
2. **service_role** — это нужен! ⚠️

### Шаг 4: Скопируй Service Role Key

1. Найди секцию **"service_role"**
2. Нажми **"Reveal"** или 👁️
3. Скопируй ключ (длинный, начинается с `eyJ...`)

---

## Создание .env файла

### В VS Code или Cursor:

1. Открой проект
2. В корне (рядом с `package.json`) создай новый файл
3. Назови его **`.env`** (с точкой в начале!)
4. Вставь:
   ```
   SUPABASE_SERVICE_KEY=твой_service_role_ключ_здесь
   VITE_SUPABASE_URL=https://yffjnqegeiorunyvcxkn.supabase.co
   ```

### Или через терминал:

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep

# Создай файл (замени ВАШ_КЛЮЧ на настоящий)
echo "SUPABASE_SERVICE_KEY=ВАШ_КЛЮЧ" > .env
echo "VITE_SUPABASE_URL=https://yffjnqegeiorunyvcxkn.supabase.co" >> .env
```

---

## Проверка

Файл `.env` должен выглядеть так:

```
SUPABASE_SERVICE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://yffjnqegeiorunyvcxkn.supabase.co
```

**Важно:** 
- В ключе должно быть `"role":"service_role"`, а не `"role":"anon"`
- Ключ очень длинный (200+ символов)

---

## Затем запусти обработку

```bash
npm run process-pdf
```

Должно вывести:
```
🚀 Начинаем обработку PDF учебников DGT
📚 Найдено PDF файлов: 10
📄 Обработка: tema1.pdf
✅ Извлечено 15234 символов
...
✅ ГОТОВО! Загружено 75 разделов
```

---

## Если не получается создать .env

Напиши, я помогу другим способом (через переменные окружения или прямо в скрипте).

