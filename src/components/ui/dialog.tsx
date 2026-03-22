import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getModalConfig, type ModalType } from "@/lib/modal-config";

const Dialog = ({ modal = true, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) => (
  <DialogPrimitive.Root modal={modal} {...props} />
);

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
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-300 data-[state=closed]:duration-200",
      className,
    )}
    style={{
      willChange: "opacity, backdrop-filter",
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
>(({ className, children, hideCloseButton = false, modalType = 'default', autoAccessibility = true, fullscreen = false, preventClose = false, onInteractOutside, ...props }, ref) => {
  const isMobile = useIsMobile();
  const config = getModalConfig(modalType);
  // Используем приведение типа, чтобы избежать проблем с отсутствующим maxWidth на мобильных
  const sizeConfig = (isMobile ? config.mobile : config.desktop) as { maxWidth?: string; maxHeight?: string };

  const handleInteractOutside = (e: any) => {
    // Если TonConnect модал открыт — он добавляет 'tc-disable-scroll' к body или имеет специфичные классы
    const hasTonClass = document.body.classList.contains('tc-disable-scroll') || 
                       document.querySelector('.tc-modal-overlay') ||
                       document.querySelector('.tonconnect-modal-container');

    if (hasTonClass) {
      e.preventDefault();
      return;
    }

    const path = e.composedPath();
    // СВЕРХнадежная проверка (Учитывает SVG-иконки и теневые узлы)
    const isExternalPortal = path.some((el: any) => {
      if (!el || !el.tagName) return false;
      
      const tagName = (el.tagName || '').toLowerCase();
      const id = typeof el.id === 'string' ? el.id.toLowerCase() : '';
      
      let className = '';
      if (typeof el.className === 'string') {
        className = el.className.toLowerCase();
      } else if (el.className && typeof el.className.baseVal === 'string') {
        className = el.className.baseVal.toLowerCase();
      }
      
      const elString = `${tagName} ${id} ${className}`;
      
      return (
        elString.includes('tc-') || 
        elString.includes('ton-') ||
        elString.includes('tonconnect') ||
        elString.includes('appkit') ||
        elString.includes('sonner') ||
        elString.includes('portal') ||
        elString.includes('modal') ||
        elString.includes('go') // CSS-in-JS классы
      );
    });
    
    if (isExternalPortal) {
      e.preventDefault();
      return;
    }
    if (preventClose) {
      e.preventDefault();
    }
    onInteractOutside?.(e);
  };

  // Полноэкранный режим
  if (fullscreen) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed inset-0 z-[100000] w-full h-full max-w-none max-h-none p-0 flex flex-col rounded-none border-none bg-background",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className,
          )}
          onInteractOutside={handleInteractOutside}
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
            "fixed z-[100000] gap-4 bg-background shadow-lg transition ease-in-out",
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
          onInteractOutside={handleInteractOutside}
          {...props}
        >
          {/* Индикатор для свайпа */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/30 rounded-full z-10" />

          {/* КРИТИЧНО: Автоматически добавляем скрытые элементы доступности КАК ПРЯМЫХ ПОТОМКОВ
              Radix UI требует, чтобы DialogTitle и DialogDescription были прямыми потомками DialogContent */}
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
          // Базовые стили для dialog (премиум стиль)
          "fixed left-[50%] top-[50%] z-50 grid w-full gap-4 p-6 duration-200 translate-x-[-50%] translate-y-[-50%] pointer-events-auto",
          "bg-background border border-border shadow-[0_30px_90px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_30px_90px_-20px_rgba(0,0,0,1)]",
          // Максимальная ширина
          sizeConfig.maxWidth || "max-w-lg",
          // Максимальная высота
          sizeConfig.maxHeight || "max-h-[88vh]",
          // Скругление (Ультра-Премиум)
          "rounded-[3rem]",
          // Анимации
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[50%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[50%]",
          // Overflow
          "overflow-hidden overflow-y-auto",
          className,
        )}
        onInteractOutside={handleInteractOutside}
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
        {/* КРИТИЧНО: Автоматически добавляем скрытые элементы доступности КАК ПРЯМЫХ ПОТОМКОВ
          Radix UI требует, чтобы DialogTitle и DialogDescription были прямыми потомками DialogContent
          Даже если они есть в children внутри DialogHeader, Radix их не видит */}
        {autoAccessibility && (
          <>
            <DialogPrimitive.Title className="sr-only">Диалоговое окно</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Содержимое диалогового окна</DialogPrimitive.Description>
          </>
        )}

        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            className="absolute right-6 top-6 z-50 flex items-center justify-center h-10 w-10 bg-white/5 border border-white/10 rounded-full text-zinc-400 opacity-60 transition-all duration-300 hover:opacity-100 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95 shadow-[0_4px_15px_rgba(0,0,0,0.3)] group backdrop-blur-md focus:outline-none"
            aria-label="Закрыть модальное окно"
          >
            <X className="h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
            <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/20 transition-all duration-300 scale-125 group-hover:scale-100" />
            <span className="sr-only">Закрыть</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left select-none", className)} {...props} />
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
    className={cn("text-lg font-semibold leading-none tracking-tight text-foreground select-none", className)}
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
