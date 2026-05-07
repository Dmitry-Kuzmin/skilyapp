import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useExternalOverlay } from "@/hooks/useExternalOverlay";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: React.ReactNode;
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
  /** Fullscreen только на мобильных */
  mobileFullscreen?: boolean;
  dismissible?: boolean;
}

/** Mobile: Vaul bottom-sheet. Desktop: centered Dialog. */
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
  mobileFullscreen = false,
  dismissible,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();
  // Disable Vaul/Radix modal mode when TonConnect or Paddle overlay is open,
  // so their portals receive pointer events.
  const isExternalOverlay = useExternalOverlay(open);

  // На мобильных используем Vaul Drawer с нативной физикой
  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible={dismissible !== undefined ? dismissible : !preventClose}
        dismissibleThreshold={0.4}
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
            "flex flex-col fixed left-0 right-0 z-[99999] outline-none",
            mobileFullscreen
              ? "inset-x-0 bottom-0 top-0 h-[100dvh] max-h-[100dvh] rounded-none"
              : "bottom-0 max-h-[calc(100dvh-env(safe-area-inset-top,0px)-12px)] h-auto",
            className
          )}
          hideHandle={hideHandle}
          onInteractOutside={(e) => {
            // TonConnect body lock or active custom event → block dismiss
            if (document.body.classList.contains('tc-disable-scroll') || isExternalOverlay) {
              e.preventDefault();
              return;
            }
            // Check if the click landed on any external widget portal
            const isExternalPortal = (e.composedPath() as Element[]).some(el => {
              if (!el?.tagName) return false;
              const id = (el instanceof HTMLElement ? el.id : '') || '';
              const cls = typeof el.className === 'string'
                ? el.className
                : ((el as SVGElement).className?.baseVal ?? '');
              return /tc-|ton-|tonconnect|appkit|sonner|paddle|\bgo\d{4,}/.test(`${id} ${cls}`);
            });
            if (isExternalPortal || preventClose) e.preventDefault();
          }}
        >
          <div className="flex-1 flex flex-col w-full overflow-hidden min-h-0">
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
                "flex-1 overflow-y-auto min-h-0 outline-none w-full",
                mobileFullscreen ? "px-4 pb-4" : "px-3",
                contentClassName
              )}
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              <div
                className={cn("flex flex-col min-h-full justify-start", mobileFullscreen ? "pt-2 pb-6" : "pt-2")}
                style={{ paddingBottom: 'max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))' }}
              >
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
            "shrink-0 px-8 pt-6 pr-16 relative flex flex-row items-center",
            !headerContent && "pb-4 border-b border-white/10"
          )}>
            <DialogTitle className="text-xl font-bold text-foreground flex-1">{title}</DialogTitle>
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
