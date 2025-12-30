import React from 'react';
import { motion } from "@/components/optimized/Motion";
import { cn } from '@/lib/utils';

interface Option {
    id: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
}

interface SegmentedControlProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
    return (
        <div className={cn(
            "relative flex p-1 bg-muted/30 dark:bg-black/20 rounded-xl border border-border/50 backdrop-blur-sm",
            className
        )}>
            {/* Sliding Background */}
            <div className="absolute inset-1 flex pointer-events-none">
                <div
                    className="h-full rounded-lg transition-all duration-300 ease-out"
                    style={{
                        width: `${100 / options.length}%`,
                        transform: `translateX(${options.findIndex(opt => opt.id === value) * 100}%)`,
                    }}
                >
                    <div className="w-full h-full bg-white dark:bg-zinc-800 shadow-sm border border-black/5 dark:border-white/10 rounded-lg" />
                </div>
            </div>

            {options.map((option) => (
                <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    className={cn(
                        "relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold transition-colors duration-200",
                        value === option.id
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    );
}
