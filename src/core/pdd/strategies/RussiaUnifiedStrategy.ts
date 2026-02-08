/**
 * Unified Strategy для России
 * Работает с unified таблицей questions_new (country='ru')
 * и answer_options для ответов
 * 
 * Преимущества:
 * - Единая структура с Испанией
 * - Готовность к синхронизации прогресса
 * - Проще добавлять новые страны
 */

import { supabase } from '@/integrations/supabase/client';
import { CountryCode, UniversalQuestion, PDDTicketSummary } from '@/types/pdd';
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
 * Maps unified question to UniversalQuestion format
 * IMPORTANT: Must match UniversalQuestion interface:
 * - text, image, answers, explanation, topics, difficulty
 */
function mapUnifiedToUniversal(
    question: any,
    answers: any[]
): UniversalQuestion {
    const metadata = question.metadata || {};

    return {
        id: question.id,
        // Main text (required by UniversalQuestion)
        text: question.question_ru || '',
        // Image
        image: question.image_url || metadata.image_src || null,
        // Answers (required by UniversalQuestion) - use UniversalAnswer format
        answers: answers.map((a) => ({
            id: a.id,
            text: a.text_ru || '',
            isCorrect: a.is_correct,
            position: a.position,
        })),
        // Explanation
        explanation: question.explanation_ru || null,
        // Topics
        topics: metadata.topics || [],
        // Difficulty
        difficulty: question.difficulty || 'medium',
    };
}

/**
 * Батчинг запросов для ответов
 */
