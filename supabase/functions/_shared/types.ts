export interface UserMetrics {
    last_login_at: string | null;
    streak_days: number;
    total_tests_completed: number;
    total_duels_played: number;
    readiness_level: number | null;
}

export interface UserNotificationSettings {
    enabled: boolean | null;
    quiet_mode_until: string | null;
    only_important: boolean | null;
    categories_enabled: string[] | string | null;
    quiet_hours_start?: string | null;
    quiet_hours_end?: string | null;
    timezone?: string | null;
}

export interface NotificationRule {
    id: string;
    event_type: string;
    category: string;
    template_type: string;
    priority: number;
    enabled: boolean;
    cooldown_hours: number;
    max_per_day: number;
    user_state_filter: RuleFilter | null;
}

export interface RuleFilter {
    state?: ('new' | 'active' | 'passive' | 'at_risk')[];
    coins_lt?: number;
    season_progress_gt?: number;
}

export interface NotificationTemplate {
    id: string;
    type: string;
    title: string;
    body: string;
    is_active: boolean;
}

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

export interface AnswerOption {
    id: string;
    text_ru: string;
    text_es: string;
    text_en: string;
    is_correct: boolean;
    position: number;
}

export interface BoostEffect {
    success: boolean;
    boost_type?: string;
    eliminated_options?: string[];
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
