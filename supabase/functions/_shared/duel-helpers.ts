import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// CORS Headers
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===== SCHEMAS =====

export const createDuelSchema = z.object({
    num_questions: z.number().int().min(5).max(30),
    categories: z.array(z.string().uuid()).max(10).nullable().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'mix']).optional(),
    bet_amount: z.number().int().min(0).max(10000).optional().default(0),
    bet_type: z.enum(['none', 'fixed', 'custom']).optional().default('none'),
    insurance_enabled: z.boolean().optional(),
    insurance_rate: z.number().min(0).max(1).optional(),
    insurance_coverage_rate: z.number().min(0).max(1).optional(),
    security_context: z.object({
        ip_hash: z.string().max(255).optional(),
        device_hash: z.string().max(255).optional()
    }).optional()
});

export const joinDuelSchema = z.object({
    code: z.string().regex(/^[A-Z0-9]{4}$/, 'Invalid code format - must be 4 characters'),
    insurance_enabled: z.boolean().optional(),
    insurance_rate: z.number().min(0).max(1).optional(),
    insurance_coverage_rate: z.number().min(0).max(1).optional(),
    security_context: z.object({
        ip_hash: z.string().max(255).optional(),
        device_hash: z.string().max(255).optional()
    }).optional()
});

export const findMatchSchema = z.object({
    num_questions: z.number().int().min(5).max(30),
    categories: z.array(z.string().uuid()).max(10).nullable().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'mix']).optional(),
    bet_amount: z.number().int().min(0).max(10000).optional().default(0),
    bet_type: z.enum(['none', 'fixed', 'custom']).optional().default('none'),
    insurance_enabled: z.boolean().optional(),
    insurance_rate: z.number().min(0).max(1).optional(),
    insurance_coverage_rate: z.number().min(0).max(1).optional(),
    security_context: z.object({
        ip_hash: z.string().max(255).optional(),
        device_hash: z.string().max(255).optional()
    }).optional()
});

// ===== RANDOM NUMBER GENERATION =====

export function mulberry32(seed: number) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function fisherYatesShuffle<T>(array: T[], rng: () => number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ===== QUESTION FETCHING =====

export async function fetchRandomQuestions(
    supabase: SupabaseClient,
    count: number,
    country: string,
    categories?: string[] | null,
    difficulty?: string | null,
    seed: number
) {
    const t1 = Date.now();
    let query = supabase.from('questions_new').select('id');

    // Map country
    let countryCode = 'es';
    const c = country ? country.toLowerCase().trim() : 'spain';
    if (c === 'russia' || c === 'ru') countryCode = 'ru';
    else if (c === 'spain' || c === 'es') countryCode = 'es';
    else countryCode = c;
    query = query.eq('country', countryCode);

    if (categories && categories.length > 0) {
        query = query.in('category_id', categories);
    }

    if (difficulty && difficulty !== 'mix') {
        query = query.eq('difficulty', difficulty);
    }

    const { data: ids, error } = await query;

    if (error) {
        console.error('[fetchRandomQuestions] Error fetching IDs:', error);
        throw error;
    }

    if (!ids || ids.length === 0) return [];

    console.log(`[fetchRandomQuestions] Found ${ids.length} questions for country=${countryCode}`);

    const rng = mulberry32(seed);
    const shuffledIds = fisherYatesShuffle(ids.map(x => x.id), rng);
    const selectedIds = shuffledIds.slice(0, count);

    const { data: questions, error: detailsError } = await supabase
        .from('questions_new')
        .select(`
      id, question_ru, question_es, question_en, image_url, difficulty,
      answer_options (id, text_ru, text_es, text_en, is_correct, position)
    `)
        .in('id', selectedIds);

    if (detailsError) {
        console.error('[fetchRandomQuestions] Error fetching details:', detailsError);
        throw detailsError;
    }

    const questionsMap = new Map((questions || []).map(q => [q.id, q]));
    return selectedIds.map(id => questionsMap.get(id)).filter(q => !!q);
}

// ===== INSURANCE =====

const BASE_INSURANCE_RATE = 0.15;
const MIN_INSURANCE_RATE = 0.05;
const MAX_INSURANCE_RATE = 0.35;
const BASE_COVERAGE_RATE = 0.6;
const MIN_COVERAGE_RATE = 0.5;
const MAX_COVERAGE_RATE = 0.9;

const clampNumber = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

export const getInsuranceConfig = (
    betAmount: number,
    options?: {
        enabled?: boolean;
        rate?: number;
        coverageRate?: number;
    }
) => {
    const enabled = !!options?.enabled && betAmount > 0;
    const rate = enabled
        ? clampNumber(options?.rate ?? BASE_INSURANCE_RATE, MIN_INSURANCE_RATE, MAX_INSURANCE_RATE)
        : 0;
    const coverageRate = enabled
        ? clampNumber(options?.coverageRate ?? BASE_COVERAGE_RATE, MIN_COVERAGE_RATE, MAX_COVERAGE_RATE)
        : 0;
    const premium = enabled ? Math.ceil(betAmount * rate) : 0;
    return { enabled, rate, coverageRate, premium };
};

// ===== BOT HELPERS =====

const BOT_NAMES = [
    'Александр', 'Мария', 'Дмитрий', 'Анна', 'Иван', 'Елена', 'Сергей', 'Ольга',
    'Carlos', 'María', 'José', 'Ana', 'Luis', 'Carmen', 'Juan', 'Laura',
    'James', 'Emma', 'Michael', 'Olivia', 'William', 'Sophia', 'David', 'Isabella',
];

export function getDeterministicBotName(id: string): string {
    if (!id) return BOT_NAMES[0];
    const botNameIndex = parseInt(id.replace(/-/g, '').slice(0, 8), 16) % BOT_NAMES.length;
    return BOT_NAMES[botNameIndex];
}

export function generateBotProfile(playerLevel: number, winStreak: number = 0, botId?: string): {
    name: string;
    avatar: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'insane';
} {
    let difficulty: 'easy' | 'medium' | 'hard' | 'insane' = 'medium';

    if (winStreak >= 5) {
        difficulty = 'insane';
    } else if (winStreak >= 3) {
        difficulty = 'hard';
    } else if (winStreak <= 2) {
        if (playerLevel >= 8) {
            difficulty = 'hard';
        } else if (playerLevel >= 4) {
            difficulty = 'medium';
        } else {
            difficulty = 'easy';
        }
    }

    const name = botId ? getDeterministicBotName(botId) : BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const BOT_AVATARS = ['default', 'cyberpunk', 'hacker', 'ninja', 'warrior', 'ghost', 'neon'];
    const avatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];

    return { name, avatar, difficulty };
}

// ===== CODE GENERATION =====

export function generateDuelCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
