import { useState, useRef } from 'react';

export interface UseDuelGameStateReturn {
  // Questions state
  questions: any[];
  setQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;

  // Answer state
  selectedAnswer: string | null;
  setSelectedAnswer: React.Dispatch<React.SetStateAction<string | null>>;
  isAnswered: boolean;
  setIsAnswered: React.Dispatch<React.SetStateAction<boolean>>;

  // Timer state
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;

  // Score state
  myScore: number;
  setMyScore: React.Dispatch<React.SetStateAction<number>>;
  opponentScore: number;
  setOpponentScore: React.Dispatch<React.SetStateAction<number>>;
  combo: number;
  setCombo: React.Dispatch<React.SetStateAction<number>>;

  // Boosts state
  boosts: any[];
  setBoosts: React.Dispatch<React.SetStateAction<any[]>>;
  usedBoosts: string[];
  setUsedBoosts: React.Dispatch<React.SetStateAction<string[]>>;
  eliminatedOptions: string[];
  setEliminatedOptions: React.Dispatch<React.SetStateAction<string[]>>;
  translationLanguage: 'ru' | 'en' | null;
  setTranslationLanguage: React.Dispatch<React.SetStateAction<'ru' | 'en' | null>>;

  // Loading state
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingRef: React.MutableRefObject<boolean>;

  // Waiting state
  isWaitingForOpponent: boolean;
  setIsWaitingForOpponent: React.Dispatch<React.SetStateAction<boolean>>;
  hasFinishedMyQuestions: boolean;
  setHasFinishedMyQuestions: React.Dispatch<React.SetStateAction<boolean>>;
  hasFinishedMyQuestionsRef: React.MutableRefObject<boolean>;

  // Refs
  isFinishingRef: React.MutableRefObject<boolean>;
  isVerifyingRef: React.MutableRefObject<boolean>;
  hasTransitionedRef: React.MutableRefObject<boolean>;
}

export function useDuelGameState() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60000);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const [usedBoosts, setUsedBoosts] = useState<string[]>([]);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [translationLanguage, setTranslationLanguage] = useState<'ru' | 'en' | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [hasFinishedMyQuestions, setHasFinishedMyQuestions] = useState(false);
  const hasFinishedMyQuestionsRef = useRef(false);
  const isFinishingRef = useRef(false);
  const isVerifyingRef = useRef(false);
  const hasTransitionedRef = useRef(false);

  return {
    questions,
    setQuestions,
    currentIndex,
    setCurrentIndex,
    selectedAnswer,
    setSelectedAnswer,
    isAnswered,
    setIsAnswered,
    timeLeft,
    setTimeLeft,
    myScore,
    setMyScore,
    opponentScore,
    setOpponentScore,
    combo,
    setCombo,
    boosts,
    setBoosts,
    usedBoosts,
    setUsedBoosts,
    eliminatedOptions,
    setEliminatedOptions,
    translationLanguage,
    setTranslationLanguage,
    loading,
    setLoading,
    isLoadingRef,
    isWaitingForOpponent,
    setIsWaitingForOpponent,
    hasFinishedMyQuestions,
    setHasFinishedMyQuestions: (val: boolean | ((prev: boolean) => boolean)) => {
      if (typeof val === 'function') {
        const newVal = (val as Function)(hasFinishedMyQuestionsRef.current);
        hasFinishedMyQuestionsRef.current = newVal;
        setHasFinishedMyQuestions(newVal);
      } else {
        hasFinishedMyQuestionsRef.current = val;
        setHasFinishedMyQuestions(val);
      }
    },
    hasFinishedMyQuestionsRef,
    isFinishingRef,
    isVerifyingRef,
    hasTransitionedRef,
  };
}

