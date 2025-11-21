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
  
  // Мемоизируем resolvedOpen для избежания лишних ре-рендеров
  const resolvedOpen = React.useMemo(() => {
    return modalRouteKey ? (open || !!route?.isOpen) : open;
  }, [modalRouteKey, open, route?.isOpen]);
  
  const renderContent = React.useMemo(() => {
    return loading
      ? skeleton ?? <ModalSkeleton variant={skeletonVariant} />
      : children;
  }, [loading, skeleton, skeletonVariant, children]);
  
  // Простой обработчик: обновляем и prop, и URL
  const handleOpenChange = React.useCallback(
    (state: boolean) => {
      onOpenChange(state);
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

  // Оптимизированная синхронизация: используем ref для предотвращения циклов
  const syncingRef = React.useRef(false);
  
  // Синхронизация: если open prop меняется извне, обновляем URL
  React.useEffect(() => {
    if (!modalRouteKey || !route || syncingRef.current) return;
    
    const routeIsOpen = route.isOpen;
    if (open && !routeIsOpen) {
      syncingRef.current = true;
      route.openModal();
      // Сбрасываем флаг после следующего тика
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    } else if (!open && routeIsOpen) {
      syncingRef.current = true;
      route.closeModal();
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    }
  }, [modalRouteKey, open, route?.isOpen, route]);

  // Синхронизация: если URL меняется (прямой переход), обновляем open prop
  React.useEffect(() => {
    if (!modalRouteKey || !route || syncingRef.current) return;
    
    const routeIsOpen = route.isOpen;
    if (routeIsOpen !== open) {
      syncingRef.current = true;
      onOpenChange(routeIsOpen);
      requestAnimationFrame(() => {
        syncingRef.current = false;
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
  React.useEffect(() => {
    if (resolvedOpen) {
      // Сохраняем текущую позицию скролла перед блокировкой
      const scrollY = window.scrollY;
      
      // Блокируем скролл фона при открытом модальном окне
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.left = '0';
      document.body.style.right = '0';
      
      // Сохраняем позицию скролла в data-атрибут для восстановления
      document.body.setAttribute('data-scroll-y', scrollY.toString());
      
      // Предотвращаем скролл фона через touchmove на мобильных
      const preventBodyScroll = (e: TouchEvent) => {
        // Разрешаем скролл только внутри модалки
        const target = e.target as HTMLElement;
        const modalContent = target.closest('[role="dialog"]') || target.closest('[data-radix-dialog-content]');
        if (!modalContent) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchmove', preventBodyScroll, { passive: false });
      
      return () => {
        document.removeEventListener('touchmove', preventBodyScroll);
      };
    } else {
      // Восстанавливаем позицию скролла
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');
      
      // Разблокируем скролл при закрытии
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.left = '';
      document.body.style.right = '';
      
      // Восстанавливаем позицию скролла
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    }
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
