import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const progressValue = Math.min(Math.max(value || 0, 0), 100);
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
      style={{ 
        // Переопределяем стили корневого элемента, чтобы избежать проблем с позиционированием
        position: 'relative',
      }}
    >
      <ProgressPrimitive.Indicator
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ 
          width: `${progressValue}%`,
          // Полностью переопределяем transform, чтобы избежать вертикального смещения
          transform: 'none !important',
          WebkitTransform: 'none !important',
          // Позиционирование
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          maxWidth: '100%',
        }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
