# ⚡ Быстрая проверка Vercel деплоя

## 🔍 5-минутная диагностика

### 1️⃣ Проверка подключения (30 сек)

1. Открой: https://vercel.com/dashboard
2. Найди проект `sdadim-dgt-prep`
3. **Settings** → **Git**
4. Проверь: репозиторий = `Dmitry-Kuzmin/sdadim-dgt-prep`

**Если не подключен:** Connect Git Repository → выбери репозиторий

---

### 2️⃣ Проверка переменных (1 мин)

1. **Settings** → **Environment Variables**
2. Убедись что есть:

```
VITE_SUPABASE_URL = https://yffjnqegeiorunyvcxkn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = твой_anon_key
```

**Важно:** Должны быть для Production, Preview, Development!

**Как получить ключ:**
- https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
- Скопируй **"anon" "public"** ключ (НЕ service_role!)

---

### 3️⃣ Проверка последнего деплоя (1 мин)

1. **Deployments** → найди последний деплой
2. Проверь:
   - ✅ Зелёная галочка (успех)
   - ✅ Время деплоя = последний коммит в GitHub
   - ✅ Нет ошибок в Build Logs

**Если деплой с ошибкой:**
- Открой Build Logs
- Ищи: `VITE_SUPABASE_URL is not set` или другие ошибки

---

### 4️⃣ Пересборка (2 мин)

**Если изменил переменные окружения:**

1. **Deployments** → последний деплой
2. **⋯** (три точки) → **Redeploy**
3. **Use existing Build Cache** = **OFF** ⚠️
4. **Redeploy**

**Или через Git:**
```bash
git commit --allow-empty -m "Trigger Vercel deploy"
git push origin main
```

---

### 5️⃣ Проверка сайта (1 мин)

1. Открой сайт (ссылка в Vercel Dashboard)
2. **F12** → **Console**
3. Ищи ошибки:
   - ❌ `VITE_SUPABASE_URL is required`
   - ❌ `401 Unauthorized`
   - ❌ `Failed to fetch`

4. **Network** → обнови страницу
5. Ищи запросы к `yffjnqegeiorunyvcxkn.supabase.co`
6. Должен быть **200 OK**

---

## 🚨 Частые проблемы

### Проблема 1: Переменные не установлены
**Решение:** Добавь в Vercel Settings → Environment Variables

### Проблема 2: Деплой не запускается автоматически
**Решение:** Проверь подключение Git репозитория (Шаг 1)

### Проблема 3: Старые переменные в билде
**Решение:** Пересобери без кэша (Шаг 4)

### Проблема 4: Данные не загружаются
**Решение:** 
1. Проверь переменные (Шаг 2)
2. Проверь консоль браузера на ошибки (Шаг 5)
3. Проверь Supabase Dashboard → Logs → API

---

## ✅ Чеклист

- [ ] Репозиторий подключен к Vercel
- [ ] Переменные установлены (Production, Preview, Development)
- [ ] Последний деплой успешен
- [ ] Нет ошибок в Build Logs
- [ ] Сайт загружается без ошибок
- [ ] Данные приходят из Supabase

---

## 🔗 Полезные ссылки

- Vercel Dashboard: https://vercel.com/dashboard
- Deployments: https://vercel.com/dashboard → Deployments
- Environment Variables: https://vercel.com/dashboard → Settings → Environment Variables
- Supabase API Keys: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api

---

**💡 Совет:** Если после всех проверок проблема остаётся - скопируй ошибки из консоли браузера и Build Logs Vercel.

