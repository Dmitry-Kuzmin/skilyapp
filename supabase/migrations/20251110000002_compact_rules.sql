-- Компактная таблица правил DGT (вместо длинных текстов)
CREATE TABLE IF NOT EXISTS public.dgt_rules_compact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Основная информация
  keyword TEXT NOT NULL UNIQUE, -- "estrechamiento", "prioridad", "velocidad_autopista"
  keyword_es TEXT, -- Испанский вариант
  keyword_ru TEXT, -- Русский вариант
  topic_number INTEGER, -- Номер темы 1-10
  
  -- Компактное правило (главное)
  rule_summary TEXT NOT NULL, -- Краткая суть одним предложением
  
  -- Детали (структурированно)
  details JSONB DEFAULT '{}', -- { "штраф": "200€", "баллы": 4, "скорость": "100 км/ч" }
  
  -- Знаки и термины
  signs TEXT[], -- ["R-5", "R-6", "P-15"]
  terms TEXT[], -- ["autopista", "autovía", "arcén"]
  
  -- Для экзамена
  exam_tips TEXT[], -- Типичные ловушки и советы
  common_mistakes TEXT[], -- Частые ошибки
  
  -- Связи
  related_rules TEXT[], -- Связанные правила (keywords)
  
  -- Примеры (короткие!)
  practical_example TEXT, -- Один конкретный пример (1-2 предложения)
  
  -- Метаданные
  search_vector tsvector, -- Для полнотекстового поиска
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_rules_keyword ON public.dgt_rules_compact(keyword);
CREATE INDEX IF NOT EXISTS idx_rules_topic ON public.dgt_rules_compact(topic_number);
CREATE INDEX IF NOT EXISTS idx_rules_search ON public.dgt_rules_compact USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_rules_signs ON public.dgt_rules_compact USING GIN(signs);
CREATE INDEX IF NOT EXISTS idx_rules_terms ON public.dgt_rules_compact USING GIN(terms);

-- Автообновление search_vector
CREATE OR REPLACE FUNCTION update_rules_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('russian', coalesce(NEW.keyword_ru, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.keyword_es, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.keyword, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.rule_summary, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.rule_summary, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rules_search_vector
  BEFORE INSERT OR UPDATE ON public.dgt_rules_compact
  FOR EACH ROW
  EXECUTE FUNCTION update_rules_search_vector();

-- RLS политики
ALTER TABLE public.dgt_rules_compact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view compact rules"
  ON public.dgt_rules_compact
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage compact rules"
  ON public.dgt_rules_compact
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Функция поиска компактных правил
CREATE OR REPLACE FUNCTION search_compact_rules(
  search_query TEXT,
  topic_num INTEGER DEFAULT NULL,
  limit_count INTEGER DEFAULT 2
)
RETURNS TABLE (
  id UUID,
  keyword TEXT,
  keyword_es TEXT,
  keyword_ru TEXT,
  rule_summary TEXT,
  details JSONB,
  signs TEXT[],
  terms TEXT[],
  exam_tips TEXT[],
  common_mistakes TEXT[],
  related_rules TEXT[],
  practical_example TEXT,
  topic_number INTEGER,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.keyword,
    cr.keyword_es,
    cr.keyword_ru,
    cr.rule_summary,
    cr.details,
    cr.signs,
    cr.terms,
    cr.exam_tips,
    cr.common_mistakes,
    cr.related_rules,
    cr.practical_example,
    cr.topic_number,
    ts_rank(cr.search_vector, plainto_tsquery('simple', search_query)) AS relevance
  FROM dgt_rules_compact cr
  WHERE 
    (topic_num IS NULL OR cr.topic_number = topic_num)
    AND (
      cr.search_vector @@ plainto_tsquery('simple', search_query)
      OR cr.keyword ILIKE '%' || search_query || '%'
      OR cr.keyword_es ILIKE '%' || search_query || '%'
      OR cr.keyword_ru ILIKE '%' || search_query || '%'
      OR search_query = ANY(cr.signs)
      OR search_query = ANY(cr.terms)
    )
  ORDER BY relevance DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.dgt_rules_compact IS 'Компактные правила DGT (вместо длинных текстов учебников)';
COMMENT ON FUNCTION search_compact_rules IS 'Быстрый поиск компактных правил DGT';

