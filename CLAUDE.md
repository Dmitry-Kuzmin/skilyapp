# CLAUDE.md — Skily / sdadim-dgt-prep

Руководство для Claude Code. Читай целиком в начале каждой сессии.

---

## 🚨 КРИТИЧНО: Git Push в main

`main` защищён. `git push origin main` → **403, заблокировано**.

**Единственный правильный способ:**
```
1. git checkout -b <feature-branch>
2. git add ... && git commit -m "..."
3. git push origin <feature-branch>
4. mcp__github__create_pull_request  (owner: Dmitry-Kuzmin, repo: sdadim-dgt-prep, base: main)
5. mcp__github__merge_pull_request   (merge_method: squash)
6. git checkout main && git reset --hard origin/main
```

На маке (с правами admin) — git push origin main работает напрямую.
В веб/агент окружении — только через MCP PR.

---

## 📍 Проект — что это

**Skily** — веб-платформа для подготовки к экзамену по вождению (DGT Испания + ПДД Россия).
Геймификация: PvP дуэли, квизы, флэшкарты, AI-тьютор, монеты, premium.

- Прод: `https://skilyapp.com`
- Supabase project ref: `yffjnqegeiorunyvcxkn`
- Supabase URL: `https://yffjnqegeiorunyvcxkn.supabase.co`
- Telegram бот: `@skilyapp_bot` (id: 8526928539)
- GitHub: `Dmitry-Kuzmin/sdadim-dgt-prep`

---

## 🔒 Никогда не трогать

- `package.json`, `vite.config.ts`, `tsconfig.json` — заблокировано `.cursorrules`
- `src/integrations/supabase/types.ts` — генерируется автоматически
- Не делать `git push origin main` напрямую

**Можно менять всё в:** `components/`, `pages/`, `hooks/`, `contexts/`, `lib/`, `utils/`, `types/`, `integrations/`, `core/`, `data/`, `supabase/`, `stores/`

---

## ⚡ Команды

```bash
npm run dev            # Vite + validator + maintenance (параллельно)
npm run dev:frontend   # только Vite, порт 8080
npm run typecheck      # TypeScript без emit
npm run lint           # ESLint
npm run build          # tsc + vite build

npm run supabase:apply   # применить DB миграции
npm run supabase:deploy  # задеплоить Edge Functions
```

---

## 🚀 Деплой — полный гайд (всё делает Claude без участия пользователя)

### Переменные окружения для CLI

```bash
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:$PATH"
```

**Всегда добавляй эту строку перед любой командой `supabase` или `node`.**

### Edge Functions

```bash
# Деплой одной функции
/opt/homebrew/bin/supabase functions deploy <function-name> --project-ref yffjnqegeiorunyvcxkn

# Деплой нескольких
/opt/homebrew/bin/supabase functions deploy duel-manager --project-ref yffjnqegeiorunyvcxkn
/opt/homebrew/bin/supabase functions deploy telegram-bot --project-ref yffjnqegeiorunyvcxkn
/opt/homebrew/bin/supabase functions deploy user-event-dispatcher --project-ref yffjnqegeiorunyvcxkn
/opt/homebrew/bin/supabase functions deploy duel-pass-claim --project-ref yffjnqegeiorunyvcxkn
```

Docker НЕ нужен. Функции деплоятся через Management API.

### Миграции БД

```bash
# ❌ НЕ ИСПОЛЬЗОВАТЬ: npm run supabase:apply (работает через APPLY_NOW.sql, ломается)
# ❌ НЕ ИСПОЛЬЗОВАТЬ: supabase db push (требует Docker, применяет ВСЕ локальные миграции)

# ✅ ПРАВИЛЬНЫЙ СПОСОБ — применить конкретный SQL-файл напрямую:
/opt/homebrew/bin/supabase db query \
  --linked \
  --file supabase/migrations/<имя_файла>.sql

# Пример:
/opt/homebrew/bin/supabase db query \
  --linked \
  --file supabase/migrations/20260510210000_fix_duel_payout_search_path.sql
```

Перед применением проверь, что файл существует:
```bash
ls supabase/migrations/ | tail -5
```

### ⚠️ Гранты для новых таблиц (с 30 октября 2026 обязательно)

Каждая новая таблица в миграции ДОЛЖНА содержать явные гранты, иначе supabase-js не сможет к ней обращаться:

```sql
-- Для пользовательских таблиц (доступных с фронтенда):
grant select, insert, update, delete on public.your_table to authenticated;
grant select on public.your_table to anon;        -- только если нужен анонимный доступ
grant all on public.your_table to service_role;
alter table public.your_table enable row level security;

-- Для backend-only таблиц (только Edge Functions):
grant all on public.your_table to service_role;
-- RLS не нужен если нет анонимного/authenticated доступа
```

