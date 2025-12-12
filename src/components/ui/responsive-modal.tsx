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
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  // На мобильных используем Drawer (Vaul) - нативное поведение Telegram
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className={cn(
            "bg-zinc-900 border-zinc-800 border-t-white/10",
            className
          )}
          onInteractOutside={(e) => {
            if (preventClose) {
              e.preventDefault();
            }
          }}
        >
          {title && (
            <DrawerHeader className={cn("text-left", contentClassName)}>
              <DrawerTitle className="text-zinc-200">{title}</DrawerTitle>
              {description && (
                <DrawerDescription className="text-zinc-400">
                  {description}
                </DrawerDescription>
              )}
            </DrawerHeader>
          )}
          <div className={cn("px-4 pb-4", contentClassName)}>
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // На десктопе используем Dialog (Radix UI) - центрированная модалка
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[425px] bg-zinc-900 border-zinc-800 border-white/10",
          className
        )}
        hideCloseButton={hideCloseButton}
        preventClose={preventClose}
      >
        {title && (
          <DialogHeader className={cn(contentClassName)}>
            <DialogTitle className="text-zinc-200">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-zinc-400">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        <div className={cn(contentClassName)}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
