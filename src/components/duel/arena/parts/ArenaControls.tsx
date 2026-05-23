import React, { useState } from 'react';
import { motion } from '@/components/optimized/Motion';
import { AttackPickerSheet, ATTACK_BOOST_TYPES } from '../../AttackPickerSheet';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface ArenaControlsProps {
    boosts: any[];
    usedBoosts: string[];
    isAnswered: boolean;
    translatePopoverOpen: string | null;
    onBoostUse: (boostId: string, lang?: 'ru' | 'en') => void;
    setTranslatePopoverOpen: (id: string | null) => void;
    isTelegramMobile: boolean;
}

export const ArenaControls: React.FC<ArenaControlsProps> = ({
    boosts,
    usedBoosts,
    isAnswered,
    translatePopoverOpen,
    onBoostUse,
    setTranslatePopoverOpen,
}) => {
    const [sheetOpen, setSheetOpen] = useState(false);

    // Total usable items in inventory
    const totalAvailable = boosts
        .filter(b => !usedBoosts.includes(b.boost_type) && b.quantity > 0)
        .reduce((sum, b) => sum + b.quantity, 0);

    const hasAttacks = boosts.some(
        b => ATTACK_BOOST_TYPES.has(b.boost_type) && b.quantity > 0 && !usedBoosts.includes(b.boost_type)
    );

    return (
        <>
            <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                    haptics.light();
                    setSheetOpen(true);
                }}
                disabled={isAnswered}
                className={cn(
                    'relative h-9 rounded-2xl flex items-center gap-1.5 px-3 border transition-all duration-200 shrink-0 select-none',
                    isAnswered
                        ? 'opacity-35 cursor-not-allowed bg-white/4 border-white/8 text-white/25'
                        : hasAttacks
                            ? 'cursor-pointer bg-indigo-600/85 border-indigo-400/40 text-white shadow-lg shadow-indigo-500/20'
                            : totalAvailable > 0
                                ? 'cursor-pointer bg-white/8 border-white/12 text-white/65'
                                : 'cursor-pointer bg-white/5 border-dashed border-white/10 text-white/35',
                )}
            >
                <span className="text-sm leading-none">⚡</span>
                <span className="text-xs font-bold leading-none">
                    {totalAvailable > 0 ? 'Арсенал' : 'Бусты'}
                </span>

                {totalAvailable > 0 && (
                    <span className="h-5 min-w-5 px-1 rounded-full bg-white/90 text-indigo-700 text-[10px] font-black flex items-center justify-center leading-none">
                        {totalAvailable}
                    </span>
                )}

                {/* Pulse dot — only when has attacks */}
                {hasAttacks && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-55" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                    </span>
                )}
            </motion.button>

            <AttackPickerSheet
                isOpen={sheetOpen}
                onClose={() => setSheetOpen(false)}
                boosts={boosts}
                usedBoosts={usedBoosts}
                isAnswered={isAnswered}
                onBoostUse={onBoostUse}
                translatePopoverOpen={translatePopoverOpen}
                onTranslatePopoverChange={setTranslatePopoverOpen}
            />
        </>
    );
};
