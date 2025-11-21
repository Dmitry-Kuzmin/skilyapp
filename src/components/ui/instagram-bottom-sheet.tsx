import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface InstagramBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  hideCloseButton?: boolean;
  snapPoints?: string[];
  initialSnap?: number;
  className?: string;
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
export function InstagramBottomSheet({
  open,
  onOpenChange,
  children,
  title,
  hideCloseButton = false,
  snapPoints = ['60vh', '92vh'],
  initialSnap = 0,
  className,
}: InstagramBottomSheetProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = React.useState(() => initialSnap > 0);

  const collapsedHeight = snapPoints[0] ?? '60vh';
  const expandedHeight = snapPoints[1] ?? '92vh';

  // Плавно расширяем лист один раз после открытия, без отслеживания скролла
  React.useEffect(() => {
    if (!open) {
      setIsExpanded(initialSnap > 0);
      return;
    }

    setIsExpanded(initialSnap > 0);
    const timer = window.setTimeout(() => setIsExpanded(true), 80);
    return () => window.clearTimeout(timer);
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
            transform: `translateY(${isExpanded ? '0px' : '12px'})`,
            maxHeight: expandedHeight,
            transition: "height 0.26s ease-out, transform 0.26s ease-out",
          }}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {title && (
            <div className="px-6 pb-3 border-b border-border/50">
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
          )}

          <div
            className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none"
          >
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // На десктопе используем обычный Dialog (центрированный)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn("max-w-4xl max-h-[90vh]", className)}
        autoAccessibility={false}
      >
        <DialogHeader>
          <DialogTitle className={title ? undefined : "sr-only"}>
            {title || "Модальное окно"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Содержимое модального окна
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-none">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

