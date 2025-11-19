-- =====================================================
-- Notification Rules, Telegram Linking, and Template Seeds
-- =====================================================

-- Telegram link tokens table
CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_profile_id
  ON public.telegram_link_tokens(profile_id);

-- История привязок/отвязок
CREATE TABLE IF NOT EXISTS public.telegram_link_history (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT,
  action TEXT NOT NULL CHECK (action IN ('linked', 'unlinked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS for telegram_link_tokens (пользователь видит только свои токены)
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Telegram tokens are manageable by profile owner"
  ON public.telegram_link_tokens
  FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Notification rules table
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_state_filter JSONB DEFAULT '{}'::jsonb,
  category TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 1,
  cooldown_hours INT NOT NULL DEFAULT 0,
  max_per_day INT NOT NULL DEFAULT 1,
  template_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_rules_rule_name_key UNIQUE (rule_name)
);

CREATE INDEX IF NOT EXISTS idx_notification_rules_event
  ON public.notification_rules(event_type);

CREATE INDEX IF NOT EXISTS idx_notification_rules_template
  ON public.notification_rules(template_type);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_notification_rule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_notification_rules
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_rule_timestamp();

-- =====================================================
-- RPC Functions for Telegram Linking
-- =====================================================

-- Создание токена привязки (доступно авторизованным пользователям)
CREATE OR REPLACE FUNCTION public.create_telegram_link_token()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_token UUID;
BEGIN
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for current user';
  END IF;

  -- Очищаем старые токены для профиля
  DELETE FROM public.telegram_link_tokens
  WHERE profile_id = v_profile_id
    OR expires_at < now();

  INSERT INTO public.telegram_link_tokens (profile_id)
  VALUES (v_profile_id)
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_telegram_link_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_telegram_link_token() TO authenticated;

-- Привязка telegram_id к профилю
CREATE OR REPLACE FUNCTION public.link_telegram_user(p_token UUID, p_telegram_id BIGINT, p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_existing_profile UUID;
  v_result JSONB;
BEGIN
  SELECT profile_id INTO v_profile_id
  FROM public.telegram_link_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Link token is invalid or expired';
  END IF;

  SELECT id INTO v_existing_profile
  FROM public.profiles
  WHERE telegram_id = p_telegram_id
  LIMIT 1;

  IF v_existing_profile IS NOT NULL AND v_existing_profile <> v_profile_id THEN
    RAISE EXCEPTION 'Telegram account already linked to another profile';
  END IF;

  UPDATE public.profiles
  SET telegram_id = p_telegram_id,
      username = COALESCE(p_username, username),
      updated_at = now()
  WHERE id = v_profile_id;

  UPDATE public.telegram_link_tokens
  SET used_at = now()
  WHERE token = p_token;

  INSERT INTO public.telegram_link_history (profile_id, telegram_id, action, metadata)
  VALUES (v_profile_id, p_telegram_id, 'linked', jsonb_build_object('username', p_username));

  v_result = jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'telegram_id', p_telegram_id
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.link_telegram_user(UUID, BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_telegram_user(UUID, BIGINT, TEXT) TO service_role;

-- Отвязка Telegram
CREATE OR REPLACE FUNCTION public.unlink_telegram_user(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_telegram BIGINT;
BEGIN
  SELECT telegram_id INTO v_old_telegram
  FROM public.profiles
  WHERE id = p_profile_id;

  UPDATE public.profiles
  SET telegram_id = NULL,
      updated_at = now()
  WHERE id = p_profile_id;

  IF v_old_telegram IS NOT NULL THEN
    INSERT INTO public.telegram_link_history (profile_id, telegram_id, action)
    VALUES (p_profile_id, v_old_telegram, 'unlinked');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.unlink_telegram_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlink_telegram_user(UUID) TO service_role;

-- =====================================================
-- Extend notification_templates category constraint
-- =====================================================

-- Удаляем старый constraint и добавляем новый с дополнительными категориями
ALTER TABLE public.notification_templates
  DROP CONSTRAINT IF EXISTS notification_templates_category_check;

ALTER TABLE public.notification_templates
  ADD CONSTRAINT notification_templates_category_check
  CHECK (category IN ('progress', 'duel', 'daily', 'educational', 'motivation', 'system', 'monetization', 'premium'));

-- =====================================================
-- Seed Notification Templates (idempotent)
-- =====================================================

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon, cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'duel', 'duel_invite', '⚔️ {opponent_name} бросил вызов!',
  'Дуэль на {num_questions} вопросов, ставка {bet_amount} монет.',
  '⚔️', 'Ответить на вызов', 'duel_{duel_id}',
  jsonb_build_object('event', 'duel_invite_created'),
  0, 5, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'duel_invite'
);

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon, cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'duel', 'duel_win', '🏆 Победа!',
  'Счёт {your_score}:{opponent_score}. {personalized_comment}',
  '🏆', 'Смотреть результат', 'duel_{duel_id}',
  jsonb_build_object('event', 'duel_finished', 'is_winner', true),
  0, 5, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'duel_win'
);

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon, cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'duel', 'duel_lose', '💪 Почти получилось',
  'Счёт {your_score}:{opponent_score}. Каждое поражение — урок. Возьмём реванш?',
  '💪', 'Назначить реванш', 'duel_{duel_id}',
  jsonb_build_object('event', 'duel_finished', 'is_winner', false),
  0, 4, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'duel_lose'
);

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon, cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'daily', 'daily_task', '🎯 Мини-задача на сегодня',
  '{task_description}',
  '🎯', 'Пройти тест', 'test_daily',
  jsonb_build_object('event', 'reminder_daily'),
  24, 3, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'daily_task'
);

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon, cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'monetization', 'low_balance', '💡 Мало монет',
  'Осталось {coins_left} монет. Маленький пакет 300 монет ~1.99€.',
  '🪙', 'Посмотреть пакет', 'store_coins',
  jsonb_build_object('event', 'low_balance'),
  72, 2, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'low_balance'
);

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon, cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'progress', 'season_near_reward', '🏅 Остался 1 уровень до награды!',
  'Ты почти получил {reward_name}. Хочешь ускориться?',
  '🏅', 'Ускорить сезон', 'season_pass',
  jsonb_build_object('event', 'season_near_reward'),
  48, 4, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'season_near_reward'
);

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon, cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'motivation', 'reengage_challenge', '🔄 Вернём ритм без стресса',
  'Попробуем челлендж 3×1 тест? Я напомню только в удобное время.',
  '🔄', 'Запустить челлендж', 'challenge_reengage',
  jsonb_build_object('event', 'user_passive_7d'),
  168, 4, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'reengage_challenge'
);

