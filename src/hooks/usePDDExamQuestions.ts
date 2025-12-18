/**
 * Хук для получения вопросов для экзамена ПДД РФ
 * Реализует алгоритм формирования экзамена по тематическим блокам:
 * - 4 блока по 5 вопросов
 * - Из каждого блока берется случайная пятерка
 * - При ошибке добавляются доп. вопросы из того же блока
 */

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CountryCode, UniversalQuestion, PDDRussiaQuestion } from '@/types/pdd';
import { mapRussiaQuestionToUniversal } from '@/utils/pddAdapters';
import { RUSSIA_EXAM_RULES, getBlockId } from '@/types/pddExam';

/**
 * Определяет номер блока по номеру вопроса в билете (1-20)
 * Блок 1: вопросы 1-5
 * Блок 2: вопросы 6-10
 * Блок 3: вопросы 11-15
 * Блок 4: вопросы 16-20
 */
function getBlockByQuestionNumber(questionNumber: number): number {
  if (questionNumber >= 1 && questionNumber <= 5) return 1;
  if (questionNumber >= 6 && questionNumber <= 10) return 2;
  if (questionNumber >= 11 && questionNumber <= 15) return 3;
  if (questionNumber >= 16 && questionNumber <= 20) return 4;
  return 1; // fallback
}

export function usePDDExamQuestions() {
  const [searchParams] = useSearchParams();
  const country = (searchParams.get('country') || 'russia') as CountryCode;

  return useQuery({
    queryKey: ['pdd-exam-questions', country],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      if (country === 'russia') {
        // Получаем ВСЕ вопросы из БД
        const { data: allQuestions, error: questionsError } = await supabase
          .from('pdd_russia_questions')
          .select('*')
          .order('ticket_number', { ascending: true })
          .order('question_number', { ascending: true });

        if (questionsError) throw questionsError;

        if (!allQuestions || allQuestions.length === 0) {
          return {
            selectedQuestions: [],
            allQuestionsByBlock: {},
          };
        }

        // Группируем вопросы по блокам (по question_number)
        const questionsByBlock = new Map<number, PDDRussiaQuestion[]>();
        
        allQuestions.forEach((q) => {
          const blockId = getBlockByQuestionNumber(q.question_number);
          const existing = questionsByBlock.get(blockId) || [];
          existing.push(q);
          questionsByBlock.set(blockId, existing);
        });

        // Из каждого блока берем случайную пятерку
        const selectedQuestions: PDDRussiaQuestion[] = [];
        
        for (let blockId = 1; blockId <= RUSSIA_EXAM_RULES.blocksCount; blockId++) {
          const blockQuestions = questionsByBlock.get(blockId) || [];
          
          if (blockQuestions.length === 0) {
            console.warn(`[usePDDExamQuestions] Блок ${blockId} пуст`);
            continue;
          }

          // Перемешиваем и берем первые 5
          const shuffled = [...blockQuestions].sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, RUSSIA_EXAM_RULES.questionsPerBlock);
          
          selectedQuestions.push(...selected);
        }

        if (selectedQuestions.length !== RUSSIA_EXAM_RULES.mainQuestionsCount) {
          console.warn(
            `[usePDDExamQuestions] Получено ${selectedQuestions.length} вопросов вместо ${RUSSIA_EXAM_RULES.mainQuestionsCount}`
          );
        }

        // Получаем ответы для всех выбранных вопросов
        const questionIds = selectedQuestions.map((q) => q.id);
        const { data: answers, error: answersError } = await supabase
          .from('pdd_russia_answers')
          .select('*')
          .in('question_id', questionIds)
          .order('position', { ascending: true });

        if (answersError) throw answersError;

        // Группируем ответы по question_id
        const answersByQuestion = new Map<string, typeof answers>();
        answers?.forEach((answer) => {
          const existing = answersByQuestion.get(answer.question_id) || [];
          existing.push(answer);
          answersByQuestion.set(answer.question_id, existing);
        });

        // Преобразуем к универсальному формату
        // ВАЖНО: Сохраняем порядок по блокам (1-5, 6-10, 11-15, 16-20)
        const universalQuestions: UniversalQuestion[] = selectedQuestions.map((q) => {
          const questionAnswers = answersByQuestion.get(q.id) || [];
          const universal = mapRussiaQuestionToUniversal(q, questionAnswers);
          
          // Сохраняем информацию о блоке в topics для использования в логике
          const blockId = getBlockByQuestionNumber(q.question_number);
          if (!universal.topics) {
            universal.topics = [];
          }
          // Добавляем метаданные о блоке (можно использовать для доп. вопросов)
          universal.topics.push(`block_${blockId}`);
          
          return universal;
        });

        // Также получаем ответы для ВСЕХ вопросов (для доп. вопросов)
        const allQuestionIds = allQuestions.map((q) => q.id);
        const { data: allAnswers, error: allAnswersError } = await supabase
          .from('pdd_russia_answers')
          .select('*')
          .in('question_id', allQuestionIds)
          .order('position', { ascending: true });

        if (allAnswersError) throw allAnswersError;

        // Группируем все ответы
        const allAnswersByQuestion = new Map<string, typeof allAnswers>();
        allAnswers?.forEach((answer) => {
          const existing = allAnswersByQuestion.get(answer.question_id) || [];
          existing.push(answer);
          allAnswersByQuestion.set(answer.question_id, existing);
        });

        // Преобразуем ВСЕ вопросы по блокам для доп. вопросов
        const allUniversalByBlock: Record<number, UniversalQuestion[]> = {};
        
        for (let blockId = 1; blockId <= RUSSIA_EXAM_RULES.blocksCount; blockId++) {
          const blockQuestions = questionsByBlock.get(blockId) || [];
          
          // Преобразуем к универсальному формату
          allUniversalByBlock[blockId] = blockQuestions.map((q) => {
            const questionAnswers = allAnswersByQuestion.get(q.id) || [];
            return mapRussiaQuestionToUniversal(q, questionAnswers);
          });
        }

        // Возвращаем выбранные вопросы и все вопросы по блокам
        return {
          selectedQuestions: universalQuestions,
          allQuestionsByBlock: allUniversalByBlock,
        };
      }

      return {
        selectedQuestions: [],
        allQuestionsByBlock: {},
      };
    },
    enabled: country === 'russia',
    staleTime: 0, // Всегда получаем свежие вопросы для экзамена
  });
}


