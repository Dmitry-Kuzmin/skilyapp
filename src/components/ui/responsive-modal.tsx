import * as React from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
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
  /** Right slot in mobile nav bar (e.g. info icon) */
  headerRight?: React.ReactNode;
  snapPoints?: (number | string)[];
  activeSnapPoint?: number | string | null;
  onSnapPointChange?: (snapPoint: number | string | null) => void;
  hideHandle?: boolean;
  fadeFromIndex?: number;
  fullscreen?: boolean;
  mobileFullscreen?: boolean;
  dismissible?: boolean;
}

/** Mobile: Vaul bottom-sheet with iOS-style nav bar. Desktop: centered Dialog. */
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
  headerRight,
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

  const showCloseBtn = !hideCloseButton && !preventClose;

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
        modal={!isExternalOverlay}
        shouldScaleBackground={false}
        repositionInputs={true}
      >
        <DrawerContent
          className={cn(
            "flex flex-col fixed left-0 right-0 z-[99999] outline-none",
            mobileFullscreen
              ? "inset-x-0 bottom-0 top-0 h-[100dvh] max-h-[100dvh] rounded-none"
              : "bottom-0 max-h-[100dvh] h-auto",
            className
          )}
          hideHandle={hideHandle}
          onInteractOutside={(e) => {
            if (document.body.classList.contains('tc-disable-scroll') || isExternalOverlay) {
              e.preventDefault();
              return;
            }
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

            {/* iOS-style nav bar: × | title | right-icon */}
            {(title || showCloseBtn) && (
              <div className="flex items-center shrink-0 px-3 pt-1 pb-2">
                {/* Left: close button or spacer */}
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  {showCloseBtn && (
                    <button
                      onClick={() => onOpenChange(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-foreground active:bg-white/20 transition-colors"
                      aria-label="Закрыть"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Center: title */}
                <DrawerTitle className={cn(
                  "flex-1 text-center px-1 leading-tight",
                  title ? "text-base font-semibold text-foreground" : "sr-only"
                )}>
                  {title ?? "Modal"}
                </DrawerTitle>
                {description && (
                  <DrawerDescription className="sr-only">{description}</DrawerDescription>
                )}

                {/* Right: optional icon or spacer */}
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  {headerRight}
                </div>
              </div>
            )}

            {/* Optional full-width section below nav bar */}
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
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-muted rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      ))}
    </div>
  );
}
