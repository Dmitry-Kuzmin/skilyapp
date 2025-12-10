import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  hideCloseButton?: boolean;
  preventClose?: boolean;
  zIndex?: number;
}

/**
 * ResponsiveModal - универсальная модалка с автоматическим переключением между Dialog и Drawer
 * 
 * - На десктопе (≥768px): Dialog (центрированный, как в Instagram)
 * - На мобильных (<768px): Drawer (bottom sheet с Vaul, как в iOS)
 * 
 * Использует Shadcn/UI компоненты:
 * - Dialog (Radix UI) для десктопа
 * - Drawer (Vaul) для мобильных
 */
export function ResponsiveModal({
  children,
  trigger,
  open,
  onOpenChange,
  title,
  description,
  className,
  contentClassName,
  hideCloseButton = false,
  preventClose = false,
  zIndex,
}: ResponsiveModalProps) {
  // Определяем десктоп через медиа-запрос (как в Instagram)
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Десктопная версия - Dialog (Radix UI)
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent
          className={cn(
            "sm:max-w-[425px] border-white/10 bg-background text-foreground max-h-[90vh] overflow-hidden flex flex-col",
            className
          )}
          style={{ zIndex }}
          onInteractOutside={(e) => {
            if (preventClose) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (preventClose) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            if (preventClose) {
              e.preventDefault();
            }
          }}
        >
          {title && (
            <DialogHeader className="shrink-0">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          <div className={cn("flex-1 overflow-y-auto px-4 md:px-6 py-4", contentClassName)}>
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Мобильная версия - Drawer (Vaul)
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent
        className={cn(
          "border-t-border bg-background text-foreground max-h-[96vh] flex flex-col",
          className
        )}
        style={{ zIndex }}
        onInteractOutside={(e) => {
          if (preventClose) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (preventClose) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (preventClose) {
            e.preventDefault();
          }
        }}
      >
        {title && (
          <DrawerHeader className="text-left shrink-0">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
        )}
        <div className={cn("flex-1 overflow-y-auto px-4 pb-8", contentClassName)}>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

