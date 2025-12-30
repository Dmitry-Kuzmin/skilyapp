// ============================================
// Duel System Type Definitions
// ============================================

export interface DuelData {
    id: string;
    status: 'pending' | 'active' | 'finished' | 'expired' | 'cancelled';
    host_user: string;
    bet_amount: number;
    bet_type: 'none' | 'fixed' | 'custom';
    num_questions: number;
    difficulty?: 'easy' | 'medium' | 'hard' | 'mix' | null;
    created_at: string;
    started_at?: string | null;
    finished_at?: string | null;
    code?: string;
    winner_id?: string | null;
}

export interface DuelPlayerProfile {
    id?: string;
    first_name?: string;
    username?: string;
    avatar_url?: string | null;
    telegram_id?: number;
}

export interface DuelPlayer {
    id: string;
    user_id: string;
    duel_id: string;
    score: number;
    is_bot: boolean;
    is_active: boolean;
    created_at?: string;
    profiles?: DuelPlayerProfile;
}

export interface AnswerOption {
    id: string;
    text_ru: string;
    text_es: string;
    text_en: string;
    is_correct: boolean;
    position: number;
}

export interface DuelQuestionSnapshot {
    question_ru: string;
    question_es: string;
    question_en: string;
    image_url?: string | null;
    difficulty?: string;
    answer_options: AnswerOption[];
}

export interface DuelQuestion {
    id: string;
    duel_id: string;
    question_id: string;
    position: number;
    correct_option_ids: string[];
    question_snapshot: DuelQuestionSnapshot;
    created_at?: string;
}

export interface DuelAnswer {
    id: string;
    player_id: string;
    duel_question_id: string;
    answer_option_ids: string[];
    is_correct: boolean;
    time_ms: number;
    created_at: string;
    duel_questions?: DuelQuestion;
}

// ============================================
// Duel Results & State
// ============================================

export interface DuelResults {
    duel: DuelData;
    players: DuelPlayer[];
    myPlayer: DuelPlayer;
    opponentPlayer: DuelPlayer;
    myAnswers: DuelAnswer[];
    opponentAnswers: DuelAnswer[];
}

export interface DuelState {
    duel: DuelData | null;
    myPlayer: DuelPlayer | null;
    opponentPlayer: DuelPlayer | null;
    currentQuestionIndex: number;
    myAnswers: DuelAnswer[];
    opponentAnswers: DuelAnswer[];
    isFinished: boolean;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateDuelRequest {
    action: 'create_duel' | 'find_match';
    profile_id: string;
    num_questions: number;
    categories?: string[] | null;
    difficulty?: 'easy' | 'medium' | 'hard' | 'mix';
    bet_amount?: number;
    bet_type?: 'none' | 'fixed' | 'custom';
    insurance_enabled?: boolean;
    insurance_rate?: number;
}

export interface JoinDuelRequest {
    action: 'join_duel';
    profile_id: string;
    code: string;
    insurance_enabled?: boolean;
}

export interface SubmitAnswerRequest {
    action: 'submit_answer';
    profile_id: string;
    duel_id: string;
    duel_question_id: string;
    answer_option_ids: string[];
    time_ms: number;
}

export interface DuelActionResponse {
    success?: boolean;
    duel?: DuelData;
    player?: DuelPlayer;
    error?: string;
    message?: string;
}
