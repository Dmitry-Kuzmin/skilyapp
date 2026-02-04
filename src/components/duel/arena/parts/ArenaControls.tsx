import React from 'react';
import { DuelBoostsPanel } from '../../DuelBoostsPanel';

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
    isTelegramMobile
}) => {
    return (
        <div className={`flex items-center gap-1.5 ${isTelegramMobile ? 'w-full justify-center' : ''}`}>
            <DuelBoostsPanel
                boosts={boosts}
                usedBoosts={usedBoosts}
                isAnswered={isAnswered}
                translatePopoverOpen={translatePopoverOpen}
                onBoostUse={onBoostUse}
                onTranslatePopoverChange={setTranslatePopoverOpen}
            />
        </div>
    );
};
