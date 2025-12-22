/**
 * CyberSwitch - Улучшенный переключатель
 * 
 * С haptic feedback
 */

import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface CyberSwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export const CyberSwitch: React.FC<CyberSwitchProps> = ({
    checked,
    onCheckedChange,
    disabled = false,
    className,
}) => {
    const handleChange = (value: boolean) => {
        triggerHaptic('medium');
        onCheckedChange(value);
    };

    return (
        <SwitchPrimitive.Root
            checked={checked}
            onCheckedChange={handleChange}
            disabled={disabled}
            className={cn(
                "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
                "border-2 transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                checked
                    ? "bg-indigo-500 border-indigo-500"
                    : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600",
                className
            )}
        >
            <SwitchPrimitive.Thumb
                className={cn(
                    "pointer-events-none block h-4 w-4 rounded-full transition-all duration-200",
                    "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-1",
                    checked
                        ? "bg-white shadow-md"
                        : "bg-white dark:bg-slate-300"
                )}
            />
        </SwitchPrimitive.Root>
    );
};

export default CyberSwitch;
