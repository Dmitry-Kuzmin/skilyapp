/**
 * Legacy Strategy для России
 * Работает с существующими таблицами pdd_russia_questions и pdd_russia_answers
 * НЕ ТРОГАЕМ - оставляем как есть для стабильности
 */

import { supabase } from '@/integrations/supabase/client';
import { CountryCode, UniversalQuestion, PDDTicketSummary } from '@/types/pdd';
import { mapRussiaQuestionToUniversal } from '@/utils/pddAdapters';
import { PDDDataStrategy } from '../PDDDataStrategy';
import { RUSSIA_EXAM_RULES } from '@/types/pddExam';

/**
 * Определяет номер блока по номеру вопроса в билете (1-20)
 */
function getBlockByQuestionNumber(questionNumber: number): number {
  if (questionNumber >= 1 && questionNumber <= 5) return 1;
  if (questionNumber >= 6 && questionNumber <= 10) return 2;
  if (questionNumber >= 11 && questionNumber <= 15) return 3;
  if (questionNumber >= 16 && questionNumber <= 20) return 4;
  return 1;
}

/**
 * Батчинг запросов для избежания ошибок 400 из-за слишком длинного URL
 * Разбивает массив ID на чанки и делает несколько запросов
 */
async function fetchAnswersInBatches(questionIds: string[], batchSize: number = 100): Promise<any[]> {
  const allAnswers: any[] = [];
  
  // Разбиваем на батчи
  for (let i = 0; i < questionIds.length; i += batchSize) {
    const batch = questionIds.slice(i, i + batchSize);
    
    const { data: batchAnswers, error: batchError } = await supabase
      .from('pdd_russia_answers')
      .select('*')
      .in('question_id', batch)
      .order('position', { ascending: true });
    
    if (batchError) throw batchError;
    
    if (batchAnswers) {
      allAnswers.push(...batchAnswers);
    }
  }
  
  return allAnswers;
}

export class RussiaLegacyStrategy implements PDDDataStrategy {
  async getTickets(country: CountryCode): Promise<PDDTicketSummary[]> {
    if (country !== 'russia') {
      return [];
    }

    const { data, error } = await supabase
      .from('pdd_russia_questions')
      .select('ticket_number')
      .order('ticket_number', { ascending: true });

    if (error) throw error;

    // Группируем по билетам и считаем количество вопросов
    const ticketsMap = new Map<number, number>();
    data?.forEach((q) => {
      const count = ticketsMap.get(q.ticket_number) || 0;
      ticketsMap.set(q.ticket_number, count + 1);
    });

    // Преобразуем в массив билетов
    const tickets: PDDTicketSummary[] = Array.from(ticketsMap.entries())
      .map(([ticketNumber, questionsCount]): PDDTicketSummary => ({
        id: ticketNumber,
        number: ticketNumber,
        questions_count: questionsCount,
        completed: false, // TODO: получать из user_progress
        progress: 0, // TODO: вычислять из user_progress
        metadata: {
          ticket_number: ticketNumber, // для обратной совместимости
        },
      }))
      .sort((a, b) => a.number - b.number);

    return tickets;
  }

