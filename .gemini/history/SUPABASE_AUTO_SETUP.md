# 🚀 Автоматическое применение миграций в Supabase

Теперь я могу автоматически применять миграции и деплоить Edge Functions!

## 📋 Первоначальная настройка (один раз)

### Шаг 1: Установить Supabase CLI

```bash
npm install -g supabase
```

### Шаг 2: Авторизоваться в Supabase

```bash
supabase login
```

### Шаг 3: Связать проект

```bash
supabase link --project-ref ijijcrucqqnnjbkclqhb
```

### Или использовать автоматическую настройку:

```bash
npm run supabase:setup
```

Этот скрипт автоматически:
- Проверит установку Supabase CLI
- Установит его, если нужно
- Проверит авторизацию
- Свяжет проект

---

## 🎯 Применение миграций

### Автоматически (через скрипт):

```bash
npm run supabase:apply-migrations
```

Этот скрипт:
- Найдет все миграции в `supabase/migrations/`
- Применит их в правильном порядке
- Покажет результаты

### Или через Supabase CLI:

```bash
supabase db push
```

---

## 🚀 Деплой Edge Function

### Деплой функции duel-manager:

```bash
npm run supabase:deploy:duel-manager
```

### Или деплой любой функции:

```bash
npm run supabase:deploy <function-name>
```

### Или через Supabase CLI:

```bash
supabase functions deploy duel-manager
```

---

## 🔧 Использование через меня (AI Assistant)

Теперь я могу автоматически:

1. **Применить миграции:**
   ```
   Вы: "Примени миграции в Supabase"
   Я: Запущу npm run supabase:apply-migrations
   ```

2. **Задеплоить функцию:**
   ```
   Вы: "Перезапусти duel-manager"
   Я: Запущу npm run supabase:deploy:duel-manager
   ```

3. **Настроить Supabase:**
   ```
   Вы: "Настрой Supabase"
   Я: Запущу npm run supabase:setup
   ```

---

## 📝 Доступные команды

| Команда | Описание |
|---------|----------|
| `npm run supabase:setup` | Автоматическая настройка Supabase CLI |
| `npm run supabase:apply-migrations` | Применить все миграции |
| `npm run supabase:deploy` | Деплой функции (по умолчанию duel-manager) |
| `npm run supabase:deploy:duel-manager` | Деплой функции duel-manager |

---

## ⚠️ Важно

1. **Access Token**: Для работы скриптов нужен `SUPABASE_ACCESS_TOKEN` или авторизация через CLI
2. **Service Role Key**: Для некоторых операций может потребоваться `SUPABASE_SERVICE_ROLE_KEY`
3. **Права доступа**: Убедитесь, что у вашего аккаунта есть права на проект

---

## 🐛 Решение проблем

### Если скрипт не может применить миграции:

1. Проверьте авторизацию:
   ```bash
   supabase projects list
   ```

2. Проверьте связь с проектом:
   ```bash
   supabase link --project-ref ijijcrucqqnnjbkclqhb
   ```

3. Примените миграции вручную через SQL Editor в Supabase Dashboard

### Если функция не деплоится:

1. Проверьте, что файл `supabase/functions/<function-name>/index.ts` существует
2. Проверьте синтаксис TypeScript
3. Попробуйте деплой через Dashboard: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions

---

## ✅ Готово!

Теперь вы можете просто сказать мне:
- "Примени миграции"
- "Перезапусти duel-manager"
- "Примени миграцию и перезапусти функцию"

И я сделаю это автоматически! 🎉


