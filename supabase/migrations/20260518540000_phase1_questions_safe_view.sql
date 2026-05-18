-- ============================================================
-- Phase 1.2: questions_safe view — без is_correct
-- ============================================================
-- Публичный view для запросов вопросов с клиента БЕЗ is_correct.
-- Используется в ситуациях вне игровой сессии (preview, learning, etc).
-- Внутри игровой сессии — клиент получает question_snapshot через test-manager.

CREATE OR REPLACE VIEW public.questions_safe AS
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
          -- is_correct intentionally omitted
        )
        ORDER BY ao.position
      )
      FROM public.answer_options ao
      WHERE ao.question_id = q.id
    ),
    '[]'::json
  ) AS answer_options
FROM public.questions_new q;

GRANT SELECT ON public.questions_safe TO anon, authenticated;

COMMENT ON VIEW public.questions_safe IS
  'Безопасное представление вопросов без is_correct. Используется клиентом для preview/learning. Игровая логика идёт через test-manager Edge Function.';
