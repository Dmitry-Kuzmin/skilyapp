# 🎨 Стандарт UI Библиотек 2025

## 📚 Золотой Стек

Для нашего стека (**React + Tailwind + Telegram Mini App**) используется следующий стек:

### 1. **shadcn/ui + Radix UI** (База)

Headless UI библиотеки, которые дают логику и доступность, но не имеют стилей.

- ✅ **Dialog** - `@radix-ui/react-dialog`
- ✅ **Drawer** - `vaul` (используется под капотом)
- ✅ **Popover** - `@radix-ui/react-popover`
- ✅ **Alert Dialog** - `@radix-ui/react-alert-dialog`
- ✅ **Tooltip** - `@radix-ui/react-tooltip`

### 2. **Vaul** (Мобильная шторка)

Имитирует нативное поведение iOS. Можно тянуть, закрывать свайпом.

### 3. **Framer Motion** (Анимации)

Для плавных анимаций появления/исчезновения.

### 4. **Sonner** (Уведомления)

Легковесная библиотека для уведомлений/тостов.

---

## 🚀 ResponsiveModal - Умный компонент

**ВСЕ новые модалки ДОЛЖНЫ использовать `ResponsiveModal`:**

```tsx
import { ResponsiveModal } from "@/components/ui/responsive-modal";

export function MyModal({ open, onOpenChange }: MyModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Заголовок модалки"
      description="Описание (опционально)"
    >
      <div className="space-y-4">
        <p className="text-zinc-300">Ваш контент здесь</p>
        <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
      </div>
    </ResponsiveModal>
  );
}
```

**Как работает:**
- На десктопе (>= 768px): **Dialog** (центрированная модалка)
- На мобильных (< 768px): **Drawer** (шторка снизу)

---

## 🔔 Уведомления - Sonner

**ВСЕ уведомления ДОЛЖНЫ использовать `toast` из `sonner`:**

```tsx
import { toast } from "@/components/ui/sonner";

// Успех
toast.success("Награда получена!", {
  description: "Вы получили 100 монет",
});

// Ошибка
toast.error("Ошибка оплаты", {
  description: "Недостаточно средств",
});

// Информация
toast.info("Новое обновление", {
  description: "Доступна новая функция",
});

// Предупреждение
toast.warning("Внимание", {
  description: "Проверьте баланс",
});

// Кастомное
toast("Кастомное уведомление", {
  description: "С кастомной иконкой",
  icon: "🎉",
});
```

**ЗАПРЕЩЕНО:**
- ❌ Использовать старую систему `use-toast`
- ❌ Создавать кастомные компоненты уведомлений

---

## 🎨 Премиум стиль (zinc-900)

**ВСЕ компоненты ДОЛЖНЫ использовать премиум стиль:**

### Цветовая палитра:

- **Фон:** `bg-zinc-900` (НЕ `bg-background`, НЕ `bg-slate-950`)
- **Границы:** `border-zinc-800 border-white/10` (тонкие, премиум)
- **Текст:** 
  - Заголовки: `text-zinc-200`
  - Описания: `text-zinc-400`
  - Мелкий текст: `text-zinc-500`
- **Скругление:** `rounded-xl` для модалок, `rounded-full` для badges

### Пример Dialog:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="bg-zinc-900 border-zinc-800 border-white/10">
    <DialogHeader>
      <DialogTitle className="text-zinc-200">Заголовок</DialogTitle>
      <DialogDescription className="text-zinc-400">
        Описание модалки
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      {/* Контент */}
    </div>
  </DialogContent>
</Dialog>
```

### Пример Drawer:

```tsx
<Drawer open={open} onOpenChange={onOpenChange}>
  <DrawerContent className="bg-zinc-900 border-zinc-800 border-t-white/10">
    <DrawerHeader>
      <DrawerTitle className="text-zinc-200">Заголовок</DrawerTitle>
      <DrawerDescription className="text-zinc-400">
        Описание шторки
      </DrawerDescription>
    </DrawerHeader>
    <div className="px-4 pb-4 space-y-4">
      {/* Контент */}
    </div>
  </DrawerContent>
</Drawer>
```

---

## 📋 Чеклист при создании новой модалки:

- [ ] Используется `ResponsiveModal` или `Dialog`/`Drawer` напрямую
- [ ] Применен премиум стиль (`bg-zinc-900`, `border-zinc-800`, `text-zinc-200/400`)
- [ ] Уведомления используют `toast` из `sonner`
- [ ] Проверена работа на мобильных (Drawer) и десктопе (Dialog)
- [ ] Добавлены анимации через Framer Motion (если нужно)

---

## 🚫 ЗАПРЕЩЕНО

- ❌ Использовать `react-modal` или другие старые библиотеки
- ❌ Использовать `Material UI` или `Ant Design` (тяжелые, убивают кастомный дизайн)
- ❌ Создавать кастомные модалки без использования Radix UI
- ❌ Использовать старую систему уведомлений (`use-toast`)

---

## 📦 Установленные зависимости

Все необходимые зависимости уже установлены:
- ✅ `@radix-ui/react-dialog` - Dialog
- ✅ `@radix-ui/react-popover` - Popover
- ✅ `@radix-ui/react-alert-dialog` - Alert Dialog
- ✅ `vaul` - Drawer (мобильная шторка)
- ✅ `framer-motion` - Анимации
- ✅ `sonner` - Уведомления
- ✅ `class-variance-authority` - Варианты компонентов
- ✅ `clsx` + `tailwind-merge` - Утилиты для классов

**НЕ нужно устанавливать дополнительные зависимости!**

---

## 🔄 Миграция существующих компонентов

### Шаг 1: Заменить старые модалки на ResponsiveModal

**Было:**
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    {/* контент */}
  </DialogContent>
</Dialog>
```

**Стало:**
```tsx
<ResponsiveModal
  open={open}
  onOpenChange={onOpenChange}
  title="Заголовок"
>
  {/* контент */}
</ResponsiveModal>
```

### Шаг 2: Заменить уведомления на Sonner

**Было:**
```tsx
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();
toast({ title: "Успех", description: "Описание" });
```

**Стало:**
```tsx
import { toast } from "@/components/ui/sonner";
toast.success("Успех", { description: "Описание" });
```

---

**Последнее обновление:** 2025-12-01



