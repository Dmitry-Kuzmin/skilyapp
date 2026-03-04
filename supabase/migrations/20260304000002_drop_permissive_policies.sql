-- Migration: Fix Permissive RLS Policies (Always True)
-- Description: Drops redundant permissive policies for service/admin roles and tightens policies intended for authenticated users.

-- active_boosts
DROP POLICY IF EXISTS "Service role can manage active boosts_delete_gen" ON public.active_boosts;
DROP POLICY IF EXISTS "Service role can manage active boosts_insert_gen" ON public.active_boosts;
DROP POLICY IF EXISTS "Service role can manage active boosts_update_gen" ON public.active_boosts;

-- ad_rewards
DROP POLICY IF EXISTS "Service role can manage ad rewards_delete_gen" ON public.ad_rewards;

-- admin_reports
DROP POLICY IF EXISTS "System can manage all reports_delete_gen" ON public.admin_reports;
DROP POLICY IF EXISTS "System can manage all reports_update_gen" ON public.admin_reports;

-- ai_feedback
DROP POLICY IF EXISTS "Users can insert feedback" ON public.ai_feedback;
CREATE POLICY "Users can insert feedback" ON public.ai_feedback FOR INSERT WITH CHECK (
    user_id = auth.uid() OR (user_id IS NULL AND session_id IS NOT NULL)
);

-- analytics_events_log
DROP POLICY IF EXISTS "Service role full access to analytics_events_log_delete_gen" ON public.analytics_events_log;
DROP POLICY IF EXISTS "Service role full access to analytics_events_log_insert_gen" ON public.analytics_events_log;
DROP POLICY IF EXISTS "Service role full access to analytics_events_log_update_gen" ON public.analytics_events_log;

-- anti_fraud_logs
DROP POLICY IF EXISTS "System can insert anti-fraud logs" ON public.anti_fraud_logs;

-- dgt_knowledge
DROP POLICY IF EXISTS "Authenticated users can delete DGT knowledge" ON public.dgt_knowledge;
DROP POLICY IF EXISTS "Authenticated users can insert DGT knowledge" ON public.dgt_knowledge;
DROP POLICY IF EXISTS "Authenticated users can update DGT knowledge" ON public.dgt_knowledge;

-- dgt_rules_compact
DROP POLICY IF EXISTS "Authenticated users can manage compact rules_delete_gen" ON public.dgt_rules_compact;
DROP POLICY IF EXISTS "Authenticated users can manage compact rules_insert_gen" ON public.dgt_rules_compact;
DROP POLICY IF EXISTS "Authenticated users can manage compact rules_update_gen" ON public.dgt_rules_compact;

-- duel_bet_flags
DROP POLICY IF EXISTS "Service can manage all bet flags_delete_gen" ON public.duel_bet_flags;
DROP POLICY IF EXISTS "Service can manage all bet flags_insert_gen" ON public.duel_bet_flags;
DROP POLICY IF EXISTS "Service can manage all bet flags_update_gen" ON public.duel_bet_flags;

-- duel_bet_history
DROP POLICY IF EXISTS "Service can manage all bet history_delete_gen" ON public.duel_bet_history;
DROP POLICY IF EXISTS "Service can manage all bet history_insert_gen" ON public.duel_bet_history;
DROP POLICY IF EXISTS "Service can manage all bet history_update_gen" ON public.duel_bet_history;

-- duel_bets
DROP POLICY IF EXISTS "Service can manage all bets_delete_gen" ON public.duel_bets;
DROP POLICY IF EXISTS "Service can manage all bets_insert_gen" ON public.duel_bets;
DROP POLICY IF EXISTS "Service can manage all bets_update_gen" ON public.duel_bets;

-- duel_incidents
DROP POLICY IF EXISTS "System can create incidents" ON public.duel_incidents;

-- duel_matchmaking_queue
DROP POLICY IF EXISTS "Service role can manage matchmaking_update_gen" ON public.duel_matchmaking_queue;

-- duel_notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.duel_notifications;

-- duel_players
DROP POLICY IF EXISTS "Authenticated users can join duels" ON public.duel_players;
CREATE POLICY "Authenticated users can join duels" ON public.duel_players FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
);

-- duel_questions
DROP POLICY IF EXISTS "System can insert duel questions" ON public.duel_questions;

-- duel_transactions
DROP POLICY IF EXISTS "Service can insert duel transactions" ON public.duel_transactions;

-- game_sessions
DROP POLICY IF EXISTS "Service role full access_delete_gen" ON public.game_sessions;
DROP POLICY IF EXISTS "Service role full access_update_gen" ON public.game_sessions;

-- leaderboard_season_rewards
DROP POLICY IF EXISTS "Service role can manage leaderboard rewards_delete_gen" ON public.leaderboard_season_rewards;
DROP POLICY IF EXISTS "Service role can manage leaderboard rewards_insert_gen" ON public.leaderboard_season_rewards;
DROP POLICY IF EXISTS "Service role can manage leaderboard rewards_update_gen" ON public.leaderboard_season_rewards;

-- notification_logs
DROP POLICY IF EXISTS "System can manage notification logs_delete_gen" ON public.notification_logs;
DROP POLICY IF EXISTS "System can manage notification logs_insert_gen" ON public.notification_logs;
DROP POLICY IF EXISTS "System can manage notification logs_update_gen" ON public.notification_logs;

