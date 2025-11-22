import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-200 data-[state=closed]:duration-150",
      className,
    )}
    style={{
      willChange: "opacity",
    }}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-250",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  hideCloseButton?: boolean;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "bottom", className, children, hideCloseButton = false, ...props }, ref) => {
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [startY, setStartY] = React.useState<number | null>(null);
    const [currentY, setCurrentY] = React.useState<number | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    // Объединяем refs
    React.useImperativeHandle(ref, () => contentRef.current as any);

    // Обработка свайпа для закрытия (только для bottom sheet)
    const handleTouchStart = (e: React.TouchEvent) => {
      if (side !== "bottom") return;
      // Проверяем, что свайп начинается от верха sheet (включая индикатор свайпа)
      const touchY = e.touches[0].clientY;
      const rect = contentRef.current?.getBoundingClientRect();
      if (rect && touchY - rect.top < 80) { // Увеличиваем зону до 80px для лучшего UX
        setStartY(touchY);
        setIsDragging(true);
        // Предотвращаем скролл при начале свайпа
        if (contentRef.current) {
          contentRef.current.style.touchAction = 'pan-y';
        }
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (side !== "bottom" || startY === null || !isDragging) return;
      
      const currentYPos = e.touches[0].clientY;
      const diff = currentYPos - startY;
      
      // Разрешаем свайп только вниз
      if (diff > 0 && contentRef.current) {
        e.preventDefault(); // Предотвращаем скролл страницы только при свайпе вниз
        setCurrentY(diff);
        contentRef.current.style.transform = `translateY(${Math.min(diff, 400)}px)`;
        contentRef.current.style.transition = 'none';
        // Затемняем overlay при свайпе
        const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
        if (overlay) {
          const opacity = Math.max(0, 0.8 - (diff / 400) * 0.8);
          overlay.style.opacity = opacity.toString();
        }
      }
    };

    const handleTouchEnd = () => {
      if (side !== "bottom" || startY === null || !isDragging) return;
      
      if (contentRef.current) {
        const threshold = 80; // Порог для закрытия
        
        if (currentY && currentY > threshold) {
          // Закрываем sheet через onOpenChange из props
          // Radix UI автоматически обработает это через Sheet.Root
          if (props.onOpenChange) {
            props.onOpenChange(false);
          }
        } else {
          // Возвращаем на место с анимацией
          contentRef.current.style.transform = '';
          contentRef.current.style.transition = 'transform 0.3s ease-out';
          const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
          if (overlay) {
            overlay.style.opacity = '0.8';
            overlay.style.transition = 'opacity 0.3s ease-out';
          }
        }
        
        // Восстанавливаем touchAction
        contentRef.current.style.touchAction = '';
      }
      
      setStartY(null);
      setCurrentY(null);
      setIsDragging(false);
    };

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content 
          ref={contentRef}
          className={cn(sheetVariants({ side }), className)} 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            ...props.style,
            // GPU ускорение для плавных анимаций
            willChange: "transform",
          }}
          {...props}
        >
          {/* Скрытые элементы доступности для Radix */}
          <SheetPrimitive.Title className="sr-only">Модальное окно</SheetPrimitive.Title>
          <SheetPrimitive.Description className="sr-only">Содержимое модального окна</SheetPrimitive.Description>

          {/* Индикатор для свайпа вниз (только для bottom sheet) */}
          {side === "bottom" && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/40 rounded-full z-10" />
          )}
          {children}
          {!hideCloseButton && (
            <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
