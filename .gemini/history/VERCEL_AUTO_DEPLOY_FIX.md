# 🔧 Исправление автодеплоя Vercel

## ⚠️ Проблема
- В GitHub последний коммит был **30 минут назад**
- В Vercel последний деплой был **10 часов назад**
- **Автодеплой не работает**

---

## 🚀 Быстрое решение

### Вариант 1: Ручной деплой через Vercel Dashboard (2 минуты)

1. Открой: https://vercel.com/dashboard
2. Найди проект `sdadim-dgt-prep`
3. Перейди в **Deployments**
4. Нажми **Create Deployment** (кнопка справа вверху)
5. Выбери:
   - **Branch:** `main`
   - **Framework Preset:** Vite (или автоматически определится)
6. Нажми **Deploy**
7. Дождись завершения (2-5 минут)

---

### Вариант 2: Триггер через Git (1 минута)

```bash
# Создай пустой коммит для триггера деплоя
git commit --allow-empty -m "Trigger Vercel auto-deploy"
git push origin main
```

После push проверь:
1. Vercel Dashboard → Deployments
2. Должен появиться новый деплой через 1-2 минуты

---

## 🔍 Проверка настроек автодеплоя

### Шаг 1: Проверка подключения репозитория

1. **Settings** → **Git**
2. Проверь:
   - ✅ **Connected Repository:** `Dmitry-Kuzmin/sdadim-dgt-prep`
   - ✅ **Production Branch:** `main` или `master`
   - ✅ **Auto-deploy:** включен

**Если репозиторий не подключен:**
1. Нажми **Disconnect**
2. Нажми **Connect Git Repository**
3. Выбери `Dmitry-Kuzmin/sdadim-dgt-prep`
4. Разреши доступ
5. Выбери ветку `main`
6. Нажми **Connect**

---

### Шаг 2: Проверка вебхука в GitHub

1. Открой: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/hooks
2. Ищи вебхук от Vercel (обычно `vercel.com` или `vercel.app`)
3. Проверь:
   - ✅ Вебхук активен (зелёная галочка)
   - ✅ Последняя доставка была недавно

**Если вебхука нет или он не работает:**
1. В Vercel: **Settings** → **Git** → **Disconnect**
2. Затем **Connect Git Repository** заново
3. Это создаст новый вебхук

---

### Шаг 3: Проверка переменных окружения

**Важно:** После переподключения репозитория проверь переменные!

1. **Settings** → **Environment Variables**
2. Убедись что есть:
   ```
   VITE_SUPABASE_URL = https://yffjnqegeiorunyvcxkn.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY = твой_anon_key
   ```
3. Должны быть для: **Production**, **Preview**, **Development**

---

## 🔄 Полное переподключение (если ничего не помогает)

1. **Settings** → **Git** → **Disconnect**
2. Подожди 10 секунд
3. **Connect Git Repository**
4. Выбери репозиторий заново
5. Выбери ветку `main`
6. **Connect**
7. Vercel автоматически запустит первый деплой

---

## 📋 Пошаговый план

### Прямо сейчас (2 минуты):

1. ✅ Запусти ручной деплой (Вариант 1 выше)
2. ✅ Дождись завершения
3. ✅ Проверь что сайт работает

### Затем (5 минут):

1. ✅ Проверь подключение репозитория
2. ✅ Проверь вебхук в GitHub
3. ✅ Проверь переменные окружения
4. ✅ Сделай тестовый коммит и push
5. ✅ Проверь что автодеплой сработал

---

## 🎯 Что могло сломаться

**Возможные причины:**

1. **Отключился репозиторий в Vercel** (самое вероятное)
   - Могло произойти при изменениях в GitHub
   - Решение: переподключить репозиторий

2. **Сломался вебхук в GitHub**
   - GitHub мог отключить вебхук из-за ошибок
   - Решение: переподключить репозиторий (создаст новый вебхук)

3. **Ветка изменилась**
   - Если в Vercel настроена другая ветка
   - Решение: проверить в Settings → Git → Production Branch

4. **Проблемы с доступом**
   - Vercel потерял доступ к репозиторию
   - Решение: переподключить репозиторий

---

## ✅ После исправления

Проверь что автодеплой работает:

```bash
# Создай тестовый коммит
git commit --allow-empty -m "Test Vercel auto-deploy"
git push origin main

# Подожди 1-2 минуты
# Проверь Vercel Dashboard → Deployments
# Должен появиться новый деплой автоматически
```

---

## 🔗 Полезные ссылки

- Vercel Dashboard: https://vercel.com/dashboard
- Deployments: https://vercel.com/dashboard → Deployments
- Git Settings: https://vercel.com/dashboard → Settings → Git
- GitHub Webhooks: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/hooks

---

**💡 Рекомендация:** Начни с Варианта 1 (ручной деплой), чтобы быстро получить актуальную версию. Затем проверь настройки автодеплоя.

