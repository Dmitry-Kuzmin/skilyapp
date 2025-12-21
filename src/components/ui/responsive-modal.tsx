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
}

/**
 * 🏆 GOLD STANDARD - ResponsiveModal с Vaul
 * 
 * - Mobile: Vaul Drawer с нативной физикой iOS (drag & dismiss, snap points)
 * - Desktop: Dialog (центрированная модалка)
 * 
 * Особенности Vaul:
 * - Физика пружины при drag
 * - Snap points для частичного открытия
 * - Scale эффект для фона
 * - Инерция при свайпе
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
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  // На мобильных используем Vaul Drawer с нативной физикой
  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible={!preventClose}
        snapPoints={snapPoints}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={onSnapPointChange}
        fadeFromIndex={fadeFromIndex}
        modal={true}
      >
        <DrawerContent
          className={cn(
            "flex flex-col",
            snapPoints ? "max-h-[100dvh]" : "max-h-[92dvh]",
            className
          )}
          hideHandle={hideHandle || !!headerContent}
          onInteractOutside={(e) => {
            if (preventClose) {
              e.preventDefault();
            }
          }}
        >
          {/* Кастомный header */}
          {headerContent ? (
            <div className="shrink-0">
              {headerContent}
            </div>
          ) : title ? (
            <DrawerHeader className={cn("text-left shrink-0 border-b border-border/30 pb-3", contentClassName)}>
              <DrawerTitle className="text-foreground">{title}</DrawerTitle>
              {description && (
                <DrawerDescription className="text-muted-foreground">
                  {description}
                </DrawerDescription>
              )}
            </DrawerHeader>
          ) : null}

          {/* Scrollable content */}
          <div
            className={cn(
              "flex-1 overflow-y-auto min-h-0 overscroll-contain",
              contentClassName
            )}
            data-scrollable
            data-vaul-no-drag
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog
  const hasMaxWidth = className?.includes('max-w');
  const defaultMaxWidth = hasMaxWidth ? '' : 'sm:max-w-[500px]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          defaultMaxWidth,
          "bg-background/95 backdrop-blur-xl border-border/50",
          "flex flex-col max-h-[90vh] p-0",
          "shadow-[0_8px_40px_rgba(0,0,0,0.2)]",
          className
        )}
        hideCloseButton={hideCloseButton}
        preventClose={preventClose}
      >
        {headerContent ? (
          <div className="shrink-0 relative">
            {headerContent}
          </div>
        ) : title ? (
          <DialogHeader className={cn("shrink-0 px-5 pt-5 pb-4 border-b border-border/30", contentClassName)}>
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
