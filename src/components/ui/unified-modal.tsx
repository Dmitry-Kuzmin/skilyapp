import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ModalSkeleton, type ModalSkeletonVariant } from "@/components/ui/modal-skeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModalRoute } from "@/hooks/useModalRoute";
import { useModalStack } from "@/hooks/useModalStack";
import { getModalConfig, type ModalType } from "@/lib/modal-config";

interface UnifiedModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void; // Сделали опциональным для безопасности
  children: React.ReactNode;
  title?: string;
  modalType?: ModalType; // Тип модалки для определения размеров (small, shop, profile, duelPass, admin, default)
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
  fullscreen?: boolean; // Полноэкранный режим с залитым фоном
  preventClose?: boolean; // Предотвратить закрытие (клик вне, ESC) - полезно для форм с несохраненными данными
  zIndex?: number; // Z-index для управления наложением модалок (используется глобальным менеджером)
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
  modalType = 'default',
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
  fullscreen = false,
  preventClose = false,
  zIndex,
}: UnifiedModalProps) {
  const isMobile = useIsMobile();
  
  // Получаем конфигурацию размеров для типа модалки
  const modalConfig = getModalConfig(modalType);
  const sizeConfig = isMobile ? modalConfig.mobile : modalConfig.desktop;
  
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
  
  // Уникальный ID модалки для отслеживания в стеке
  const modalId = React.useMemo(() => modalRouteKey || `modal-${Date.now()}-${Math.random()}`, [modalRouteKey]);
  
  // Отслеживаем модалку в стеке для предотвращения вложенности
  const { isTopModal } = useModalStack(modalId, resolvedOpen, title || modalRouteKey);
  
  // Мемоизация контента для оптимизации производительности
  // Мемоизация контента для оптимизации производительности
  const renderContent = React.useMemo(() => {
    if (loading) {
      return skeleton ?? <ModalSkeleton variant={skeletonVariant} />;
    }
    return children;
  }, [loading, skeleton, skeletonVariant, children]);
  
  // Ref для предотвращения множественных вызовов во время анимации
  const isAnimatingRef = React.useRef(false);
  const lastStateRef = React.useRef<boolean | null>(null);

  // КРИТИЧНО: Сбрасываем флаги при изменении resolvedOpen
  React.useEffect(() => {
    // При открытии модалки сбрасываем все флаги
    if (resolvedOpen) {
      isAnimatingRef.current = false;
      lastStateRef.current = null;
      if (process.env.NODE_ENV === 'development') {
        console.log('[UnifiedModal] Modal opened - flags reset');
      }
    }
  }, [resolvedOpen]);

  // Улучшенный обработчик: предотвращаем множественные вызовы во время анимации
  const handleOpenChange = React.useCallback(
    (state: boolean) => {
      // КРИТИЧНО: Если модалка открывается, сбрасываем флаги сразу
      if (state) {
        isAnimatingRef.current = false;
        lastStateRef.current = null;
      }

      // Предотвращаем повторные вызовы с тем же состоянием только если это закрытие
      // При открытии всегда разрешаем
      if (!state && lastStateRef.current === state) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[UnifiedModal] Ignoring duplicate close call');
        }
        return;
      }

      // Предотвращаем вызовы во время анимации только при закрытии
      // При открытии всегда разрешаем
      if (!state && isAnimatingRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[UnifiedModal] Ignoring close call during animation');
        }
        return;
      }

      // Устанавливаем флаг анимации только при закрытии
      if (!state) {
        isAnimatingRef.current = true;
      }
      lastStateRef.current = state;

      // Обновляем prop (основной источник истины)
      if (typeof onOpenChange === 'function') {
      onOpenChange(state);
      }
      
      // Синхронизируем URL (если используется)
      if (modalRouteKey && route) {
        if (state) {
          route.openModal();
        } else {
          route.closeModal();
        }
      }

      // Сбрасываем флаг после завершения анимации (200ms) только при закрытии
      if (!state) {
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 200);
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
      // Проверяем, что onOpenChange является функцией перед вызовом
      if (typeof onOpenChange === 'function') {
      onOpenChange(route.isOpen);
      } else {
        console.warn('[UnifiedModal] onOpenChange is not a function:', typeof onOpenChange, onOpenChange);
      }
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
          onOpenChange={handleOpenChange}
          className={cn(
            "p-0 border-none bg-background rounded-t-[24px] flex flex-col shadow-[0_-16px_40px_rgba(15,23,42,0.25)]",
            // На мобильных всегда полная ширина, игнорируем max-w из className
            "!w-full !max-w-none !left-0 !right-0",
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
            // Гарантируем полную ширину на мобильных
            width: '100%',
            maxWidth: '100%',
            left: 0,
            right: 0,
          }}
        >
          {shouldShowHandle && (
            <div className="sticky top-0 z-10 shrink-0 flex justify-center pt-3 pb-2 select-none pointer-events-none">
              <div className="h-1 w-12 rounded-full bg-white/70 dark:bg-white/60 shadow-[0_3px_12px_rgba(0,0,0,0.35)]" />
            </div>
          )}
          {title && showTitleBar && (
            <div className="px-4 pb-2 pt-3 border-b border-border/50 sm:px-6 sm:pb-3 sm:pt-4">
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
          )}

          <div
            data-scrollable
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

  // На десктопе используем обычный Dialog (центрированный) или полноэкранный режим
  if (fullscreen) {
    const modalTitle = title || "Модальное окно";
    const modalDescription = title ? `Содержимое модального окна: ${title}` : "Содержимое модального окна";
    
    return (
      <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
        <DialogContent 
          fullscreen={true}
          className={cn(className)}
          autoAccessibility={false}
          preventClose={preventClose}
        >
          <DialogHeader className={showTitleBar ? "px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 border-b border-border/50" : "sr-only"}>
            <DialogTitle>
              {modalTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {modalDescription}
            </DialogDescription>
          </DialogHeader>
          <div
            data-scrollable
            className={cn(
              "flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4 scrollbar-none",
              contentClassName
            )}
          >
            {renderContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Всегда рендерим DialogTitle и DialogDescription для accessibility, даже если showTitleBar=false
  const modalTitle = title || "Модальное окно";
  const modalDescription = title ? `Содержимое модального окна: ${title}` : "Содержимое модального окна";

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        modalType={modalType}
        className={cn(
          // Используем стандартизированные размеры из modal-config
          sizeConfig.maxWidth || "max-w-[560px]",
          sizeConfig.maxHeight || "max-h-[80vh]",
          "p-0 flex flex-col",
          className
        )}
        autoAccessibility={false}
        preventClose={preventClose}
      >
        <DialogHeader className={showTitleBar && title ? "px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-border/50" : "sr-only"}>
          <DialogTitle>
            {modalTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {modalDescription}
          </DialogDescription>
        </DialogHeader>
        <div
          data-scrollable
          className={cn(
            "overflow-y-auto px-4 md:px-6 py-4 scrollbar-none flex-1 min-h-0",
            contentClassName
          )}
        >
          {renderContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
