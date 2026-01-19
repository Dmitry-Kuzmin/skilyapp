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
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  // iOS Keyboard handling с Visual Viewport API + CSS-переменная
  React.useEffect(() => {
    if (!isMobile || typeof window === 'undefined' || !open) return;

    const handleViewportChange = () => {
      // Visual Viewport API - правильный способ для iOS
      if ('visualViewport' in window && window.visualViewport) {
        const viewport = window.visualViewport;
        const windowHeight = window.innerHeight;
        const viewportHeight = viewport.height;

        // Клавиатура открыта если viewport меньше window
        const keyboardVisible = viewportHeight < windowHeight;

        if (keyboardVisible) {
          // Высота клавиатуры = разница между window и viewport
          const kbHeight = windowHeight - viewportHeight;
          setKeyboardHeight(kbHeight);

          // Записываем в CSS-переменную для использования в стилях
          document.documentElement.style.setProperty(
            '--visual-viewport-height',
            `${viewportHeight}px`
          );
        } else {
          setKeyboardHeight(0);
          // Сбрасываем в default (96vh)
          document.documentElement.style.setProperty(
            '--visual-viewport-height',
            '96vh'
          );
        }
      }
    };

    // Подписка на изменения viewport
    if ('visualViewport' in window && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
      // Сразу проверяем при mount
      handleViewportChange();
    }

    // Fallback для старых браузеров
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if ('visualViewport' in window && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
      setKeyboardHeight(0);
      // Очищаем CSS-переменную
      document.documentElement.style.removeProperty('--visual-viewport-height');
    };
  }, [isMobile, open]);

  // На мобильных используем Vaul Drawer с нативной физикой
  if (isMobile) {
    // Динамическая высота: используем CSS-переменную ИЛИ calc
    const isKeyboardOpen = keyboardHeight > 0;

    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible={dismissible !== undefined ? dismissible : !preventClose}
        dismissibleThreshold={0.25}
        snapPoints={snapPoints}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={onSnapPointChange}
        fadeFromIndex={fadeFromIndex}
        modal={true}
        shouldScaleBackground={false}
        repositionInputs={false} // 🔥 КРИТИЧНО: Отключаем авто-скролл Vaul
      >
        <DrawerContent
          className={cn(
            "flex flex-col fixed bottom-0 left-0 right-0 z-[100001] outline-none transition-all duration-200",
            // 🔥 КРИТИЧНО: НЕТ rounded-t когда клавиатура открыта
            isKeyboardOpen ? "" : "rounded-t-[32px]",
            className
          )}
          style={{
            // Используем CSS-переменную с fallback
            height: 'var(--visual-viewport-height, 96vh)',
            maxHeight: '96%', // Ограничиваем максимальную высоту 
            // Плавный переход при изменении высоты
            transition: isKeyboardOpen
              ? 'height 0.2s ease-out, border-radius 0.2s ease-out'
              : 'height 0.15s ease-in, border-radius 0.15s ease-in',
            // Предотвращаем overflow за пределы экрана
            overflow: 'hidden',
          }}
          hideHandle={hideHandle}
          onInteractOutside={(e) => {
            if (preventClose) {
              e.preventDefault();
            }
          }}
        >
          {/* Глобальный стиль для скрытия элементов на низких экранах */}
          <style>{`
            @media (max-height: 650px) {
              .hide-on-keyboard {
                display: none !important;
                opacity: 0 !important;
                height: 0 !important;
                margin: 0 !important;
                pointer-events: none !important;
              }
            }
          `}</style>

          <div className={cn(
            "flex-1 flex flex-col w-full bg-background/95 backdrop-blur-xl overflow-hidden",
            isKeyboardOpen ? "" : "rounded-t-[32px]"
          )}>
            {/* Полоска-ручка */}
            {!hideHandle && (
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-700/50 mt-3 mb-2" />
            )}

            {/* Кастомный header */}
            {headerContent && (
              <div className="shrink-0 hide-on-keyboard transition-all duration-300">
                {headerContent}
              </div>
            )}

            {title && (
              <DrawerHeader className="text-left shrink-0 border-b border-white/10 pb-3 px-8 hide-on-keyboard transition-all duration-300">
                <DrawerTitle className="text-foreground">{title}</DrawerTitle>
                {description && (
                  <DrawerDescription className="text-muted-foreground">
                    {description}
                  </DrawerDescription>
                )}
              </DrawerHeader>
            )}

            {/* Scrollable content - 🔥 КРИТИЧНО: justify-start для скролла */}
            <div
              className={cn(
                "flex-1 overflow-y-auto min-h-0 overscroll-contain outline-none w-full px-4",
                contentClassName
              )}
              id="drawer-scroll-container"
              data-scrollable
              data-vaul-no-drag
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              <div className="flex flex-col min-h-full justify-start pt-2">
                {children}

                {/* Spacer для iOS - чтобы контент можно было прокрутить ВЫШЕ клавиатуры */}
                {/* 🔥 Важно: 40vh дает огромный запас хода скролла */}
                <div className="h-[40vh] w-full flex-shrink-0" aria-hidden="true" />
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          defaultMaxWidth,
          fullscreen ? "h-screen rounded-none" : "max-h-[90vh]",
          "bg-background/95 backdrop-blur-xl border-zinc-800/50",
          "flex flex-col p-0",
          "shadow-[0_8px_40px_rgba(0,0,0,0.2)]",
          className
        )}
        hideCloseButton={hideCloseButton || !!headerContent}
        preventClose={preventClose}
      >
        {headerContent ? (
          <div className="shrink-0 relative">
            {headerContent}
          </div>
        ) : title ? (
          <DialogHeader className="shrink-0 px-8 pt-5 pb-4 border-b border-white/10">
            <DialogTitle className="text-foreground">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        ) : null}
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
