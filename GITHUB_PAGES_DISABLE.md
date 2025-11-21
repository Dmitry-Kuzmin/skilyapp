# 🚫 Отключение GitHub Pages

## ✅ Что уже сделано

1. ✅ Workflow `.github/workflows/deploy.yml` отключен (закомментирован)
2. ✅ Все секреты удалены из кода
3. ✅ Создан `SECURITY_GUIDE.md` с инструкциями

## 📋 Что нужно сделать вручную

### Шаг 1: Отключить GitHub Pages в настройках

1. Перейти: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/pages
2. В разделе **"Source"** выбрать **"None"**
3. Нажать **"Save"**

### Шаг 2: Проверить, что Vercel настроен

1. Убедиться, что проект подключен к Vercel
2. Проверить Environment Variables в Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Все остальные `VITE_*` переменные

### Шаг 3: Ротация скомпрометированных ключей (ВАЖНО!)

⚠️ **КРИТИЧНО**: Service Role Key был в публичном репозитории!

1. **Supabase Service Role Key:**
   - Перейти: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/settings/api
   - Нажать **"Reset service_role key"**
   - Обновить в:
     - GitHub Secrets (если используется в workflows)
     - Vercel Environment Variables
     - Локальный `.env.local`

2. **Telegram Bot Token** (если был в коде):
   - Перейти: https://t.me/BotFather
   - Отправить `/revoke` или `/newtoken`
   - Обновить в Supabase Edge Functions Secrets

3. **Stripe Secret Key** (если был в коде):
   - Перейти: https://dashboard.stripe.com/apikeys
   - Создать новый ключ
   - Обновить в Supabase Edge Functions Secrets

## ✅ Результат

После выполнения всех шагов:
- ✅ GitHub Pages отключен
- ✅ Все секреты ротированы
- ✅ Проект деплоится только через Vercel
- ✅ Публичный репозиторий безопасен

## 🔍 Проверка

После отключения GitHub Pages:
- Проверить: https://dmitry-kuzmin.github.io/sdadim-dgt-prep/ (должна быть 404)
- Проверить Vercel: ваш домен должен работать

---

**Важно**: Если GitHub Pages всё ещё работает, нужно подождать несколько минут после отключения.



