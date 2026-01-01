import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  additionalRightElement?: React.ReactNode;
  variant?: 'default' | 'transparent';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, rightElement, additionalRightElement, variant = 'default', ...props }, ref) => {
    const isTransparent = variant === 'transparent';

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-zinc-400 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none ${isTransparent ? 'text-zinc-500' : 'text-zinc-500 group-focus-within:text-white'
              }`}>
              {icon}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            inputMode={type === 'email' ? 'email' : 'text'}
            className={cn(
              "w-full rounded-2xl h-12 transition-all duration-300 ease-out disabled:opacity-100 disabled:cursor-text text-[16px]",
              icon ? 'pl-11' : 'pl-4',
              rightElement || additionalRightElement ? 'pr-20' : 'pr-4',
              isTransparent
                ? 'bg-transparent border-transparent text-zinc-400 placeholder-transparent focus:ring-0 px-0 pl-0'
                : cn(
                  "bg-white/[0.03] text-white placeholder-zinc-600 border border-white/10",
                  "focus:outline-none focus:bg-zinc-900/50 focus:border-blue-500/50",
                  "focus:shadow-[0_0_20px_rgba(59,130,246,0.15)] disabled:opacity-50",
                  error && 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                ),
              className
            )}
            {...props}
          />

          {(rightElement || additionalRightElement) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
              {rightElement}
              {additionalRightElement}
            </div>
          )}

          {/* Animated Border Glow for Focus */}
          {!isTransparent && !error && (
            <div className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-100 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 blur-md -z-10" />
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400 ml-1 animate-in slide-in-from-top-1 font-medium">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
