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

const TIME_LIMIT_MS = 60000; // 60 seconds

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
  const questionEndTimeRef = useRef<number | null>(null);

  // Устанавливаем время окончания при загрузке нового вопроса
  useEffect(() => {
    if (!questions.length || isAnswered || isWaitingForOpponent || hasFinishedMyQuestions) {
      return;
    }

    // Устанавливаем время окончания = Сейчас + 60 секунд
    const targetTime = Date.now() + TIME_LIMIT_MS;
    questionEndTimeRef.current = targetTime;
    setTimeLeft(TIME_LIMIT_MS);
  }, [currentIndex, questions.length, isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, setTimeLeft]);

  // Основной таймер - вычисляет разницу между endTime и текущим временем
  useEffect(() => {
    if (!questions.length || isAnswered || isWaitingForOpponent || hasFinishedMyQuestions || !questionEndTimeRef.current) {
      return;
    }

    const timer = setInterval(() => {
      if (questionEndTimeRef.current) {
        const now = Date.now();
        const secondsRemaining = Math.ceil((questionEndTimeRef.current - now) / 1000) * 1000; // В миллисекундах

        if (secondsRemaining <= 0) {
          // 🛑 Время вышло
          setTimeLeft(0);
          clearInterval(timer);
          questionEndTimeRef.current = null;
          onTimeout();
        } else {
          // ✅ Обновляем UI
          setTimeLeft(secondsRemaining);
        }
      }
    }, 250); // Обновляем 4 раза в секунду для плавности

    return () => clearInterval(timer);
  }, [currentIndex, isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, questions.length, setTimeLeft, onTimeout]);

  // Обработчик visibilitychange - мгновенное обновление при возвращении на вкладку
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && questionEndTimeRef.current && !isAnswered && !isWaitingForOpponent && !hasFinishedMyQuestions) {
        // Мгновенный пересчет при возвращении
        const now = Date.now();
        const secondsRemaining = Math.ceil((questionEndTimeRef.current - now) / 1000) * 1000;
        
        if (secondsRemaining <= 0) {
          setTimeLeft(0);
          questionEndTimeRef.current = null;
          onTimeout();
        } else {
          setTimeLeft(secondsRemaining);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAnswered, isWaitingForOpponent, hasFinishedMyQuestions, onTimeout, setTimeLeft]);

  // Reset end time when question changes
  useEffect(() => {
    questionEndTimeRef.current = null;
    setTimeLeft(TIME_LIMIT_MS);
  }, [currentIndex, setTimeLeft]);

  const formatTime = useCallback((ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  }, []);

  return { formatTime, questionEndTimeRef };
}


