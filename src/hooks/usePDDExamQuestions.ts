/**
 * Хук для получения вопросов для экзамена ПДД РФ
 * Для экзамена нужны случайные 20 вопросов (не конкретного билета)
 */

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CountryCode, UniversalQuestion } from '@/types/pdd';
import { mapRussiaQuestionToUniversal } from '@/utils/pddAdapters';
import { RUSSIA_EXAM_RULES } from '@/types/pddExam';

export function usePDDExamQuestions() {
  const [searchParams] = useSearchParams();
  const country = (searchParams.get('country') || 'russia') as CountryCode;

  return useQuery({
    queryKey: ['pdd-exam-questions', country],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      if (country === 'russia') {
        // Для экзамена получаем случайные 20 вопросов
        const { data: questions, error: questionsError } = await supabase
          .from('pdd_russia_questions')
          .select('*')
          .limit(RUSSIA_EXAM_RULES.mainQuestionsCount)
          .order('ticket_number', { ascending: true })
          .order('question_number', { ascending: true });

        if (questionsError) throw questionsError;

        if (!questions || questions.length === 0) {
          return [];
        }

        // Перемешиваем вопросы для случайности
        const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, RUSSIA_EXAM_RULES.mainQuestionsCount);

        // Получаем ответы для всех вопросов
        const questionIds = shuffled.map((q) => q.id);
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
        const universalQuestions: UniversalQuestion[] = shuffled.map((q) => {
          const questionAnswers = answersByQuestion.get(q.id) || [];
          return mapRussiaQuestionToUniversal(q, questionAnswers);
        });

        return universalQuestions;
      }

      return [];
    },
    enabled: country === 'russia',
    staleTime: 0, // Всегда получаем свежие вопросы для экзамена
  });
}


