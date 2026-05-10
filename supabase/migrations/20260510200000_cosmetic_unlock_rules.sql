-- =====================================================
-- Cosmetic unlock rules
-- Каждый предмет (скин/бейдж/стикер) получает 1+ правил открытия.
-- На фронте показываем "квест" вместо абстрактного "Закрыто".
-- Несколько правил на 1 предмет = OR-логика (выполнил любое — открыл).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cosmetic_unlock_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('skin', 'badge', 'sticker')),
  rule_type text NOT NULL CHECK (rule_type IN (
    'wins_total',          -- duel_stats.wins >= count
    'streak_wins',         -- duel_stats.current_streak >= count (победы в дуэлях подряд)
    'perfect_quiz',        -- N дуэлей где correct_count == num_questions
    'speed_avg',           -- средний answer time <= ms на N последних дуэлях
    'is_premium',          -- profiles.is_premium = true (или premium_until > now)
    'season_rank_top',     -- топ-N в любом сезоне (заполняется отдельно)
    'first_duel_win',      -- первая победа (welcome reward)
    'streak_days',         -- дневной login streak >= count
    'coins_purchase',      -- куплено за монеты в Black Market (Sprint 2)
    'manual'               -- выдаётся только вручную (дефолт для уже выданных)
  )),
  rule_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_text_ru text NOT NULL,
  display_text_es text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, item_type, rule_type)
);

CREATE INDEX IF NOT EXISTS idx_cosmetic_unlock_rules_item ON public.cosmetic_unlock_rules(item_id, item_type) WHERE is_active = true;

-- Все могут читать определения правил (как и определения косметики)
ALTER TABLE public.cosmetic_unlock_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read unlock rules"
  ON public.cosmetic_unlock_rules FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage unlock rules"
  ON public.cosmetic_unlock_rules FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.cosmetic_unlock_rules IS 'Правила открытия косметических предметов. OR-логика по item_id+item_type.';

-- =====================================================
-- Сид: правила для 19 размеченных в миграциях скинов и бейджей
-- =====================================================

-- Скины (19)
INSERT INTO public.cosmetic_unlock_rules (item_id, item_type, rule_type, rule_params, display_text_ru, display_text_es) VALUES
  -- Стартовые скины — выдаются всем (правило manual; они открываются грантом без предиката)
  ('avatar_default', 'skin', 'manual', '{}', 'Открыт по умолчанию', 'Desbloqueado por defecto'),
  ('avatar_basic',   'skin', 'manual', '{}', 'Открыт по умолчанию', 'Desbloqueado por defecto'),

  -- Огненный — серия побед в дуэлях подряд
  ('avatar_fire', 'skin', 'streak_wins', '{"count": 5}',
    'Победи в 5 дуэлях подряд', 'Gana 5 duelos seguidos'),

  -- Ледяной — высокая средняя скорость ответа
  ('avatar_ice', 'skin', 'speed_avg', '{"max_ms": 3000, "min_duels": 5}',
    'Средняя скорость ответа меньше 3 сек в 5 дуэлях', 'Tiempo medio de respuesta menor a 3 s en 5 duelos'),

  -- Золотой — Premium ИЛИ покупка за монеты
  ('avatar_gold', 'skin', 'is_premium', '{}',
    'Доступен с Premium', 'Disponible con Premium'),
  ('avatar_gold', 'skin', 'coins_purchase', '{"price": 5000}',
    'Купи в Black Market за 5000 монет', 'Cómpralo en el Black Market por 5000 monedas'),

  -- Алмазный — N идеальных дуэлей (correct == total)
  ('avatar_diamond', 'skin', 'perfect_quiz', '{"count": 30}',
    'Сыграй 30 безошибочных дуэлей', 'Completa 30 duelos sin errores'),

  -- Эпический — общее число побед
  ('avatar_epic', 'skin', 'wins_total', '{"count": 25}',
    'Выиграй 25 дуэлей', 'Gana 25 duelos'),

  -- Frame Novice — первая победа (welcome)
  ('frame_novice', 'skin', 'first_duel_win', '{}',
    'Выиграй свою первую дуэль', 'Gana tu primer duelo'),

  -- Frame 1 — за монеты
  ('frame_1', 'skin', 'coins_purchase', '{"price": 1000}',
    'Купи в Black Market за 1000 монет', 'Cómpralo en el Black Market por 1000 monedas'),

  -- Frame Epic — стрик дней (если нет таблицы дневного стрика — упадёт в "не выполнено")
  ('frame_epic', 'skin', 'streak_days', '{"count": 14}',
    'Заходи в Skily 14 дней подряд', 'Entra en Skily 14 días seguidos'),

  -- Premium-only скины
  ('frame_season_1_premium', 'skin', 'is_premium', '{}',
    'Доступен с Premium', 'Disponible con Premium'),
  ('skin_avatar_premium', 'skin', 'is_premium', '{}',
    'Доступен с Premium', 'Disponible con Premium'),

  -- Сезонные награды (выдаются отдельной механикой; правила тут только для текста)
  ('skin_champion_season_1', 'skin', 'season_rank_top', '{"rank": 1, "season": 1}',
    'Займи 1-е место в сезоне', 'Termina 1º en la temporada'),
  ('skin_silver_runner_season_1', 'skin', 'season_rank_top', '{"rank": 2, "season": 1}',
    'Займи 2-е место в сезоне', 'Termina 2º en la temporada'),
  ('skin_bronze_finalist_season_1', 'skin', 'season_rank_top', '{"rank": 3, "season": 1}',
    'Займи 3-е место в сезоне', 'Termina 3º en la temporada'),
  ('frame_champion_gold_season_1', 'skin', 'season_rank_top', '{"rank": 1, "season": 1}',
    'Займи 1-е место в сезоне', 'Termina 1º en la temporada'),
  ('frame_silver_runner_season_1', 'skin', 'season_rank_top', '{"rank": 2, "season": 1}',
    'Займи 2-е место в сезоне', 'Termina 2º en la temporada'),
  ('frame_bronze_finalist_season_1', 'skin', 'season_rank_top', '{"rank": 3, "season": 1}',
    'Займи 3-е место в сезоне', 'Termina 3º en la temporada'),
  ('frame_elite_top_10_season_1', 'skin', 'season_rank_top', '{"rank": 10, "season": 1}',
    'Войди в Топ-10 сезона', 'Entra en el Top 10 de la temporada')
