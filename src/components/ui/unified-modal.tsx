import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ModalSkeleton, type ModalSkeletonVariant } from "@/components/ui/modal-skeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModalRoute } from "@/hooks/useModalRoute";
import { useModalStack } from "@/hooks/useModalStack";
import { getModalConfig, type ModalType } from "@/lib/modal-config";

interface UnifiedModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  modalType?: ModalType;
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
  fullscreen?: boolean;
  preventClose?: boolean;
  zIndex?: number;
}

/**
 * Унифицированная модалка с bottom sheet на мобильных
 * 
 * - На мобильных: Sheet снизу с расширением при скролле
 * - На десктопе: центрированный Dialog
 * - Оптимизировано: не рендерит детей когда закрыта
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
  const route = useModalRoute(modalRouteKey ?? undefined);
  
  const modalConfig = getModalConfig(modalType);
  const sizeConfig = isMobile ? modalConfig.mobile : modalConfig.desktop;
  
  const resolvedOpen = React.useMemo(() => {
    if (open !== undefined) {
      return open;
    }
    if (modalRouteKey && route) {
      return route.isOpen;
    }
    return false;
  }, [modalRouteKey, open, route?.isOpen]);
  
  const modalId = React.useMemo(() => modalRouteKey || `modal-${Date.now()}-${Math.random()}`, [modalRouteKey]);
  
  const { isTopModal } = useModalStack(modalId, resolvedOpen, title || modalRouteKey);
  
  // ОПТИМИЗАЦИЯ: Не рендерим контент когда модалка закрыта
  const renderContent = React.useMemo(() => {
    if (!resolvedOpen) {
      return null;
    }
    
    if (loading) {
      return skeleton ?? <ModalSkeleton variant={skeletonVariant} />;
    }
    
    return children;
  }, [resolvedOpen, loading, skeleton, skeletonVariant, children]);
  
  const isAnimatingRef = React.useRef(false);
  const lastStateRef = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    if (resolvedOpen) {
      isAnimatingRef.current = false;
      lastStateRef.current = null;
      if (process.env.NODE_ENV === 'development') {
        console.log('[UnifiedModal] Modal opened - flags reset');
      }
    }
  }, [resolvedOpen]);

  const handleOpenChange = React.useCallback(
    (state: boolean) => {
      if (state) {
        isAnimatingRef.current = false;
        lastStateRef.current = null;
      }

      if (!state && lastStateRef.current === state) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[UnifiedModal] Ignoring duplicate close call');
        }
        return;
      }

      if (!state && isAnimatingRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[UnifiedModal] Ignoring close call during animation');
        }
        return;
      }

      if (!state) {
        isAnimatingRef.current = true;
      }
      lastStateRef.current = state;

      if (typeof onOpenChange === 'function') {
        onOpenChange(state);
      }
      
      if (modalRouteKey && route) {
        if (state) {
          route.openModal();
        } else {
          route.closeModal();
        }
      }

      if (!state) {
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 200);
      }
    },
    [modalRouteKey, route, onOpenChange]
  );

  const isSyncingRef = React.useRef(false);
  React.useEffect(() => {
    if (!modalRouteKey || !route || open !== undefined || isSyncingRef.current) return;
    
    if (route.isOpen !== open) {
      isSyncingRef.current = true;
      if (typeof onOpenChange === 'function') {
        onOpenChange(route.isOpen);
      } else {
        console.warn('[UnifiedModal] onOpenChange is not a function:', typeof onOpenChange, onOpenChange);
      }
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  }, [modalRouteKey, route?.isOpen, onOpenChange, open]);

  const [isExpanded, setIsExpanded] = React.useState(() => initialSnap > 0);

  const collapsedHeight = snapPoints[0] ?? '60vh';
  const expandedHeight = snapPoints[1] ?? '92vh';

  React.useEffect(() => {
    if (resolvedOpen) {
      if (initialSnap > 0) {
        setIsExpanded(true);
      } else {
        const rafId = requestAnimationFrame(() => {
          setIsExpanded(true);
        });
        return () => cancelAnimationFrame(rafId);
      }
    } else {
      setIsExpanded(initialSnap > 0);
    }
  }, [resolvedOpen, initialSnap]);

  React.useEffect(() => {
    if (!resolvedOpen) return;
    
    const scrollY = window.scrollY;
    document.body.setAttribute('data-scroll-y', scrollY.toString());
    
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    
    if (!document.body.hasAttribute('data-radix-scroll-locked')) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    }
    
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
      
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');
      
      if (!document.body.hasAttribute('data-radix-scroll-locked')) {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
      }
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    };
  }, [resolvedOpen]);

  // ОПТИМИЗАЦИЯ: Early return если модалка закрыта
  if (!resolvedOpen && !loading) {
    return null;
  }

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
            "!w-full !max-w-none !left-0 !right-0",
            className
          )}
          style={{
            height: isExpanded ? expandedHeight : collapsedHeight,
            transform: `translateY(${isExpanded ? '0px' : '8px'})`,
            maxHeight: expandedHeight,
            transition: "height 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: resolvedOpen ? "height, transform" : "auto",
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
          <SheetHeader className={showTitleBar && title ? "px-4 pb-2 pt-3 border-b border-border/50 sm:px-6 sm:pb-3 sm:pt-4" : "sr-only"}>
            <SheetTitle>
              {title || "Модальное окно"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {title ? `Содержимое модального окна: ${title}` : "Содержимое модального окна"}
            </SheetDescription>
          </SheetHeader>

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

  const modalTitle = title || "Модальное окно";
  const modalDescription = title ? `Содержимое модального окна: ${title}` : "Содержимое модального окна";

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        modalType={modalType}
        className={cn(
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
