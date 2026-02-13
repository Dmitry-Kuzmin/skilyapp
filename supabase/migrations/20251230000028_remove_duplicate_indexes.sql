-- Drop Duplicate Indexes
-- Removes redundant indexes identified by Supabase Linter.
-- Kept the index likely associated with constraints (_key) or the more descriptive one where appropriate.

-- 1. answer_options: Drop manually created duplicate
DROP INDEX IF EXISTS public.idx_answer_options_question;
-- Keep: public.idx_answer_options_question_id (likely standard convention)

-- 2. dgt_knowledge: Drop one of the content indexes
DROP INDEX IF EXISTS public.idx_dgt_knowledge_content_ru;
-- Keep: public.idx_dgt_knowledge_content

-- 3. passkey_credentials: Drop manual index, keep UNIQUE/primary key constraint index
DROP INDEX IF EXISTS public.idx_passkey_credentials_credential_id;
-- Keep: public.passkey_credentials_credential_id_key (Likely unique constraint)

-- 4. questions_new: Drop less standardized name
DROP INDEX IF EXISTS public.idx_questions_topic;
-- Keep: public.idx_questions_new_topic_id (More standard naming)

-- 5. stars_payments: Drop manual index, keep key
DROP INDEX IF EXISTS public.idx_stars_payments_payload;
-- Keep: public.stars_payments_invoice_payload_key

-- 6. webauthn_challenges: Drop manual index, keep key
DROP INDEX IF EXISTS public.idx_webauthn_challenge_session;
-- Keep: public.webauthn_challenges_session_id_key
