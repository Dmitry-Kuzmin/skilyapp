/**
 * Хук для получения вопросов для экзамена ПДД
 * Использует Strategy Pattern для работы с разными источниками данных
 */

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CountryCode } from '@/types/pdd';
import { getPDDStrategy } from '@/core/pdd';

export interface PDDExamQuestionsResult {
  selectedQuestions: import('@/types/pdd').UniversalQuestion[];
  allQuestionsByBlock: Record<number, import('@/types/pdd').UniversalQuestion[]>;
}

export function usePDDExamQuestions() {
  const [searchParams] = useSearchParams();
  const country = (searchParams.get('country') || 'russia') as CountryCode;

  return useQuery({
    queryKey: ['pdd-exam-questions', country],
    queryFn: async (): Promise<PDDExamQuestionsResult> => {
      const strategy = getPDDStrategy(country);
      return strategy.getExamQuestions(country);
    },
    enabled: !!country,
    staleTime: 0, // Всегда получаем свежие вопросы для экзамена
  });
}
