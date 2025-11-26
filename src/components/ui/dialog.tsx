import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getModalConfig, type ModalType } from "@/lib/modal-config";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[2147483645] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-200 data-[state=closed]:duration-150",
      className,
    )}
    style={{
      willChange: "opacity",
    }}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
  modalType?: ModalType;
  // Автоматически добавлять скрытые элементы доступности, если они не предоставлены
  autoAccessibility?: boolean;
  fullscreen?: boolean; // Полноэкранный режим
  preventClose?: boolean; // Предотвратить закрытие при клике вне окна и ESC
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideCloseButton = false, modalType = 'default', autoAccessibility = true, fullscreen = false, preventClose = false, ...props }, ref) => {
  const isMobile = useIsMobile();
  const config = getModalConfig(modalType);
  const sizeConfig = isMobile ? config.mobile : config.desktop;

  // Полноэкранный режим
  if (fullscreen) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed inset-0 z-[2147483646] w-full h-full max-w-none max-h-none p-0 flex flex-col rounded-none border-none bg-background",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className,
          )}
          {...props}
        >
          {autoAccessibility && (
            <>
              <DialogPrimitive.Title className="sr-only">Диалоговое окно</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Содержимое диалогового окна</DialogPrimitive.Description>
            </>
          )}
          {children}
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }

  // На мобильных используем bottom sheet стиль
  if (isMobile) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            // Базовые стили для bottom sheet
            "fixed z-[2147483646] gap-4 bg-background shadow-lg transition ease-in-out",
            // Позиционирование снизу без отступов
            "inset-x-0 bottom-0",
            // Скругление сверху
            "rounded-t-[20px]",
            // Максимальная высота
            sizeConfig.maxHeight || "max-h-[90vh]",
            // Padding
            "p-4",
            // Flexbox для контента
            "flex flex-col",
            // Overflow
            "overflow-hidden overflow-y-auto",
            // Анимации для bottom sheet
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full",
            // Безопасная зона для iOS
            "pb-safe",
            className,
          )}
          {...props}
        >
          {/* Индикатор для свайпа */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/30 rounded-full z-10" />
          
          {/* Автоматически добавляем скрытые элементы доступности */}
          {autoAccessibility && (
            <>
              <DialogPrimitive.Title className="sr-only">Диалоговое окно</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Содержимое диалогового окна</DialogPrimitive.Description>
            </>
          )}
          
          {children}
          
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }

  // На десктопе используем центрированный dialog (БЕЗ ИЗМЕНЕНИЙ - работает как было)
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Базовые стили для dialog
          "fixed left-[50%] top-[50%] z-[2147483646] grid w-full gap-4 border border-white/10 dark:border-white/6 bg-background/95 supports-[backdrop-filter]:backdrop-blur-2xl p-6 shadow-[0_35px_90px_rgba(2,6,23,0.65)] duration-200",
          // Центрирование
          "translate-x-[-50%] translate-y-[-50%]",
          // Максимальная ширина
          sizeConfig.maxWidth || "max-w-lg",
          // Максимальная высота
          sizeConfig.maxHeight || "max-h-[88vh]",
          // Скругление
          "rounded-lg",
          // Анимации (как было)
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          // Overflow
          "overflow-hidden overflow-y-auto",
          className,
        )}
        onInteractOutside={(e) => {
          // Предотвращаем закрытие при клике вне окна, если preventClose === true
          if (preventClose) {
            e.preventDefault();
          }
          // Вызываем оригинальный обработчик, если он был передан
          props.onInteractOutside?.(e);
        }}
        onEscapeKeyDown={(e) => {
          // Предотвращаем закрытие при ESC, если preventClose === true
          if (preventClose) {
            e.preventDefault();
          }
          // Вызываем оригинальный обработчик, если он был передан
          props.onEscapeKeyDown?.(e);
        }}
        {...props}
      >
        {/* Автоматически добавляем скрытые элементы доступности */}
        {autoAccessibility && (
          <>
            <DialogPrimitive.Title className="sr-only">Диалоговое окно</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Содержимое диалогового окна</DialogPrimitive.Description>
          </>
        )}
        
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close 
            className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent/30"
            aria-label="Закрыть модальное окно"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Закрыть</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
