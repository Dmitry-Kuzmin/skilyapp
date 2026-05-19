-- ============================================================
-- Phase 1 hardening: Honeypot вопросы для детекции парсинга
-- ============================================================
-- Идея: добавляем в banco вопросов несколько вопросов с уникальной
-- формулировкой/комбинацией знаков, которой не существует в природе.
-- Эти вопросы НЕ показываются обычным пользователям (is_honeypot=true),
-- но присутствуют в БД и могут быть случайно подхвачены парсером,
-- если злоумышленник пытается выкачать всю таблицу.
--
-- Если эти вопросы потом находим на конкурентных сайтах / в датасетах,
-- у нас есть доказательство что они спарсили базу + timeframe.

-- ── Шаг 1: добавить колонку is_honeypot
ALTER TABLE public.questions_new
  ADD COLUMN IF NOT EXISTS is_honeypot BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_questions_new_honeypot
  ON public.questions_new(is_honeypot) WHERE is_honeypot = TRUE;

-- ── Шаг 2: исключить honeypot из questions_safe view, который видит клиент
DROP VIEW IF EXISTS public.questions_safe;

CREATE VIEW public.questions_safe AS
SELECT
  q.id,
  q.topic_id,
  q.difficulty,
  q.is_premium,
  q.type,
  q.image_url,
  q.sign_code,
  q.source,
  q.percent_correct,
  q.question_ru,
  q.question_es,
  q.question_en,
  q.explanation_ru,
  q.explanation_es,
  q.explanation_en,
  q.created_at,
  q.updated_at,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', ao.id,
          'text_ru', ao.text_ru,
          'text_es', ao.text_es,
          'text_en', ao.text_en,
          'position', ao.position
        )
        ORDER BY ao.position
      )
      FROM public.answer_options ao
      WHERE ao.question_id = q.id
    ),
    '[]'::json
  ) AS answer_options
FROM public.questions_new q
WHERE q.is_honeypot = FALSE;  -- ← KEY: honeypot НЕ попадают в публичный view

GRANT SELECT ON public.questions_safe TO anon, authenticated;

-- ── Шаг 3: пометить test-manager что он тоже не должен использовать honeypot
-- (это управляется в Edge Function start_session — добавим фильтр там же)

-- ── Шаг 4: лог обнаружения утечки. Если honeypot вопрос показывается
-- кому-то — это значит злоумышленник напрямую читает questions_new (не safe view),
-- что само по себе подозрительно.
CREATE TABLE IF NOT EXISTS public.honeypot_access_log (
  id BIGSERIAL PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions_new(id),
  accessed_by UUID,
  ip_hash TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context JSONB
);

CREATE INDEX IF NOT EXISTS idx_honeypot_access_recent
  ON public.honeypot_access_log(accessed_at DESC);

ALTER TABLE public.honeypot_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.honeypot_access_log FROM anon, authenticated;

COMMENT ON COLUMN public.questions_new.is_honeypot IS
  'Если TRUE — вопрос-ловушка для детекции парсинга. НЕ показывается в questions_safe view.';
COMMENT ON TABLE public.honeypot_access_log IS
  'Лог обращений к honeypot-вопросам. Любая запись = подозрение на парсинг.';
