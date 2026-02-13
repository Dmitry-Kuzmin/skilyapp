-- Create a view to mimic the old table structure for the validator server
CREATE OR REPLACE VIEW "public"."pdd_russia_questions" AS 
SELECT 
    q.id,
    CAST(substring(q.metadata->>'ticket_number' FROM '\d+') AS INTEGER) as ticket_number,
    q.metadata->>'ticket_number' as ticket_label,
    q.question->>'ru' as question_text,
    q.explanation->>'ru' as explanation,
    q.id as source_id
FROM questions_new q
WHERE q.source = 'pdd_russia_github';

-- Grant access to authenticated and anon users (if needed for API)
GRANT SELECT ON "public"."pdd_russia_questions" TO "authenticated";
GRANT SELECT ON "public"."pdd_russia_questions" TO "anon";
GRANT SELECT ON "public"."pdd_russia_questions" TO "service_role";
