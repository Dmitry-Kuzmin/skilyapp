import { useState } from 'react';

interface UseRussiaExamModeProps {
    isEnabled: boolean;
}

/**
 * Хук для управления логикой РФ экзамена
 * 
 * Логика:
 * - Штрафные блоки при ошибках
 * - Дополнительные вопросы
 * - Модалки уведомлений о штрафах
 * 
 * Примечание: основная логика РФ экзамена находится в examStore
 * Этот хук управляет только UI state (модалки, уведомления)
 */
export const useRussiaExamMode = ({ isEnabled }: UseRussiaExamModeProps) => {
    const [showPenaltyAlert, setShowPenaltyAlert] = useState(false);
    const [penaltyBlock, setPenaltyBlock] = useState<number | null>(null);
    const [showFailureModal, setShowFailureModal] = useState(false);
    const [failureReason, setFailureReason] = useState<string>('');

    const triggerPenaltyAlert = (blockNumber: number) => {
        if (!isEnabled) return;

        setPenaltyBlock(blockNumber);
        setShowPenaltyAlert(true);
    };

    const closePenaltyAlert = () => {
        setShowPenaltyAlert(false);
        setPenaltyBlock(null);
    };

    const triggerFailure = (reason: string) => {
        if (!isEnabled) return;

        setFailureReason(reason);
        setShowFailureModal(true);
    };

    const closeFailureModal = () => {
        setShowFailureModal(false);
        setFailureReason('');
    };

    return {
        showPenaltyAlert,
        setShowPenaltyAlert,
        penaltyBlock,
        setPenaltyBlock,
        showFailureModal,
        setShowFailureModal,
        failureReason,
        setFailureReason,
        triggerPenaltyAlert,
        closePenaltyAlert,
        triggerFailure,
        closeFailureModal
    };
};
