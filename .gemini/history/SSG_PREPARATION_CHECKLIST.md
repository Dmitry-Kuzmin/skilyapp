# Чеклист подготовки к SSG

## 🎯 Цель

Проверить и исправить все проблемные места в коде перед внедрением SSG, чтобы билд не падал из-за отсутствия `window`, `document` или `Telegram` в Node.js окружении.

## ⚠️ Критическая проблема

При SSG билде React-код запускается в **Node.js**, где нет:
- `window`
- `document`
- `Telegram`
- `navigator`
- `localStorage`
- `sessionStorage`

Все обращения к этим объектам должны быть обёрнуты в проверки или находиться в `useEffect`.

## 📋 Чеклист

### 1. Поиск проблемных мест

```bash
# Найти все обращения к window
grep -r "window\." src/ | grep -v "typeof window" | grep -v "window !== 'undefined'"

# Найти все обращения к Telegram
grep -r "Telegram\." src/ | grep -v "typeof window"

# Найти все обращения к document
grep -r "document\." src/ | grep -v "typeof document"

# Найти все обращения к navigator
grep -r "navigator\." src/ | grep -v "typeof navigator"

# Найти все обращения к localStorage
grep -r "localStorage\." src/ | grep -v "typeof window"

# Найти все обращения к sessionStorage
grep -r "sessionStorage\." src/ | grep -v "typeof window"
```

### 2. Типичные проблемные паттерны

#### ❌ НЕПРАВИЛЬНО (упадёт при SSG билде):

```typescript
// Прямое обращение к window
const tg = window.Telegram.WebApp;

// Прямое обращение к document
const root = document.getElementById('root');

// Прямое обращение к navigator
const isOnline = navigator.onLine;

// Прямое обращение к localStorage
const value = localStorage.getItem('key');

// Глобальная инициализация
if (window.Telegram) {
  window.Telegram.WebApp.ready();
}
```

#### ✅ ПРАВИЛЬНО (работает с SSG):

```typescript
// Проверка typeof window
const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

// Проверка typeof document
const root = typeof document !== 'undefined' ? document.getElementById('root') : null;

// Проверка typeof navigator
const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

// Проверка typeof window для localStorage
const value = typeof window !== 'undefined' ? localStorage.getItem('key') : null;

// Использование useEffect (не запускается при SSG)
useEffect(() => {
  if (typeof window !== 'undefined' && window.Telegram) {
    window.Telegram.WebApp.ready();
  }
}, []);
```

### 3. Файлы для проверки

#### Критичные файлы (проверить в первую очередь):

- [ ] `src/main.tsx` — точка входа, может быть глобальная инициализация
- [ ] `src/App.tsx` — главный компонент
- [ ] `src/pages/Landing.tsx` — будет SSG
- [ ] `src/pages/Blog.tsx` — будет SSG
- [ ] `src/pages/Article.tsx` — будет SSG
- [ ] `src/hooks/useInitTelegram.ts` — инициализация Telegram
- [ ] `src/lib/telegram.ts` — работа с Telegram API
- [ ] `src/components/Layout.tsx` — может использовать window для размеров

#### Все файлы с Telegram:

- [ ] Все файлы, использующие `window.Telegram`
- [ ] Все файлы, использующие `getTelegramWebApp()`
- [ ] Все файлы, использующие `isTelegramMiniApp()`

### 4. Типичные места для исправления

#### Инициализация Telegram WebApp:

```typescript
// ❌ НЕПРАВИЛЬНО
const tg = window.Telegram.WebApp;

// ✅ ПРАВИЛЬНО
useEffect(() => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    // логика
  }
}, []);
```

#### Проверка размера экрана:

```typescript
// ❌ НЕПРАВИЛЬНО
const isMobile = window.innerWidth < 768;

// ✅ ПРАВИЛЬНО
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  if (typeof window !== 'undefined') {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }
}, []);
```

#### Работа с localStorage:

```typescript
// ❌ НЕПРАВИЛЬНО
const value = localStorage.getItem('key');

// ✅ ПРАВИЛЬНО
const value = typeof window !== 'undefined' ? localStorage.getItem('key') : null;
```

#### Условный рендеринг:

```typescript
// ❌ НЕПРАВИЛЬНО
{window.Telegram && <TelegramComponent />}

// ✅ ПРАВИЛЬНО
{typeof window !== 'undefined' && window.Telegram && <TelegramComponent />}
```

### 5. Тестирование

После исправлений:

- [ ] Запустить `npm run build` — должен проходить без ошибок
- [ ] Проверить, что сгенерированные HTML файлы содержат контент
- [ ] Проверить, что мета-теги присутствуют в HTML
- [ ] Проверить, что structured data присутствует в HTML

### 6. Полезные утилиты

Создать helper функции:

```typescript
// src/utils/ssr-safe.ts
export const isBrowser = typeof window !== 'undefined';

export const getWindow = () => (isBrowser ? window : null);

export const getDocument = () => (isBrowser ? document : null);

export const getTelegramWebApp = () => 
  isBrowser ? window.Telegram?.WebApp : null;

export const getLocalStorage = () => 
  isBrowser ? localStorage : null;

export const getSessionStorage = () => 
  isBrowser ? sessionStorage : null;
```

Использование:

```typescript
import { getTelegramWebApp, isBrowser } from '@/utils/ssr-safe';

const tg = getTelegramWebApp();

if (isBrowser) {
  // безопасная работа с window
}
```

## ✅ Готовность к SSG

Код готов к SSG, когда:

- [ ] Все проверки пройдены
- [ ] `npm run build` проходит без ошибок
- [ ] Все проблемные места исправлены
- [ ] Созданы helper функции для безопасной работы с browser API
- [ ] Протестирована генерация статического HTML

## 🚀 Следующий шаг

После прохождения чеклиста можно переходить к [SSG_IMPLEMENTATION_PLAN.md](./SSG_IMPLEMENTATION_PLAN.md) и начинать внедрение SSG.

