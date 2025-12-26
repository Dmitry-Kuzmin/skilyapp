import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'exam_timer_';

interface UseExamTimerProps {
    examId: string;
    initialDurationSeconds: number; // usually 20 * 60 = 1200 or 60 (for blitz)
    onTimeExpired?: () => void;
    sessionId?: string;
}

export function useExamTimer({
    examId,
    initialDurationSeconds,
    onTimeExpired,
    sessionId
}: UseExamTimerProps) {
    const [timeLeft, setTimeLeft] = useState(initialDurationSeconds);
    const [extraSeconds, setExtraSeconds] = useState(0);
    const [isExpired, setIsExpired] = useState(false);

    // Refs to avoid dependency loops in intervals
    const timeLeftRef = useRef(initialDurationSeconds);
    const onTimeExpiredRef = useRef(onTimeExpired);

    // Update refs
    useEffect(() => {
        onTimeExpiredRef.current = onTimeExpired;
    }, [onTimeExpired]);

    // Load state or initialize
    useEffect(() => {
        const key = `${STORAGE_KEY_PREFIX}${examId}`;
        const savedState = localStorage.getItem(key);

        let startTime = Date.now();
        let savedExtraSeconds = 0;

        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (!sessionId || parsed.sessionId === sessionId) {
                    startTime = parsed.startTime;
                    // Support legacy penaltyMinutes or new extraSeconds
                    savedExtraSeconds = parsed.extraSeconds || (parsed.penaltyMinutes ? parsed.penaltyMinutes * 60 : 0);
                }
            } catch (e) {
                console.error('Failed to parse saved timer state', e);
            }
        } else {
            // Initialize new state
            localStorage.setItem(key, JSON.stringify({
                startTime,
                extraSeconds: 0,
                sessionId
            }));
        }

        setExtraSeconds(savedExtraSeconds);

        // Calculate initial time left immediately
        const totalDuration = initialDurationSeconds + savedExtraSeconds;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, totalDuration - elapsed);

        setTimeLeft(remaining);
        timeLeftRef.current = remaining;
    }, [examId, initialDurationSeconds, sessionId]);

    // Main interval effect
    useEffect(() => {
        const key = `${STORAGE_KEY_PREFIX}${examId}`;

        const tick = () => {
            const savedState = localStorage.getItem(key);
            if (!savedState) return;

            try {
                const parsed = JSON.parse(savedState);
                const startTime = parsed.startTime;

                // Read latest extraSeconds
                const currentExtraSeconds = parsed.extraSeconds || (parsed.penaltyMinutes ? parsed.penaltyMinutes * 60 : 0);

                if (currentExtraSeconds !== extraSeconds) {
                    setExtraSeconds(currentExtraSeconds);
                }

                const totalDuration = initialDurationSeconds + currentExtraSeconds;
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const remaining = Math.max(0, totalDuration - elapsed);

                setTimeLeft(remaining);
                timeLeftRef.current = remaining;

                if (remaining <= 0 && !isExpired && onTimeExpiredRef.current) {
                    setIsExpired(true);
                    onTimeExpiredRef.current();
                }
            } catch (e) {
                console.error('Timer tick error', e);
            }
        };

        // Run tick immediately
        tick();

        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [examId, initialDurationSeconds, isExpired, extraSeconds]);

    const addTime = useCallback((seconds: number) => {
        const key = `${STORAGE_KEY_PREFIX}${examId}`;
        const savedState = localStorage.getItem(key);

        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                const currentExtras = parsed.extraSeconds || (parsed.penaltyMinutes ? parsed.penaltyMinutes * 60 : 0);
                const newExtras = currentExtras + seconds;

                parsed.extraSeconds = newExtras;
                // Clear legacy penaltyMinutes to avoid confusion
                delete parsed.penaltyMinutes;

                localStorage.setItem(key, JSON.stringify(parsed));
                setExtraSeconds(newExtras);

                // Immediate update
                const totalDuration = initialDurationSeconds + newExtras;
                const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
                const remaining = Math.max(0, totalDuration - elapsed);
                setTimeLeft(remaining);
                timeLeftRef.current = remaining;
            } catch (e) {
                console.error("Error adding time", e);
            }
        }
    }, [examId, initialDurationSeconds]);

    // Legacy support
    const addPenalty = useCallback((minutes: number) => {
        addTime(minutes * 60);
    }, [addTime]);

    const clearTimer = useCallback(() => {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${examId}`);
    }, [examId]);

    return {
        timeLeft,
        extraSeconds,
        addTime,
        addPenalty,
        clearTimer
    };
}
