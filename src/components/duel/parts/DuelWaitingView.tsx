import { DuelWaitingReplay } from '../DuelWaitingReplay';
import { DuelPlayer, DuelResultSnapshot } from '@/features/duel/shared';

interface DuelWaitingViewProps {
    isWaitingForOpponent: boolean;
    hasFinishedMyQuestions: boolean;
    isWaitingHidden: boolean;
    setIsWaitingHidden: (hidden: boolean) => void;
    duelId: string;
    duelCode?: string;
    profileId: string | null;
    myScore: number;
    opponentScore: number;
    questionsLength: number;
    myName: string;
    opponentName: string;
    onDuelFinished: (snapshot?: DuelResultSnapshot) => void;
    onWidgetExpand?: () => void;
    onHide?: () => void;
    activeDuel: any;
    saveActiveDuel: (state: any) => void;
    updateActiveDuel: (state: any) => void;
}

export function DuelWaitingView({
    isWaitingForOpponent,
    hasFinishedMyQuestions,
    isWaitingHidden,
    setIsWaitingHidden,
    duelId,
    duelCode,
    profileId,
    myScore,
    opponentScore,
    questionsLength,
    myName,
    opponentName,
    onDuelFinished,
    onWidgetExpand,
    onHide,
    activeDuel,
    saveActiveDuel,
    updateActiveDuel
}: DuelWaitingViewProps) {

    // КРИТИЧНО: Экран ожидания показываем ТОЛЬКО если мы реально ответили на все вопросы
    if (isWaitingForOpponent && hasFinishedMyQuestions) {
        return (
            <DuelWaitingReplay
                duelId={duelId}
                myScore={myScore}
                totalQuestions={questionsLength}
                onDuelFinished={onDuelFinished}
                onExpand={() => {
                    // When widget expands, restore battle view
                    setIsWaitingHidden(false);
                    // Notify parent to restore battle mode
                    if (onWidgetExpand) {
                        onWidgetExpand();
                    }
                }}
                onHide={(hidden) => {
                    setIsWaitingHidden(hidden);
                    if (hidden) {
                        // Сохраняем состояние при сворачивании на экране ожидания
                        if (duelId && duelCode && profileId && questionsLength > 0) {
                            const stateToSave = {
                                duelId,
                                duelCode,
                                mode: 'waiting' as const,
                                currentIndex: undefined, // Не сохраняем currentIndex в режиме ожидания
                                myScore,
                                opponentScore,
                                totalQuestions: questionsLength,
                                myName,
                                opponentName,
                            };

                            // Используем saveActiveDuel если activeDuel еще не существует, иначе updateActiveDuel
                            if (activeDuel) {
                                updateActiveDuel(stateToSave);
                            } else {
                                saveActiveDuel(stateToSave);
                            }
                        }
                        // Notify parent that game is hidden - parent will show menu
                        if (onHide) {
                            onHide();
                        }
                    } else {
                        // Game is expanded again - reset state
                        setIsWaitingHidden(false);
                    }
                }}
            />
        );
    }

    // If waiting is hidden but we're not waiting for opponent (shouldn't happen)
    // Return null so parent can show menu
    if (isWaitingHidden) {
        return null;
    }

    return null;
}