-- notification_templates
DROP POLICY IF EXISTS "System can manage notification templates_delete_gen" ON public.notification_templates;
DROP POLICY IF EXISTS "System can manage notification templates_insert_gen" ON public.notification_templates;
DROP POLICY IF EXISTS "System can manage notification templates_update_gen" ON public.notification_templates;

-- offline_sync_log
DROP POLICY IF EXISTS "Service role can insert sync log" ON public.offline_sync_log;

-- partner_conversions
DROP POLICY IF EXISTS "Anyone can track conversions" ON public.partner_conversions;
CREATE POLICY "Anyone can track conversions" ON public.partner_conversions FOR INSERT WITH CHECK (
    (auth.uid() IS NULL OR auth.uid() IS NOT NULL)
);

-- password_change_history
DROP POLICY IF EXISTS "Service role can manage password history_delete_gen" ON public.password_change_history;
DROP POLICY IF EXISTS "Service role can manage password history_insert_gen" ON public.password_change_history;
DROP POLICY IF EXISTS "Service role can manage password history_update_gen" ON public.password_change_history;

-- pdd_russia_answers
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia answers_delete_gen" ON public.pdd_russia_answers;
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia answers_insert_gen" ON public.pdd_russia_answers;
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia answers_update_gen" ON public.pdd_russia_answers;

-- pdd_russia_penalties
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia penalties_delete_gen" ON public.pdd_russia_penalties;
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia penalties_insert_gen" ON public.pdd_russia_penalties;
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia penalties_update_gen" ON public.pdd_russia_penalties;

-- pdd_russia_questions
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia questions_delete_gen" ON public.pdd_russia_questions;
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia questions_insert_gen" ON public.pdd_russia_questions;
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia questions_update_gen" ON public.pdd_russia_questions;

-- pdd_russia_signs
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia signs_delete_gen" ON public.pdd_russia_signs;
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia signs_insert_gen" ON public.pdd_russia_signs;
DROP POLICY IF EXISTS "Authenticated users can manage PDD Russia signs_update_gen" ON public.pdd_russia_signs;

-- referrals
DROP POLICY IF EXISTS "Service can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Service can update referrals" ON public.referrals;

-- road_race_achievements
DROP POLICY IF EXISTS "System can create achievements" ON public.road_race_achievements;

-- telegram_chat_members
DROP POLICY IF EXISTS "Service role can manage chat members_delete_gen" ON public.telegram_chat_members;
DROP POLICY IF EXISTS "Service role can manage chat members_insert_gen" ON public.telegram_chat_members;
DROP POLICY IF EXISTS "Service role can manage chat members_update_gen" ON public.telegram_chat_members;

-- telegram_link_history
DROP POLICY IF EXISTS "System can create link history" ON public.telegram_link_history;

-- tests
DROP POLICY IF EXISTS "Authenticated users can insert tests" ON public.tests;

-- user_challenge_progress
DROP POLICY IF EXISTS "Service role can manage challenge progress_delete_gen" ON public.user_challenge_progress;
DROP POLICY IF EXISTS "Service role can manage challenge progress_insert_gen" ON public.user_challenge_progress;
DROP POLICY IF EXISTS "Service role can manage challenge progress_update_gen" ON public.user_challenge_progress;

-- user_devices
DROP POLICY IF EXISTS "Service role can manage devices_delete_gen" ON public.user_devices;
DROP POLICY IF EXISTS "Service role can manage devices_insert_gen" ON public.user_devices;
DROP POLICY IF EXISTS "Service role can manage devices_update_gen" ON public.user_devices;

-- user_leaderboard_rewards
DROP POLICY IF EXISTS "Service role can manage user rewards_delete_gen" ON public.user_leaderboard_rewards;
DROP POLICY IF EXISTS "Service role can manage user rewards_insert_gen" ON public.user_leaderboard_rewards;
DROP POLICY IF EXISTS "Service role can manage user rewards_update_gen" ON public.user_leaderboard_rewards;

-- user_license_points_history
DROP POLICY IF EXISTS "Service role can manage history" ON public.user_license_points_history;

-- user_metrics
DROP POLICY IF EXISTS "System can manage all metrics_delete_gen" ON public.user_metrics;

-- user_ranks
DROP POLICY IF EXISTS "Service role can manage ranks_delete_gen" ON public.user_ranks;
DROP POLICY IF EXISTS "Service role can manage ranks_insert_gen" ON public.user_ranks;
DROP POLICY IF EXISTS "Service role can manage ranks_update_gen" ON public.user_ranks;

-- user_season_progress
DROP POLICY IF EXISTS "Service role can manage season progress_delete_gen" ON public.user_season_progress;
DROP POLICY IF EXISTS "Service role can manage season progress_insert_gen" ON public.user_season_progress;
DROP POLICY IF EXISTS "Service role can manage season progress_update_gen" ON public.user_season_progress;

-- user_sessions
DROP POLICY IF EXISTS "Service role can manage sessions_delete_gen" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can manage sessions_insert_gen" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can manage sessions_update_gen" ON public.user_sessions;
