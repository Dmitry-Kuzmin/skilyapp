import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  hideCloseButton?: boolean;
  preventClose?: boolean;
  zIndex?: number;
}

/**
 * ResponsiveModal - универсальная модалка с автоматическим переключением между Dialog и Drawer
 * 
 * - На десктопе (≥768px): Dialog (центрированный, как в Instagram)
 * - На мобильных (<768px): Drawer (bottom sheet с Vaul, как в iOS)
 * 
 * Использует Shadcn/UI компоненты:
 * - Dialog (Radix UI) для десктопа
 * - Drawer (Vaul) для мобильных
 */
export function ResponsiveModal({
  children,
  trigger,
  open,
  onOpenChange,
  title,
  description,
  className,
  contentClassName,
  hideCloseButton = false,
  preventClose = false,
  zIndex = 50,
}: ResponsiveModalProps) {
  // Определяем десктоп через медиа-запрос (как в Instagram)
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // КРИТИЧНО: Обработчик изменения состояния модалки
  // Выносим useCallback наверх, чтобы не нарушать правила хуков React
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    // Просто передаем изменение состояния дальше
    // Vaul сам управляет состоянием, нам нужно только уведомить родителя
    onOpenChange?.(newOpen);
  }, [onOpenChange]);

  // Общий контент для desktop и mobile
  const modalContent = (
    <>
      {/* Header */}
      {title && (
        <div className="px-4 pt-4 pb-3 border-b border-border/40 shrink-0 sm:px-6 sm:pt-6 sm:pb-4">
          <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground sm:text-sm mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Scrollable Content */}
      <div className={cn(
        "flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 scrollbar-none overscroll-contain",
        contentClassName
      )} style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </>
  );

  // Мобильная версия - Vaul Drawer с физикой (как в модалке достижений)
  if (!isDesktop) {
    if (!mounted) return null;

    return (
      <DrawerPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        shouldScaleBackground={true}
        dismissible={!preventClose}
        modal={true}
        fadeFromIndex={0}
        noBodyStyles={false}
      >
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Overlay
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            style={{ zIndex }}
          />
          <DrawerPrimitive.Content
            className={cn(
              "bg-card flex flex-col rounded-t-[24px] border-t border-border shadow-[0_0_40px_rgba(139,92,246,0.15)] dark:shadow-[0_0_40px_rgba(139,92,246,0.15)] z-50 focus:outline-none fixed bottom-0 left-0 right-0 max-h-[90vh]",
              className
            )}
            style={{ zIndex }}
            onInteractOutside={(e) => {
              if (preventClose) {
                e.preventDefault();
              }
            }}
            onEscapeKeyDown={(e) => {
              if (preventClose) {
                e.preventDefault();
              }
            }}
            onPointerDownOutside={(e) => {
              if (preventClose) {
                e.preventDefault();
              }
            }}
          >
            {/* Drawer Handle - область для drag-to-dismiss */}
            <div 
              className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-800 mt-4 cursor-grab active:cursor-grabbing" 
              aria-hidden="true"
              style={{ touchAction: 'none' }}
            />
            
            {/* Content Wrapper - Vaul сам управляет drag, data-vaul-no-drag нужен только на скроллируемых элементах внутри */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {modalContent}
            </div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    );
  }

  // Десктопная версия - Framer Motion с spring-физикой (как в модалке достижений)
  if (!mounted) return null;

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4" style={{ zIndex }}>
          {/* Backdrop с blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={preventClose ? undefined : () => onOpenChange?.(false)}
          />

          {/* Modal Content с spring-анимацией */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 400,
              duration: 0.25
            }}
            className={cn(
              "relative z-10 w-full max-w-2xl h-auto max-h-[85vh] bg-card rounded-[24px] border border-border shadow-[0_0_40px_rgba(139,92,246,0.15)] dark:shadow-[0_0_40px_rgba(139,92,246,0.15)] overflow-hidden flex flex-col",
              className
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby={title ? "responsive-modal-title" : "responsive-modal-title-default"}
            aria-describedby={description ? "responsive-modal-description" : "responsive-modal-description-default"}
          >
            {/* Accessibility: скрытые заголовки для screen readers (используем обычные HTML элементы, не DialogTitle/DialogDescription) */}
            {title ? (
              <h2 id="responsive-modal-title" className="sr-only">{title}</h2>
            ) : (
              <h2 id="responsive-modal-title-default" className="sr-only">Модальное окно</h2>
            )}
            {description ? (
              <p id="responsive-modal-description" className="sr-only">{description}</p>
            ) : (
              <p id="responsive-modal-description-default" className="sr-only">Содержимое модального окна</p>
            )}
            
            {/* Кнопка закрытия (X) */}
            {!hideCloseButton && !preventClose && (
              <button
                onClick={() => onOpenChange?.(false)}
                className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Закрыть</span>
              </button>
            )}
            
            {modalContent}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalTarget
  );
}

