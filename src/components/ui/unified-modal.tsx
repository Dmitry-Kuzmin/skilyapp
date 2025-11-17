import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getModalConfig, type ModalType } from "@/lib/modal-config";

interface UnifiedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  type?: ModalType;
  hideCloseButton?: boolean;
  className?: string;
}

/**
 * Универсальный компонент модалки
 * - На мобильных устройствах (< 768px): открывается снизу как bottom sheet
 * - На десктопе: открывается по центру как dialog
 * - Единый стиль и поведение для всех модалок
 */
export function UnifiedModal({
  open,
  onOpenChange,
  children,
  type = 'default',
  hideCloseButton = false,
  className,
}: UnifiedModalProps) {
  const isMobile = useIsMobile();
  const config = getModalConfig(type);
  const sizeConfig = isMobile ? config.mobile : config.desktop;

  // На мобильных используем Sheet (bottom sheet)
  if (isMobile) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              // Базовые стили для bottom sheet
              "fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out",
              // Позиционирование снизу
              "inset-x-0 bottom-0",
              // Скругление сверху
              "rounded-t-[20px] sm:rounded-t-[24px]",
              // Отступы от краев экрана
              "mx-2 mb-2 sm:mx-3 sm:mb-3",
              // Высота и максимальная высота
              sizeConfig.height || "h-[90vh]",
              sizeConfig.maxHeight || "max-h-[90vh]",
              // Padding
              "p-4 sm:p-6",
              // Flexbox для контента
              "flex flex-col",
              // Overflow
              "overflow-hidden overflow-y-auto",
              // Анимации
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full",
              // Безопасная зона для iOS
              "pb-safe",
              className,
            )}
          >
            {/* Индикатор для свайпа (опционально) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            
            {children}
            
            {!hideCloseButton && (
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  // На десктопе используем Dialog (центрированный)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            // Базовые стили для dialog
            "fixed left-[50%] top-[50%] z-50 grid w-full gap-4 border bg-background p-6 shadow-lg duration-200",
            // Центрирование
            "translate-x-[-50%] translate-y-[-50%]",
            // Максимальная ширина
            sizeConfig.maxWidth || "max-w-lg",
            // Высота
            sizeConfig.height || "h-[85vh]",
            sizeConfig.maxHeight || "max-h-[85vh]",
            // Скругление
            "rounded-lg",
            // Анимации
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            // Overflow
            "overflow-hidden overflow-y-auto",
            className,
          )}
        >
          {children}
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Экспортируем также компоненты для совместимости
export const UnifiedModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
UnifiedModalHeader.displayName = "UnifiedModalHeader";

export const UnifiedModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)} {...props} />
);
UnifiedModalFooter.displayName = "UnifiedModalFooter";

export const UnifiedModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
UnifiedModalTitle.displayName = DialogPrimitive.Title.displayName;

export const UnifiedModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
UnifiedModalDescription.displayName = DialogPrimitive.Description.displayName;

