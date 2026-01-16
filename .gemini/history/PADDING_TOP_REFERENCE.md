# Справочник отступов сверху (padding-top) для TestSession

## 📱 Основной контент (TestSession.tsx, строка 1610-1612)

### Обычные экраны (браузер, не Telegram):
- **Мобильные (< 640px):** `pt-0` = **0px**
- **Планшеты (≥ 640px):** `sm:pt-1` = **4px**
- **Десктоп (≥ 768px):** `md:pt-3` = **12px**

### Telegram WebApp:
- **Все экраны:** `!pt-12` = **48px** (important, переопределяет все)

**Код:**
```tsx
<div className={cn(
  "pt-0 sm:pt-1 md:pt-3",
  isTelegramApp ? "px-2 sm:px-4 !pt-12" : "pb-2 md:pb-3"
)}>
```

---

## 🖼️ Диалог увеличенного изображения (TestSession.tsx, строка 173)

### Все устройства:
- **Padding-top:** `max(env(safe-area-inset-top), var(--tg-content-safe-area-inset-top, 0px))`
  - Использует CSS `env(safe-area-inset-top)` для системного safe area
  - Или Telegram переменную `--tg-content-safe-area-inset-top` (обычно 40-80px)
  - По умолчанию: **0px** (если не Telegram и нет safe area)

**Код:**
```tsx
style={{
  paddingTop: 'max(env(safe-area-inset-top), var(--tg-content-safe-area-inset-top, 0px))',
  // ...
}}
```

---

## ❌ Кнопка закрытия в диалоге изображения (TestSession.tsx, строка 193)

### Все устройства:
- **Top position:** `calc(max(env(safe-area-inset-top), var(--tg-content-safe-area-inset-top, 0px)) + 16px)`
  - Safe area + **16px** дополнительного отступа

**Код:**
```tsx
style={{
  top: 'calc(max(env(safe-area-inset-top), var(--tg-content-safe-area-inset-top, 0px)) + 16px)',
  // ...
}}
```

---

## 🗺️ Карта вопросов - Drag Handle (TestSession.tsx, строка 2056)

### Все устройства:
- **Padding-top:** `pt-3` = **12px**

**Код:**
```tsx
<div className="flex justify-center pt-3 pb-2">
```

---

## 📋 Карта вопросов - Footer (TestSession.tsx, строка 2121)

### Все устройства:
- **Margin-top:** `mt-6` = **24px**
- **Padding-top:** `pt-4` = **16px**
- **Итого отступ сверху:** **40px**

**Код:**
```tsx
<div className="mt-6 pt-4 border-t border-border">
```

---

## 🤖 AI Widget (TestSession.tsx, строка 2186-2188)

### Обычные экраны (браузер, не Telegram):
- **Мобильные (< 768px):** `pt-0` = **0px**
- **Десктоп (≥ 768px):** `md:pt-3` = **12px**

**Код:**
```tsx
<div className={cn(
  "hidden lg:flex lg:flex-col pt-0 md:pt-3",
  !isTelegramApp && "pb-2 md:pb-3"
)}>
```

---

## 💬 AI Explanation Dialog (AIExplanationDialog.tsx, строка 501)

### Telegram WebApp:
- **Padding-top:** `calc(var(--tg-content-safe-area-inset-top, 0px) + 48px + 12px)`
  - Telegram safe area (обычно 40-80px) + **48px** (высота header) + **12px** (дополнительный отступ)
  - **Итого:** ~100-140px

### Обычные экраны:
- **Padding-top:** `12px`

**Код:**
```tsx
style={{
  paddingTop: isTelegram ? 'calc(var(--tg-content-safe-area-inset-top, 0px) + 48px + 12px)' : '12px',
}}
```

---

## 📊 Сводная таблица отступов сверху

| Элемент | Мобильные (< 640px) | Планшеты (≥ 640px) | Десктоп (≥ 768px) | Telegram WebApp |
|---------|---------------------|-------------------|-------------------|-----------------|
| **Основной контент** | 0px | 4px | 12px | **48px** (important) |
| **Диалог изображения** | Safe area (0px) | Safe area (0px) | Safe area (0px) | Safe area (40-80px) |
| **Кнопка закрытия** | Safe area + 16px | Safe area + 16px | Safe area + 16px | Safe area + 16px |
| **Карта вопросов - Handle** | 12px | 12px | 12px | 12px |
| **Карта вопросов - Footer** | 40px | 40px | 40px | 40px |
| **AI Widget** | - | - | 12px | - (скрыт) |
| **AI Dialog** | 12px | 12px | 12px | Safe area + 60px |

---

## 🔧 Telegram Safe Area Variables

### CSS переменные:
- `env(safe-area-inset-top)` - системный safe area (iOS notch, Android status bar)
- `--tg-content-safe-area-inset-top` - Telegram WebApp safe area (обычно 40-80px)
- `--tg-safe-area-inset-top` - альтернативная переменная (используется реже)

### Типичные значения:
- **iOS с notch:** `env(safe-area-inset-top)` = ~44-50px
- **Android:** `env(safe-area-inset-top)` = ~24-28px
- **Telegram WebApp:** `--tg-content-safe-area-inset-top` = 40-80px (зависит от устройства)

---

## 📝 Примечания

1. **Telegram WebApp** всегда использует `!pt-12` (48px) для основного контента, независимо от размера экрана
2. **Safe area** применяется автоматически через CSS `env()` и Telegram переменные
3. **Отступы снизу** убраны для Telegram WebApp (`pb-2 md:pb-3` применяется только для обычных экранов)
4. Все значения в Tailwind CSS:
   - `pt-0` = 0px
   - `pt-1` = 4px
   - `pt-3` = 12px
   - `pt-4` = 16px
   - `pt-12` = 48px
   - `mt-6` = 24px

