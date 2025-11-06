-- Drop the legacy questions table with overly permissive RLS policies
-- All data has been migrated to questions_new
DROP TABLE IF EXISTS questions CASCADE;

-- Drop the legacy answer_options table (associated with old questions)
DROP TABLE IF EXISTS answer_options CASCADE;
