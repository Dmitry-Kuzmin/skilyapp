import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ModalSkeleton, type ModalSkeletonVariant } from "@/components/ui/modal-skeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModalRoute } from "@/hooks/useModalRoute";

interface UnifiedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  hideCloseButton?: boolean;
  snapPoints?: string[];
  initialSnap?: number;
  showTitleBar?: boolean;
  loading?: boolean;
  skeletonVariant?: ModalSkeletonVariant;
  skeleton?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showHandle?: boolean;
  modalRouteKey?: string;
}

/**
 * Instagram-подобная модалка с bottom sheet поведением
 * 
 * Особенности:
 * - На мобильных: открывается снизу с начальной высотой 55%, расширяется до 95% при скролле
 * - На десктопе: центрированная модалка
 * - Поддержка свайпа для закрытия (через Vaul)
 * - Плавное расширение при скролле контента
 * - Оптимизировано для быстрого открытия и плавных анимаций
 */
export function UnifiedModal({
  open,
  onOpenChange,
  children,
  title,
  hideCloseButton = false,
  snapPoints = ['60vh', '92vh'],
  initialSnap = 0,
  showTitleBar = true,
  loading = false,
  skeletonVariant = "default",
  skeleton,
  className,
  contentClassName,
  showHandle = true,
  modalRouteKey,
}: UnifiedModalProps) {
  const isMobile = useIsMobile();
  
  // Используем URL только если modalRouteKey задан
  const route = modalRouteKey ? useModalRoute(modalRouteKey) : null;
  
  // Единый источник истины: open prop имеет приоритет
  // Если modalRouteKey задан, синхронизируем с URL, но open prop - главный
  const resolvedOpen = React.useMemo(() => {
    // open prop всегда имеет приоритет
    if (open !== undefined) {
      return open;
    }
    // Если open не задан, используем URL (для программного открытия через URL)
    if (modalRouteKey && route) {
      return route.isOpen;
    }
    return false;
  }, [modalRouteKey, open, route?.isOpen]);
  
  const renderContent = React.useMemo(() => {
    return loading
      ? skeleton ?? <ModalSkeleton variant={skeletonVariant} />
      : children;
  }, [loading, skeleton, skeletonVariant, children]);
  
  // Упрощенный обработчик: обновляем prop и синхронизируем URL
  const handleOpenChange = React.useCallback(
    (state: boolean) => {
      // Обновляем prop (основной источник истины)
      onOpenChange(state);
      
      // Синхронизируем URL (если используется)
      if (modalRouteKey && route) {
        if (state) {
          route.openModal();
        } else {
          route.closeModal();
        }
      }
    },
    [modalRouteKey, route, onOpenChange]
  );

  // Синхронизация URL -> prop: если URL меняется извне (прямой переход), обновляем prop
  // Но только если open prop не был явно установлен (undefined)
  // Используем ref для предотвращения циклов
  const isSyncingRef = React.useRef(false);
  React.useEffect(() => {
    if (!modalRouteKey || !route || open !== undefined || isSyncingRef.current) return;
    
    // Синхронизируем prop с URL только если open не задан явно
    if (route.isOpen !== open) {
      isSyncingRef.current = true;
      onOpenChange(route.isOpen);
      // Сбрасываем флаг после следующего тика
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  }, [modalRouteKey, route?.isOpen, onOpenChange, open]);

  // Оптимизированное расширение: сразу устанавливаем финальное состояние
  const [isExpanded, setIsExpanded] = React.useState(() => initialSnap > 0);

  const collapsedHeight = snapPoints[0] ?? '60vh';
  const expandedHeight = snapPoints[1] ?? '92vh';

  // Быстрое расширение при открытии - используем один RAF для минимальной задержки
  React.useEffect(() => {
    if (resolvedOpen) {
      // Если initialSnap > 0, сразу расширяем, иначе расширяем через один RAF
      if (initialSnap > 0) {
        setIsExpanded(true);
      } else {
        // Один RAF для минимальной задержки
        const rafId = requestAnimationFrame(() => {
          setIsExpanded(true);
        });
        return () => cancelAnimationFrame(rafId);
      }
    } else {
      setIsExpanded(initialSnap > 0);
    }
  }, [resolvedOpen, initialSnap]);

  // Блокировка скролла body при открытии модалки
  // Radix UI сам управляет блокировкой, но мы добавляем дополнительную защиту
  React.useEffect(() => {
    if (!resolvedOpen) return;
    
    // Сохраняем текущую позицию скролла перед блокировкой
    const scrollY = window.scrollY;
    document.body.setAttribute('data-scroll-y', scrollY.toString());
    
    // Дополнительная блокировка для предотвращения скролла фона
    // Radix UI уже блокирует скролл, но мы добавляем дополнительную защиту
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    
    // Блокируем скролл только если Radix UI еще не сделал этого
    if (!document.body.hasAttribute('data-radix-scroll-locked')) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    }
    
    // Предотвращаем скролл фона через touchmove на мобильных
    const preventBodyScrollHandler = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const modalContent = target.closest('[role="dialog"]') || 
                          target.closest('[data-radix-dialog-content]') ||
                          target.closest('[data-state="open"]');
      if (!modalContent) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventBodyScrollHandler, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventBodyScrollHandler);
      
      // Восстанавливаем скролл
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');
      
      // Восстанавливаем стили только если мы их меняли
      if (!document.body.hasAttribute('data-radix-scroll-locked')) {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
      }
      
      // Восстанавливаем позицию скролла
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    };
  }, [resolvedOpen]);

  const shouldShowHandle = isMobile && showHandle;

  if (isMobile) {
    return (
      <Sheet open={resolvedOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          hideCloseButton={hideCloseButton}
          className={cn(
            "p-0 border-none bg-background rounded-t-[24px] flex flex-col shadow-[0_-16px_40px_rgba(15,23,42,0.25)]",
            className
          )}
          style={{
            height: isExpanded ? expandedHeight : collapsedHeight,
            transform: `translateY(${isExpanded ? '0px' : '8px'})`,
            maxHeight: expandedHeight,
            // Ускоренная анимация: 0.15s вместо 0.26s
            transition: "height 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
            // GPU ускорение для плавности
            willChange: resolvedOpen ? "height, transform" : "auto",
          }}
        >
          {shouldShowHandle && (
            <div className="sticky top-0 z-10 shrink-0 flex justify-center pt-3 pb-2 bg-gradient-to-b from-background via-background/95 to-background/0 backdrop-blur-md border-b border-white/5">
              <div className="w-12 h-1.5 rounded-full bg-foreground/20 shadow-[0_2px_6px_rgba(15,23,42,0.35)]" />
            </div>
          )}
          {title && showTitleBar && (
            <div className="px-4 pb-2 pt-3 border-b border-border/50 sm:px-6 sm:pb-3 sm:pt-4">
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
          )}

          <div
            className={cn(
              "flex-1 overflow-y-auto px-4 py-3 scrollbar-none sm:px-6 sm:py-4",
              contentClassName
            )}
          >
            {renderContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // На десктопе используем обычный Dialog (центрированный)
  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className={cn("max-w-4xl max-h-[90vh] p-0 flex flex-col", className)}
        autoAccessibility={false}
      >
        <DialogHeader className={showTitleBar ? undefined : "sr-only"}>
          <DialogTitle className={title ? undefined : "sr-only"}>
            {title || "Модальное окно"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Содержимое модального окна
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "overflow-y-auto max-h-[calc(90vh-60px)] px-6 py-4 scrollbar-none",
            contentClassName
          )}
        >
          {renderContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
