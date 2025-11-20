-- =====================================================
-- LEADERBOARD INDEXES: Оптимизация запросов лидерборда
-- =====================================================

-- Индекс для сортировки по уровню и XP (основной запрос лидерборда)
CREATE INDEX IF NOT EXISTS idx_profiles_duel_pass_leaderboard 
  ON public.profiles(duel_pass_level DESC, duel_pass_xp DESC)
  WHERE duel_pass_level IS NOT NULL;

-- Индекс для фильтрации по стране (language_code)
CREATE INDEX IF NOT EXISTS idx_profiles_language_code_duel_pass
  ON public.profiles(language_code, duel_pass_level DESC, duel_pass_xp DESC)
  WHERE duel_pass_level IS NOT NULL AND language_code IS NOT NULL;

-- Индекс для referrals (для фильтра "друзья")
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_leaderboard
  ON public.referrals(referrer_id, referred_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_leaderboard
  ON public.referrals(referred_id, referrer_id);

-- Композитный индекс для быстрого поиска друзей пользователя
CREATE INDEX IF NOT EXISTS idx_referrals_friends_lookup
  ON public.referrals(referrer_id, referred_id)
  WHERE referrer_id IS NOT NULL AND referred_id IS NOT NULL;

COMMENT ON INDEX idx_profiles_duel_pass_leaderboard IS 'Оптимизация основного запроса лидерборда по уровню и XP';
COMMENT ON INDEX idx_profiles_language_code_duel_pass IS 'Оптимизация фильтрации лидерборда по стране';
COMMENT ON INDEX idx_referrals_referrer_leaderboard IS 'Оптимизация поиска друзей (referrer)';
COMMENT ON INDEX idx_referrals_referred_leaderboard IS 'Оптимизация поиска друзей (referred)';

