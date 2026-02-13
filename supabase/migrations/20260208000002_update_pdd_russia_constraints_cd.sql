
-- 1. Standardize category naming (A,B -> A_B)
UPDATE pdd_russia_questions
SET ticket_category = 'A_B'
WHERE ticket_category = 'A,B';

-- 2. Drop the old unique constraint (ticket_number, question_number)
ALTER TABLE pdd_russia_questions
DROP CONSTRAINT IF EXISTS pdd_russia_questions_ticket_number_question_number_key;

-- 3. Add new unique constraint including ticket_category
ALTER TABLE pdd_russia_questions
ADD CONSTRAINT pdd_russia_questions_unique_ticket_question_category_key 
UNIQUE (ticket_number, question_number, ticket_category);

-- 4. Create separate table for user progress per category if not exists?
-- (user_learning_progress usually stores progress. Does it have category/params?)
-- Assuming user_learning_progress tracks by question_id so it's fine.

-- 5. Update RLS policies if needed? (Likely not, they select *)

-- verify
SELECT COUNT(*) as ab_count FROM pdd_russia_questions WHERE ticket_category = 'A_B';
