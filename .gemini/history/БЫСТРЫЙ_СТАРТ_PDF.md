# 🚀 БЫСТРЫЙ СТАРТ: Загрузка PDF учебников

## Что сделать (6 шагов)

### 1️⃣ Применить миграцию

**Supabase Dashboard** → **SQL Editor** → **New query**

Скопируй файл: `supabase/migrations/20251110_create_dgt_knowledge.sql`
Нажми **"Run"**

---

### 2️⃣ Положить PDF файлы

Положи PDF в папку: `data/pdf/`

Названия файлов:
- `tema1.pdf`
- `tema2.pdf`
- ...
- `tema10.pdf`

---

### 3️⃣ Установить библиотеку

```bash
npm install pdf-parse
```

---

### 4️⃣ Получить Service Key

**Supabase Dashboard** → **Settings** → **API** → скопируй **service_role key**

Создай файл `.env` в корне проекта:
```
SUPABASE_SERVICE_KEY=твой_ключ_здесь
```

---

### 5️⃣ Запустить обработку PDF

```bash
npm run process-pdf
```

Должно быть:
```
✅ ГОТОВО! Загружено 75 разделов в базу данных
```

---

### 6️⃣ Обновить Edge Function

**Supabase Dashboard** → **Edge Functions** → **ai-chat** → **Code**

Скопируй код из: `AI_CHAT_WITH_KNOWLEDGE.txt`

Нажми **"Deploy updates"**

---

## Проверка

1. Перезагрузи приложение
2. Задай вопрос AI: "Что такое обгон?"
3. В логах должно быть:
   ```
   [AI Chat] Searching DGT knowledge for: Что такое обгон?
   [AI Chat] Found 3 relevant sections
   [AI Chat] Using knowledge from DGT manuals
   ```
4. Ответ должен быть точным, из учебников

---

## Готово! 🎉

AI теперь использует твои учебники DGT для точных ответов!

Подробная инструкция: `ПОШАГОВЫЙ_ПЛАН.md`

