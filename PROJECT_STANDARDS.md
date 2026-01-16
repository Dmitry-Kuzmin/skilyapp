# 🥇 Золотой Стандарт Архитектуры Проекта

## 🛠 Технологический Стек (Diamond Stack 2025)
* **Framework:** React 18+ (Vite).
* **UI Pattern:** Гибридный (Hybrid UX).
    * Desktop (>768px): shadcn/ui Dialog.
    * Mobile: Vaul Drawer (native iOS feel).
* **State Management:** Zustand (только для UI стейта: модалки, фильтры).
* **Data Fetching:** TanStack Query v5 (React Query).
* **Database/Backend:** Supabase (PostgreSQL + Edge Functions).
* **Auth:** Custom Telegram Auth (HMAC verification).
* **Styling:** Tailwind CSS.
* **Motion:** Framer Motion (для сложных переходов).
* **Toasts:** Sonner (строго).

## 🧩 Принципы Архитектуры
1. **Separation of Concerns:** Логика (Hooks/Stores) и UI (Components) разделены. UI-компоненты должны быть "глупыми".
2. **Types First:** Сначала пишем интерфейсы и типы, потом реализацию.
3. **No Prop Drilling:** Если данные нужны глубже 1 уровня — используем Store (Zustand) или Context.
4. **Data-First:** Архитектор сначала утверждает схему данных и типы, потом компоненты.
5. **Optimistic UI:** Мгновенное обновление через `onMutate` в React Query.

## 🤖 Правила для ИИ (AI Interaction)
1. **Strict Typing:** Всегда использовать сгенерированные типы Supabase. Никаких ручных типов для сущностей БД.
2. **Separation:** Запрещено смешивать `useEffect` и `fetch` внутри JSX. Выносим в хуки или сторы.
3. **Draft First:** Сначала предложи структуру папок и интерфейсы, получи подтверждение, потом пиши код.
4. **Mobile-First UX:** Приоритет взаимодействиям через Drawers в "Thumb Zone".

## 📱 Mobile Layout & Insets
* Всегда использовать `pt-safe-top` и `pb-safe-bottom`.
* Главный контейнер страницы: `<PageWrapper />` с `min-h-tg-screen`.
* Отключать `overscroll-behavior-y` для предотвращения pull-to-refresh в TMA.

## 🏁 Команда для начала работы
"Инициализируй структуру проекта, установи зависимости и настрой ResponsiveDialog обертку первым делом."
