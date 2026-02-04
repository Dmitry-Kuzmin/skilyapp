import { useState, useRef } from 'react';

export function useDuelLocalState() {
    // Game Flow UI States
    const [duelCode, setDuelCode] = useState<string | null>(null);
    const [isWaitingHidden, setIsWaitingHidden] = useState(false);
    const [showSurrenderModal, setShowSurrenderModal] = useState(false);

    // Data States (Local copies or fetched data not in store)
    const [boosts, setBoosts] = useState<any[]>([]);

    // UI Overlays & Feedback States
    const [toastNotifications, setToastNotifications] = useState<Array<{
        id: string;
        title: string;
        message: string;
        icon?: string;
    }>>([]);

    const [translatePopoverOpen, setTranslatePopoverOpen] = useState<string | null>(null);

    const [boostFeedback, setBoostFeedback] = useState<{ isActive: boolean; boostName: string; boostType: string }>({
        isActive: false,
        boostName: '',
        boostType: '',
    });

    const [showDuelSettings, setShowDuelSettings] = useState(false);
    const [feedbackEffect, setFeedbackEffect] = useState<'correct' | 'wrong' | null>(null);

    // Refs for tracking transitions and activity (moved from main component)
    const isLoadingRef = useRef(false);
    const isFinishingRef = useRef(false);
    const isVerifyingRef = useRef(false);
    const hasTransitionedRef = useRef(false);
    const previousActivityStatusRef = useRef<'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline'>('online');
    const questionEndTimeRef = useRef<number | null>(null);

    return {
        // States
        duelCode,
        isWaitingHidden,
        showSurrenderModal,
        boosts,
        toastNotifications,
        translatePopoverOpen,
        boostFeedback,
        showDuelSettings,
        feedbackEffect,

        // Setters
        setDuelCode,
        setIsWaitingHidden,
        setShowSurrenderModal,
        setBoosts,
        setToastNotifications,
        setTranslatePopoverOpen,
        setBoostFeedback,
        setShowDuelSettings,
        setFeedbackEffect,

        // Refs
        isLoadingRef,
        isFinishingRef,
        isVerifyingRef,
        hasTransitionedRef,
        previousActivityStatusRef,
        questionEndTimeRef
    };
}
