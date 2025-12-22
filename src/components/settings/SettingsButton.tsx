/**
 * Settings Trigger Button
 * 
 * Кнопка для открытия UnifiedSettingsDrawer.
 * Использует Zustand — никаких пропсов не нужно.
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';

interface SettingsButtonProps {
    variant?: 'default' | 'ghost' | 'icon';
    className?: string;
    showLabel?: boolean;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
    variant = 'ghost',
    className,
    showLabel = false,
}) => {
    const openSettings = useSettingsStore((state) => state.openSettings);

    if (variant === 'icon') {
        return (
            <button
                onClick={() => openSettings()}
                className={cn(
                    'w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50',
                    'flex items-center justify-center',
                    'hover:bg-slate-700/50 hover:border-slate-600/50 transition-colors',
                    'text-slate-400 hover:text-slate-200',
                    className
                )}
            >
                <Settings className="w-5 h-5" />
            </button>
        );
    }

    return (
        <Button
            variant={variant}
            onClick={() => openSettings()}
            className={cn('gap-2', className)}
        >
            <Settings className="w-4 h-4" />
            {showLabel && <span>Настройки</span>}
        </Button>
    );
};

export default SettingsButton;
