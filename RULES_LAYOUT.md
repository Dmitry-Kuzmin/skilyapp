# 📱 TELEGRAM MINI APPS: GOLDEN LAYOUT RULES

**Context:** We are building a Telegram Mini App using React, Tailwind CSS, and the Telegram WebApp SDK.
**Goal:** Perfect native-like layout with zero safe-area issues, synchronized colors, and correct scrolling on iOS/Android.

---

## 🔴 RULE 1: The "No-Bounce" Foundation (CSS)

All standard browser behaviors that break the "native app feel" must be disabled in `index.css`.

1. **Define Fallbacks:** ALWAYS define CSS variables for development in a browser (localhost).
2. **Lock the Body:** Disable pull-to-refresh and rubber-banding.
3. **Color Match:** `html` and `body` MUST have the exact same background color as the app theme.

```css
/* index.css */
:root {
  /* Default values for browser testing */
  --tg-viewport-height: 100vh;
  --tg-viewport-stable-height: 100vh;
  --tg-content-safe-area-inset-top: 0px;
  --tg-content-safe-area-inset-bottom: 0px;
}

html, body {
  /* CRITICAL: Must match tg.setBackgroundColor() */
  background-color: #09090b; 
  color: white;
  margin: 0;
  padding: 0;
  /* Disables pull-to-refresh on mobile */
  overscroll-behavior-y: none; 
  /* Ensures smooth scrolling inside containers */
  -webkit-overflow-scrolling: touch; 
}
```

---

## 🔴 RULE 2: The Tailwind Map (Config)

Never use arbitrary values (like `h-[100vh]`). Map Telegram variables to utility classes in `tailwind.config.ts`.

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      height: {
        // Use this instead of h-screen
        'tg-screen': 'var(--tg-viewport-stable-height, 100vh)', 
      },
      minHeight: {
        'tg-screen': 'var(--tg-viewport-stable-height, 100vh)',
      },
      padding: {
        // Dynamic Island / Notch area
        'safe-top': 'var(--tg-content-safe-area-inset-top, 0px)', 
        // Home Indicator area
        'safe-bottom': 'var(--tg-content-safe-area-inset-bottom, 0px)', 
      },
    },
  },
}
```

---

## 🔴 RULE 3: The "Chameleon" Protocol (JS Sync)

CSS is not enough. You MUST programmatically tell Telegram to paint its native UI (Status Bar & Bottom Area) to match your app.

**Action:** Execute this inside `App.tsx` or `AppLayout.tsx` once on mount.

```tsx
useEffect(() => {
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    
    // 1. Expand to full height (removes half-screen sheet mode)
    tg.expand();
    
    // 2. Paint the Status Bar (Top)
    // MUST match your header color or body bg
    tg.setHeaderColor('#09090b'); 
    
    // 3. Paint the Bottom Area (Home Indicator)
    // MUST match your page background
    tg.setBackgroundColor('#09090b'); 

    // 4. Enable closing confirmation (optional but recommended)
    tg.enableClosingConfirmation();
  }
}, []);
```

---

## 🔴 RULE 4: The Layout Architecture

Do not mix scrolling and fixed elements randomly. Use this strict component structure.

### Scenario A: Page with Scrollable Content

Use a wrapper that handles the bottom safe area.

```tsx
// PageWrapper.tsx
export const PageWrapper = ({ children, className }) => {
  return (
    <div className={cn(
      "w-full min-h-tg-screen flex flex-col",
      "bg-zinc-950 text-white", // Matches Rule 1 & 3
      "pb-safe-bottom", // Protects content from Home Indicator
      className
    )}>
      {children}
    </div>
  );
};
```

### Scenario B: Fixed Header / Overlay

Fixed elements MUST handle the top safe area manually.

```tsx
// Header.tsx
export const Header = () => {
  return (
    <header className={cn(
      "fixed top-0 left-0 w-full z-50",
      "pt-safe-top", // CRITICAL: Pushes content below the Notch
      "bg-zinc-950/90 backdrop-blur-md"
    )}>
      <div className="h-14 flex items-center px-4">
        {/* Actual Header Content */}
      </div>
    </header>
  );
};
```

---

## 🔴 RULE 5: The "Z-Index" of Safe Areas

* **Backgrounds:** Should ignore safe areas (fill the whole screen).
* **Content (Text/Buttons):** Must respect safe areas.
* **Bottom Navigation:** Must have `pb-safe-bottom` as padding, not margin, so the background color extends to the edge of the screen.

---

## 💡 Как использовать эти правила:

1. При создании нового компонента с fixed позиционированием — проверь Rule 4.
2. При изменении цвета фона — убедись, что Rule 1 + Rule 3 синхронизированы.
3. При проблемах с отступами на iPhone — проверь, используешь ли `pt-safe-top` / `pb-safe-bottom`.
4. При проблемах с высотой — используй `min-h-tg-screen` вместо `min-h-screen`.

---

## 📍 Файлы, которые реализуют эти правила:

- `src/index.css` — Rule 1 (CSS Foundation)
- `tailwind.config.ts` — Rule 2 (Tailwind Utilities)
- `src/App.tsx` — Rule 3 (JS Sync)
- `src/components/layout/PageWrapper.tsx` — Rule 4 (Layout Architecture)
- `src/components/layout/TelegramHeader.tsx` — Rule 4 (Fixed Header)

---

## 🎯 Цвета по умолчанию (Dark Theme):

| Элемент | Цвет |
|---------|------|
| Body Background | `#09090b` (zinc-950) |
| Card Background | `hsl(224 30% 14%)` |
| Header Background | `#09090b` (zinc-950) |
| Header Color (Telegram) | `#09090b` |
| Background Color (Telegram) | `#09090b` |

---

Теперь твой лейаут будет пуленепробиваемым. 🛡️
