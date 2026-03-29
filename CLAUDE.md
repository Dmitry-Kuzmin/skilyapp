# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs 3 services in parallel: Vite + validator server + maintenance)
npm run dev

# Frontend only (port 8080)
npm run dev:frontend

# Validator microservice only (port 3030)
npm run validator

# Build
npm run build          # tsc + vite build
npm run typecheck      # TypeScript only, no emit
npm run lint           # ESLint

# Database
npm run supabase:apply              # Apply DB migrations
npm run supabase:deploy             # Deploy Edge Functions

# Import driving test content
npm run import:pdd-russia           # Import Russian PDD questions
npm run generate:images             # Batch generate question images via AI
```

**Do not modify:** `package.json`, `vite.config.ts`, `tsconfig.json` — these are locked per `.cursorrules`.

## 🤖 Telegram Bot — ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА

### Файлы бота
```
supabase/functions/telegram-bot/
  index.ts        — webhook handler, роутинг всех обновлений
  keyboards.ts    — ВСЕ inline-клавиатуры. ВСЕГДА импортировать InlineKeyboardButton и InlineKeyboardMarkup из ./types.ts
  commands.ts     — обработчики команд (/start, /stats, /help, ...)
  translations.ts — переводы ru/en/es. Добавлять ключ ДО использования в keyboards.ts
  types.ts        — TypeScript типы. НЕ редактировать вручную
  season.ts       — логика сезонов Duel Pass
```

### КРИТИЧНО: После любых изменений в боте — ВСЕГДА деплоить
```bash
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:$PATH"
/opt/homebrew/bin/supabase functions deploy telegram-bot
```
**Без деплоя изменения не применяются.** Локальный git ≠ продакшн.

### Структура главного меню (getMainMenuKeyboard)
```
Row 1: [🚀 Открыть Skily]          ← web_app, icon: 5188481279963715781
Row 2: [👤 Профиль] [⚔️ Вызвать]  ← callback: profile / duel_inline
Row 3: [🎮 Duel Pass]              ← web_app → /duel-pass, icon: 5118744200921219799
Row 4: [🏎 Сезон: NAME]            ← только если activeSeasonName != null
```

### Иконки кнопок (icon_custom_emoji_id)
- `5188481279963715781` — ракета (Открыть Skily)
- `5105344272324887540` — лицо/профиль (Профиль)
- `5116175844837950263` — Вызвать друга
- `5118744200921219799` — Duel Pass
- `6005661956931850799` — золотая звезда (Сезон)

### Доступ к БД (без пароля, через linked project)
```bash
export PATH="/opt/homebrew/bin:$PATH"
./scripts/db.sh "SELECT * FROM profiles LIMIT 5"
./scripts/db.sh profiles              # таблица целиком (20 строк)
./scripts/db.sh tables                # список всех таблиц
/opt/homebrew/bin/supabase db query "SQL" --linked
```

### Project info
- Project ref: `yffjnqegeiorunyvcxkn`
- URL: `https://yffjnqegeiorunyvcxkn.supabase.co`
- Bot: `@skilyapp_bot` (telegram_id: 8526928539)
- Mini App URL: `https://skilyapp.com`

**Safe to modify:** `components/`, `pages/`, `hooks/`, `contexts/`, `lib/`, `utils/`, `types/`, `integrations/`, `core/`, `data/`, `supabase/`.

## Architecture

### What This Is
A **Telegram Mini App** for driving test (DGT) exam preparation — gamified learning platform with real-time PvP duels, quizzes, flashcards, AI tutoring, and a coin/premium economy. Runs inside Telegram as a WebApp.

### Route Architecture (App.tsx)
Two completely separate trees:

**Public (no auth, no providers):**
- `/` → `Landing.tsx` — lightweight, fast, no AppProviders loaded
- `/login`, `/pricing`, `/partners`, `/blog`, `/about`, `/purchase`

**Authenticated (`/dashboard`, `/app/*`):**
- Lazy-loads `AppProviders` + `AppRoutes` only when accessed
- AppProviders wraps: Supabase, React Query (with IndexedDB persister), UserContext, TelegramContext, LanguageContext, NotificationContext

