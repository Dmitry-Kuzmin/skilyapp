# 📚 Справочник скриптов для работы с тестами DGT

> Последнее обновление: 14.01.2026

---

## 🎯 **АКТИВНЫЕ СКРИПТЫ** (используем сейчас)

### 1️⃣ **Парсинг тестов из браузера**
**Файл:** `scripts/browser-test-parser-v2.js`  
**Где запускать:** В консоли браузера (DevTools) на странице теста  
**Что делает:** Извлекает вопросы, ответы, изображения с сайта practicavial.com  
**Результат:** Создает JSON файл `topic-XX_test-YYY.json` в `data/parsed/topic-XX/`

**Как использовать:**
```javascript
// 1. Открой тест на practicavial.com
// 2. Открой DevTools (F12) → Console
// 3. Скопируй весь код из browser-test-parser-v2.js
// 4. Вставь в консоль и нажми Enter
// 5. Скачай созданный JSON файл
```

---

### 2️⃣ **AI-обогащение (переводы + объяснения)**
**Файл:** `scripts/enrich-batch-v2.js`  
**Где запускать:** В терминале (Node.js)  
**Что делает:** Берет спарсенный JSON, переводит на RU/EN, генерирует объяснения через Gemini AI  
**Результат:** Создает файл `*-enriched.json` с полными переводами и объяснениями

**Как использовать:**
```bash
node scripts/enrich-batch-v2.js data/parsed/topic-02/topic-02_test-002.json
```

**Особенности:**
- Использует модель `gemini-2.0-flash-exp` (можно менять на `gemini-3-pro-preview`)
- Автоматические повторы при ошибках (до 3 попыток)
- Валидация: требует ровно 30 вопросов
- Формат объяснений: 🧠 **Логика "Почему"** + 💣 **Ловушка / Трюк**

---

### 3️⃣ **Аудит готовности к продакшену**
**Файл:** `scripts/audit-all-tests.cjs`  
**Где запускать:** В терминале  
**Что делает:** Проверяет все тесты на:
- Наличие переводов (ES, EN, RU)
- Наличие объяснений
- Галлюцинации (кириллица в испанском)
- Упоминания ответов ("Ответ А")
- Единый формат (🧠/💣 vs старый 1️⃣/2️⃣)

**Как использовать:**
```bash
node scripts/audit-all-tests.cjs
```

**Результат:**
```
📊 STATS:
  ✅ Fully Ready: 29/30 (97%)
  🎨 New Format (🧠/💣): 25
  ⚠️  Answer Mentions: 1
  ⚠️  Cyrillic in ES: 0
```

---

### 4️⃣ **Автоматическое исправление проблем**
**Файл:** `scripts/fix-all-issues.js`  
**Где запускать:** В терминале  
**Что делает:** 
- Чистит кириллицу из испанских текстов
- Удаляет упоминания букв ответов
- Перегенерирует объяснения в новом формате

**Как использовать:**
```bash
node scripts/fix-all-issues.js
# или в фоне:
nohup node scripts/fix-all-issues.js > /tmp/fix.log 2>&1 &
```

---

### 5️⃣ **Полировка Topic 2**
**Файл:** `scripts/polish-topic-02.cjs`  
**Где запускать:** В терминале  
**Что делает:** Унифицирует стиль объяснений в Topic 2 (заменяет старые заголовки на новые)

**Как использовать:**
```bash
node scripts/polish-topic-02.cjs
```

---

## 🗑️ **УСТАРЕВШИЕ СКРИПТЫ** (не используем)

### ❌ `scripts/enrich-batch.js` (v1)
**Почему устарел:** Нет валидации, старый формат объяснений, нет повторов при ошибках  
**Заменен на:** `enrich-batch-v2.js`

### ❌ `scripts/re-enrich-explanations.js`
**Почему устарел:** Не сработал корректно (проблемы с сохранением)  
**Заменен на:** `fix-all-issues.js`

### ❌ `scripts/inject-enrichment.cjs`
**Почему устарел:** Хардкод данных, использовался только один раз для Topic 2  
**Заменен на:** AI-генерация через `fix-all-issues.js`

