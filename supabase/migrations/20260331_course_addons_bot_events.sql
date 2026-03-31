-- =====================================================
-- Course Addons + Bot Events
-- Единый источник правды для цен и аналитика бота
-- =====================================================

-- ─── 1. Расширяем course_plans: промо-поля ───────────

ALTER TABLE course_plans
  ADD COLUMN IF NOT EXISTS format       TEXT    NOT NULL DEFAULT 'group',
  -- 'group' | 'mini_group' | 'individual'
  ADD COLUMN IF NOT EXISTS promo_label  TEXT,
  -- 'Акция старта -20%' — показывается в боте и на лендинге
  ADD COLUMN IF NOT EXISTS promo_until  TIMESTAMPTZ,
  -- null = бессрочно, иначе — дата окончания
  ADD COLUMN IF NOT EXISTS features     JSONB,
  -- ["8 живых сессий", "Чат куратора", ...] — фичи для лендинга
  ADD COLUMN IF NOT EXISTS sort_order   INTEGER NOT NULL DEFAULT 10;

-- Актуализируем существующие тарифы (группы)
UPDATE course_plans SET
  format     = 'group',
  features   = '["8 живых занятий с куратором","Чат поддержки группы","Платформа Skilyapp 3 мес","Записи занятий"]',
  sort_order = CASE id WHEN 'basic' THEN 1 WHEN 'pro' THEN 2 WHEN 'vip' THEN 3 END
WHERE id IN ('basic', 'pro', 'vip');

-- Добавляем мини-группу и индивидуальный формат
INSERT INTO course_plans (id, label_ru, price_eur, original_price_eur, active, format, features, sort_order)
VALUES
  ('mini_group',
   'Мини-группа 2–3 чел',
   499, 499, true, 'mini_group',
   '["8 живых сессий с преподавателем","Группа 2–3 человека","Платформа Skilyapp 3 мес","Чат группы с куратором","Записи занятий"]',
   10),

  ('individual',
   'Индивидуально',
   799, 799, true, 'individual',
   '["8 сессий полностью под тебя","Только ты и преподаватель","Платформа Skilyapp 6 мес","Личный куратор 24/7","Гибкое расписание","Записи навсегда"]',
   11)
ON CONFLICT (id) DO UPDATE
  SET label_ru           = EXCLUDED.label_ru,
      price_eur          = EXCLUDED.price_eur,
      original_price_eur = EXCLUDED.original_price_eur,
      format             = EXCLUDED.format,
      features           = EXCLUDED.features,
      sort_order         = EXCLUDED.sort_order,
      updated_at         = now();

-- ─── 2. Аддоны ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_addons (
  id                  SERIAL PRIMARY KEY,
  addon_key           TEXT UNIQUE NOT NULL,
  -- 'spanish' | 'documents' | 'extra_session'
  label               TEXT NOT NULL,
  description         TEXT,
  -- короткое пояснение под названием
  price_group         INTEGER NOT NULL DEFAULT 0,
  -- цена для group / mini_group
  price_individual    INTEGER NOT NULL DEFAULT 0,
  -- цена для individual
  is_active           BOOLEAN DEFAULT true,
  sort_order          INTEGER DEFAULT 10,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

INSERT INTO course_addons (addon_key, label, description, price_group, price_individual, sort_order)
VALUES
  ('spanish',        'Испанский для водителей',  'Дорожная лексика и знаки на испанском', 60, 80, 1),
  ('documents',      'Помощь с документами',     'Сопровождение при подаче в DGT',        50, 50, 2),
  ('extra_session',  'Дополнительная сессия',    'Ещё одно занятие с преподавателем',     40, 60, 3)
ON CONFLICT (addon_key) DO UPDATE
  SET label            = EXCLUDED.label,
      description      = EXCLUDED.description,
      price_group      = EXCLUDED.price_group,
      price_individual = EXCLUDED.price_individual,
      sort_order       = EXCLUDED.sort_order,
      updated_at       = now();

-- ─── 3. Bot Events — аналитика воронки ───────────────

CREATE TABLE IF NOT EXISTS bot_events (
  id          BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  username    TEXT,
  event       TEXT NOT NULL,
  -- 'funnel_start' | 'step1_shown' | 'step2_visa' | 'tariffs_shown'
  -- 'plan_selected' | 'stream_selected' | 'payment_step' | 'doubt_handled'
  -- 'back_to_s1' | 'tourist_interstitial' | 'menu_opened'
  data        JSONB,
  -- { plan: 'pro', stream: 52, choice: 'vnj' } — контекст события
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_events_telegram_idx ON bot_events(telegram_id);
CREATE INDEX IF NOT EXISTS bot_events_event_idx    ON bot_events(event);
CREATE INDEX IF NOT EXISTS bot_events_created_idx  ON bot_events(created_at DESC);

-- ─── 4. RLS: только сервис-ключ пишет/читает ─────────

ALTER TABLE course_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_events    ENABLE ROW LEVEL SECURITY;

-- Только service_role (бот, Edge Functions, admin) — полный доступ
CREATE POLICY "service_role_all_addons" ON course_addons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_bot_events" ON bot_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Анонимный и authenticated — только чтение аддонов (для лендинга)
CREATE POLICY "public_read_addons" ON course_addons
  FOR SELECT TO anon, authenticated USING (is_active = true);
