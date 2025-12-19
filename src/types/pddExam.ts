/**
 * Типы для экзамена ПДД РФ с алгоритмом "5 за 1"
 * Специфичная логика для России
 */

import { UniversalQuestion } from './pdd';

/**
 * Тематический блок (5 вопросов)
 */
export interface ExamBlock {
  id: number; // 1, 2, 3, 4
  questionIndices: number[]; // индексы вопросов в билете (0-4, 5-9, 10-14, 15-19)
  errors: number; // количество ошибок в блоке
  topic?: string; // тема блока (если есть)
}

/**
 * Дополнительный вопрос (из-за ошибки)
 */
export interface ExtraQuestion {
  question: UniversalQuestion;
  blockId: number; // из какого блока была ошибка
  originalQuestionIndex: number; // индекс вопроса, где была ошибка
}

/**
 * Состояние экзамена ПДД РФ
 */
export interface RussiaExamState {
  // Основные вопросы (20) - выбранные для экзамена
  mainQuestions: UniversalQuestion[];
  currentMainIndex: number; // текущий вопрос из основных (0-19)

  // ВСЕ вопросы по блокам (для генерации доп. вопросов)
  allQuestionsByBlock: Record<number, UniversalQuestion[]>; // blockId -> вопросы из этого блока

  // Ответы на основные вопросы
  mainAnswers: Record<number, {
    questionId: string;
    isCorrect: boolean;
    answeredAt: number; // timestamp
  }>;

  // Блоки и ошибки
  blocks: ExamBlock[];
  errorsPerBlock: Record<number, number>; // blockId -> количество ошибок

  // Дополнительные вопросы
  isExtraMode: boolean; // находимся ли в режиме доп. вопросов
  extraQuestions: ExtraQuestion[]; // очередь доп. вопросов
  currentExtraIndex: number; // текущий доп. вопрос
  extraAnswers: Record<number, {
    questionId: string;
    isCorrect: boolean;
    answeredAt: number;
  }>;

  // Время
  timeLimit: number; // базовое время (20 минут)
  timeRemaining: number; // оставшееся время
  extraTimeAdded: number; // добавленное время за ошибки

  // Статус
  status: 'in-progress' | 'passed' | 'failed' | 'failed-extra';
  failureReason?: string;

  // Статистика
  startTime: number;
  endTime?: number;
}

/**
 * Результат проверки ответа
 */
export interface AnswerResult {
  isCorrect: boolean;
  shouldContinue: boolean; // продолжать ли экзамен
  shouldAddExtra: boolean; // нужно ли добавить доп. вопросы
  extraQuestionsCount?: number; // сколько доп. вопросов
  extraTime?: number; // сколько времени добавить
  failureReason?: string; // причина провала (если есть)
  blockId?: number; // номер блока, где была ошибка
}

/**
 * Правила экзамена ПДД РФ
 */
export const RUSSIA_EXAM_RULES = {
  mainQuestionsCount: 20,
  blocksCount: 4,
  questionsPerBlock: 5,
  baseTimeMinutes: 20,
  maxErrorsTotal: 2, // максимум 2 ошибки всего
  maxErrorsPerBlock: 1, // максимум 1 ошибка в блоке
  extraQuestionsPerError: 5, // +5 вопросов за каждую ошибку
  extraTimePerError: 5, // +5 минут за каждую ошибку
  noErrorsInExtra: true, // в доп. вопросах ошибки недопустимы
} as const;

/**
 * Получить номер блока по индексу вопроса (0-19)
 */
export function getBlockId(questionIndex: number): number {
  // Block 1: 0-4 (вопросы 1-5)
  // Block 2: 5-9 (вопросы 6-10)
  // Block 3: 10-14 (вопросы 11-15)
  // Block 4: 15-19 (вопросы 16-20)
  return Math.floor(questionIndex / RUSSIA_EXAM_RULES.questionsPerBlock) + 1;
}

/**
 * Получить индексы вопросов в блоке
 */
export function getBlockQuestionIndices(blockId: number): number[] {
  const start = (blockId - 1) * RUSSIA_EXAM_RULES.questionsPerBlock;
  const end = start + RUSSIA_EXAM_RULES.questionsPerBlock;
  return Array.from({ length: RUSSIA_EXAM_RULES.questionsPerBlock }, (_, i) => start + i);
}

/**
 * Инициализация состояния экзамена
 */
export function createRussiaExamState(
  questions: UniversalQuestion[],
  allQuestionsByBlock: Record<number, UniversalQuestion[]> | undefined,
  timeLimit: number = RUSSIA_EXAM_RULES.baseTimeMinutes * 60
): RussiaExamState {
  if (questions.length !== RUSSIA_EXAM_RULES.mainQuestionsCount) {
    throw new Error(`Экзамен должен содержать ровно ${RUSSIA_EXAM_RULES.mainQuestionsCount} вопросов`);
  }

  // Создаем блоки
  const blocks: ExamBlock[] = Array.from({ length: RUSSIA_EXAM_RULES.blocksCount }, (_, i) => ({
    id: i + 1,
    questionIndices: getBlockQuestionIndices(i + 1),
    errors: 0,
  }));

  return {
    mainQuestions: questions,
    allQuestionsByBlock: allQuestionsByBlock || {},
    currentMainIndex: 0,
    mainAnswers: {},
    blocks,
    errorsPerBlock: {},
    isExtraMode: false,
    extraQuestions: [],
    currentExtraIndex: 0,
    extraAnswers: {},
    timeLimit,
    timeRemaining: timeLimit,
    extraTimeAdded: 0,
    status: 'in-progress',
    startTime: Date.now(),
  };
}