ON CONFLICT (item_id, item_type, rule_type) DO NOTHING;

-- Бейджи (выдача автоматическая — правила реальные)
INSERT INTO public.cosmetic_unlock_rules (item_id, item_type, rule_type, rule_params, display_text_ru, display_text_es) VALUES
  ('badge_winner_10',  'badge', 'wins_total', '{"count": 10}',
    'Выиграй 10 дуэлей', 'Gana 10 duelos'),
  ('badge_winner_50',  'badge', 'wins_total', '{"count": 50}',
    'Выиграй 50 дуэлей', 'Gana 50 duelos'),
  ('badge_winner_100', 'badge', 'wins_total', '{"count": 100}',
    'Выиграй 100 дуэлей', 'Gana 100 duelos'),
  ('badge_streak_7',   'badge', 'streak_wins', '{"count": 7}',
    'Победи в 7 дуэлях подряд', 'Gana 7 duelos seguidos'),
  ('badge_perfect',    'badge', 'perfect_quiz', '{"count": 1}',
    'Заверши дуэль без единой ошибки', 'Completa un duelo sin errores'),
  ('badge_premium',    'badge', 'is_premium', '{}',
    'Доступен с Premium', 'Disponible con Premium'),
  ('badge_champion_season_1',      'badge', 'season_rank_top', '{"rank": 1, "season": 1}',
    'Займи 1-е место в сезоне', 'Termina 1º en la temporada'),
  ('badge_silver_runner_season_1', 'badge', 'season_rank_top', '{"rank": 2, "season": 1}',
    'Займи 2-е место в сезоне', 'Termina 2º en la temporada'),
  ('badge_bronze_finalist_season_1', 'badge', 'season_rank_top', '{"rank": 3, "season": 1}',
    'Займи 3-е место в сезоне', 'Termina 3º en la temporada'),
  ('badge_top_10_elite_season_1',  'badge', 'season_rank_top', '{"rank": 10, "season": 1}',
    'Войди в Топ-10 сезона', 'Entra en el Top 10 de la temporada'),
  ('title_champion_season_1',      'badge', 'season_rank_top', '{"rank": 1, "season": 1}',
    'Займи 1-е место в сезоне', 'Termina 1º en la temporada'),
  ('title_silver_runner_season_1', 'badge', 'season_rank_top', '{"rank": 2, "season": 1}',
    'Займи 2-е место в сезоне', 'Termina 2º en la temporada'),
  ('title_bronze_finalist_season_1', 'badge', 'season_rank_top', '{"rank": 3, "season": 1}',
    'Займи 3-е место в сезоне', 'Termina 3º en la temporada'),
  ('title_elite_top_10_season_1',  'badge', 'season_rank_top', '{"rank": 10, "season": 1}',
    'Войди в Топ-10 сезона', 'Entra en el Top 10 de la temporada'),
  ('badge_season_1',         'badge', 'season_rank_top', '{"rank": 9999, "season": 1}',
    'Сыграй хотя бы одну дуэль в сезоне 1', 'Juega al menos un duelo en la temporada 1'),
  ('season_1_silver',        'badge', 'season_rank_top', '{"rank": 2, "season": 1}',
    'Займи 2-е место в сезоне', 'Termina 2º en la temporada'),
  ('badge_season_1_gold',    'badge', 'is_premium', '{}',
    'Доступен с Premium на 10 уровне', 'Disponible con Premium en el nivel 10'),
  ('badge_season_1_platinum','badge', 'is_premium', '{}',
    'Доступен с Premium на 30 уровне', 'Disponible con Premium en el nivel 30')
ON CONFLICT (item_id, item_type, rule_type) DO NOTHING;
