# ⚡ БЫСТРАЯ НАСТРОЙКА: Свой Gemini API

## Что сделано

✅ Убран Lovable API (платный)
✅ Добавлен прямой Gemini API от Google (бесплатно)
✅ Упрощён промпт (естественный язык)
✅ Groq как резерв

---

## Шаг 1: Получить ключ Gemini (2 минуты)

1. Открой: **https://aistudio.google.com/apikey**
2. Войди через Google
3. Нажми **"Create API Key"**
4. Скопируй ключ (начинается с `AIza...`)

---

## Шаг 2: Добавить в Supabase (1 минута)

1. **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. Нажми **"Add a new secret"**
3. Заполни:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: вставь ключ
4. Нажми **"Save"**

---

## Шаг 3: Обновить функцию (1 минута)

**Supabase Dashboard** → **Edge Functions** → **ai-chat** → **Code**

**Скопируй код из:**
- `AI_CHAT_WITH_KNOWLEDGE.txt` — с учебниками (рекомендую)
- `AI_CHAT_CODE.txt` — без учебников (проще)

**Нажми** "Deploy updates"

---

## Шаг 4: Проверить (1 минута)

1. Перезагрузи приложение
2. Задай вопрос AI
3. В логах:
```
[AI Chat] Trying Google Gemini API...
[AI Chat] ✅ Gemini API success
```

---

## Итого: 5 минут 🎉

После настройки:
- ✅ Свой бесплатный Gemini
- ✅ Грамотные ответы
- ✅ Естественный стиль
- ✅ Про Испанию (не "некоторые страны")
- ✅ Использует учебники (если AI_CHAT_WITH_KNOWLEDGE.txt)

---

**Начни с получения ключа:** https://aistudio.google.com/apikey