  async getTicketQuestions(
    country: CountryCode,
    ticketNumber: number
  ): Promise<UniversalQuestion[]> {
    if (country !== 'russia') {
      return [];
    }

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

    // Получаем ответы для всех вопросов (с батчингом для больших списков)
    const questionIds = questions.map((q) => q.id);
    const answers = await fetchAnswersInBatches(questionIds);

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

  async getRandomQuestions(
    country: CountryCode,
    count: number
  ): Promise<UniversalQuestion[]> {
    if (country !== 'russia') {
      return [];
    }

    // Получаем случайные вопросы
    const { data: questions, error: questionsError } = await supabase
      .from('pdd_russia_questions')
      .select('*')
      .limit(count);

    if (questionsError) throw questionsError;

    if (!questions || questions.length === 0) {
      return [];
    }

    // Получаем ответы (с батчингом для больших списков)
    const questionIds = questions.map((q) => q.id);
    const answers = await fetchAnswersInBatches(questionIds);

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

  async getExamQuestions(country: CountryCode): Promise<{
    selectedQuestions: UniversalQuestion[];
    allQuestionsByBlock: Record<number, UniversalQuestion[]>;
  }> {
    if (country !== 'russia') {
      return {
        selectedQuestions: [],
        allQuestionsByBlock: {},
      };
    }

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
    const questionsByBlock = new Map<number, typeof allQuestions>();
    
    allQuestions.forEach((q) => {
      const blockId = getBlockByQuestionNumber(q.question_number);
      const existing = questionsByBlock.get(blockId) || [];
      existing.push(q);
      questionsByBlock.set(blockId, existing);
    });

    // Из каждого блока берем случайную пятерку
    const selectedQuestions: typeof allQuestions = [];
    
    for (let blockId = 1; blockId <= RUSSIA_EXAM_RULES.blocksCount; blockId++) {
      const blockQuestions = questionsByBlock.get(blockId) || [];
      
      if (blockQuestions.length === 0) {
        console.warn(`[RussiaLegacyStrategy] Блок ${blockId} пуст`);
        continue;
      }

      // Перемешиваем и берем первые 5
      const shuffled = [...blockQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, RUSSIA_EXAM_RULES.questionsPerBlock);
      
      selectedQuestions.push(...selected);
    }

    // Получаем ответы для всех выбранных вопросов (с батчингом)
    const questionIds = selectedQuestions.map((q) => q.id);
    const answers = await fetchAnswersInBatches(questionIds);

    // Группируем ответы по question_id
    const answersByQuestion = new Map<string, typeof answers>();
    answers?.forEach((answer) => {
      const existing = answersByQuestion.get(answer.question_id) || [];
      existing.push(answer);
      answersByQuestion.set(answer.question_id, existing);
    });

    // Преобразуем к универсальному формату
    const universalQuestions: UniversalQuestion[] = selectedQuestions.map((q) => {
      const questionAnswers = answersByQuestion.get(q.id) || [];
      const universal = mapRussiaQuestionToUniversal(q, questionAnswers);
      
      const blockId = getBlockByQuestionNumber(q.question_number);
      if (!universal.topics) {
        universal.topics = [];
      }
      universal.topics.push(`block_${blockId}`);
      
      return universal;
    });

    // Также получаем ответы для ВСЕХ вопросов (для доп. вопросов)
    // КРИТИЧНО: используем батчинг, т.к. может быть очень много вопросов
    const allQuestionIds = allQuestions.map((q) => q.id);
    const allAnswers = await fetchAnswersInBatches(allQuestionIds);

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

    return {
      selectedQuestions: universalQuestions,
      allQuestionsByBlock: allUniversalByBlock,
    };
  }

  async getQuestionsByTopic(
    country: CountryCode,
    topicName: string,
    count?: number
  ): Promise<UniversalQuestion[]> {
    if (country !== 'russia') {
      return [];
    }

    // Получаем вопросы по теме (используем массив topics)
    // Для массивов в Supabase используем фильтрацию через .filter() или оператор cs
    // Альтернативно можно использовать .contains() для проверки наличия элемента в массиве
    let query = supabase
      .from('pdd_russia_questions')
      .select('*')
      .contains('topics', [topicName]); // Проверяем, содержит ли массив topics элемент topicName

    if (count) {
      query = query.limit(count);
    }

    const { data: questions, error: questionsError } = await query;
    
    if (questionsError) {
      console.error('[RussiaLegacyStrategy] Error fetching questions by topic:', questionsError);
      throw questionsError;
    }

    if (questionsError) throw questionsError;

    if (!questions || questions.length === 0) {
      return [];
    }

    // Получаем ответы (с батчингом)
    const questionIds = questions.map((q) => q.id);
    const answers = await fetchAnswersInBatches(questionIds);

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

  async getTopicsWithCounts(country: CountryCode): Promise<Array<{
    name: string;
    count: number;
  }>> {
    if (country !== 'russia') {
      return [];
    }

    // Получаем все уникальные темы и считаем количество вопросов
    const { data: questions, error } = await supabase
      .from('pdd_russia_questions')
      .select('topics');

    if (error) throw error;

    if (!questions || questions.length === 0) {
      return [];
    }

    // Группируем по темам
    const topicsMap = new Map<string, number>();
    
    questions.forEach((q) => {
      if (q.topics && Array.isArray(q.topics)) {
        q.topics.forEach((topic: string) => {
          const count = topicsMap.get(topic) || 0;
          topicsMap.set(topic, count + 1);
        });
      }
    });

    // Преобразуем в массив и сортируем по количеству вопросов (убывание)
    return Array.from(topicsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
}

