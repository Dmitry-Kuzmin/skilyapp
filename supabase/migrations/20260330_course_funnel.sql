-- =====================================================
-- Course Funnel: course_plans + course_leads
-- Воронка продаж курса DGT
-- =====================================================

-- Тарифы курса — цены меняются здесь, подхватываются ботом и лендингом
CREATE TABLE IF NOT EXISTS course_plans (
  id TEXT PRIMARY KEY,                     -- 'basic', 'pro', 'vip'
  label_ru TEXT NOT NULL,
  price_eur INTEGER NOT NULL,              -- текущая цена в EUR
  original_price_eur INTEGER,             -- цена до скидки (для зачёркивания)
  stripe_link TEXT,                        -- Stripe Payment Link URL
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Начальные данные (редактируй здесь чтобы менять цены)
INSERT INTO course_plans (id, label_ru, price_eur, original_price_eur, stripe_link)
VALUES
  ('basic', 'Только теория',           199, 199, NULL),
  ('pro',   'С сопровождением 🚀',     259, 324, NULL),
  ('vip',   'VIP — Под ключ 👑',       349, 437, NULL)
ON CONFLICT (id) DO UPDATE
  SET label_ru           = EXCLUDED.label_ru,
      price_eur          = EXCLUDED.price_eur,
      original_price_eur = EXCLUDED.original_price_eur,
      updated_at         = now();

-- Лиды из бота
CREATE TABLE IF NOT EXISTS course_leads (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id    BIGINT NOT NULL,
  telegram_user  TEXT,                    -- @username или имя
  first_name     TEXT,
  status         TEXT DEFAULT 'new',      -- new | qualified | plan_selected | paid | lost
  plan_id        TEXT REFERENCES course_plans(id),
  qualification  JSONB,                   -- {status_answer, attempt_answer}
  payment_method TEXT,                    -- card | crypto | rub
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Индекс для быстрого поиска по telegram_id
CREATE INDEX IF NOT EXISTS course_leads_telegram_idx ON course_leads(telegram_id);

-- Дата старта потока (редактируется одной строкой)
CREATE TABLE IF NOT EXISTS course_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO course_config (key, value)
VALUES ('next_stream_date', '7 апреля 2026')
ON CONFLICT (key) DO NOTHING;

INSERT INTO course_config (key, value)
VALUES ('spots_remaining', '4')
ON CONFLICT (key) DO NOTHING;
