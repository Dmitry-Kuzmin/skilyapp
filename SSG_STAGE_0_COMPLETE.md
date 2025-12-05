# ✅ Этап 0 завершён: Подготовка кода для SSG

**Дата:** 5 декабря 2025  
**Статус:** ✅ Завершён

## 🎯 Цель этапа

Исправить все проблемные места в коде, которые могут сломать SSG билд из-за отсутствия `window`, `document`, `Telegram` в Node.js окружении.

## ✅ Выполненные задачи

### 1. Поиск проблемных мест

Найдены обращения к:
- `window.location` (hostname, pathname, search, hash, reload)
- `window.history` (replaceState)
- `window.scrollTo`
- `navigator.onLine`
- `document.addEventListener/removeEventListener`

### 2. Исправления в `src/App.tsx`

#### Проблема: `window.location` на верхнем уровне компонента
```typescript
// ❌ БЫЛО (упадёт при SSG билде)
const isGitHubPages = window.location.hostname === 'dmitry-kuzmin.github.io' || 
                      window.location.pathname.startsWith('/sdadim-dgt-prep');
const basename = isGitHubPages ? '/sdadim-dgt-prep' : '/';
```

#### Решение: `useState` + `useEffect` (избегаем Hydration Mismatch)
```typescript
// ✅ СТАЛО (безопасно для SSG)
const [basename, setBasename] = useState('/');
const [isGitHubPages, setIsGitHubPages] = useState(false);

useEffect(() => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const isGH = hostname === 'dmitry-kuzmin.github.io' || pathname.startsWith('/sdadim-dgt-prep');
    setIsGitHubPages(isGH);
    setBasename(isGH ? '/sdadim-dgt-prep' : '/');
  }
}, []);
```

#### Другие исправления:
- ✅ `window.location.reload()` → проверки `typeof window !== 'undefined'`
- ✅ `navigator.onLine` → проверка `typeof navigator !== 'undefined'`
- ✅ `window.scrollTo` → проверка `typeof window !== 'undefined'`
- ✅ Все `useEffect` с `window` → добавлены проверки

### 3. Исправления в `src/pages/TestSession.tsx`

#### Проблема: `document.addEventListener` без проверки
```typescript
// ❌ БЫЛО
document.addEventListener('click', unlockAudio, { once: true });
```

#### Решение: Проверка `typeof document`
```typescript
// ✅ СТАЛО
if (typeof document === 'undefined') return;
document.addEventListener('click', unlockAudio, { once: true });
```

### 4. Создан `src/utils/ssr-safe.ts`

Helper функции для безопасной работы с browser API:

```typescript
export const isBrowser = typeof window !== 'undefined';
export const getWindow = (): Window | null => (isBrowser ? window : null);
export const getDocument = (): Document | null => (isBrowser ? document : null);
export const getTelegramWebApp = () => isBrowser ? (window as any).Telegram?.WebApp : null;
export const getLocalStorage = (): Storage | null => isBrowser ? localStorage : null;
export const getSessionStorage = (): Storage | null => isBrowser ? sessionStorage : null;
export const getNavigator = (): Navigator | null => isBrowser ? navigator : null;
export const getLocation = (): Location | null => isBrowser ? window.location : null;
export const getHistory = (): History | null => isBrowser ? window.history : null;
```

## ✅ Результаты

### Билд проходит успешно:
```bash
npm run build
✓ built in 9.00s
```

### Нет ошибок линтера:
- ✅ `src/App.tsx` — без ошибок
- ✅ `src/pages/TestSession.tsx` — без ошибок
- ✅ `src/utils/ssr-safe.ts` — без ошибок

### Код готов к SSG:
- ✅ Все обращения к `window` обёрнуты в проверки
- ✅ Использован `useState` + `useEffect` для избежания Hydration Mismatch
- ✅ Telegram WebApp инициализация уже в `useEffect` (безопасно)
- ✅ Созданы helper функции для будущего использования

## 📋 Изменённые файлы

1. `src/App.tsx` — исправлены все проблемные места
2. `src/pages/TestSession.tsx` — добавлена проверка `document`
3. `src/utils/ssr-safe.ts` — создан новый файл с helper функциями

## 🚀 Следующий шаг

**Этап 1: Установка и настройка SSG плагина**

Рекомендация эксперта: Рассматривать `vite-plugin-prerender` как основной вариант (работает "сверху", не требует изменения кода).

## 💡 Важные уроки

1. **Hydration Mismatch** — критично использовать `useState` + `useEffect` для браузер-зависимых вещей
2. **Проверки `typeof window`** — обязательны для всех обращений к browser API
3. **Helper функции** — упрощают работу и делают код безопаснее

