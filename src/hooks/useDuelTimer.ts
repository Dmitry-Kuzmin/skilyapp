import { useEffect, useRef, useCallback } from 'react';

interface UseDuelTimerProps {
  questions: any[];
  currentIndex: number;
  isAnswered: boolean;
  isWaitingForOpponent: boolean;
  hasFinishedMyQuestions: boolean;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  onTimeout: () => void;
}

export function useDuelTimer({
  questions,
  currentIndex,
  isAnswered,
  isWaitingForOpponent,
  hasFinishedMyQuestions,
  timeLeft,
  setTimeLeft,
  onTimeout,
}: UseDuelTimerProps) {
  const questionStartTimeRef = useRef<number | null>(null);

  // Timer logic with timestamp fix
  useEffect(() => {
    if (!questions.length || isAnswered || isWaitingForOpponent || hasFinishedMyQuestions) {
      return;
    }

    // Set start time if not set
    if (!questionStartTimeRef.current) {
      questionStartTimeRef.current = Date.now();
    }

    const timer = setInterval(() => {
      if (questionStartTimeRef.current) {
        const elapsed = Date.now() - questionStartTimeRef.current;
        const newTimeLeft = Math.max(0, 60000 - elapsed);

        setTimeLeft(newTimeLeft);

        if (newTimeLeft <= 0) {
          clearInterval(timer);
          onTimeout();
        }
      }
    }, 100); // Update more frequently for smoothness

    return () => clearInterval(timer);
  }, [currentIndex, isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, questions.length, setTimeLeft, onTimeout]);

  // Reset start time when question changes
  useEffect(() => {
    questionStartTimeRef.current = null;
    setTimeLeft(60000);
  }, [currentIndex, setTimeLeft]);

  const formatTime = useCallback((ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  }, []);

  return { formatTime };
}


