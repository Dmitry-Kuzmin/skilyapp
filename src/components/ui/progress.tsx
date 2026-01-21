import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps & { indicatorClassName?: string }>(
  ({ className, indicatorClassName, value = 0, max = 100, ...props }, ref) => {
    const progressValue = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
        {...props}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn("h-full bg-primary transition-all duration-300 ease-in-out rounded-full", indicatorClassName)}
          style={{
            width: `${progressValue}%`,
          }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
