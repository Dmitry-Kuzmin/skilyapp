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
import { getSpainTopicName, getSpainTopicNumber } from '../spainTopics';

export class DefaultCountryStrategy implements PDDDataStrategy {
  constructor(private countryCode: CountryCode) { }

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

    // Маппинг country code для таблицы questions_new
    const countryCodeMap: Record<string, string> = {
      'spain': 'es',
      'russia': 'ru',
      'ukraine': 'ua',
    };

    const dbCountryCode = countryCodeMap[country] || country;

    // Получаем случайные вопросы из таблицы questions_new
    // Используем rpc для случайного выбора или просто выбираем с запасом и перемешиваем
    // В Supabase нет прямого .order('random()'), поэтому берем последние N или используем фильтр
    const { data: questions, error: questionsError } = await supabase
      .from('questions_new')
      .select('*')
      .eq('country', dbCountryCode)
      .limit(Math.min(count * 2, 100)); // Берем чуть больше для рандомизации на клиенте

    if (questionsError) {
      console.error(`[DefaultCountryStrategy] Error fetching random questions for ${country}:`, questionsError);
      throw questionsError;
    }

    if (!questions || questions.length === 0) {
      return [];
    }

    // Перемешиваем и берем нужное количество
    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, count);

    // Получаем ответы
    const questionIds = shuffled.map((q) => q.id);
    const { data: answers, error: answersError } = await supabase
      .from('answer_options')
      .select('*')
      .in('question_id', questionIds)
      .order('position', { ascending: true });

    if (answersError) {
      console.error(`[DefaultCountryStrategy] Error fetching answers for random questions:`, answersError);
      throw answersError;
    }

    // Группируем ответы
    const answersByQuestion = new Map<string, typeof answers>();
    answers?.forEach((answer) => {
      const existing = answersByQuestion.get(answer.question_id) || [];
      existing.push(answer);
      answersByQuestion.set(answer.question_id, existing);
    });

    // Преобразуем к универсальному формату
    return shuffled.map((q): UniversalQuestion => {
      const questionAnswers = answersByQuestion.get(q.id) || [];
      const metadata = q.metadata || {};

      return {
        id: q.id,
        text: q.question_ru || q.question_es || '',
        image: q.image_url || metadata.image_src || null,
        answers: questionAnswers.map((a) => ({
          id: a.id,
          text: a.text_ru || a.text_es || '',
          isCorrect: a.is_correct,
          position: a.position,
        })),
        explanation: q.explanation_ru || q.explanation_es || null,
        topics: metadata.topics || [],
        difficulty: q.difficulty || 'medium',
      };
    }).sort(() => Math.random() - 0.5);
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

    // Для Испании (DGT) в экзамене 30 вопросов
    const questionCount = country === 'spain' ? 30 : 20;

    // Для стандартных стран экзамен = случайные вопросы
    const questions = await this.getRandomQuestions(country, questionCount);

    return {
      selectedQuestions: questions,
      allQuestionsByBlock: {}, // Для стандартных стран блоки не используются
    };
  }

  /**
   * Получить темы с количеством вопросов
   * Работает с таблицей questions_new (metadata->topics)
   */
  async getTopicsWithCounts(country: CountryCode): Promise<Array<{
    name: string;
    count: number;
  }>> {
    if (country !== this.countryCode) {
      return [];
    }

    // Маппинг country code для таблицы questions_new
    const countryCodeMap: Record<string, string> = {
      'spain': 'es',
      'russia': 'ru',
      'ukraine': 'ua',
    };

    const dbCountryCode = countryCodeMap[country] || country;

    // Получаем все темы из metadata
    const { data: questions, error } = await supabase
      .from('questions_new')
      .select('metadata')
      .eq('country', dbCountryCode);

    if (error) {
      console.error(`[DefaultCountryStrategy] Error fetching topics for ${country}:`, error);
      throw error;
    }

    if (!questions || questions.length === 0) {
      console.warn(`[DefaultCountryStrategy] No questions found for ${country}`);
      return [];
    }

    // Группируем по темам
    const topicsMap = new Map<string, number>();

    questions.forEach((q) => {
      let topicName: string | null = null;

      // Для Испании темы хранятся в test_id как "topic-01_test-001"
      if (country === 'spain' && q.metadata?.test_id) {
        const testId = q.metadata.test_id as string;
        const match = testId.match(/^topic-(\d+)_/);
        if (match) {
          topicName = getSpainTopicName(match[1]);
        }
      } else {
        // Для других стран используем metadata->topics
        const topics = q.metadata?.topics;
        if (topics && Array.isArray(topics) && topics.length > 0) {
          topicName = topics[0]; // Берём первую тему
        }
      }

      if (topicName) {
        const count = topicsMap.get(topicName) || 0;
        topicsMap.set(topicName, count + 1);
      }
    });

    // Преобразуем и сортируем
    return Array.from(topicsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Получить вопросы по теме
   * Работает с таблицей questions_new (metadata->topics)
   */
  async getQuestionsByTopic(
    country: CountryCode,
    topicName: string,
    count?: number
  ): Promise<UniversalQuestion[]> {
    if (country !== this.countryCode) {
      return [];
    }

    // Маппинг country code для таблицы questions_new
    const countryCodeMap: Record<string, string> = {
      'spain': 'es',
      'russia': 'ru',
      'ukraine': 'ua',
    };

    const dbCountryCode = countryCodeMap[country] || country;

    // Фильтруем вопросы
    let query = supabase
      .from('questions_new')
      .select('*')
      .eq('country', dbCountryCode);

    // Для Испании фильтруем по test_id (например, "topic-01_test-001" -> "Определения и использование дорог")
    if (country === 'spain') {
      // Получаем номер темы из названия
      const topicNumber = getSpainTopicNumber(topicName);
      if (topicNumber) {
        // ВАЖНО: используем ->> вместо -> для преобразования JSONB в текст
        // Иначе LIKE не работает (ошибка "operator does not exist: jsonb ~~ unknown")
        query = query.filter('metadata->>test_id', 'like', `%topic-${topicNumber}_%`);
      } else {
        // Если формат не совпадает, возвращаем пустой массив
        console.warn(`[DefaultCountryStrategy] Invalid topic name format: ${topicName}`);
        return [];
      }
    } else {
      // Для других стран фильтруем по topics в metadata (JSONB array contains)
      query = query.filter('metadata->topics', 'cs', `["${topicName}"]`);
    }

    if (count) {
      query = query.limit(count);
    }

    const { data: questions, error: questionsError } = await query;

    if (questionsError) {
      console.error(`[DefaultCountryStrategy] Error fetching questions by topic for ${country}:`, questionsError);
      throw questionsError;
    }

    if (!questions || questions.length === 0) {
      return [];
    }

    // Получаем ответы
    const questionIds = questions.map((q) => q.id);

    const { data: answers, error: answersError } = await supabase
      .from('answer_options')
      .select('*')
      .in('question_id', questionIds)
      .order('position', { ascending: true });

    if (answersError) {
      console.error(`[DefaultCountryStrategy] Error fetching answers:`, answersError);
      throw answersError;
    }

    // Группируем ответы
    const answersByQuestion = new Map<string, typeof answers>();
    answers?.forEach((answer) => {
      const existing = answersByQuestion.get(answer.question_id) || [];
      existing.push(answer);
      answersByQuestion.set(answer.question_id, existing);
    });

    // Преобразуем к универсальному формату (используем ту же логику что в RussiaUnifiedStrategy)
    const result = questions.map((q): UniversalQuestion => {
      const questionAnswers = answersByQuestion.get(q.id) || [];
      const metadata = q.metadata || {};

      return {
        id: q.id,
        text: q.question_ru || q.question_es || '',
        image: q.image_url || metadata.image_src || null,
        answers: questionAnswers.map((a) => ({
          id: a.id,
          text: a.text_ru || a.text_es || '',
          isCorrect: a.is_correct,
          position: a.position,
        })),
        explanation: q.explanation_ru || q.explanation_es || null,
        topics: metadata.topics || [],
        difficulty: q.difficulty || 'medium',
      };
    });

    // Перемешиваем
    return result.sort(() => Math.random() - 0.5);
  }
}