### Фронтенд (Vercel)

Деплой происходит **автоматически** при пуше в `main`. Вручную ничего делать не нужно.

### Git-workflow (Mac, admin-права)

```bash
# Просто:
git add <файлы>
git commit -m "fix: описание"
git push origin main   # напрямую в main ✓
```

### Проверка после деплоя функций

```bash
# Список задеплоенных функций:
/opt/homebrew/bin/supabase functions list --project-ref yffjnqegeiorunyvcxkn

# Проверка конкретной миграции в БД (SQL):
/opt/homebrew/bin/supabase db query \
  --linked \
  --sql "SELECT proname, proconfig FROM pg_proc WHERE proname = 'handle_duel_payout_atomic';"
```

### Применение произвольного SQL в прод

```bash
/opt/homebrew/bin/supabase db query \
  --linked \
  --sql "UPDATE profiles SET coins = coins + 20 WHERE id = 'xxx';"
```

---

## 🗂 Файловая карта — куда идти сразу

### Роутинг
- `src/App.tsx` — все роуты, lazy-loading, Telegram WebApp init
- `src/components/AppRoutes.tsx` — роуты для авторизованных

### Главная / Dashboard
- `src/pages/Index.tsx` — dashboard, WelcomeOverlay

### AI Чат
- `src/components/ai/AIChatWidget.tsx` — **главный файл чата** (Drawer/Dialog, markdown, виджеты)
- `src/components/chat/SignWidget.tsx` — виджет показа дорожного знака по коду (R-1, P-6 и т.д.)
- `src/hooks/useAIRequest.ts` — отправка запросов к AI Edge Function
- `src/stores/useAIChatStore.ts` — Zustand store чата (сообщения, лимиты, состояние)
- `supabase/functions/ai-chat/` — Edge Function AI
- `src/lib/aiPrompts.ts` — генерация промптов
- `src/lib/prompts/spain.ts`, `src/lib/prompts/russia.ts` — промпты по стране

### AI Widget система (в AIChatWidget.tsx → MarkdownContent)
ИИ может вставлять виджеты в текст ответа:
```
[WIDGET:SIGN:R-1]           → SignWidget (картинка знака из БД road_signs)
[WIDGET:CTA:PREMIUM:текст]  → кнопка открытия BoostShop (openModal('BOOST_SHOP'))
[WIDGET:MEME:BADGE:Имя]     → карточка достижения
```
Все виджеты парсятся в `MarkdownContent` через `WIDGET_REGEX`.
Таблицы в markdown рендерятся через `mdComponents` (table/thead/tbody/tr/th/td).

### Магазин / Оплата
- `src/components/shop/BoostShopModal.tsx` — весь UI магазина
- `src/lib/payment-config.ts` — включить/выключить провайдеры
- `src/lib/paddle.ts` — Paddle init
- `src/components/monetization/` — upsell компоненты
- `supabase/functions/cryptomus-payment/` — крипто Edge Function

### Модальное окно — как открыть
```typescript
import { useModalStore } from '@/store/modalStore';
const openModal = useModalStore(s => s.openModal);
openModal('BOOST_SHOP');   // магазин
// Другие типы: см. src/store/modalStore.ts → ModalType
```

### Дуэли / PvP
- `src/components/duel/Duel.tsx` — UI дуэли
- `src/hooks/useDuelGame.ts` — логика ответов, комбо, победа
- `src/hooks/useActiveDuel.ts` — получить/создать duelId
- `src/store/duelStore.ts` — Zustand состояние игры
- `src/hooks/duel-realtime/` — Supabase подписка

### Тесты / Экзамен
- `src/pages/TestSession.tsx` — контроллер теста
- `src/pages/Tests.tsx` — список тестов
- `src/components/test-session/` — UI теста
- `src/hooks/useDGTExamQuestions.ts` — загрузка вопросов

### Обучение
- `src/pages/Learning.tsx` — хаб обучения
- `src/components/FlashCards.tsx` — флэшкарты
- `src/pages/TopicDetail.tsx` — страница темы
- `src/pages/Dictionary.tsx` — словарь терминов

### Auth / Пользователь
- `src/contexts/UserContext.tsx` — profileId, session, isPremium, balance
- `src/contexts/TelegramContext.tsx` — Telegram.WebApp, haptics, тема
- `src/components/AuthModalNew.tsx` — login/signup
- `src/hooks/useProfile.ts` — профиль через React Query
- `src/hooks/usePremium.ts` — проверка премиума

