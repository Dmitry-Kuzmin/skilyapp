# Настройка проекта в Google Antigravity

## 🚀 Быстрый старт

### 1. Клонирование репозитория

```bash
# Клонируй репозиторий
git clone https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep.git
cd sdadim-dgt-prep
```

### 2. Установка зависимостей

```bash
# Установи все зависимости
npm install
```

### 3. Настройка переменных окружения

**КРИТИЧЕСКИ ВАЖНО:** Создай файл `.env.local` в корне проекта со следующими переменными:

```env
# Supabase
VITE_SUPABASE_URL=твой_supabase_url
VITE_SUPABASE_ANON_KEY=твой_anon_key

# Telegram (если используется)
VITE_TELEGRAM_BOT_TOKEN=твой_bot_token

# Другие переменные из Vercel
# Проверь все переменные в Vercel Dashboard -> Settings -> Environment Variables
```

**Где взять переменные:**
- Vercel Dashboard → Settings → Environment Variables
- Supabase Dashboard → Settings → API

### 4. Запуск проекта

```bash
# Запусти dev сервер
npm run dev
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА

### ❌ НИКОГДА НЕ ИЗМЕНЯЙ БЕЗ ЯВНОЙ ПРОСЬБЫ:

1. **package.json** - НЕ удаляй зависимости, НЕ изменяй версии
2. **vite.config.ts** - НЕ удаляй lovable-tagger, НЕ изменяй plugins
3. **tsconfig.json, tsconfig.app.json, tsconfig.node.json**
4. **tailwind.config.ts**
5. **postcss.config.js**
6. **eslint.config.js**
7. **.gitignore**
8. **index.html**

### ✅ МОЖНО ИЗМЕНЯТЬ:

- `src/components/` (все .tsx файлы)
- `src/pages/` (все .tsx файлы)
- `src/hooks/` (все .ts, .tsx файлы)
- `src/contexts/` (все .tsx файлы)
- `src/lib/` (все .ts файлы)
- `src/utils/` (все .ts файлы)
- `src/types/` (все .ts, .d.ts файлы)
- `src/integrations/` (осторожно с клиентами)
- `src/core/` (все .ts файлы)
- `src/data/` (все .csv, .json файлы)
- `supabase/functions/` (Edge Functions)
- `supabase/migrations/` (только новые миграции)

### 🔑 КРИТИЧЕСКИЕ ЗАВИСИМОСТИ (НЕ УДАЛЯТЬ):

- `lovable-tagger` (обязателен для Lovable)
- `@vitejs/plugin-react-swc`
- Все `@radix-ui/*` компоненты
- `lucide-react`

---

## 🔄 Рабочий процесс

### Перед началом работы:

1. **Проверь текущую ветку:**
   ```bash
   git branch
   ```

2. **Создай новую ветку для фичи:**
   ```bash
   git checkout -b feature/название-фичи
   ```

3. **Убедись, что у тебя последняя версия:**
   ```bash
   git pull origin main
   ```

### Во время работы:

1. **Регулярно коммить изменения:**
   ```bash
   git add .
   git commit -m "feat: описание изменений"
   ```

2. **Проверяй линтер:**
   ```bash
   npm run lint
   ```

3. **Тестируй локально:**
   ```bash
   npm run dev
   ```

### После завершения работы:

1. **Запушь изменения:**
   ```bash
   git push origin feature/название-фичи
   ```

2. **Создай Pull Request в GitHub** (если работаешь в feature ветке)

3. **Или смержь в main и запушь:**
   ```bash
   git checkout main
   git merge feature/название-фичи
   git push origin main
   ```

4. **Автоматический деплой в Vercel** произойдет после пуша в main

---

## 🗄️ Оптимизация Supabase (критично)

### Правила работы с Supabase:

1. **Минимизируй количество запросов**
2. **Никогда не используй real-time**, если можно обойтись polling/edge-триггером
3. **Любая функция Supabase должна:**
   - работать < 300 мс
   - иметь предохранители
   - не вызывать каскадные запросы

4. **Любая миграция должна быть оптимизирована:**
   - не создавать лишние индексы
   - не хранить дубликаты
   - использовать SMALLINT/INTEGER где возможно

5. **Всегда проверяй, можно ли объединить несколько запросов в один RPC**

6. **Используй `select('...',{ count: 'exact', head: true })` вместо полноценного запроса**, если нужно только проверить существование

---

## 🔐 Безопасность

1. **НЕ коммить `.env.local`** - он уже в .gitignore
2. **НЕ коммить секреты** - используй только переменные окружения
3. **Проверяй перед коммитом:**
   ```bash
   git status
   git diff
   ```

---

## 📋 Полезные команды

```bash
# Проверка статуса
git status

# Просмотр изменений
git diff

# Отмена изменений в файле
git checkout -- путь/к/файлу

# Просмотр логов
git log --oneline

# Сброс к последнему коммиту (ОСТОРОЖНО!)
git reset --hard HEAD

# Создание тега
git tag -a v1.0.0 -m "Версия 1.0.0"
git push origin v1.0.0
```

---

## 🐛 Решение проблем

### Проблема: "Module not found"

```bash
# Удали node_modules и переустанови
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Port already in use"

```bash
# Найди процесс на порту 8080
lsof -ti:8080 | xargs kill -9

# Или измени порт в vite.config.ts
```

### Проблема: "Build failed"

```bash
# Очисти кеш и пересобери
rm -rf dist .vite
npm run build
```

---

## 📚 Дополнительные ресурсы

- **CURSOR_RULES.md** - полные правила работы с проектом
- **GIT_WORKFLOW.md** - правила синхронизации с Git
- **Project.md** - архитектура и стандарты проекта

---

## ⚡ Быстрая проверка перед коммитом

```bash
# 1. Проверь линтер
npm run lint

# 2. Проверь сборку
npm run build

# 3. Проверь статус git
git status

# 4. Проверь изменения
git diff

# 5. Если всё ОК - коммить
git add .
git commit -m "feat: описание"
git push origin main
```

---

## 💡 Советы для Antigravity

1. **Используй контекст проекта** - Antigravity может читать файлы проекта
2. **Указывай конкретные файлы** при запросах к ИИ
3. **Проверяй изменения** перед коммитом
4. **Следуй тем же правилам**, что и в Cursor

---

**Удачи с разработкой! 🚀**