INSERT INTO public.notification_templates (
  category, type, title_template, message_template, icon, cta_text, cta_deeplink, trigger_condition,
  cooldown_hours, priority, is_active, ai_enhance
)
SELECT 
  'premium', 'ai_unlimited', '🤖 Skily на связи 24/7',
  'Хочешь задавать любые вопросы прямо здесь без лимитов? Включи Skily+.',
  '🤖', 'Активировать Skily+', 'premium_ai',
  jsonb_build_object('event', 'ai_usage_high'),
  120, 3, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates WHERE type = 'ai_unlimited'
);

-- =====================================================
-- Seed Notification Rules
-- =====================================================

INSERT INTO public.notification_rules (
  rule_name, event_type, user_state_filter, category, priority,
  cooldown_hours, max_per_day, template_type
) VALUES
  (
    'Duel Result Win',
    'duel_finished_win',
    jsonb_build_object('state', ARRAY['active','at_risk']),
    'duel',
    5,
    0,
    5,
    'duel_win'
  ),
  (
    'Duel Result Lose',
    'duel_finished_lose',
    jsonb_build_object('state', ARRAY['active','at_risk']),
    'duel',
    4,
    0,
    5,
    'duel_lose'
  ),
  (
    'Duel Invite Default',
    'duel_invite_created',
    jsonb_build_object('state', ARRAY['active','at_risk']),
    'duel',
    5,
    0,
    10,
    'duel_invite'
  ),
  (
    'Daily Task Active',
    'reminder_daily',
    jsonb_build_object('state', ARRAY['active']),
    'daily',
    3,
    24,
    1,
    'daily_task'
  ),
  (
    'Low Balance Offer',
    'low_balance',
    jsonb_build_object('state', ARRAY['active','at_risk'], 'coins_lt', 120),
    'monetization',
    2,
    72,
    1,
    'low_balance'
  ),
  (
    'Season Near Reward',
    'season_near_reward',
    jsonb_build_object('state', ARRAY['active','at_risk'], 'season_progress_gt', 0.7),
    'progress',
    4,
    48,
    1,
    'season_near_reward'
  ),
  (
    'Passive User Challenge',
    'user_passive_7d',
    jsonb_build_object('state', ARRAY['passive']),
    'motivation',
    4,
    168,
    1,
    'reengage_challenge'
  ),
  (
    'AI Unlimited Upsell',
    'ai_usage_high',
    jsonb_build_object('state', ARRAY['active','at_risk']),
    'premium',
    3,
    120,
    1,
    'ai_unlimited'
  )
ON CONFLICT (rule_name) DO NOTHING;


