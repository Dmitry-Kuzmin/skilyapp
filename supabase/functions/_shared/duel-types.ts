// ========================================
// Duel Manager Types
// ========================================

export interface DuelPlayer {
    id: string;
    user_id: string;
    duel_id: string;
    is_bot: boolean;
    score: number;
    is_active: boolean;
    name?: string;
    avatar?: string;
}

export interface DuelAnswer {
    id: string;
    player_id: string;
    duel_question_id: string;
    answer_option_ids: string[];
    is_correct: boolean;
    time_ms: number;
    created_at: string;
}

export interface AnswerOption {
    id: string;
    text_ru: string;
    text_es: string;
    text_en: string;
    is_correct: boolean;
    position: number;
}

export interface QuestionData {
    id: string;
    question_ru: string;
    question_es: string;
    question_en: string;
    image_url: string | null;
    difficulty?: string;
    answer_options: AnswerOption[];
}

export interface DuelQuestion {
    id: string;
    duel_id: string;
    question_id: string;
    position: number;
    question_ru?: string;
    question_es?: string;
    question_en?: string;
    image_url?: string | null;
    answer_options?: AnswerOption[];
    correct_answer_ids?: string[];
}

export interface BoostEffect {
    success: boolean;
    boost_type?: string;
    eliminated_options?: string[];
    hidden_options?: string[];
    time_added_ms?: number;
    message?: string;
}

export interface ProfileData {
    id: string;
    first_name?: string | null;
    username?: string | null;
    telegram_id?: number | null;
    avatar_url?: string | null;
}