async function fetchAnswersInBatches(
    questionIds: string[],
    batchSize: number = 100
): Promise<any[]> {
    const allAnswers: any[] = [];

    for (let i = 0; i < questionIds.length; i += batchSize) {
        const batch = questionIds.slice(i, i + batchSize);

        const { data: batchAnswers, error: batchError } = await supabase
            .from('answer_options')
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

export class RussiaUnifiedStrategy implements PDDDataStrategy {
    private readonly COUNTRY = 'ru';

    async getTickets(country: CountryCode, category?: string): Promise<PDDTicketSummary[]> {
        if (country !== 'russia') {
            return [];
        }

        // Получаем все вопросы для подсчёта билетов
        const { data, error } = await supabase
            .from('questions_new')
            .select('metadata')
            .eq('country', this.COUNTRY);

        if (error) throw error;

        // Фильтрация по категории прав
        const filteredData = data?.filter(q => {
            const ticketCategory = q.metadata?.ticket_category;
            const isCD = ticketCategory === 'C_D';

            // Если запрошена категория C/D
            if (category === 'C' || category === 'D' || category === 'CE' || category === 'DE' || category === 'C_D') {
                return isCD;
            }

            // По умолчанию (A, B, M и т.д.) - используем базу A/B (где ticket_category != 'C_D')
            return !isCD;
        });

        // Группируем по билетам (используем original_ticket_number если есть)
        const ticketsMap = new Map<number, number>();
        filteredData?.forEach((q) => {
            const ticketNumber = q.metadata?.original_ticket_number || q.metadata?.ticket_number;
            if (ticketNumber) {
                const count = ticketsMap.get(ticketNumber) || 0;
                ticketsMap.set(ticketNumber, count + 1);
            }
        });

        // Преобразуем в массив
        const tickets: PDDTicketSummary[] = Array.from(ticketsMap.entries())
            .map(([ticketNumber, questionsCount]): PDDTicketSummary => ({
                id: ticketNumber,
                number: ticketNumber,
                questions_count: questionsCount,
                completed: false,
                progress: 0,
                metadata: {
                    ticket_number: ticketNumber,
                },
            }))
            .sort((a, b) => a.number - b.number);

        return tickets;
    }

    async getTicketQuestions(
        country: CountryCode,
        ticketNumber: number,
        category?: string
    ): Promise<UniversalQuestion[]> {
        if (country !== 'russia') {
            return [];
        }

        // Определяем фильтр категории
        const isCD = (category === 'C' || category === 'D' || category === 'CE' || category === 'DE' || category === 'C_D');

        // Получаем вопросы билета через JSONB фильтр
        let query = supabase
            .from('questions_new')
            .select('*')
            .eq('country', this.COUNTRY);

        if (isCD) {
            // C/D: используем original_ticket_number (1-40)
            query = query.contains('metadata', { ticket_category: 'C_D', original_ticket_number: ticketNumber });
        } else {
            // A/B: используем ticket_number (1-40) и исключаем C_D
            // ВАЖНО: ticket_category может быть NULL для старых записей, поэтому проверяем:
            // где ticket_category = NULL ИЛИ ticket_category != 'C_D'
            query = query
                .or(`metadata->>ticket_category.is.null,metadata->>ticket_category.neq.C_D`)
                .eq('metadata->>ticket_number', ticketNumber.toString());
        }

        const { data: questions, error: questionsError } = await query;

        if (questionsError) throw questionsError;

        if (!questions || questions.length === 0) {
            return [];
        }

        // Сортируем по question_number из metadata
        questions.sort((a, b) => {
            const aNum = a.metadata?.question_number || 0;
            const bNum = b.metadata?.question_number || 0;
            return aNum - bNum;
        });

        // Получаем ответы
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
        return questions.map((q) => {
            const questionAnswers = answersByQuestion.get(q.id) || [];
            return mapUnifiedToUniversal(q, questionAnswers);
        });
    }

    async getRandomQuestions(
        country: CountryCode,
        count: number,
        category?: string
    ): Promise<UniversalQuestion[]> {
        if (country !== 'russia') {
            return [];
        }

        // Определяем фильтр категории
        const isCD = (category === 'C' || category === 'D' || category === 'CE' || category === 'DE' || category === 'C_D');

        let query = (supabase as any)
            .from('questions_new')
            .select('*')
            .eq('country', this.COUNTRY);

        if (isCD) {
            query = query.contains('metadata', { ticket_category: 'C_D' });
        } else {
            // A/B: NULL OR != 'C_D'
            query = query.or(`metadata->>ticket_category.is.null,metadata->>ticket_category.neq.C_D`);
        }

        // Получаем случайные вопросы России
        const { data: questions, error: questionsError } = await query
            .order('id', { ascending: Math.random() > 0.5 }) // Simple randomization fallback
            .limit(count);

        if (questionsError) throw questionsError;

        if (!questions || questions.length === 0) {
            return [];
        }

        // Получаем ответы
        const questionIds = questions.map((q) => q.id);
        const answers = await fetchAnswersInBatches(questionIds);

        // Группируем ответы
        const answersByQuestion = new Map<string, typeof answers>();
        answers?.forEach((answer) => {
            const existing = answersByQuestion.get(answer.question_id) || [];
            existing.push(answer);
            answersByQuestion.set(answer.question_id, existing);
        });

        // Преобразуем и перемешиваем
        const result = questions.map((q) => {
            const questionAnswers = answersByQuestion.get(q.id) || [];
            return mapUnifiedToUniversal(q, questionAnswers);
        });

        return result.sort(() => Math.random() - 0.5);
    }

    async getExamQuestions(country: CountryCode, category?: string): Promise<{
        selectedQuestions: UniversalQuestion[];
        allQuestionsByBlock: Record<number, UniversalQuestion[]>;
    }> {
        if (country !== 'russia') {
            return {
                selectedQuestions: [],
                allQuestionsByBlock: {},
            };
        }

        const isCD = (category === 'C' || category === 'D' || category === 'CE' || category === 'DE' || category === 'C_D');

        let query = supabase
            .from('questions_new')
            .select('*')
            .eq('country', this.COUNTRY);

        if (isCD) {
            query = query.contains('metadata', { ticket_category: 'C_D' });
        } else {
            // A/B: NULL OR != 'C_D'
            query = query.or(`metadata->>ticket_category.is.null,metadata->>ticket_category.neq.C_D`);
        }

        // Получаем ВСЕ вопросы
        const { data: allQuestions, error: questionsError } = await query;

        if (questionsError) throw questionsError;

        if (!allQuestions || allQuestions.length === 0) {
            return {
                selectedQuestions: [],
                allQuestionsByBlock: {},
            };
        }

        // Группируем по блокам (по question_number из metadata)
        const questionsByBlock = new Map<number, typeof allQuestions>();

        allQuestions.forEach((q) => {
            const questionNumber = q.metadata?.question_number || 1;
            const blockId = getBlockByQuestionNumber(questionNumber);
            const existing = questionsByBlock.get(blockId) || [];
            existing.push(q);
            questionsByBlock.set(blockId, existing);
        });

        // Из каждого блока берем случайную пятерку
        const selectedQuestions: typeof allQuestions = [];

        for (let blockId = 1; blockId <= RUSSIA_EXAM_RULES.blocksCount; blockId++) {
            const blockQuestions = questionsByBlock.get(blockId) || [];

            if (blockQuestions.length === 0) {
                console.warn(`[RussiaUnifiedStrategy] Блок ${blockId} пуст`);
                continue;
            }

            // Перемешиваем и берем первые 5
            const shuffled = [...blockQuestions].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, RUSSIA_EXAM_RULES.questionsPerBlock);

            selectedQuestions.push(...selected);
        }

        // Получаем ответы для всех вопросов
        const allQuestionIds = allQuestions.map((q) => q.id);
        const allAnswers = await fetchAnswersInBatches(allQuestionIds);

        // Группируем все ответы
        const allAnswersByQuestion = new Map<string, typeof allAnswers>();
        allAnswers?.forEach((answer) => {
            const existing = allAnswersByQuestion.get(answer.question_id) || [];
            existing.push(answer);
            allAnswersByQuestion.set(answer.question_id, existing);
        });

        // Преобразуем выбранные вопросы
        const universalQuestions: UniversalQuestion[] = selectedQuestions.map((q) => {
            const questionAnswers = allAnswersByQuestion.get(q.id) || [];
            const universal = mapUnifiedToUniversal(q, questionAnswers);

            const blockId = getBlockByQuestionNumber(q.metadata?.question_number || 1);
            if (!universal.topics) {
                universal.topics = [];
            }
            universal.topics.push(`block_${blockId}`);

            return universal;
        });

        // Преобразуем ВСЕ вопросы по блокам для доп. вопросов
        const allUniversalByBlock: Record<number, UniversalQuestion[]> = {};

        for (let blockId = 1; blockId <= RUSSIA_EXAM_RULES.blocksCount; blockId++) {
            const blockQuestions = questionsByBlock.get(blockId) || [];

            allUniversalByBlock[blockId] = blockQuestions.map((q) => {
                const questionAnswers = allAnswersByQuestion.get(q.id) || [];
                return mapUnifiedToUniversal(q, questionAnswers);
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
        count?: number,
        category?: string
    ): Promise<UniversalQuestion[]> {
        if (country !== 'russia') {
            return [];
        }

        const isCD = (category === 'C' || category === 'D' || category === 'CE' || category === 'DE' || category === 'C_D');

        // Фильтруем по topics в metadata (JSONB array contains)
        let query = supabase
            .from('questions_new')
            .select('*')
            .eq('country', this.COUNTRY)
            .filter('metadata->topics', 'cs', `["${topicName}"]`);

        if (isCD) {
            query = query.contains('metadata', { ticket_category: 'C_D' });
        } else {
            // A/B: NULL OR != 'C_D'
            query = query.or(`metadata->>ticket_category.is.null,metadata->>ticket_category.neq.C_D`);
        }

        if (count) {
            query = query.limit(count);
        }

        const { data: questions, error: questionsError } = await query;

        if (questionsError) {
            console.error('[RussiaUnifiedStrategy] Error fetching questions by topic:', questionsError);
            throw questionsError;
        }

        if (!questions || questions.length === 0) {
            return [];
        }

        // Получаем ответы
        const questionIds = questions.map((q) => q.id);
        const answers = await fetchAnswersInBatches(questionIds);

        // Группируем ответы
        const answersByQuestion = new Map<string, typeof answers>();
        answers?.forEach((answer) => {
            const existing = answersByQuestion.get(answer.question_id) || [];
            existing.push(answer);
            answersByQuestion.set(answer.question_id, existing);
        });

        // Преобразуем и перемешиваем
        const result = questions.map((q) => {
            const questionAnswers = answersByQuestion.get(q.id) || [];
            return mapUnifiedToUniversal(q, questionAnswers);
        });

        return result.sort(() => Math.random() - 0.5);
    }

    async getTopicsWithCounts(country: CountryCode, category?: string): Promise<Array<{
        name: string;
        count: number;
    }>> {
        if (country !== 'russia') {
            return [];
        }

        const isCD = (category === 'C' || category === 'D' || category === 'CE' || category === 'DE' || category === 'C_D');

        let query = supabase
            .from('questions_new')
            .select('metadata')
            .eq('country', this.COUNTRY);

        if (isCD) {
            query = query.contains('metadata', { ticket_category: 'C_D' });
        } else {
            // A/B: NULL OR != 'C_D'
            query = query.or(`metadata->>ticket_category.is.null,metadata->>ticket_category.neq.C_D`);
        }

        // Получаем все темы из metadata
        const { data: questions, error } = await query;

        if (error) throw error;

        if (!questions || questions.length === 0) {
            return [];
        }

        // Группируем по темам
        const topicsMap = new Map<string, number>();

        questions.forEach((q) => {
            const topics = q.metadata?.topics;
            if (topics && Array.isArray(topics)) {
                topics.forEach((topic: string) => {
                    const count = topicsMap.get(topic) || 0;
                    topicsMap.set(topic, count + 1);
                });
            }
        });

        // Преобразуем и сортируем
        return Array.from(topicsMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    async getSequentialQuestions(country: CountryCode, category?: string): Promise<UniversalQuestion[]> {
        if (country !== 'russia') return [];

        const isCD = (category === 'C' || category === 'D' || category === 'CE' || category === 'DE' || category === 'C_D');

        let query = supabase
            .from('questions_new')
            .select('*')
            .eq('country', this.COUNTRY);

        if (isCD) {
            query = query.contains('metadata', { ticket_category: 'C_D' });
        } else {
            // A/B: NULL OR != 'C_D'
            query = query.or(`metadata->>ticket_category.is.null,metadata->>ticket_category.neq.C_D`);
        }

        // Получаем ВСЕ вопросы России
        // Для 800 вопросов лучше использовать стабильную сортировку
        const { data: questions, error: questionsError } = await query;

        if (questionsError) throw questionsError;

        if (!questions || questions.length === 0) return [];

        // Стабильная сортировка по билетам и вопросам
        questions.sort((a, b) => {
            const aTicket = a.metadata?.ticket_number || 0;
            const bTicket = b.metadata?.ticket_number || 0;
            if (aTicket !== bTicket) return aTicket - bTicket;

            const aNum = a.metadata?.question_number || 0;
            const bNum = b.metadata?.question_number || 0;
            return aNum - bNum;
        });

        // Получаем ответы батчами
        const questionIds = questions.map(q => q.id);
        const answers = await fetchAnswersInBatches(questionIds);

        const answersByQuestion = new Map<string, any[]>();
        answers.forEach(a => {
            const existing = answersByQuestion.get(a.question_id) || [];
            existing.push(a);
            answersByQuestion.set(a.question_id, existing);
        });

        return questions.map(q => {
            const qAnswers = answersByQuestion.get(q.id) || [];
            return mapUnifiedToUniversal(q, qAnswers);
        });
    }
}
