-- Улучшенная функция поиска с поддержкой испанского и русского языков
DROP FUNCTION IF EXISTS search_dgt_knowledge(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_dgt_knowledge(
  search_query TEXT,
  topic_num INTEGER DEFAULT NULL,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  section_title TEXT,
  topic_number INTEGER,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dk.id,
    dk.content,
    dk.section_title,
    dk.topic_number,
    -- Комбинированный поиск по русскому и испанскому языкам
    GREATEST(
      ts_rank(to_tsvector('russian', dk.content), plainto_tsquery('russian', search_query)),
      ts_rank(to_tsvector('spanish', dk.content), plainto_tsquery('spanish', search_query)),
      ts_rank(to_tsvector('simple', dk.content), plainto_tsquery('simple', search_query))
    ) AS relevance
  FROM dgt_knowledge dk
  WHERE 
    (topic_num IS NULL OR dk.topic_number = topic_num)
    AND (
      to_tsvector('russian', dk.content) @@ plainto_tsquery('russian', search_query)
      OR to_tsvector('spanish', dk.content) @@ plainto_tsquery('spanish', search_query)
      OR to_tsvector('simple', dk.content) @@ plainto_tsquery('simple', search_query)
      OR dk.content ILIKE '%' || search_query || '%' -- Fallback: простой поиск подстроки
    )
  ORDER BY relevance DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_dgt_knowledge IS 'Поиск релевантного контекста из учебников DGT (поддержка русского и испанского языков)';

