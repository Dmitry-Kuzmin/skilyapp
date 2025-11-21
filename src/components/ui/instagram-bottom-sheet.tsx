import * as React from "react";
import { Drawer } from "vaul";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const DrawerPortal = Drawer.Portal;
const DrawerTitle = Drawer.Title;
const DrawerDescription = Drawer.Description;

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
  snapPoints = ['55%', '95%'],
  initialSnap = 0,
  className,
}: InstagramBottomSheetProps) {
  const isMobile = useIsMobile();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [snapIndex, setSnapIndex] = React.useState(initialSnap);
  const drawerRef = React.useRef<HTMLDivElement>(null);

  // Отладка
  React.useEffect(() => {
    console.log('[InstagramBottomSheet] open:', open, 'isMobile:', isMobile);
  }, [open, isMobile]);

  // Расширение при скролле
  React.useEffect(() => {
    if (!contentRef.current || snapIndex === snapPoints.length - 1 || !isMobile) return;
    
    const handleScroll = () => {
      const scrollTop = contentRef.current?.scrollTop || 0;
      // Если пользователь начал скроллить и модалка не развернута
      if (scrollTop > 10 && snapIndex === 0) {
        // Плавно расширяем до максимума
        setSnapIndex(1);
      }
    };
    
    const content = contentRef.current;
    content?.addEventListener('scroll', handleScroll, { passive: true });
    return () => content?.removeEventListener('scroll', handleScroll);
  }, [snapIndex, snapPoints.length, isMobile]);

  // Сброс snapIndex при закрытии
  React.useEffect(() => {
    if (!open) {
      setSnapIndex(initialSnap);
    }
  }, [open, initialSnap]);

  // На мобильных используем Vaul Drawer
  if (isMobile) {
    return (
      <Drawer.Root 
        open={open} 
        onOpenChange={onOpenChange} 
        snapPoints={snapPoints}
        activeSnapPoint={snapIndex}
        onSnapPointChange={(index) => {
          if (typeof index === 'number') {
            setSnapIndex(index);
          }
        }}
      >
        <DrawerPortal>
          <Drawer.Overlay className="fixed inset-0 z-[2147483647] bg-black/80" />
          <Drawer.Content
            ref={drawerRef}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[2147483647] mt-24 flex flex-col rounded-t-[20px] border-t bg-background",
              "focus:outline-none",
              className
            )}
          >
            {/* Индикатор для свайпа */}
            <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            
          {/* Скрытые элементы доступности для Radix */}
          <DrawerTitle className="sr-only">{title || "Модальное окно"}</DrawerTitle>
          <DrawerDescription className="sr-only">Содержимое модального окна</DrawerDescription>
          
            {/* Заголовок */}
            {title && (
              <div className="px-6 pt-4 pb-2 border-b shrink-0">
                <h2 className="text-xl font-bold">{title}</h2>
              </div>
            )}
            
            {/* Контент с скроллом */}
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto px-6 py-4 min-h-0"
            >
              {children}
            </div>
            
            {!hideCloseButton && (
              <Drawer.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Drawer.Close>
            )}
          </Drawer.Content>
        </DrawerPortal>
      </Drawer.Root>
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
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

