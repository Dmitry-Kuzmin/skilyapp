import { useMemo } from 'react';

// Helper utilities
const duelRiskMultiplierPreview = (betAmount: number) => {
    if (!betAmount || betAmount <= 0) return 1;
    if (betAmount >= 600) return 4;
    if (betAmount >= 450) return 3;
    if (betAmount >= 300) return 2.25;
    if (betAmount >= 200) return 1.75;
    if (betAmount >= 100) return 1.25;
    return 1.1;
};

const getSeasonBonusDisplay = (betAmount: number) => {
    return betAmount > 0 ? Math.round(20 * duelRiskMultiplierPreview(betAmount)) : 30;
};

export function useDuelBetting(betInfo: any) {
    const myInsuranceActive = useMemo(() =>
        betInfo ? (betInfo.isHost ? betInfo.hostInsurance : betInfo.opponentInsurance) : false,
        [betInfo]
    );

    const myCoverageDisplay = useMemo(() =>
        betInfo ? Math.round(((betInfo.isHost ? betInfo.coverageHost : betInfo.coverageOpponent) || 0) * 100) : 0,
        [betInfo]
    );

    const opponentInsuranceActive = useMemo(() =>
        betInfo ? (betInfo.isHost ? betInfo.opponentInsurance : betInfo.hostInsurance) : false,
        [betInfo]
    );

    const opponentCoverageDisplay = useMemo(() =>
        betInfo ? Math.round(((betInfo.isHost ? betInfo.coverageOpponent : betInfo.coverageHost) || 0) * 100) : 0,
        [betInfo]
    );

    const seasonBonusDisplay = useMemo(() =>
        betInfo ? getSeasonBonusDisplay(betInfo.betAmount) : 0,
        [betInfo]
    );

    return {
        myInsuranceActive,
        myCoverageDisplay,
        opponentInsuranceActive,
        opponentCoverageDisplay,
        seasonBonusDisplay
    };
}
