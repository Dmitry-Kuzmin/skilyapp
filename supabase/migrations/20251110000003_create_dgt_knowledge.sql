-- Таблица для хранения знаний из учебников DGT
CREATE TABLE IF NOT EXISTS public.dgt_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  topic_number INTEGER,
  section_title TEXT,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'manual', -- 'manual', 'law', 'fines', 'examples'
  source_file TEXT, -- Название исходного PDF файла
  page_number INTEGER,
  language TEXT DEFAULT 'ru', -- 'ru', 'es', 'en'
  keywords TEXT[], -- Ключевые слова для поиска
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_dgt_knowledge_topic ON public.dgt_knowledge(topic_id);
CREATE INDEX IF NOT EXISTS idx_dgt_knowledge_topic_number ON public.dgt_knowledge(topic_number);
CREATE INDEX IF NOT EXISTS idx_dgt_knowledge_keywords ON public.dgt_knowledge USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_dgt_knowledge_content ON public.dgt_knowledge USING GIN(to_tsvector('russian', content));

-- Full-text search для русского и испанского
CREATE INDEX IF NOT EXISTS idx_dgt_knowledge_content_ru ON public.dgt_knowledge USING GIN(to_tsvector('russian', content));
CREATE INDEX IF NOT EXISTS idx_dgt_knowledge_content_es ON public.dgt_knowledge USING GIN(to_tsvector('spanish', content));

-- RLS политики
ALTER TABLE public.dgt_knowledge ENABLE ROW LEVEL SECURITY;

-- Все могут читать
CREATE POLICY "Anyone can view DGT knowledge"
  ON public.dgt_knowledge
  FOR SELECT
  USING (true);

-- Authenticated users can insert, update, delete (для загрузки через скрипты)
CREATE POLICY "Authenticated users can insert DGT knowledge"
  ON public.dgt_knowledge
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update DGT knowledge"
  ON public.dgt_knowledge
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete DGT knowledge"
  ON public.dgt_knowledge
  FOR DELETE
  TO authenticated
  USING (true);

-- Функция для поиска релевантного контекста
CREATE OR REPLACE FUNCTION search_dgt_knowledge(
  search_query TEXT,
  topic_num INTEGER DEFAULT NULL,
  limit_count INTEGER DEFAULT 3
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
    ts_rank(to_tsvector('russian', dk.content), plainto_tsquery('russian', search_query)) AS relevance
  FROM dgt_knowledge dk
  WHERE 
    (topic_num IS NULL OR dk.topic_number = topic_num)
    AND to_tsvector('russian', dk.content) @@ plainto_tsquery('russian', search_query)
  ORDER BY relevance DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.dgt_knowledge IS 'Знания из учебников DGT для AI-помощника';
COMMENT ON FUNCTION search_dgt_knowledge IS 'Поиск релевантного контекста из учебников DGT';

