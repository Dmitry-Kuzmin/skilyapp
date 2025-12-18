/**
 * Универсальная стратегия для стран со стандартной логикой
 * Работает с единой таблицей pdd_questions (country_code)
 * 
 * Используется для большинства стран, которые не имеют специфичной логики
 * (как блоки вопросов в России)
 */

import { supabase } from '@/integrations/supabase/client';
import { CountryCode, UniversalQuestion, PDDTicketSummary } from '@/types/pdd';
import { PDDDataStrategy } from '../PDDDataStrategy';

export class DefaultCountryStrategy implements PDDDataStrategy {
  constructor(private countryCode: CountryCode) {}

  async getTickets(country: CountryCode): Promise<PDDTicketSummary[]> {
    if (country !== this.countryCode) {
      return [];
    }

    // TODO: Когда будет создана единая таблица pdd_questions, раскомментировать:
    // Получаем вопросы из единой таблицы pdd_questions
    // const { data: questions, error } = await supabase
    //   .from('pdd_questions')
    //   .select('id, metadata')
    //   .eq('country_code', country);
    
    // Пока таблица не создана, возвращаем пустой массив
    // Это позволит зарегистрировать стратегию, но данные будут пустыми до создания таблицы
    console.warn(`[DefaultCountryStrategy] Table pdd_questions not created yet for ${country}. Returning empty array.`);
    return [];

    // if (error) throw error;

    // if (!questions || questions.length === 0) {
    //   return [];
    // }

    // // Группируем по билетам/темам из metadata
    // // metadata может содержать: { ticket_number: 5 } или { topic_id: "uuid" }
    // const ticketsMap = new Map<string | number, number>();
    
    // questions.forEach((q) => {
    //   const metadata = q.metadata || {};
    //   // Поддерживаем разные форматы metadata
    //   const ticketId = metadata.ticket_number || metadata.topic_id || q.id;
    //   const count = ticketsMap.get(ticketId) || 0;
    //   ticketsMap.set(ticketId, count + 1);
    // });

    // // Преобразуем в массив билетов
    // const tickets: PDDTicketSummary[] = Array.from(ticketsMap.entries())
    //   .map(([ticketId, questionsCount], index): PDDTicketSummary => ({
    //     id: ticketId,
    //     number: typeof ticketId === 'number' ? ticketId : index + 1,
    //     questions_count: questionsCount,
    //     completed: false, // TODO: получать из user_progress
    //     progress: 0, // TODO: вычислять из user_progress
    //     metadata: {
    //       ticket_id: ticketId,
    //     },
    //   }))
    //   .sort((a, b) => a.number - b.number);

    // return tickets;
  }

  async getTicketQuestions(
    country: CountryCode,
    ticketNumber: number
  ): Promise<UniversalQuestion[]> {
    if (country !== this.countryCode) {
      return [];
    }

    // TODO: Когда будет создана единая таблица pdd_questions, раскомментировать:
    // Получаем вопросы билета из единой таблицы
    // const { data: questions, error: questionsError } = await supabase
    //   .from('pdd_questions')
    //   .select('*')
    //   .eq('country_code', country)
    //   .or(`metadata->>ticket_number.eq.${ticketNumber},metadata->>topic_id.eq.${ticketNumber}`)
    //   .order('metadata->>question_number', { ascending: true });
    
    console.warn(`[DefaultCountryStrategy] Table pdd_questions not created yet for ${country}. Returning empty array.`);
    return [];

    // if (questionsError) throw questionsError;

    // if (!questions || questions.length === 0) {
    //   return [];
    // }

    // // Получаем ответы
    // const questionIds = questions.map((q) => q.id);
    // const { data: answers, error: answersError } = await supabase
    //   .from('pdd_answers')
    //   .select('*')
    //   .in('question_id', questionIds)
    //   .order('position', { ascending: true });

    // if (answersError) throw answersError;

    // // Группируем ответы
    // const answersByQuestion = new Map<string, typeof answers>();
    // answers?.forEach((answer) => {
    //   const existing = answersByQuestion.get(answer.question_id) || [];
    //   existing.push(answer);
    //   answersByQuestion.set(answer.question_id, existing);
    // });

    // // Преобразуем к универсальному формату
    // // TODO: Использовать адаптер из registry
    // const universalQuestions: UniversalQuestion[] = questions.map((q) => {
    //   const questionAnswers = answersByQuestion.get(q.id) || [];
    //   return {
    //     id: q.id,
    //     text: q.question_text,
    //     image: q.image_url,
    //     answers: questionAnswers.map((a) => ({
    //       id: a.id,
    //       text: a.answer_text,
    //       isCorrect: a.is_correct,
    //       position: a.position,
    //     })),
    //     explanation: q.explanation,
    //     topics: q.topics || [],
    //     difficulty: (q.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
    //   };
    // });

    // return universalQuestions;
  }

  async getRandomQuestions(
    country: CountryCode,
    count: number
  ): Promise<UniversalQuestion[]> {
    if (country !== this.countryCode) {
      return [];
    }

    // TODO: Когда будет создана единая таблица pdd_questions, раскомментировать:
    // Получаем случайные вопросы из единой таблицы
    // const { data: questions, error: questionsError } = await supabase
    //   .from('pdd_questions')
    //   .select('*')
    //   .eq('country_code', country)
    //   .limit(count);
    
    console.warn(`[DefaultCountryStrategy] Table pdd_questions not created yet for ${country}. Returning empty array.`);
    return [];

    // if (questionsError) throw questionsError;

    // if (!questions || questions.length === 0) {
    //   return [];
    // }

    // // Перемешиваем
    // const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, count);

    // // Получаем ответы
    // const questionIds = shuffled.map((q) => q.id);
    // const { data: answers, error: answersError } = await supabase
    //   .from('pdd_answers')
    //   .select('*')
    //   .in('question_id', questionIds)
    //   .order('position', { ascending: true });

    // if (answersError) throw answersError;

    // // Группируем ответы
    // const answersByQuestion = new Map<string, typeof answers>();
    // answers?.forEach((answer) => {
    //   const existing = answersByQuestion.get(answer.question_id) || [];
    //   existing.push(answer);
    //   answersByQuestion.set(answer.question_id, existing);
    // });

    // // Преобразуем к универсальному формату
    // const universalQuestions: UniversalQuestion[] = shuffled.map((q) => {
    //   const questionAnswers = answersByQuestion.get(q.id) || [];
    //   return {
    //     id: q.id,
    //     text: q.question_text,
    //     image: q.image_url,
    //     answers: questionAnswers.map((a) => ({
    //       id: a.id,
    //       text: a.answer_text,
    //       isCorrect: a.is_correct,
    //       position: a.position,
    //     })),
    //     explanation: q.explanation,
    //     topics: q.topics || [],
    //     difficulty: (q.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
    //   };
    // });

    // return universalQuestions;
  }

  async getExamQuestions(country: CountryCode): Promise<{
    selectedQuestions: UniversalQuestion[];
    allQuestionsByBlock: Record<number, UniversalQuestion[]>;
  }> {
    if (country !== this.countryCode) {
      return {
        selectedQuestions: [],
        allQuestionsByBlock: {},
      };
    }

    // Для стандартных стран экзамен = случайные вопросы
    // Можно переопределить в конкретной стратегии, если нужна специфичная логика
    const questions = await this.getRandomQuestions(country, 20);
    
    return {
      selectedQuestions: questions,
      allQuestionsByBlock: {}, // Для стандартных стран блоки не используются
    };
  }
}

