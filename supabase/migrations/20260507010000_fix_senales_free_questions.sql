-- Fix: Señales topic (id: dfeafca4-30cf-4277-ab3a-d54399d75fce) had 267 free questions
-- instead of 30. Mark excess as is_premium=true, keeping first 30 by id.
UPDATE questions_new
SET is_premium = true
WHERE topic_id = 'dfeafca4-30cf-4277-ab3a-d54399d75fce'
  AND country = 'es'
  AND is_premium = false
  AND id NOT IN (
    SELECT id FROM questions_new
    WHERE topic_id = 'dfeafca4-30cf-4277-ab3a-d54399d75fce'
      AND country = 'es'
      AND is_premium = false
    ORDER BY id
    LIMIT 30
  );
