/**
 * Логика экзамена ПДД РФ с алгоритмом "5 за 1"
 */

import {
  RussiaExamState,
  AnswerResult,
  RUSSIA_EXAM_RULES,
  getBlockId,
  ExtraQuestion,
} from '@/types/pddExam';
import { UniversalQuestion } from '@/types/pdd';

/**
 * Обработка ответа на основной вопрос
 */
export function handleMainQuestionAnswer(
  state: RussiaExamState,
  questionIndex: number,
  isCorrect: boolean
): AnswerResult {
  const blockId = getBlockId(questionIndex);
  const currentErrorsInBlock = state.errorsPerBlock[blockId] || 0;
  const totalErrors = Object.values(state.errorsPerBlock).reduce((sum, count) => sum + count, 0);

  // Если ответ правильный - просто продолжаем
  if (isCorrect) {
    return {
      isCorrect: true,
      shouldContinue: true,
      shouldAddExtra: false,
    };
  }

  // ОШИБКА: проверяем правила

  // 1. Проверка: две ошибки в одном блоке = провал
  if (currentErrorsInBlock >= 1) {
    // Уже была ошибка в этом блоке, теперь вторая
    return {
      isCorrect: false,
      shouldContinue: false,
      shouldAddExtra: false,
      failureReason: 'Две ошибки в одном тематическом блоке. Экзамен не сдан.',
      blockId,
    };
  }

  // 2. Проверка: три ошибки всего = провал
  if (totalErrors >= 2) {
    // Уже было 2 ошибки, теперь третья
    return {
      isCorrect: false,
      shouldContinue: false,
      shouldAddExtra: false,
      failureReason: 'Более двух ошибок. Экзамен не сдан.',
      blockId,
    };
  }

  // 3. Ошибка допустима - добавляем доп. вопросы
  const newErrorsInBlock = currentErrorsInBlock + 1;
  const newTotalErrors = totalErrors + 1;

  return {
    isCorrect: false,
    shouldContinue: true, // продолжаем основной тест
    shouldAddExtra: true,
    extraQuestionsCount: RUSSIA_EXAM_RULES.extraQuestionsPerError,
    extraTime: RUSSIA_EXAM_RULES.extraTimePerError * 60, // в секундах
    blockId,
  };
}

/**
 * Обработка ответа на дополнительный вопрос
 */
export function handleExtraQuestionAnswer(
  state: RussiaExamState,
  extraIndex: number,
  isCorrect: boolean
): AnswerResult {
  // В дополнительных вопросах ошибки недопустимы
  if (!isCorrect) {
    return {
      isCorrect: false,
      shouldContinue: false,
      shouldAddExtra: false,
      failureReason: 'Ошибка в дополнительном вопросе. Экзамен не сдан.',
    };
  }

  // Правильный ответ - продолжаем доп. вопросы
  return {
    isCorrect: true,
    shouldContinue: true,
    shouldAddExtra: false,
  };
}

/**
 * Применить результат ответа к состоянию
 */
