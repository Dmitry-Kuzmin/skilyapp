/**
 * CyberSlider - Улучшенный слайдер
 * 
 * С прямоугольным бегунком и haptic feedback
 */

import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { sliderHaptic } from '@/lib/haptics';

interface CyberSliderProps {
    value: number;
    onValueChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    className?: string;
    label?: string;
}

export const CyberSlider: React.FC<CyberSliderProps> = ({
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 5,
    disabled = false,
    className,
    label = 'Громкость',
}) => {
    const handleChange = (values: number[]) => {
        sliderHaptic();
        onValueChange(values[0]);
    };

    return (
        <div className={cn("space-y-3", className)}>
            {/* Label with value */}
            <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">
                    {value}%
                </span>
            </div>

            <SliderPrimitive.Root
                value={[value]}
                onValueChange={handleChange}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                className="relative flex w-full touch-none select-none items-center"
            >
                {/* Track */}
                <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    {/* Range (filled part) */}
                    <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-indigo-500 to-indigo-400" />
                </SliderPrimitive.Track>

                {/* Thumb */}
                <SliderPrimitive.Thumb
                    className={cn(
                        "block h-5 w-5 rounded-full border-2",
                        "bg-white dark:bg-slate-100",
                        "border-indigo-500",
                        "shadow-md",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
                        "disabled:pointer-events-none disabled:opacity-50",
                        "transition-all hover:scale-110"
                    )}
                />
            </SliderPrimitive.Root>
        </div>
    );
};

export default CyberSlider;
