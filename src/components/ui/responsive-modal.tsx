import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  hideCloseButton?: boolean;
  preventClose?: boolean;
  headerContent?: React.ReactNode;
  /** Snap points для Vaul (0-1). Например [0.5, 0.85, 1] */
  snapPoints?: (number | string)[];
  /** Snap point по умолчанию при открытии */
  activeSnapPoint?: number | string | null;
  /** Callback при изменении snap point */
  onSnapPointChange?: (snapPoint: number | string | null) => void;
  /** Скрыть ручку на мобильных */
  hideHandle?: boolean;
  /** Fade из эффект при закрытии */
  fadeFromIndex?: number;
  /** Fullscreen режим */
  fullscreen?: boolean;
  dismissible?: boolean;
}

/**
 * 🏆 GOLD STANDARD - ResponsiveModal с Vaul + iOS Keyboard Fix v2
 * 
 * - Mobile: Vaul Drawer с нативной физикой iOS + поддержка клавиатуры
 * - Desktop: Dialog (центрированная модалка)
 * 
 * Особенности:
 * - Visual Viewport API для iOS клавиатуры
 * - CSS-переменная --visual-viewport-height
 * - meta tag interactive-widget=resizes-content
 * - repositionInputs={false} для Vaul
 * - Адаптивный layout: убираются отступы когда клавиатура открыта
 * - justify-start вместо center для скролла
 * - Спейсер для прокрутки над клавиатурой
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
  contentClassName,
  hideCloseButton = false,
  preventClose = false,
  headerContent,
  snapPoints,
  activeSnapPoint,
  onSnapPointChange,
  hideHandle = false,
  fadeFromIndex,
  fullscreen = false,
  dismissible,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();
  
  // КРИТИЧНО: Если открыт TonConnect или Paddle — отключаем 'modal' режим у Radix,
  // чтобы он не блокировал pointer-events у внешних оверлеев.
  const [isExternalOverlay, setIsExternalOverlay] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    const handleOverlayEvent = (e: Event) => {
      const isOpen = !!(e as CustomEvent).detail?.open;
      setIsExternalOverlay(isOpen);
    };
    document.addEventListener('tonconnect-modal', handleOverlayEvent);
    document.addEventListener('paddle-checkout', handleOverlayEvent);

    return () => {
      document.removeEventListener('tonconnect-modal', handleOverlayEvent);
      document.removeEventListener('paddle-checkout', handleOverlayEvent);
    };
  }, [open]);

  // На мобильных используем Vaul Drawer с нативной физикой
  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible={dismissible !== undefined ? dismissible : !preventClose}
        dismissibleThreshold={0.15}
        snapPoints={snapPoints}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={onSnapPointChange}
        {...(snapPoints ? { fadeFromIndex } as any : {})}
        modal={!isExternalOverlay} // Dynamic: disabled when TonConnect/Paddle overlay is open
        shouldScaleBackground={false}
        repositionInputs={true}
      >
        <DrawerContent
          className={cn(
            "flex flex-col fixed bottom-0 left-0 right-0 z-[99999] outline-none transition-transform duration-200",
            "max-h-[97vh] h-auto",
            className
          )}
          hideHandle={hideHandle}
          onInteractOutside={(e) => {
            // Если TonConnect модал открыт — он добавляет 'tc-disable-scroll' к body
            if (document.body.classList.contains('tc-disable-scroll')) {
              e.preventDefault();
              return;
            }

            const path = e.composedPath();
            // СВЕРХнадежная проверка (Учитывает SVG-иконки и теневые узлы)
            const isExternalPortal = path.some((el: any) => {
              if (!el || !el.tagName) return false;
              
              const tagName = (el.tagName || '').toLowerCase();
              const id = typeof el.id === 'string' ? el.id.toLowerCase() : '';
              
              // Безопасное получение класса (если кликнули на SVG, SVGPath и т.д.)
              let className = '';
              if (typeof el.className === 'string') {
                className = el.className.toLowerCase();
              } else if (el.className && typeof el.className.baseVal === 'string') {
                className = el.className.baseVal.toLowerCase();
              }
              
              // Собираем все признаки элемента в одну строку
              const elString = `${tagName} ${id} ${className}`;
              
              return (
                elString.includes('tc-') ||
                elString.includes('ton-') ||
                elString.includes('tonconnect') ||
                elString.includes('appkit') ||
                elString.includes('sonner') ||
                elString.includes('paddle') ||
                elString.includes('go') // CSS-in-JS классы от TonConnect (напр. .go12345)
              );
            });
            
            // Если кликнули по чему-то из виджетов TON - отменяем закрытие модалки
            if (isExternalPortal) {
              e.preventDefault();
              return;
            }
            if (preventClose) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex-1 flex flex-col w-full overflow-hidden">
            {/* Header Tray */}
            {title && (
              <DrawerHeader className="text-left shrink-0 pb-2 px-8">
                <DrawerTitle className="text-foreground text-xl font-bold">{title}</DrawerTitle>
                {description && (
                  <DrawerDescription className="text-muted-foreground">
                    {description}
                  </DrawerDescription>
                )}
              </DrawerHeader>
            )}

            {headerContent && (
              <div className="shrink-0">
                {headerContent}
              </div>
            )}

            {/* Scrollable content */}
            <div
              className={cn(
                "flex-1 overflow-y-auto min-h-0 overscroll-contain outline-none w-full px-3",
                contentClassName
              )}
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              <div className="flex flex-col min-h-full justify-start pt-2 pb-10">
                {children}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog
  const hasMaxWidth = className?.includes('max-w');
  const defaultMaxWidth = fullscreen ? 'max-w-none w-screen' : (hasMaxWidth ? '' : 'sm:max-w-[500px]');

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!isExternalOverlay}>
      <DialogContent
        className={cn(
          defaultMaxWidth,
          fullscreen ? "h-screen rounded-none" : "max-h-[90vh]",
          "flex flex-col p-0",
          className
        )}
        hideCloseButton={hideCloseButton}
        preventClose={preventClose}
      >
        {title && (
          <DialogHeader className={cn(
            "shrink-0 px-8 pt-6 relative",
            !headerContent && "pb-4 border-b border-white/10"
          )}>
            <DialogTitle className="text-xl font-bold text-foreground">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        {headerContent && (
          <div className="shrink-0 relative z-10">
            {headerContent}
          </div>
        )}
        <div
          className={cn(
            "flex-1 overflow-y-auto min-h-0",
            contentClassName
          )}
          data-scrollable
          style={{ scrollbarWidth: 'none' }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Skeleton компонент для загрузки контента в модалках
 */
export function ModalSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-muted rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>

      {/* Content skeleton */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      ))}
    </div>
  );
}
