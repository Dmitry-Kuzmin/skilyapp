/**
 * Unified Strategy для Испании
 * Работает с unified таблицей questions_new (country='es')
 */

import { supabase } from '@/integrations/supabase/client';
import { CountryCode, UniversalQuestion, PDDTicketSummary } from '@/types/pdd';
import { PDDDataStrategy } from '../PDDDataStrategy';

/**
 * Maps unified question to UniversalQuestion format
 * Returns ALL languages (ES/EN/RU) for proper language switching
 */
function mapUnifiedToUniversal(
    question: any,
    answersFromDB: any[]
): UniversalQuestion {
    const metadata = question.metadata || {};

    // 1. Try taking answers from separate table first (WITH ALL LANGUAGES)
    let finalAnswers = (answersFromDB || []).map((a) => ({
        id: a.id,
        text: a.text_es || a.text_ru || a.answer_text || '',
        // NEW: Include all language variants (no automatic ES fallback here)
        text_es: a.text_es || '',
        text_en: a.text_en || null,
        text_ru: a.text_ru || null,
        isCorrect: a.is_correct,
        position: a.position,
    }));

    // 2. Fallback: Try metadata.answer_options (array format)
    if (finalAnswers.length === 0 && metadata.answer_options && Array.isArray(metadata.answer_options)) {
        finalAnswers = metadata.answer_options.map((opt: any, index: number) => ({
            id: opt.id || `${question.id}-${index}`,
            text: opt.text_es || opt.text_ru || opt.text || '',
            text_es: opt.text_es || opt.text || '',
            text_en: opt.text_en || null,
            text_ru: opt.text_ru || null,
            isCorrect: opt.is_correct || false,
            position: opt.position || index + 1,
        }));
    }

    // 3. Fallback: Try metadata.options (character-keyed format)
    if (finalAnswers.length === 0 && metadata.options) {
        const optionsMeta = metadata.options || {};
        const correctAnswerChar = (question.correct_answer || 'a').toLowerCase();

        finalAnswers = ['a', 'b', 'c', 'd'].map((char, index) => {
            const isCorrect = char === correctAnswerChar;
            const textEs = optionsMeta.es?.[char] || optionsMeta[char] || '';
            const textEn = optionsMeta.en?.[char] || null;
            const textRu = optionsMeta.ru?.[char] || null;
            return {
                id: `${question.id}-${char}`,
                text: textEs,
                text_es: textEs,
                text_en: textEn,
                text_ru: textRu,
                isCorrect: isCorrect,
                position: index + 1,
            };
        }).filter(opt => opt.text !== '');
    }

    return {
        id: question.id,
        // PRIMARY text (for legacy compatibility)
        text: question.question_es || question.question_ru || '',
        // NEW: All language variants for UI switching (no automatic ES fallback)
        text_es: question.question_es || '',
        text_en: question.question_en || null,
        text_ru: question.question_ru || null,
        image: question.image_url || null,
        answers: finalAnswers,
        // Explanations with all languages
        explanation: question.explanation_es || question.explanation_ru || null,
        explanation_es: question.explanation_es || null,
        explanation_en: question.explanation_en || null,
        explanation_ru: question.explanation_ru || null,
        topics: metadata.topics || [],
        difficulty: question.difficulty || 'medium',
    };
}

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
        if (batchAnswers) allAnswers.push(...batchAnswers);
    }
    return allAnswers;
}

export class SpainUnifiedStrategy implements PDDDataStrategy {
    private readonly COUNTRY = 'es';

    async getTickets(country: CountryCode): Promise<PDDTicketSummary[]> {
        if (country !== 'spain') return [];

        // В Испании билеты - это темы. Но мы можем вернуть их как "Билеты" для обратной совместимости 
        // или загрузить из таблицы topics.
        const { data: topics, error } = await supabase
            .from('topics')
            .select('id, title_es, questions_new(count)')
            .order('title_es');

        if (error) throw error;

        return (topics || []).map((t: any) => ({
            id: t.id,
            number: 0, // Не используется для тем
            questions_count: t.questions_new?.[0]?.count || 0,
            completed: false,
            progress: 0,
            metadata: {
                title: t.title_es,
                topic_id: t.id
            }
        }));
    }

    async getTicketQuestions(
        country: CountryCode,
        ticketNumber: number
    ): Promise<UniversalQuestion[]> {
        // Spain doesn't use "numbers", it uses topic IDs usually.
        // If ticketNumber is provided, we might treat it as a topic index or similar.
        // For now, let's keep it simple.
        return this.getRandomQuestions(country, 30);
    }

    async getRandomQuestions(
        country: CountryCode,
        count: number
    ): Promise<UniversalQuestion[]> {
        if (country !== 'spain') return [];

        const { data: questions, error: questionsError } = await (supabase as any)
            .from('questions_new')
            .select('*')
            .eq('country', this.COUNTRY)
            .order('id') // Fallback order
            .limit(count);

        // Randomize on client side since order('random()') is not directly supported in Supabase JS select
        const shuffled = (questions || []).sort(() => Math.random() - 0.5);

        if (questionsError) throw questionsError;
        if (!shuffled || shuffled.length === 0) return [];

        const questionIds = shuffled.map((q) => q.id);
        const answers = await fetchAnswersInBatches(questionIds);

        const answersByQuestion = new Map<string, any[]>();
        answers.forEach((a) => {
            const existing = answersByQuestion.get(a.question_id) || [];
            existing.push(a);
            answersByQuestion.set(a.question_id, existing);
        });

        return questions.map((q) => {
            const questionAnswers = answersByQuestion.get(q.id) || [];
            return mapUnifiedToUniversal(q, questionAnswers);
        });
    }

    async getExamQuestions(country: CountryCode): Promise<{
        selectedQuestions: UniversalQuestion[];
        allQuestionsByBlock: Record<number, UniversalQuestion[]>;
    }> {
        const questions = await this.getRandomQuestions(country, 30);
        return {
            selectedQuestions: questions,
            allQuestionsByBlock: {},
        };
    }

    async getQuestionsByTopic(
        country: CountryCode,
        topicId: string,
        count?: number
    ): Promise<UniversalQuestion[]> {
        if (country !== 'spain') return [];

        let query = supabase
            .from('questions_new')
            .select('*')
            .eq('country', this.COUNTRY)
            .eq('topic_id', topicId);

        if (count) query = query.limit(count);

        const { data: questions, error: questionsError } = await query;
        if (questionsError) throw questionsError;
        if (!questions || questions.length === 0) return [];

        const questionIds = questions.map((q) => q.id);
        const answers = await fetchAnswersInBatches(questionIds);

        const answersByQuestion = new Map<string, any[]>();
        answers.forEach((a) => {
            const existing = answersByQuestion.get(a.question_id) || [];
            existing.push(a);
            answersByQuestion.set(a.question_id, existing);
        });

        return questions.map((q) => {
            const questionAnswers = answersByQuestion.get(q.id) || [];
            return mapUnifiedToUniversal(q, questionAnswers);
        });
    }
}
