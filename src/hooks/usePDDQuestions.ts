/**
 * Хук для получения вопросов билета с адаптацией к универсальному формату
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CountryCode, UniversalQuestion } from '@/types/pdd';
import { mapRussiaQuestionToUniversal } from '@/utils/pddAdapters';

export function usePDDTicketQuestions(
  country: CountryCode,
  ticketNumber: number
) {
  return useQuery({
    queryKey: ['pdd-questions', country, ticketNumber],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      if (country === 'russia') {
        // Получаем вопросы билета
        const { data: questions, error: questionsError } = await supabase
          .from('pdd_russia_questions')
          .select('*')
          .eq('ticket_number', ticketNumber)
          .order('question_number', { ascending: true });

        if (questionsError) throw questionsError;

        if (!questions || questions.length === 0) {
          return [];
        }

        // Получаем ответы для всех вопросов
        const questionIds = questions.map((q) => q.id);
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
        const universalQuestions: UniversalQuestion[] = questions.map((q) => {
          const questionAnswers = answersByQuestion.get(q.id) || [];
          return mapRussiaQuestionToUniversal(q, questionAnswers);
        });

        return universalQuestions;
      }

      return [];
    },
    enabled: country === 'russia' && ticketNumber > 0,
  });
}

/**
 * Хук для получения случайных вопросов
 */
export function usePDDRandomQuestions(country: CountryCode, count: number = 20) {
  return useQuery({
    queryKey: ['pdd-random-questions', country, count],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      if (country === 'russia') {
        // Получаем случайные вопросы
        const { data: questions, error: questionsError } = await supabase
          .from('pdd_russia_questions')
          .select('*')
          .limit(count);

        if (questionsError) throw questionsError;

        if (!questions || questions.length === 0) {
          return [];
        }

        // Получаем ответы
        const questionIds = questions.map((q) => q.id);
        const { data: answers, error: answersError } = await supabase
          .from('pdd_russia_answers')
          .select('*')
          .in('question_id', questionIds)
          .order('position', { ascending: true });

        if (answersError) throw answersError;

        // Группируем ответы
        const answersByQuestion = new Map<string, typeof answers>();
        answers?.forEach((answer) => {
          const existing = answersByQuestion.get(answer.question_id) || [];
          existing.push(answer);
          answersByQuestion.set(answer.question_id, existing);
        });

        // Преобразуем к универсальному формату
        const universalQuestions: UniversalQuestion[] = questions.map((q) => {
          const questionAnswers = answersByQuestion.get(q.id) || [];
          return mapRussiaQuestionToUniversal(q, questionAnswers);
        });

        // Перемешиваем вопросы
        return universalQuestions.sort(() => Math.random() - 0.5);
      }

      return [];
    },
    enabled: country === 'russia' && count > 0,
  });
}


