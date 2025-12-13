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
}

/**
 * ResponsiveModal - Умный компонент, который автоматически выбирает Dialog или Drawer
 * 
 * - На десктопе (>= 768px): Dialog (центрированная модалка)
 * - На мобильных (< 768px): Drawer (шторка снизу с нативным поведением iOS)
 * 
 * Использует shadcn/ui Dialog (Radix UI) и Vaul Drawer для максимальной производительности
 * и нативного UX в Telegram Mini App.
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
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  // На мобильных используем Drawer (Vaul) - нативное поведение Telegram
  if (isMobile) {
    return (
      <Drawer 
        open={open} 
        onOpenChange={onOpenChange}
        dismissible={!preventClose}
      >
        <DrawerContent
          className={cn(
            "bg-zinc-900 border-zinc-800 border-t-white/10 flex flex-col max-h-[90vh]",
            className
          )}
          onInteractOutside={(e) => {
            if (preventClose) {
              e.preventDefault();
            }
          }}
        >
          {headerContent ? (
            <div className="shrink-0">
              {headerContent}
            </div>
          ) : title ? (
            <DrawerHeader className={cn("text-left shrink-0", contentClassName)}>
              <DrawerTitle className="text-zinc-200">{title}</DrawerTitle>
              {description && (
                <DrawerDescription className="text-zinc-400">
                  {description}
                </DrawerDescription>
              )}
            </DrawerHeader>
          ) : null}
          <div 
            className={cn(
              "px-4 md:px-6 pb-6 flex-1 overflow-y-auto min-h-0 scrollbar-none",
              contentClassName
            )}
            data-scrollable
            data-vaul-no-drag
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // На десктопе используем Dialog (Radix UI) - центрированная модалка
  // Проверяем, есть ли в className max-w, чтобы не переопределять переданную ширину
  const hasMaxWidth = className?.includes('max-w');
  const defaultMaxWidth = hasMaxWidth ? '' : 'sm:max-w-[425px]';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          defaultMaxWidth,
          "bg-zinc-900 border-zinc-800 border-white/10 flex flex-col max-h-[90vh] p-0",
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
          <DialogHeader className={cn("shrink-0 px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4", contentClassName)}>
            <DialogTitle className="text-zinc-200">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-zinc-400">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        ) : null}
        <div 
          className={cn(
            "flex-1 overflow-y-auto min-h-0 px-4 md:px-6 pb-4 md:pb-6",
            contentClassName
          )}
          data-scrollable
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
