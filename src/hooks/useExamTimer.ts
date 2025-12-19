
import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY_PREFIX = 'exam_timer_';

interface UseExamTimerProps {
    examId: string;
    initialDurationSeconds: number; // usually 20 * 60 = 1200
    onTimeExpired?: () => void;
    // If provided, we verify if there's saved state for this specific exam session
    sessionId?: string;
}

export function useExamTimer({
    examId,
    initialDurationSeconds,
    onTimeExpired,
    sessionId
}: UseExamTimerProps) {
    const [timeLeft, setTimeLeft] = useState(initialDurationSeconds);
    const [penaltyMinutes, setPenaltyMinutes] = useState(0);
    const [isExpired, setIsExpired] = useState(false);

    // Refs to avoid dependency loops in intervals
    const timeLeftRef = useRef(initialDurationSeconds);
    const onTimeExpiredRef = useRef(onTimeExpired);
    const examIdRef = useRef(examId);

    useEffect(() => {
        onTimeExpiredRef.current = onTimeExpired;
    }, [onTimeExpired]);

    // Load state or initialize
    useEffect(() => {
        const key = `${STORAGE_KEY_PREFIX}${examId}`;
        const savedState = localStorage.getItem(key);

        // Default initialization
        let startTime = Date.now();
        let penalties = 0;

        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                // Verify sessionId if needed to ensure we don't pick up old exam state (optional but good for robustness)
                // If sessionId is provided and doesn't match, we behave like it's a new exam
                if (!sessionId || parsed.sessionId === sessionId) {
                    startTime = parsed.startTime;
                    penalties = parsed.penaltyMinutes || 0;
                }
            } catch (e) {
                console.error('Failed to parse saved timer state', e);
            }
        } else {
            // Initialize new state
            localStorage.setItem(key, JSON.stringify({
                startTime,
                penaltyMinutes: 0,
                sessionId
            }));
        }

        setPenaltyMinutes(penalties);

        // Calculate initial time left immediately
        const durationWithPenalty = initialDurationSeconds + (penalties * 60);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, durationWithPenalty - elapsed);

        setTimeLeft(remaining);
        timeLeftRef.current = remaining;

        // Start interval
        const interval = setInterval(() => {
            const currentPenaltyMinutes = parseFloat(localStorage.getItem(`${STORAGE_KEY_PREFIX}${examIdRef.current}_penalty`) || "0");
            // Re-read storage or state? 
            // Actually we should rely on the startTime that is constant.

            const currentDuration = initialDurationSeconds + (currentPenaltyMinutes * 60); // Use ref or state?
            // Better: we update state when adding penalty, so let's rely on calculation from stable start time.

            // Let's rely on the variables bound in closure? No, they might be stale.
            // We need to access the LATEST penalty minutes.
            // Let's store penalty in a separate storage key or part of the main state object for easier updates.
        }, 1000); // Wait, interval logic is tricky with closures.

        return () => clearInterval(interval);
    }, []); // Only on mount/examId change

    // Better approach: Main effect for interval
    useEffect(() => {
        const key = `${STORAGE_KEY_PREFIX}${examId}`;

        // Function to calculate time
        const tick = () => {
            const savedState = localStorage.getItem(key);
            if (!savedState) return;

            try {
                const parsed = JSON.parse(savedState);
                const startTime = parsed.startTime;
                const penalties = parsed.penaltyMinutes || 0;

                // Sync local state if changed from outside (unlikely here but good practice)
                if (penalties !== penaltyMinutes) {
                    setPenaltyMinutes(penalties);
                }

                const totalDuration = initialDurationSeconds + (penalties * 60);
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const remaining = Math.max(0, totalDuration - elapsed);

                setTimeLeft(remaining);
                timeLeftRef.current = remaining;

                if (remaining <= 0 && !isExpired) {
                    setIsExpired(true);
                    if (onTimeExpiredRef.current) {
                        onTimeExpiredRef.current();
                    }
                }
            } catch (e) {
                console.error('Timer tick error', e);
            }
        };

        // Run immediately
        tick();

        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [examId, initialDurationSeconds, penaltyMinutes, isExpired]);

    const addPenalty = (minutes: number) => {
        const key = `${STORAGE_KEY_PREFIX}${examId}`;
        const savedState = localStorage.getItem(key);

        if (savedState) {
            const parsed = JSON.parse(savedState);
            const newPenalties = (parsed.penaltyMinutes || 0) + minutes;

            parsed.penaltyMinutes = newPenalties;
            localStorage.setItem(key, JSON.stringify(parsed));

            setPenaltyMinutes(newPenalties);

            // Immediate update of timeLeft
            const totalDuration = initialDurationSeconds + (newPenalties * 60);
            const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
            const remaining = Math.max(0, totalDuration - elapsed);
            setTimeLeft(remaining);
        }
    };

    const clearTimer = () => {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${examId}`);
    };

    return {
        timeLeft,
        penaltyMinutes,
        addPenalty,
        clearTimer
    };
}
