# 🔍 Проверка Gemini API

## Проблема
```
ERROR 429: You exceeded your current quota
```

Но ключ **новый**, квота не должна быть исчерпана!

---

## Возможные причины

### 1. Новый ключ не активирован
Google иногда требует активации ключа:
- Нужно сделать первый запрос через UI
- Или подождать несколько минут

### 2. Неправильная модель
Может быть `gemini-2.0-flash-exp` требует биллинга?

### 3. Региональные ограничения
API может быть недоступен в твоём регионе.

### 4. Лимиты для новых аккаунтов
Google ограничивает новые аккаунты.

---

## Проверка 1: Статус ключа

### Перейди в Google AI Studio
https://aistudio.google.com/apikey

### Проверь:
1. **API key** активен?
2. **Project** привязан?
3. Есть ли **предупреждения**?

---

## Проверка 2: Квота

### Перейди в раздел квоты
https://aistudio.google.com/

### Проверь:
1. **Usage** — сколько запросов использовано?
2. **Quota** — какой лимит?
3. Есть ли **ошибки**?

---

## Проверка 3: Тестовый запрос

### Проверим API ключ напрямую

Выполни в терминале (замени `YOUR_API_KEY`):

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'
```

---

## Решение 1: Попробуй другую модель

Может быть `gemini-2.0-flash-exp` (экспериментальная) требует особых прав?

### Попробуем стабильную версию

Замени в `AI_CHAT_FINAL.txt` строку 95:

**Было:**
```typescript
gemini-2.0-flash-exp:streamGenerateContent
```

**Попробуй:**
```typescript
gemini-1.5-flash:streamGenerateContent
```

Или:
```typescript
gemini-1.5-pro:streamGenerateContent
```

---

## Решение 2: Пересоздай ключ

1. Удали старый ключ: https://aistudio.google.com/apikey
2. Создай новый
3. Обнови в Supabase Secrets
4. Redeploy функцию

---

## Решение 3: Включи биллинг

Иногда Google требует включить биллинг даже для бесплатного уровня:

1. Перейди: https://console.cloud.google.com/billing
2. Привяжи карту (списаний не будет, если не превысишь лимит)
3. Подожди 5-10 минут

---

## Временное решение: Оставь Groq

Пока разбираемся с Gemini:
- ✅ Groq работает отлично (Llama-3.3)
- ✅ 14,400 запросов/день
- ✅ Бесплатно
- ✅ AI уже работает

---

**Давай сначала проверим квоту в Google AI Studio!**

Открой https://aistudio.google.com/ и скинь скрин раздела с квотой.