export function applyAnswerToState(
  state: RussiaExamState,
  result: AnswerResult,
  questionId: string
): RussiaExamState {
  const newState = { ...state };

  if (state.isExtraMode) {
    // Дополнительный вопрос
    newState.extraAnswers[state.currentExtraIndex] = {
      questionId,
      isCorrect: result.isCorrect,
      answeredAt: Date.now(),
    };

    if (!result.shouldContinue) {
      // Провал в доп. вопросе
      newState.status = 'failed-extra';
      newState.failureReason = result.failureReason;
      newState.endTime = Date.now();
    } else {
      // Переходим к следующему доп. вопросу
      newState.currentExtraIndex += 1;
      
      // Если все доп. вопросы пройдены
      if (newState.currentExtraIndex >= newState.extraQuestions.length) {
        newState.status = 'passed';
        newState.endTime = Date.now();
      }
    }
  } else {
    // Основной вопрос
    newState.mainAnswers[state.currentMainIndex] = {
      questionId,
      isCorrect: result.isCorrect,
      answeredAt: Date.now(),
    };

    if (!result.shouldContinue) {
      // Провал
      newState.status = 'failed';
      newState.failureReason = result.failureReason;
      newState.endTime = Date.now();
    } else {
      // Обновляем ошибки в блоке
      if (!result.isCorrect && result.blockId) {
        const blockId = result.blockId;
        newState.errorsPerBlock[blockId] = (newState.errorsPerBlock[blockId] || 0) + 1;
        
        // Обновляем блок
        const block = newState.blocks.find(b => b.id === blockId);
        if (block) {
          block.errors = newState.errorsPerBlock[blockId];
        }
      }

      // Переходим к следующему основному вопросу
      newState.currentMainIndex += 1;

      // Если все основные вопросы пройдены
      if (newState.currentMainIndex >= newState.mainQuestions.length) {
        // Проверяем, есть ли доп. вопросы
        if (newState.extraQuestions.length > 0) {
          // Переходим в режим доп. вопросов
          newState.isExtraMode = true;
          newState.currentExtraIndex = 0;
        } else {
          // Нет доп. вопросов - экзамен сдан
          newState.status = 'passed';
          newState.endTime = Date.now();
        }
      }

      // Добавляем доп. вопросы и время
      if (result.shouldAddExtra && result.extraQuestionsCount && result.extraTime && result.blockId) {
        // Получаем доп. вопросы из того же блока
        const blockQuestions = newState.allQuestionsByBlock[result.blockId] || [];
        
        if (blockQuestions.length === 0) {
          console.warn(`[russiaExamLogic] Нет вопросов в блоке ${result.blockId} для доп. вопросов`);
        } else {
          // Исключаем уже использованные вопросы из основных
          const usedQuestionIds = new Set(
            newState.mainQuestions.map(q => q.id)
          );
          
          const availableQuestions = blockQuestions.filter(
            q => !usedQuestionIds.has(q.id)
          );
          
          // Если доступных вопросов меньше, чем нужно - используем все доступные
          const questionsToUse = availableQuestions.length >= result.extraQuestionsCount
            ? availableQuestions
            : blockQuestions; // fallback: используем все вопросы блока
          
          // Перемешиваем и берем нужное количество
          const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, result.extraQuestionsCount);
          
          const extraQuestions: ExtraQuestion[] = selected.map((q) => ({
            question: q,
            blockId: result.blockId!,
            originalQuestionIndex: state.currentMainIndex - 1,
          }));
          
          newState.extraQuestions.push(...extraQuestions);
        }
        
        newState.timeRemaining += result.extraTime;
        newState.extraTimeAdded += result.extraTime;
      }
    }
  }

  return newState;
}

/**
 * Проверка, сдан ли экзамен
 */
export function isExamPassed(state: RussiaExamState): boolean {
  return state.status === 'passed';
}

/**
 * Получить итоговую статистику экзамена
 */
export function getExamStats(state: RussiaExamState) {
  const mainCorrect = Object.values(state.mainAnswers).filter(a => a.isCorrect).length;
  const mainTotal = Object.keys(state.mainAnswers).length;
  const extraCorrect = Object.values(state.extraAnswers).filter(a => a.isCorrect).length;
  const extraTotal = Object.keys(state.extraAnswers).length;

  const totalTime = state.endTime 
    ? Math.floor((state.endTime - state.startTime) / 1000)
    : Math.floor((Date.now() - state.startTime) / 1000);

  return {
    mainQuestions: {
      correct: mainCorrect,
      total: mainTotal,
      accuracy: mainTotal > 0 ? Math.round((mainCorrect / mainTotal) * 100) : 0,
    },
    extraQuestions: {
      correct: extraCorrect,
      total: extraTotal,
      accuracy: extraTotal > 0 ? Math.round((extraCorrect / extraTotal) * 100) : 0,
    },
    totalErrors: Object.values(state.errorsPerBlock).reduce((sum, count) => sum + count, 0),
    errorsPerBlock: state.errorsPerBlock,
    timeSpent: totalTime,
    timeLimit: state.timeLimit + state.extraTimeAdded,
    status: state.status,
    failureReason: state.failureReason,
  };
}


