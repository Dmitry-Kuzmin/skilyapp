# Единая система модалок с Skeleton анимацией

## 📋 Обзор

Все модалки в приложении должны использовать единую систему skeleton анимации для состояния загрузки. Это обеспечивает:
- ✅ Фиксированную высоту модалки (не меняется при загрузке)
- ✅ Плавную анимацию skeleton элементов
- ✅ Единообразный UX во всем приложении
- ✅ Поддержку Desktop и Mobile/Telegram

## 🚀 Быстрый старт

### 1. Импорты

```typescript
import { ModalSkeleton } from '@/components/ui/modal-skeleton';
import { getDialogContentClasses, getSheetContentClasses } from '@/lib/modal-config';
import { useIsMobile } from '@/hooks/use-mobile';
```

### 2. Структура компонента

```typescript
export function MyModal({ open, onOpenChange }: MyModalProps) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Контент модалки с skeleton
  const ModalContent = () => {
    if (loading) {
      return <ModalSkeleton variant="default" />; // или "shop", "duelPass", "profile"
    }
    
    return (
      <>
        {/* Ваш контент здесь */}
        <div>Загруженные данные</div>
      </>
    );
  };

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className={getSheetContentClasses('default', isMobile)}>
            <div className="flex-1 overflow-y-auto">
              <ModalContent />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={getDialogContentClasses('default', isMobile)}>
            <div className="flex-1 overflow-y-auto">
              <ModalContent />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
```

## 📐 Типы модалок

### Доступные варианты skeleton:

- `default` - базовый skeleton (заголовок + список элементов)
- `shop` - для магазина (табы, карточки товаров)
- `duelPass` - для Duel Pass (прогресс, таблица наград)
- `profile` - для профиля (аватар, статистика)

### Конфигурация размеров:

```typescript
// В modal-config.ts определены размеры для каждого типа:
types: {
  shop: {
    desktop: { maxWidth: 'max-w-lg', maxHeight: 'max-h-[80vh]' },
    mobile: { maxHeight: 'max-h-[85vh]' },
  },
  duelPass: {
    desktop: { maxWidth: 'max-w-5xl', maxHeight: 'max-h-[88vh]' },
    mobile: { maxHeight: 'max-h-[90vh]' },
  },
  // ... и т.д.
}
```

## 🎨 Примеры использования

### Пример 1: Простая модалка

```typescript
const ModalContent = () => {
  if (loading) {
    return <ModalSkeleton variant="default" />;
  }
  
  return <div>Контент</div>;
};

return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={getDialogContentClasses('default', isMobile)}>
      <div className="flex-1 overflow-y-auto">
        <ModalContent />
      </div>
    </DialogContent>
  </Dialog>
);
```

### Пример 2: Модалка магазина

```typescript
const ModalContent = () => {
  if (loading) {
    return <ModalSkeleton variant="shop" />;
  }
  
  return (
    <>
      <DialogHeader className="shrink-0">
        <DialogTitle>Магазин</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {/* Товары */}
      </div>
    </>
  );
};

return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={getDialogContentClasses('shop', isMobile)}>
      <div className="flex-1 overflow-y-auto">
        <ModalContent />
      </div>
    </DialogContent>
  </Dialog>
);
```

### Пример 3: Модалка с Header

```typescript
const ModalContent = () => {
  if (loading) {
    return <ModalSkeleton variant="duelPass" />;
  }
  
  return (
    <>
      {/* Header должен быть с shrink-0 */}
      <DialogHeader className="shrink-0 border-b">
        <DialogTitle>Заголовок</DialogTitle>
      </DialogHeader>
      
      {/* Контент в scrollable контейнере */}
      <div className="flex-1 overflow-y-auto space-y-6 px-6 py-6">
        {/* Ваш контент */}
      </div>
    </>
  );
};
```

## ⚙️ Правила использования

### ✅ ОБЯЗАТЕЛЬНО:

1. **Всегда используйте `ModalContent` функцию** для условного рендеринга skeleton
2. **Адаптивная высота**: используйте `getDialogContentClasses()` или `getSheetContentClasses()` — они добавят `max-h` и позволят контенту занимать столько места, сколько нужно
3. **Scrollable контейнер**: оборачивайте контент в `<div className="flex-1 overflow-y-auto">`
4. **Header с shrink-0**: если есть header, добавьте `shrink-0` чтобы он не сжимался
5. **Проверка loading**: skeleton показывается только при `loading === true`

### ❌ НЕ ДЕЛАЙТЕ:

1. ❌ Не используйте ранний `return` при loading - это изменит размер модалки
2. ❌ Не задавайте `h-[...vh]` на DialogContent — только `max-h` с внутренним скроллом
3. ❌ Не показывайте спиннер вместо skeleton - skeleton лучше для UX
4. ❌ Не забывайте про `isMobile` для правильных размеров

## 🔧 Настройка

### Добавление нового типа модалки:

1. Откройте `src/lib/modal-config.ts`
2. Добавьте новый тип в `MODAL_CONFIG.types`:

```typescript
types: {
  myNewType: {
    desktop: { maxWidth: 'max-w-2xl', maxHeight: 'max-h-[88vh]' },
    mobile: { maxHeight: 'max-h-[90vh]' },
  },
}
```

3. Создайте skeleton компонент в `src/components/ui/modal-skeleton.tsx`:

```typescript
function MyNewTypeSkeleton() {
  return (
    <>
      {/* Ваш skeleton контент */}
    </>
  );
}

// Добавьте в variants:
const variants = {
  // ...
  myNewType: <MyNewTypeSkeleton />,
};
```

## 📱 Mobile и Telegram

Система автоматически определяет мобильное устройство через `useIsMobile()` и применяет соответствующие ограничения:

- **Desktop**: `max-h-[88-90vh]` (в зависимости от типа)
- **Mobile/Telegram**: `max-h-[90-92vh]`

## 🎯 Примеры в коде

Смотрите реализацию в:
- `src/components/shop/BoostShopModal.tsx` - пример магазина
- `src/components/monetization/DuelPassSeasonModal.tsx` - пример Duel Pass

## 💡 Советы

1. **Автообновление**: Используйте `MODAL_CONFIG.common.autoRefreshInterval` для тихого обновления данных
2. **Задержка skeleton**: Если загрузка очень быстрая (< 100ms), можно добавить задержку перед показом skeleton
3. **Кастомный skeleton**: Если нужен особый skeleton, создайте свой компонент по аналогии с `ModalSkeleton`

## 🐛 Отладка

Если модалка меняет размер при загрузке:
1. Проверьте, что используете `getDialogContentClasses()` или `getSheetContentClasses()`
2. Убедитесь, что контент обернут в `<div className="flex-1 overflow-y-auto">`
3. Проверьте, что нет раннего `return` при loading

---

**Важно**: Все новые модалки ДОЛЖНЫ использовать эту систему по умолчанию!


