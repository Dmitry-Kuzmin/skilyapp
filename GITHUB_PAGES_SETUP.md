# 🚀 Настройка GitHub Pages

## ✅ Что уже настроено

1. **GitHub Actions workflow** (`.github/workflows/deploy.yml`) — автоматический деплой при push
2. **Vite config** — настроен base path для GitHub Pages
3. **Build скрипт** — готов к сборке для production

## 📋 Шаги для активации GitHub Pages

### Шаг 1: Настройте секреты в GitHub

1. Откройте репозиторий: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Добавьте следующие секреты:
   - `VITE_SUPABASE_URL` = `https://yffjnqegeiorunyvcxkn.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = ваш anon key из Supabase

### Шаг 2: Включите GitHub Pages

1. Перейдите в **Settings** → **Pages**
2. В разделе **Source** выберите:
   - **Source**: `GitHub Actions`
3. Сохраните изменения

### Шаг 3: Запустите деплой

**Вариант 1: Автоматический деплой**
- Просто сделайте push в ветку `main`, `master` или `feature/premium-race-game`
- GitHub Actions автоматически соберет и задеплоит проект

**Вариант 2: Ручной запуск**
1. Перейдите в **Actions** → **Deploy to GitHub Pages**
2. Нажмите **Run workflow**
3. Выберите ветку и нажмите **Run workflow**

### Шаг 4: Получите ссылку на сайт

После успешного деплоя ссылка будет:
```
https://dmitry-kuzmin.github.io/sdadim-dgt-prep/
```

Или проверьте в:
- **Settings** → **Pages** → **Your site is live at**
- **Actions** → последний успешный workflow → **deploy** job → **Deploy to GitHub Pages** → **View deployment**

## 🔧 Настройка кастомного домена (опционально)

1. В **Settings** → **Pages** → **Custom domain**
2. Введите ваш домен (например, `sdadim.com`)
3. Настройте DNS записи:
   - **A record**: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Или **CNAME record**: `dmitry-kuzmin.github.io`

## ⚠️ Важные замечания

1. **Base path**: Если репозиторий в корне GitHub, измените `base: '/sdadim-dgt-prep/'` на `base: '/'` в `vite.config.ts`
2. **Секреты**: Убедитесь, что секреты настроены правильно
3. **Первая сборка**: Первая сборка может занять несколько минут

## 🔍 Проверка деплоя

1. Откройте **Actions** в репозитории
2. Найдите последний workflow "Deploy to GitHub Pages"
3. Проверьте, что все шаги выполнены успешно (зеленые галочки)
4. Перейдите по ссылке из **deploy** job

## 📝 Структура URL

- **GitHub Pages**: `https://dmitry-kuzmin.github.io/sdadim-dgt-prep/`
- **Локальная разработка**: `http://localhost:8080/`
- **Lovable**: через Lovable платформу

## 🐛 Решение проблем

### Проблема: Сайт не загружается
- Проверьте, что секреты настроены
- Проверьте логи в **Actions**
- Убедитесь, что base path правильный

### Проблема: 404 ошибки
- Проверьте base path в `vite.config.ts`
- Убедитесь, что все пути в коде относительные

### Проблема: Сборка не проходит
- Проверьте логи в **Actions**
- Убедитесь, что все зависимости установлены
- Проверьте TypeScript ошибки

## 🔗 Полезные ссылки

- **Репозиторий**: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep
- **Actions**: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions
- **Pages Settings**: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/pages
- **Supabase Dashboard**: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn

