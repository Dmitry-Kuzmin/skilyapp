/**
 * Хук для получения вопросов билета для экзамена ПДД РФ
 */

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { usePDDTicketQuestions } from './usePDDQuestions';
import { CountryCode } from '@/types/pdd';

export function usePDDExamQuestions() {
  const [searchParams] = useSearchParams();
  const country = (searchParams.get('country') || 'russia') as CountryCode;
  const ticketNumber = parseInt(searchParams.get('ticket') || '0');

  const { data: questions, isLoading, error } = usePDDTicketQuestions(
    country,
    ticketNumber
  );

  return {
    data: questions,
    isLoading,
    error,
    country,
    ticketNumber,
  };
}

