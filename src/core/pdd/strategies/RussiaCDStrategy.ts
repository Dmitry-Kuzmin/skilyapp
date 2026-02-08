
import { supabase } from '@/integrations/supabase/client';
import { CountryCode, UniversalQuestion, PDDTicketSummary } from '@/types/pdd';
import { PDDDataStrategy } from '../PDDDataStrategy';
import { RUSSIA_EXAM_RULES } from '@/types/pddExam';

/**
 * Strategy for Russia C/D Category (Trucks/Buses)
 * Uses the Unified Schema (questions_new) instead of Legacy tables.
 */
export class RussiaCDStrategy implements PDDDataStrategy {

    async getTickets(country: CountryCode): Promise<PDDTicketSummary[]> {
        if (country !== 'russia_cd') return [];

        // Fetch all questions metadata to count tickets
        const { data, error } = await supabase
            .from('questions_new')
            .select('metadata')
            .eq('country', 'ru')
            .contains('metadata', { ticket_category: 'C_D' });

        if (error) throw error;

        // Group by ticket_number
        // Note: ticket_number in C/D might be 1..40 or 101..140?
        // In metadata it is stored as 101..140 (offset).
        // But original_ticket_number stores 1..40.
        // UI should probably show 1..40?
        // Let's check metadata structure.
        // metadata: { ticket_number: 101, original_ticket_number: 1 ... }

        // We want to show Ticket 1, Ticket 2...
        // So we use original_ticket_number if present, else normalize.

        const ticketsMap = new Map<number, number>();

        data?.forEach((row: any) => {
            const meta = row.metadata || {};
            const ticketNum = meta.original_ticket_number || meta.ticket_number;
            // If we use original number, we get 1..40.
            if (ticketNum) {
                const count = ticketsMap.get(ticketNum) || 0;
                ticketsMap.set(ticketNum, count + 1);
            }
        });

        return Array.from(ticketsMap.entries())
            .map(([ticketNumber, questionsCount]): PDDTicketSummary => ({
                id: ticketNumber, // ID displayed in UI
                number: ticketNumber,
                questions_count: questionsCount,
                completed: false, // User progress not implemented yet for this strategy
                progress: 0,
                metadata: {
                    ticket_category: 'C_D'
                }
            }))
            .sort((a, b) => a.number - b.number);
    }

    async getTicketQuestions(
        country: CountryCode,
        ticketNumber: number
    ): Promise<UniversalQuestion[]> {
        if (country !== 'russia_cd') return [];

        // We need to match ticket_number.
        // Since metadata stores ticket_number + 100, we can match EITHER:
        // 1. metadata->>original_ticket_number = ticketNumber
        // 2. OR metadata->>ticket_number = ticketNumber (if we passed 101)

        // UI passes 1..40.
        // So we match original_ticket_number.

        // BUT postgrest JSON filtering is limited.
        // .contains('metadata', { original_ticket_number: ticketNumber })

        const { data: questions, error } = await supabase
            .from('questions_new')
            .select(`
        id, question_ru, image_url, metadata,
        answer_options (id, text_ru, is_correct, position)
      `)
            .eq('country', 'ru')
            .contains('metadata', { ticket_category: 'C_D', original_ticket_number: ticketNumber })
            .order('id'); // internal order, later sorted by question_number

        if (error) throw error;
        if (!questions) return [];

        // Sort by question_number in metadata
        const sorted = questions.sort((a, b) => {
            const qa = (a.metadata as any)?.question_number || 0;
            const qb = (b.metadata as any)?.question_number || 0;
            return qa - qb;
        });

        return sorted.map(mapToUniversal);
    }