---

## 📋 **ТИПИЧНЫЙ WORKFLOW**

### **Добавление нового теста:**

```bash
# 1. Парсинг (в браузере)
# Открой тест → DevTools → Console → вставь browser-test-parser-v2.js

# 2. Сохрани скачанный JSON в:
# data/parsed/topic-XX/topic-XX_test-YYY.json

# 3. AI-обогащение
node scripts/enrich-batch-v2.js data/parsed/topic-XX/topic-XX_test-YYY.json

# 4. Проверка качества
node scripts/audit-all-tests.cjs

# 5. Если есть проблемы — автофикс
node scripts/fix-all-issues.js

# 6. Финальная проверка
node scripts/audit-all-tests.cjs
```

---

## 🔧 **ВСПОМОГАТЕЛЬНЫЕ СКРИПТЫ**

### `scripts/audit-topic1.cjs`
Проверяет только Topic 1 на кириллицу (узкоспециализированный)

### `scripts/generate-images-gemini.js`
Генерация изображений через Gemini (для тестов с картинками, если нужно)

---

## 📁 **СТРУКТУРА ДАННЫХ**

```
data/parsed/
├── topic-01/
│   ├── topic-01_test-001.json          # Спарсенный (только ES)
│   ├── topic-01_test-001-enriched.json # Обогащенный (ES+EN+RU)
│   ├── topic-01_test-002.json
│   └── topic-01_test-002-enriched.json
├── topic-02/
│   ├── topic-02_test-001.json
│   ├── topic-02_test-001-enriched.json
│   ├── topic-02_test-002.json
│   └── topic-02_test-002-enriched.json (или без -enriched, если еще не обогащен)
```

---

## ⚙️ **НАСТРОЙКИ AI**

### Модели Gemini:
- **`gemini-2.0-flash-exp`** — быстрая, бесплатная, умная (используем по умолчанию)
- **`gemini-3-pro-preview`** — очень умная, но может быть перегружена (503 errors)

### Где менять модель:
В файле `scripts/enrich-batch-v2.js` или `scripts/fix-all-issues.js`:
```javascript
model: "gemini-2.0-flash-exp", // <- здесь
```

### API ключ:
Хранится в `.env.local`:
```
GEMINI_API_KEY=your_key_here
```

---

## 🎯 **ЗОЛОТОЙ СТАНДАРТ ФОРМАТА**

### Объяснения должны выглядеть так:

**Русский:**
```
🧠 **Логика "Почему"**:
[Простое объяснение, аналогии, 2-3 предложения]

💣 **Ловушка / Трюк**:
[Что путает людей, 1-2 предложения]
```

**Испанский:**
```
🧠 **La Lógica "Por qué"**:
[Explicación clara]

💣 **La Trampa / El Truco**:
[Qué confunde]
```

**Английский:**
```
🧠 **The Logic "Why"**:
[Clear explanation]

💣 **The Trap / The Trick**:
[What confuses people]
```

---

## ❗ **ВАЖНЫЕ ПРАВИЛА**

1. **Никогда не упоминай буквы ответов** ("Ответ А", "Respuesta B") — они рандомизируются!
2. **Никакой кириллицы** в испанском/английском тексте
3. **Каждый тест = ровно 30 вопросов**
4. **Единый стиль** объяснений (🧠/💣) во всех тестах

---

## 🆘 **TROUBLESHOOTING**

### Проблема: "Bad control character in JSON"
**Решение:** Скрипт `fix-all-issues.js` автоматически чистит `.replace(/[\x00-\x1F\x7F-\x9F]/g, '')`

### Проблема: "503 Service Unavailable" от Gemini
**Решение:** Поменяй модель на `gemini-2.0-flash-exp` или подожди 5 минут

### Проблема: Скрипт завис
**Решение:** 
```bash
# Найди процесс
ps aux | grep "enrich-batch"
# Убей его
kill -9 <PID>
```

---

**Автор:** Antigravity AI  
**Контакт:** Дим, если что-то непонятно — спрашивай! 🚀
