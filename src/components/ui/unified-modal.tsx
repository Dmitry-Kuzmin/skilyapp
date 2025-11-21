import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ModalSkeleton, type ModalSkeletonVariant } from "@/components/ui/modal-skeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
}

/**
 * Instagram-подобная модалка с bottom sheet поведением
 * 
 * Особенности:
 * - На мобильных: открывается снизу с начальной высотой 55%, расширяется до 95% при скролле
 * - На десктопе: центрированная модалка
 * - Поддержка свайпа для закрытия (через Vaul)
 * - Плавное расширение при скролле контента
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
}: UnifiedModalProps) {
  const isMobile = useIsMobile();
  const renderContent = loading
    ? skeleton ?? <ModalSkeleton variant={skeletonVariant} />
    : children;
  const [isExpanded, setIsExpanded] = React.useState(() => initialSnap > 0);
  const rafRef = React.useRef<number>();

  const collapsedHeight = snapPoints[0] ?? '60vh';
  const expandedHeight = snapPoints[1] ?? '92vh';

  // Плавно расширяем лист один раз после открытия, без отслеживания скролла
  React.useEffect(() => {
    if (!open) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setIsExpanded(initialSnap > 0);
      return;
    }

    setIsExpanded(initialSnap > 0);
    rafRef.current = window.requestAnimationFrame(() => setIsExpanded(true));
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, initialSnap]);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
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
            transition: "height 0.26s ease-out, transform 0.26s ease-out",
          }}
        >
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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