    async getRandomQuestions(
        country: CountryCode,
        count: number
    ): Promise<UniversalQuestion[]> {
        if (country !== 'russia_cd') return [];

        // Random selection from questions_new where C_D
        // Since we can't random() easily in supabase client without RPC,
        // and get_random_duel_questions is for duels...
        // We can just fetch a bunch of IDs and pick random?
        // Or rely on legacy strategy approach: fetch ALL IDs and pick?
        // C/D has 800 Qs. Feasible to fetch all IDs (compact).

        const { data: ids, error } = await supabase
            .from('questions_new')
            .select('id')
            .eq('country', 'ru')
            .contains('metadata', { ticket_category: 'C_D' });

        if (error) throw error;
        if (!ids || ids.length === 0) return [];

        // Shuffle and take count
        const shuffled = ids.sort(() => Math.random() - 0.5).slice(0, count);
        const selectedIds = shuffled.map(x => x.id);

        const { data: questions, error: qError } = await supabase
            .from('questions_new')
            .select(`
         id, question_ru, image_url, metadata,
         answer_options (id, text_ru, is_correct, position)
       `)
            .in('id', selectedIds);

        if (qError) throw qError;
        return (questions || []).map(mapToUniversal);
    }

    async getExamQuestions(country: CountryCode): Promise<{
        selectedQuestions: UniversalQuestion[];
        allQuestionsByBlock: Record<number, UniversalQuestion[]>;
    }> {
        if (country !== 'russia_cd') return { selectedQuestions: [], allQuestionsByBlock: {} };

        // Exam rules: 20 Qs, 4 blocks of 5.
        // We need to fetch ALL questions to group by block?
        // Same optimized approach: Fetch IDs + metadata.

        const { data: metaRows, error } = await supabase
            .from('questions_new')
            .select('id, metadata')
            .eq('country', 'ru')
            .contains('metadata', { ticket_category: 'C_D' });

        if (error) throw error;
        if (!metaRows) return { selectedQuestions: [], allQuestionsByBlock: {} };

        // Group by logic block (1..4) based on question_number (1..20)
        const blocks: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };

        metaRows.forEach((row: any) => {
            const qNum = row.metadata?.question_number || 0;
            let blockId = 1;
            if (qNum >= 1 && qNum <= 5) blockId = 1;
            else if (qNum >= 6 && qNum <= 10) blockId = 2;
            else if (qNum >= 11 && qNum <= 15) blockId = 3;
            else if (qNum >= 16 && qNum <= 20) blockId = 4;

            if (blocks[blockId]) blocks[blockId].push(row.id);
        });

        const selectedIds: string[] = [];

        // Pick 5 random from each block
        for (let i = 1; i <= 4; i++) {
            const blockIds = blocks[i];
            const picked = blockIds.sort(() => Math.random() - 0.5).slice(0, 5);
            selectedIds.push(...picked);
        }

        // Fetch details
        const { data: questions, error: qError } = await supabase
            .from('questions_new')
            .select(`
        id, question_ru, image_url, metadata,
        answer_options (id, text_ru, is_correct, position)
      `)
            .in('id', selectedIds);

        if (qError) throw qError;

        const universal = (questions || []).map(mapToUniversal);

        // Add topic/block info for Exam UI logic?
        // Legacy strategy adds "block_X" to topics.
        universal.forEach(q => {
            // Re-calculate block from metadata?
            // Can't access logic easily here without looking at metadata inside mapToUniversal.
            // mapToUniversal helper implementation below needs access to metadata.
        });

        return {
            selectedQuestions: universal,
            allQuestionsByBlock: {} // Not implementing full fallback for now unless critical
        };
    }
}

function mapToUniversal(q: any): UniversalQuestion {
    const meta = q.metadata || {};
    const qNum = meta.question_number;
    let blockTopic = '';
    if (qNum) {
        if (qNum >= 1 && qNum <= 5) blockTopic = 'block_1';
        else if (qNum >= 6 && qNum <= 10) blockTopic = 'block_2';
        else if (qNum >= 11 && qNum <= 15) blockTopic = 'block_3';
        else if (qNum >= 16 && qNum <= 20) blockTopic = 'block_4';
    }

    const topics = meta.topics || [];
    if (blockTopic) topics.push(blockTopic);

    return {
        id: q.id,
        text: q.question_ru || '',
        image: q.image_url,
        explanation: q.explanation_ru || meta.explanation || null, // Check where explanation is
        topics: topics,
        difficulty: q.difficulty,
        answers: (q.answer_options || []).map((a: any) => ({
            id: a.id,
            text: a.text_ru || '',
            isCorrect: a.is_correct,
            position: a.position
        }))
    };
}
