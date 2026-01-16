# 🔧 Исправление ошибки Gemini 404

## Проблема

Ошибка в логах:
```
[AI Chat] Gemini API error: 404 
models/gemini-1.5-flash is not found for API version v1beta
```

## Причина

Модель называется `gemini-1.5-flash-latest`, а не `gemini-1.5-flash`.

## Решение

✅ Код исправлен!

Изменено:
```typescript
// Было:
gemini-1.5-flash

// Стало:
gemini-1.5-flash-latest
```

---

## Что сделать

### Обнови код в Supabase:

1. **Edge Functions** → **ai-chat** → **Code**
2. Скопируй код из `AI_CHAT_CODE.txt` (уже исправлен)
3. **Deploy updates**

---

## Проверка

После деплоя в логах должно быть:
```
[AI Chat] Trying Google Gemini API...
[AI Chat] ✅ Gemini API success
```

Вместо ошибки 404.

---

## Готово! 🎉

Теперь Gemini должен работать правильно!

