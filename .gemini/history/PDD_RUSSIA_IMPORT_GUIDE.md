# 📥 Руководство по импорту данных ПДД России

## 🎯 Что мы создали

1. ✅ **Таблица стран** (`countries`) - для управления разными странами
2. ✅ **Таблицы ПДД России** - отдельные таблицы без переводов:
   - `pdd_russia_questions` - вопросы
   - `pdd_russia_answers` - ответы
   - `pdd_russia_signs` - дорожные знаки
   - `pdd_russia_penalties` - штрафы
3. ✅ **Скрипт импорта** - автоматический импорт из GitHub репозитория

---

## 📋 Шаг 1: Применить миграции

**ВАЖНО:** Примени миграции в правильном порядке:
1. `20251218000001_create_countries_table.sql`
2. `20251218000002_create_pdd_russia_tables.sql`
3. `20251218000003_create_pdd_russia_storage_bucket.sql` ⭐ **Новый!**

### Через Supabase Dashboard:

1. Открой **Supabase Dashboard**: https://supabase.com/dashboard
2. Выбери проект
3. Перейди в **SQL Editor** → **New query**
4. Примени миграции в порядке:
   - `20251218000001_create_countries_table.sql`
   - `20251218000002_create_pdd_russia_tables.sql`
5. Нажми **Run**

### Или через CLI:

```bash
supabase db push
```

---

## 📥 Шаг 2: Скачать репозиторий

```bash
# Клонируй репозиторий
git clone https://github.com/etspring/pdd_russia.git /tmp/pdd_russia

# Или скачай ZIP и распакуй
# https://github.com/etspring/pdd_russia/archive/refs/heads/master.zip
```

---

## ⚙️ Шаг 3: Настроить окружение

Создай файл `.env` в корне проекта (если его нет):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Где взять ключи:**
- Supabase Dashboard → Settings → API
- `SUPABASE_SERVICE_KEY` = `service_role` key (секретный!)

---

## 🚀 Шаг 4: Запустить импорт

```bash
# Убедись, что установлены зависимости
npm install

# Запусти скрипт импорта
node scripts/import-pdd-russia.js /tmp/pdd_russia
```

### Что делает скрипт:

1. ✅ Парсит все JSON файлы из папки `questions/`
2. ✅ **Загружает изображения в Supabase Storage** (bucket `pdd_russia`)
3. ✅ Импортирует вопросы в `pdd_russia_questions` с публичными URL изображений
4. ✅ Импортирует ответы в `pdd_russia_answers`
5. ✅ Импортирует знаки из `signs/signs.json` (с загрузкой изображений)
6. ✅ Импортирует штрафы из `penalties/penalties.json`
7. ✅ Пропускает дубликаты (по `source_id`)

**⭐ Новое:** Изображения автоматически загружаются в Supabase Storage и получают публичные URL!

### Ожидаемый результат:

```
🚀 Начинаю импорт данных ПДД России...

📝 Импортирую вопросы...
✅ Импортирован: Билет 1, Вопрос 1
✅ Импортирован: Билет 1, Вопрос 2
...
✅ Вопросов импортировано: 800, пропущено: 0

🛑 Импортирую дорожные знаки...
✅ Импортировано знаков: 150

💰 Импортирую штрафы...
✅ Импортировано штрафов: 200

✨ Импорт завершён!
```

---

## 🔍 Проверка данных

### Через Supabase Dashboard:

1. Table Editor → `pdd_russia_questions`
2. Должно быть ~800 вопросов
3. Проверь несколько билетов

### Через SQL:

```sql
-- Количество вопросов
SELECT COUNT(*) FROM pdd_russia_questions;

-- Вопросы билета 1
SELECT * FROM get_pdd_russia_ticket(1);

-- Вопросы по категории
SELECT * FROM pdd_russia_questions 
WHERE ticket_category = 'A,B' 
LIMIT 10;
```

---

## 🎨 Следующие шаги

### 1. Админка для управления вопросами

Создай компоненты:
- `src/components/admin/pdd-russia/PDDRussiaQuestionsList.tsx`
- `src/components/admin/pdd-russia/PDDRussiaQuestionEditor.tsx`
- `src/components/admin/pdd-russia/PDDRussiaSignsManager.tsx`

### 2. Фронтенд для пользователей

- Компонент выбора страны при входе
- Страница с билетами (1-40)
- Режим экзамена
- Статистика по билетам

### 3. Загрузка изображений

Сейчас изображения хранятся как пути. Нужно:
- Загрузить в Supabase Storage
- Обновить `image_url` в базе

---

## ⚠️ Важные замечания

1. **Дедупликация**: Скрипт использует `source_id` (MD5 hash) для предотвращения дублей
2. **Изображения**: Сейчас сохраняются пути, нужно загрузить в Storage
3. **Актуальность**: Репозиторий обновляется, проверяй новые версии
4. **Лицензия**: Проверь лицензию репозитория перед коммерческим использованием

---

## 🐛 Решение проблем

### Ошибка: "SUPABASE_SERVICE_KEY не найден"
- Проверь `.env` файл
- Убедись, что используешь `service_role` key, а не `anon` key

### Ошибка: "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js
```

### Дубликаты вопросов
- Скрипт автоматически пропускает дубликаты по `source_id`
- Если нужно переимпортировать, удали данные из таблиц

### Медленный импорт
- Импорт идёт последовательно для надёжности
- Можно оптимизировать через батчи (batch insert)

---

## 📚 Полезные ссылки

- **Репозиторий**: https://github.com/etspring/pdd_russia
- **Архитектура**: `PDD_RUSSIA_ARCHITECTURE.md`
- **Миграции**: `supabase/migrations/20251218000002_create_pdd_russia_tables.sql`

