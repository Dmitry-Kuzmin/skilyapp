/**
 * Хук для управления состоянием экзамена ПДД РФ
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  RussiaExamState, 
  createRussiaExamState,
  getBlockId,
} from '@/types/pddExam';
import {
  handleMainQuestionAnswer,
  handleExtraQuestionAnswer,
  applyAnswerToState,
  getExamStats,
} from '@/utils/russiaExamLogic';
import { UniversalQuestion } from '@/types/pdd';

export function useRussiaExam(questions: UniversalQuestion[]) {
  const [state, setState] = useState<RussiaExamState | null>(() => {
    if (questions.length === 20) {
      return createRussiaExamState(questions, 20 * 60);
    }
    return null;
  });

  const isExtraMode = state?.isExtraMode || false;
  const currentQuestion = useMemo(() => {
    if (!state) return null;
    
    if (isExtraMode) {
      return state.extraQuestions[state.currentExtraIndex]?.question || null;
    } else {
      return state.mainQuestions[state.currentMainIndex] || null;
    }
  }, [state, isExtraMode]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    if (!state || !currentQuestion) return;

    let result;
    if (isExtraMode) {
      result = handleExtraQuestionAnswer(state, state.currentExtraIndex, isCorrect);
    } else {
      result = handleMainQuestionAnswer(state, state.currentMainIndex, isCorrect);
    }

    const newState = applyAnswerToState(state, result, currentQuestion.id);
    setState(newState);

    return {
      shouldContinue: result.shouldContinue,
      shouldAddExtra: result.shouldAddExtra,
      failureReason: result.failureReason,
      extraQuestionsCount: result.extraQuestionsCount,
      extraTime: result.extraTime,
    };
  }, [state, currentQuestion, isExtraMode]);

  const stats = useMemo(() => {
    if (!state) return null;
    return getExamStats(state);
  }, [state]);

  const progress = useMemo(() => {
    if (!state) return { current: 0, total: 0 };
    
    if (isExtraMode) {
      return {
        current: state.currentExtraIndex + 1,
        total: state.extraQuestions.length,
        label: 'Дополнительные вопросы',
      };
    } else {
      return {
        current: state.currentMainIndex + 1,
        total: state.mainQuestions.length,
        label: 'Основные вопросы',
      };
    }
  }, [state, isExtraMode]);

  const currentBlock = useMemo(() => {
    if (!state || isExtraMode) return null;
    return getBlockId(state.currentMainIndex);
  }, [state, isExtraMode]);

  const errorsInCurrentBlock = useMemo(() => {
    if (!state || !currentBlock) return 0;
    return state.errorsPerBlock[currentBlock] || 0;
  }, [state, currentBlock]);

  return {
    state,
    currentQuestion,
    isExtraMode,
    progress,
    currentBlock,
    errorsInCurrentBlock,
    stats,
    handleAnswer,
    timeRemaining: state?.timeRemaining || 0,
    status: state?.status || 'in-progress',
  };
}