The split is intentional for performance — the landing bundle does not include Supabase, React Query, or any app vendors.

### State Layers

| Layer | Tool | What It Holds |
|-------|------|---------------|
| Server state | **React Query v5** | User profile, questions, leaderboard (cached to IndexedDB, offline-first) |
| Game state | **Zustand** (`src/store/`) | Duel scores, exam session, modal visibility, settings |
| Auth | **UserContext** | `profileId`, session, isPremium, balance |
| Real-time | **Supabase subscriptions** | Duel opponent moves, live notifications |
| Telegram | **TelegramContext** | `window.Telegram.WebApp`, haptics, theme color |

### React Query Conventions
- `staleTime: 5 * 60 * 1000` (5 min fresh)
- `gcTime: 7 * 24 * 60 * 60 * 1000` (7 days offline cache)
- `refetchOnWindowFocus: false`, `refetchOnReconnect: false` — prevents floods
- Always use **optimistic updates** in `onMutate`, revert in `onError`
- Query keys always include `profileId`: `['profile-data', profileId]`

### Supabase Usage
- Client: `src/integrations/supabase/client.ts` (eager) or `src/integrations/supabase/lazyClient.ts` (lazy, preferred in components)
- **Always use generated types** from `src/integrations/supabase/types.ts`
- Prefer server-side Edge Functions for sensitive mutations (payments, rewards, daily bonuses) — never trust client-side coin counting
- Use `supabase.rpc()` for atomic counter operations (increment, not read-modify-write)

### Payment Architecture
Configured in `src/lib/payment-config.ts`. Active providers:

- **Paddle** — Merchant of Record (taxes, compliance), initialized lazily via `src/lib/paddle.ts`, preloaded on app start
- **Telegram Stars** — Native Telegram currency, via `Telegram.WebApp` API
- **Cryptomus** — Crypto payments, server-side via Edge Function `cryptomus-payment`
- **TON Blockchain** — via `@ton/appkit-react`, wallet connection in `TonWalletHeader`

Button order convention (established in BoostShopModal): Stars → Crypto (primary) → TON → Card (secondary outline).

### Real-time Duel Flow
```
useActiveDuel() → gets or creates duelId
useDuelRealtime() → Supabase postgres_changes subscription on duels table
duelStore (Zustand) → game state: questions, scores, timer, status
useDuelGame() → answer handling, combo logic, win detection
Duel.tsx → rendering
```

### Startup / Loading Sequence
1. `index.html` renders `.app-skeleton` (pure HTML, `pointer-events: none`) — shows before React mounts
2. `main.tsx` mounts React
3. `WelcomeOverlay` (z-index 10000) shows over the skeleton for first visit of the day
4. `StartupCurtain` component (renders null, side-effect only) calls `liftStartupCurtain()` once data loads — removes `.app-skeleton` from DOM
5. `welcome_shown_date` in localStorage controls daily WelcomeOverlay display

### Audio / Haptics
- `src/services/audioService.ts` — Web Audio API, single AudioContext, requires user gesture unlock
- `src/lib/sounds.ts` — preloaded sound effects
- `src/lib/haptics.ts` — Telegram WebApp haptic feedback
- Audio errors must never block UI flow — always fire-and-forget with try/catch

### i18n
`LanguageContext` provides `t(key, params?)`. Translation files in `src/i18n/locales/`. Language driven by user profile setting or browser locale.

### Chunk Splitting Strategy (vite.config.ts)
Manual chunks: `react-core`, `framer-motion`, `lucide-react`, `recharts`, `carousel`, `supabase-vendor`. Landing page loads none of these. Any new heavy dependency should be added to the appropriate manual chunk.

### Validator Microservice (port 3030)
Express.js server (`validator-server.js`) for admin image generation/validation. Uses Puppeteer + Sharp + Google Vertex AI. Not needed for regular frontend dev — only for admin image workflows.

## Key Files