### i18n
- `src/i18n/locales/` — JSON переводы (es, ru, en...)
- `src/contexts/LanguageContext.tsx` — хук `t(key, params?)`

### Навигация / Layout
- `src/components/navigation/` — нижняя навигация, tab bar
- `src/components/layout/` — обёртки страниц

### Уведомления
- `src/contexts/NotificationContext.tsx`
- `src/components/NotificationsPanel.tsx`
- `src/components/NotificationToast.tsx`

### Дорожные знаки
- `src/components/RoadSignCard.tsx` — карточка знака (с диалогом)
- `src/components/chat/SignWidget.tsx` — компактный виджет для чата
- `src/pages/RoadSigns.tsx` — страница библиотеки знаков
- БД таблица: `road_signs` (поля: `sign_number`, `image_url`, `name_ru`, `name_es`, `description_ru`, `description_es`)

### Supabase
- `src/integrations/supabase/client.ts` — eager клиент
- `src/integrations/supabase/lazyClient.ts` — lazy клиент (предпочтительно в компонентах)
- `src/integrations/supabase/types.ts` — **не редактировать** (авто-генерация)
- `supabase/functions/` — Edge Functions
- `supabase/migrations/` — миграции БД

### Стартовая последовательность
1. `index.html` → `.app-skeleton` (CSS, без React)
2. `main.tsx` → монтирует React
3. `WelcomeOverlay` (z-index 10000) — первое посещение дня
4. `StartupCurtain` → убирает skeleton когда данные загружены

---

## 🤖 Telegram Bot

```
supabase/functions/telegram-bot/
  index.ts        — webhook, роутинг обновлений
  keyboards.ts    — ВСЕ inline-клавиатуры (импортировать типы из ./types.ts)
  commands.ts     — /start, /stats, /help...
  translations.ts — переводы ru/en/es (добавлять ключ ДО использования)
  types.ts        — TypeScript типы, не редактировать вручную
  season.ts       — логика сезонов Duel Pass
```

**Деплой бота (только Mac):**
```bash
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/supabase functions deploy telegram-bot
```
Без деплоя изменения не применяются. Локальный git ≠ продакшн.

**Главное меню бота:**
```
Row 1: [🚀 Открыть Skily]          web_app, icon: 5188481279963715781
Row 2: [👤 Профиль] [⚔️ Вызвать]  callback: profile / duel_inline
Row 3: [🎮 Duel Pass]              web_app → /duel-pass, icon: 5118744200921219799
Row 4: [🏎 Сезон: NAME]            только если activeSeasonName != null
```

---

## 🏗 Архитектура

### State layers
| Слой | Инструмент | Что хранит |
|------|-----------|------------|
| Server state | React Query v5 | профиль, вопросы, лидерборд (IndexedDB, offline-first) |
| Game state | Zustand (`src/store/`) | дуэль, экзамен, модалы |
| Auth | UserContext | profileId, session, isPremium, balance |
| Real-time | Supabase subscriptions | ходы дуэли, уведомления |
| Telegram | TelegramContext | WebApp, haptics, тема |

### React Query правила
- `staleTime: 5 * 60 * 1000`, `gcTime: 7 * 24 * 60 * 60 * 1000`
- `refetchOnWindowFocus: false`, `refetchOnReconnect: false`
- Оптимистичные обновления в `onMutate`, откат в `onError`
- Query keys всегда включают `profileId`: `['profile-data', profileId]`

### Supabase правила
- Предпочитай `lazyClient.ts` в компонентах
- `supabase.rpc()` для атомарных счётчиков
- Чувствительные мутации (оплата, награды) — только через Edge Functions

### Платёжные провайдеры (порядок кнопок в BoostShopModal)
Stars → Crypto → TON → Card

---

## 🧠 Правила эффективной работы

1. **Сначала смотри File Map** — иди сразу в нужный файл, не исследуй папки
2. **Grep вместо Explore** — `grep -n "pattern" src/...` быстрее любого агента
3. **Edit, не Write** — точечные правки, не переписывай файл целиком
4. **Минимум чтений** — читай только нужный файл, не "соседние для контекста"
5. **Верь пользователю** — "баг в X строке Y" → иди туда сразу
6. **typecheck после правок** — `npm run typecheck` перед коммитом
7. **Комментарии не нужны** — только если WHY неочевиден

---

## 🌍 Переменные окружения

```
VITE_SUPABASE_URL              — обязательно
VITE_SUPABASE_PUBLISHABLE_KEY  — обязательно
VITE_PADDLE_CLIENT_TOKEN       — без него Paddle не работает
VITE_TON_ANALYTICS_KEY         — опционально
VITE_DEBUG_AUDIO=true          — логи аудио
```
