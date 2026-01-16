# 🔍 Диагностика деплоя на Vercel

## ⚠️ Проблема: Данные не поступают на Vercel

### Шаг 1: Проверка подключения репозитория к Vercel

1. Откройте Vercel Dashboard: https://vercel.com/dashboard
2. Найдите проект `sdadim-dgt-prep`
3. Перейдите в **Settings** → **Git**
4. Проверьте:
   - ✅ Репозиторий подключен: `Dmitry-Kuzmin/sdadim-dgt-prep`
   - ✅ Ветка для production: `main` или `master`
   - ✅ Автодеплой включен

**Если репозиторий не подключен:**
1. Перейдите в **Settings** → **Git**
2. Нажмите **Connect Git Repository**
3. Выберите `Dmitry-Kuzmin/sdadim-dgt-prep`
4. Нажмите **Connect**

---

### Шаг 2: Проверка переменных окружения в Vercel

1. Перейдите в **Settings** → **Environment Variables**
2. Убедитесь, что установлены для **Production**, **Preview**, и **Development**:

**Обязательные переменные:**
```
VITE_SUPABASE_URL=https://yffjnqegeiorunyvcxkn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

**Как получить правильный ключ:**
1. Откройте: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
2. Найдите секцию **"Project API keys"**
3. Скопируйте ключ с меткой **"anon" "public"** (НЕ service_role!)
4. Добавьте в Vercel как `VITE_SUPABASE_PUBLISHABLE_KEY`

**Важно:**
- ✅ Убедитесь, что переменные установлены для всех окружений (Production, Preview, Development)
- ✅ После изменения переменных нужно **пересобрать** проект

---

### Шаг 3: Проверка последних деплоев

1. Перейдите в **Deployments** в Vercel Dashboard
2. Проверьте последние деплои:
   - ✅ Последний деплой был успешным (зелёная галочка)
   - ✅ Время деплоя соответствует последнему коммиту в GitHub
   - ✅ Нет ошибок в логах деплоя

**Если деплои не создаются автоматически:**
1. Проверьте, что автодеплой включен (Шаг 1)
2. Сделайте тестовый коммит и push:
   ```bash
   git commit --allow-empty -m "Trigger Vercel deploy"
   git push origin main
   ```
3. Проверьте, что деплой запустился

**Если последний деплой с ошибкой:**
1. Откройте последний деплой
2. Кликните на **Build Logs**
3. Ищите ошибки:
   - ❌ `VITE_SUPABASE_URL is not set`
   - ❌ `VITE_SUPABASE_PUBLISHABLE_KEY is not set`
   - ❌ Ошибки сборки (build errors)

---

### Шаг 4: Пересборка проекта с новыми переменными

**Если вы изменили переменные окружения:**

1. Перейдите в **Deployments**
2. Найдите последний деплой
3. Нажмите **⋯** (три точки) → **Redeploy**
4. **Важно:** Убедитесь, что **"Use existing Build Cache"** = **OFF**
5. Нажмите **Redeploy**
6. Дождитесь завершения деплоя

**Альтернатива - через команду:**
```bash
# Сделать пустой коммит для триггера деплоя
git commit --allow-empty -m "Trigger Vercel redeploy"
git push origin main
```

---

### Шаг 5: Проверка логов деплоя

1. Откройте последний деплой в Vercel Dashboard
2. Кликните на **Build Logs**
3. Проверьте, что:
   - ✅ `npm ci` завершился успешно
   - ✅ `npm run build` завершился успешно
   - ✅ Нет ошибок о переменных окружения
   - ✅ Билд завершился с кодом 0

**Частые ошибки в логах:**

1. **Ошибка:** `VITE_SUPABASE_URL is not set`
   - **Решение:** Добавьте переменную в Vercel (Шаг 2)

2. **Ошибка:** `Build failed`
   - **Решение:** Проверьте логи подробнее, возможно ошибка в коде

3. **Ошибка:** `Command failed`
   - **Решение:** Проверьте package.json и зависимости

---

### Шаг 6: Проверка работоспособности сайта

1. Откройте сайт на Vercel (ссылка в Dashboard → Domains)
2. Откройте DevTools (F12)
3. Перейдите на вкладку **Console**
4. Ищите ошибки:
   - ❌ `VITE_SUPABASE_URL is required`
   - ❌ `Failed to fetch`
   - ❌ `401 Unauthorized`

5. Перейдите на вкладку **Network**
6. Обновите страницу
7. Ищите запросы к Supabase:
   - ✅ `yffjnqegeiorunyvcxkn.supabase.co` - должен быть 200
   - ❌ Если 401 или 403 - проблема с ключом

---

### Шаг 7: Проверка GitHub Actions (если используется)

**Если у вас настроен автодеплой через GitHub Actions:**

1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions
2. Проверьте последние workflow runs:
   - ✅ Последний workflow был успешным
   - ✅ Время соответствует последнему коммиту

**Если workflow не запускается:**
1. Проверьте файл `.github/workflows/deploy.yml` (если есть)
2. Убедитесь, что workflow настроен на ветку `main`

---

### Шаг 8: Ручной триггер деплоя

Если автодеплой не работает, можно запустить вручную:

**Вариант 1: Через Vercel Dashboard**
1. **Deployments** → **Create Deployment**
2. Выберите ветку `main`
3. Нажмите **Deploy**

**Вариант 2: Через GitHub**
```bash
git commit --allow-empty -m "Trigger Vercel deploy"
git push origin main
```

**Вариант 3: Через Vercel CLI**
```bash
vercel --prod
```

---

## 🔧 Быстрое решение

### Если данные не поступают:

1. ✅ Проверьте переменные окружения в Vercel
2. ✅ Пересоберите проект (Redeploy без кэша)
3. ✅ Проверьте логи деплоя на ошибки
4. ✅ Проверьте консоль браузера на ошибки

### Если деплой не запускается:

1. ✅ Проверьте подключение репозитория к Vercel
2. ✅ Проверьте настройки автодеплоя
3. ✅ Сделайте тестовый коммит и push

---

## 📋 Чеклист для проверки

- [ ] Репозиторий подключен к Vercel
- [ ] Переменные окружения установлены (Production, Preview, Development)
- [ ] Последний деплой успешен
- [ ] Нет ошибок в Build Logs
- [ ] Сайт работает и загружает данные
- [ ] Нет ошибок в консоли браузера
- [ ] Запросы к Supabase возвращают 200

---

## 🆘 Если ничего не помогло

1. Скопируйте логи деплоя из Vercel
2. Скопируйте ошибки из консоли браузера
3. Проверьте логи в Supabase Dashboard → Logs → API
4. Проверьте RLS политики в Supabase

---

## 📞 Полезные ссылки

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn
- GitHub Actions: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions
- GitHub Settings: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings

