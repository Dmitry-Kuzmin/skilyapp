# 🔐 Руководство по безопасности

## ⚠️ КРИТИЧЕСКИ ВАЖНО

Этот репозиторий **публичный**, поэтому все секреты должны храниться **ТОЛЬКО** в:
- GitHub Secrets (для CI/CD)
- Vercel Environment Variables (для деплоя)
- Локальный `.env` файл (для разработки, НЕ коммитить!)

## 🚫 ЧТО НИКОГДА НЕ КОММИТИТЬ

### ❌ Критичные секреты (удалить немедленно, если найдены):
- `SUPABASE_SERVICE_ROLE_KEY` - полный доступ к БД, обходит RLS
- `STRIPE_SECRET_KEY` - доступ к платежам
- `TELEGRAM_BOT_TOKEN` - управление ботом
- `GROQ_API_KEY`, `GEMINI_API_KEY` - доступ к AI API
- Любые пароли, токены, приватные ключи

### ⚠️ Публичные ключи (можно, но лучше через env):
- `VITE_SUPABASE_URL` - публичный URL (но лучше через env)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - anon key (публичный, но лучше через env)

## ✅ ЧТО ДЕЛАТЬ

### 1. Использовать переменные окружения

**В коде:**
```javascript
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is required!');
  process.exit(1);
}
```

**В скриптах:**
```bash
export SUPABASE_SERVICE_ROLE_KEY=your_key_here
node scripts/your-script.js
```

### 2. Настроить GitHub Secrets

1. Перейти: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions
2. Добавить секреты:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (для workflows)
   - `TELEGRAM_BOT_TOKEN` (если нужен в workflows)

### 3. Настроить Vercel Environment Variables

1. Перейти в Vercel Dashboard → Project → Settings → Environment Variables
2. Добавить:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Все остальные `VITE_*` переменные

### 4. Локальная разработка

Создать `.env.local` (уже в `.gitignore`):
```bash
VITE_SUPABASE_URL=https://yffjnqegeiorunyvcxkn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## 🔄 ЕСЛИ СЕКРЕТ УЖЕ ЗАКОММИТЕН

### Вариант 1: Ротация ключей (рекомендуется)

1. **Сгенерировать новые ключи** в Supabase/Stripe/Telegram
2. **Обновить** все места использования (GitHub Secrets, Vercel, локальный .env)
3. **Удалить старые ключи** из Supabase/Stripe/Telegram

### Вариант 2: Удалить из истории Git (опасно!)

⚠️ **ВНИМАНИЕ**: Это перепишет историю Git, может сломать работу других разработчиков!

```bash
# Удалить файл из истории
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/file" \
  --prune-empty --tag-name-filter cat -- --all

# Принудительно запушить (ОПАСНО!)
git push origin --force --all
```

**Лучше просто ротировать ключи!**

## 🛡️ ДОПОЛНИТЕЛЬНЫЕ МЕРЫ

### 1. Проверка перед коммитом

Использовать `git-secrets` или pre-commit hook:
```bash
# Установить git-secrets
brew install git-secrets

# Настроить
git secrets --install
git secrets --register-aws
```

### 2. Регулярный аудит

Периодически проверять:
```bash
# Поиск потенциальных секретов
grep -r "eyJ" --include="*.js" --include="*.ts" --include="*.md"
grep -r "sk_" --include="*.js" --include="*.ts"
grep -r "token" --include="*.js" --include="*.ts" -i
```

### 3. RLS политики в Supabase

Убедиться, что все таблицы защищены RLS (Row Level Security):
- Проверить в Supabase Dashboard → Database → Policies
- Service Role Key обходит RLS, поэтому его нельзя коммитить!

## 📋 ЧЕКЛИСТ БЕЗОПАСНОСТИ

- [ ] Все секреты удалены из кода
- [ ] Все скрипты используют `process.env.*`
- [ ] GitHub Secrets настроены
- [ ] Vercel Environment Variables настроены
- [ ] `.env.local` в `.gitignore`
- [ ] RLS политики включены в Supabase
- [ ] Регулярный аудит секретов

## 🆘 ЕСЛИ ЧТО-ТО СЛУЧИЛОСЬ

1. **Немедленно ротировать** все скомпрометированные ключи
2. **Проверить логи** доступа в Supabase/Stripe/Telegram
3. **Уведомить команду** (если есть)
4. **Обновить документацию** с новыми ключами (в секретах, не в коде!)

---

**Помни**: Публичный репозиторий = открытый доступ ко всему коду. Секреты должны быть только в секретах! 🔐


