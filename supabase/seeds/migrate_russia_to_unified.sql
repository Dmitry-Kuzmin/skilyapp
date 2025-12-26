-- ========================================
-- DATA MIGRATION: pdd_russia_questions -> questions_new
-- Date: 2025-12-25
-- Purpose: Copy Russian questions to unified schema
-- ========================================

-- STEP 1: Insert questions from legacy table
INSERT INTO public.questions_new (
  id,
  country,
  question_ru,
  question_es,
  question_en,
  explanation_ru,
  explanation_es,
  explanation_en,
  topic_id,
  metadata,
  image_url,
  difficulty,
  is_premium,
  type,
  source,
  created_at,
  updated_at
)
SELECT
  q.id,                           -- Keep original ID
  'ru'::TEXT,                     -- Country = Russia
  q.question_text,                -- Russian question text (correct column name!)
  NULL::TEXT,                     -- No Spanish
  NULL::TEXT,                     -- No English  
  q.explanation,                  -- Russian explanation
  NULL::TEXT,                     -- No Spanish
  NULL::TEXT,                     -- No English
  NULL::UUID,                     -- No topic (Russia uses different topic system)
  jsonb_build_object(             -- Metadata
    'ticket_number', q.ticket_number,
    'question_number', q.question_number,
    'ticket_category', q.ticket_category,
    'topics', COALESCE(q.topics, ARRAY[]::TEXT[]),
    'correct_answer_text', q.correct_answer_text,
    'source_id', q.source_id,
    'image_src', q.image_url
  ),
  q.image_url,                    -- Image URL
  CASE q.difficulty 
    WHEN 'easy' THEN 'easy'::difficulty_level
    WHEN 'hard' THEN 'hard'::difficulty_level
    ELSE 'medium'::difficulty_level
  END,                            -- Keep difficulty
  COALESCE(q.is_premium, FALSE),  -- Premium flag
  'single'::question_type,        -- Single choice
  'pdd_russia_legacy',            -- Source marker
  q.created_at,                   -- Original creation date
  NOW()                           -- Updated now
FROM public.pdd_russia_questions q
ON CONFLICT (id) 
DO UPDATE SET
  question_ru = EXCLUDED.question_ru,
  explanation_ru = EXCLUDED.explanation_ru,
  metadata = EXCLUDED.metadata,
  image_url = EXCLUDED.image_url,
  updated_at = NOW();

-- STEP 2: Insert answers from legacy table
INSERT INTO public.answer_options (
  id,
  question_id,
  text_ru,
  text_es,
  text_en,
  is_correct,
  position,
  created_at
)
SELECT
  a.id,                           -- Keep original ID
  a.question_id,                  -- Link to question
  a.answer_text,                  -- Russian answer text (correct column name!)
  NULL::TEXT,                     -- No Spanish
  NULL::TEXT,                     -- No English
  a.is_correct,                   -- Is correct answer
  a.position,                     -- Position (1, 2, 3, etc.)
  a.created_at                    -- Original creation date
FROM public.pdd_russia_answers a
ON CONFLICT (id)
DO UPDATE SET
  text_ru = EXCLUDED.text_ru,
  is_correct = EXCLUDED.is_correct,
  position = EXCLUDED.position;

-- STEP 3: Verify migration
DO $$
DECLARE
  v_legacy_questions INTEGER;
  v_unified_questions INTEGER;
  v_legacy_answers INTEGER;
  v_unified_answers INTEGER;
BEGIN
  -- Count legacy
  SELECT COUNT(*) INTO v_legacy_questions FROM public.pdd_russia_questions;
  SELECT COUNT(*) INTO v_legacy_answers FROM public.pdd_russia_answers;
  
  -- Count unified (Russia only)
  SELECT COUNT(*) INTO v_unified_questions 
  FROM public.questions_new WHERE country = 'ru';
  
  SELECT COUNT(*) INTO v_unified_answers 
  FROM public.answer_options a
  JOIN public.questions_new q ON a.question_id = q.id
  WHERE q.country = 'ru';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Legacy Questions: %', v_legacy_questions;
  RAISE NOTICE 'Unified Questions: %', v_unified_questions;
  RAISE NOTICE 'Legacy Answers: %', v_legacy_answers;
  RAISE NOTICE 'Unified Answers: %', v_unified_answers;
  RAISE NOTICE '========================================';
  
  IF v_legacy_questions = v_unified_questions AND v_legacy_answers = v_unified_answers THEN
    RAISE NOTICE '✅ Migration SUCCESSFUL! All data copied.';
  ELSE
    RAISE WARNING '⚠️ Migration INCOMPLETE! Check for errors.';
  END IF;
END $$;