- `src/App.tsx` — All routing, lazy loading, Telegram WebApp init
- `src/pages/Index.tsx` — Main authenticated dashboard, WelcomeOverlay logic
- `src/components/shop/BoostShopModal.tsx` — Full shop UI (coins, premium, TON/crypto payments)
- `src/store/duelStore.ts` — Duel game Zustand store
- `src/hooks/useDuelRealtime.ts` — Real-time duel subscriptions
- `src/integrations/supabase/client.ts` — Supabase client config (realtime params, heartbeat)
- `src/lib/payment-config.ts` — Enable/disable payment providers
- `src/services/audioService.ts` — Audio context management
- `index.html` — App skeleton + startup CSS (z-index 9999, `pointer-events: none`)

## File Map by Feature

**Auth & User:**
- `src/contexts/UserContext.tsx` — profileId, session, isPremium, balance
- `src/contexts/TelegramContext.tsx` — Telegram.WebApp, haptics, theme
- `src/components/AuthModalNew.tsx` — login/signup modal
- `src/hooks/useProfile.ts` — profile React Query hook

**Duel / PvP:**
- `src/components/duel/Duel.tsx` — main duel UI
- `src/hooks/useDuelGame.ts` — answer logic, combo, win detection
- `src/hooks/useActiveDuel.ts` — get/create duelId
- `src/hooks/duel-realtime/` — Supabase subscription
- `src/store/duelStore.ts` — Zustand game state

**Tests / Exam:**
- `src/pages/TestSession.tsx` — test flow controller
- `src/pages/Tests.tsx` — test list
- `src/components/test-session/` — test UI components
- `src/hooks/useDGTExamQuestions.ts` — question fetching

**Shop / Payments:**
- `src/components/shop/BoostShopModal.tsx` — main shop
- `src/lib/payment-config.ts` — provider toggles
- `src/lib/paddle.ts` — Paddle init
- `src/components/monetization/` — upsell components
- `supabase/functions/cryptomus-payment/` — crypto Edge Function

**Learning / Flashcards:**
- `src/pages/Learning.tsx` — learning hub
- `src/components/FlashCards.tsx` — flashcard UI
- `src/pages/TopicDetail.tsx` — topic page
- `src/pages/Dictionary.tsx` — term dictionary

**Notifications:**
- `src/contexts/NotificationContext.tsx` — notification state
- `src/components/NotificationsPanel.tsx` — panel UI
- `src/components/NotificationToast.tsx` — toast component

**AI Features:**
- `src/hooks/useAIChat.ts` — AI tutor chat
- `src/components/ai/` — AI UI components
- `src/components/AIWidget.tsx` — floating AI widget
- `supabase/functions/ai-chat/` — AI Edge Function

**Onboarding:**
- `src/components/onboarding/` — onboarding flow components
- `src/components/PasskeyOnboardingWrapper.tsx` — passkey flow

**Navigation / Layout:**
- `src/components/navigation/` — bottom nav, tab bar
- `src/components/layout/` — page layout wrappers
- `src/components/AppRoutes.tsx` — authenticated route definitions

**i18n:**
- `src/i18n/locales/` — translation JSON files (es, ru, en, etc.)
- `src/contexts/LanguageContext.tsx` — `t()` provider

**Supabase:**
- `src/integrations/supabase/types.ts` — generated DB types (never edit manually)
- `supabase/functions/` — Edge Functions
- `supabase/migrations/` — DB migrations

## Efficiency Rules for Claude

**Before reading files:** Check this File Map first — go directly to the right file, don't Glob/Explore.
**Minimal reads:** Read only the specific file mentioned in the task. Don't read related files unless the fix requires it.
**No broad exploration:** Never use Explore agent for navigation — use Grep with a specific pattern instead.
**Edit don't rewrite:** Prefer targeted Edit over full file rewrites.
**Trust the user:** If the user says "bug in X file at line Y" — go there directly, don't verify by reading surrounding files.

## Environment Variables

Required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Optional but affect features:
- `VITE_PADDLE_CLIENT_TOKEN` — disables Paddle checkout if missing
- `VITE_TON_ANALYTICS_KEY`
- `VITE_DEBUG_AUDIO=true` — enables audio debug logging
