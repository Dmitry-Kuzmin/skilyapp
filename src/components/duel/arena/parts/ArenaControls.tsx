import React, { useState } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { DuelBoostsPanel } from '../../DuelBoostsPanel';
import { AttackPickerSheet, ATTACK_BOOST_TYPES } from '../../AttackPickerSheet';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface ArenaControlsProps {
    boosts: any[];
    usedBoosts: string[];
    isAnswered: boolean;
    translatePopoverOpen: string | null;
    onBoostUse: (boostId: string) => void;
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
    isTelegramMobile,
}) => {
    const [attackSheetOpen, setAttackSheetOpen] = useState(false);

    // Utility boosts — не атаки, показываются inline
    const utilityBoosts = boosts.filter(b => !ATTACK_BOOST_TYPES.has(b.boost_type));

    // Подсчёт доступных атак для бейджа
    const totalAttacks = boosts
        .filter(b => ATTACK_BOOST_TYPES.has(b.boost_type) && b.quantity > 0)
        .reduce((sum, b) => sum + b.quantity, 0);

    const hasAttacks = totalAttacks > 0;

    return (
        <>
            <div className={cn(
                'flex items-center gap-2',
                isTelegramMobile ? 'w-full justify-between' : 'justify-end',
            )}>
                {/* Utility boosts — inline pills */}
                {utilityBoosts.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <DuelBoostsPanel
                            boosts={utilityBoosts}
                            usedBoosts={usedBoosts}
                            isAnswered={isAnswered}
                            translatePopoverOpen={translatePopoverOpen}
                            onBoostUse={onBoostUse}
                            onTranslatePopoverChange={setTranslatePopoverOpen}
                        />
                    </div>
                )}

                {/* ⚡ Attack button */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        haptics.light();
                        setAttackSheetOpen(true);
                    }}
                    disabled={isAnswered}
                    className={cn(
                        'relative h-9 rounded-2xl flex items-center gap-1.5 px-3 border transition-all duration-200 shrink-0',
                        isAnswered
                            ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/10 text-white/30'
                            : hasAttacks
                                ? 'bg-indigo-600/90 border-indigo-400/50 text-white shadow-lg shadow-indigo-500/25 cursor-pointer'
                                : 'bg-white/8 border-white/15 text-white/50 cursor-pointer hover:bg-white/12',
                    )}
                >
                    <AnimatePresence mode="wait">
                        {hasAttacks ? (
                            <motion.span
                                key="zap-active"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="text-sm"
                            >
                                ⚡
                            </motion.span>
                        ) : (
                            <motion.span
                                key="zap-empty"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="text-sm opacity-50"
                            >
                                ⚡
                            </motion.span>
                        )}
                    </AnimatePresence>

                    <span className={cn(
                        'text-xs font-bold',
                        hasAttacks ? 'text-white' : 'text-white/40',
                    )}>
                        {hasAttacks ? 'Атака' : 'Атаки'}
                    </span>

                    {/* Count badge */}
                    {hasAttacks && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="h-5 min-w-5 px-1 rounded-full bg-white text-indigo-700 text-[10px] font-black flex items-center justify-center"
                        >
                            {totalAttacks}
                        </motion.span>
                    )}

                    {/* Ping dot when has attacks */}
                    {hasAttacks && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                        </span>
                    )}
                </motion.button>
            </div>

            <AttackPickerSheet
                isOpen={attackSheetOpen}
                onClose={() => setAttackSheetOpen(false)}
                boosts={boosts}
                usedBoosts={usedBoosts}
                isAnswered={isAnswered}
                onBoostUse={onBoostUse}
            />
        </>
    );
};
