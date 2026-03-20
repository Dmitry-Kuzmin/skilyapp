import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

type DrawerProps = React.ComponentProps<typeof DrawerPrimitive.Root> & {
  /** Включить scale эффект фона при открытии (default: false из-за проблем с layout в Telegram) */
  shouldScaleBackground?: boolean;
  /** 
   * Порог (0-1) как далеко нужно свайпнуть для закрытия
   * Default: 0.5 (50%)
   * Для Telegram лучше 0.25 (25%) для более чувствительного закрытия
   */
  dismissibleThreshold?: number;
}

const Drawer = ({
  shouldScaleBackground: _shouldScaleBackground, // Игнорируем пришедшее значение
  dismissibleThreshold = 0.25,
  children,
  ...props
}: DrawerProps) => (
  <DrawerPrimitive.Root
    {...props}
    shouldScaleBackground={false} // ВСЕГДА false — пользователь не хочет scale эффект
    dismissible={true}
    closeThreshold={dismissibleThreshold}
  >
    {children}
  </DrawerPrimitive.Root>
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all duration-300",
      className
    )}
    style={{
      willChange: "opacity, backdrop-filter",
    }}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  /** Скрыть ручку (handle) */
  hideHandle?: boolean;
}

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  DrawerContentProps
>(({ className, children, hideHandle = false, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex h-auto flex-col w-full",
        "rounded-t-[24px] border-t border-white/10",
        "bg-zinc-950",
        "shadow-[0_-8px_40px_rgba(0,0,0,0.5)]",
        className,
      )}
      {...props}
    >
      {/* Ручка (Handle) - индикатор свайпа */}
      {!hideHandle && (
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-muted-foreground/40 via-muted-foreground/60 to-muted-foreground/40 shadow-sm" />
        </div>
      )}
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 px-8 py-3 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4 pt-2", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
