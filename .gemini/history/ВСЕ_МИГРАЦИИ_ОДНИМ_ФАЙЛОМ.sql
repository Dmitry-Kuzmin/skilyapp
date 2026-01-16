-- ============================================================================
-- КОМПАКТНЫЕ СПРАВОЧНИКИ DGT - ВСЕ МИГРАЦИИ В ОДНОМ ФАЙЛЕ
-- Скопируй ВЕСЬ этот файл и выполни в Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ КОМПАКТНЫХ ПРАВИЛ
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dgt_rules_compact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Основная информация
  keyword TEXT NOT NULL UNIQUE,
  keyword_es TEXT,
  keyword_ru TEXT,
  topic_number INTEGER,
  
  -- Компактное правило
  rule_summary TEXT NOT NULL,
  
  -- Детали (JSON)
  details JSONB DEFAULT '{}',
  
  -- Массивы
  signs TEXT[],
  terms TEXT[],
  exam_tips TEXT[],
  common_mistakes TEXT[],
  related_rules TEXT[],
  
  -- Пример
  practical_example TEXT,
  
  -- Для поиска
  search_vector tsvector,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
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

DROP TRIGGER IF EXISTS trigger_update_rules_search_vector ON public.dgt_rules_compact;
CREATE TRIGGER trigger_update_rules_search_vector
  BEFORE INSERT OR UPDATE ON public.dgt_rules_compact
  FOR EACH ROW
  EXECUTE FUNCTION update_rules_search_vector();

-- RLS
ALTER TABLE public.dgt_rules_compact ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view compact rules" ON public.dgt_rules_compact;
CREATE POLICY "Anyone can view compact rules"
  ON public.dgt_rules_compact
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage compact rules" ON public.dgt_rules_compact;
CREATE POLICY "Authenticated users can manage compact rules"
  ON public.dgt_rules_compact
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. ФУНКЦИЯ ПОИСКА КОМПАКТНЫХ ПРАВИЛ
-- ============================================================================

DROP FUNCTION IF EXISTS search_compact_rules(TEXT, INTEGER, INTEGER);

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

-- ============================================================================
-- 3. ПРИМЕРЫ ПРАВИЛ (3 готовых правила для теста)
-- ============================================================================

-- Удаляем старые примеры если есть
DELETE FROM public.dgt_rules_compact WHERE keyword IN ('estrechamiento', 'prioridad_rotonda', 'velocidad_autopista');

-- Правило 1: Estrechamiento
INSERT INTO public.dgt_rules_compact (
  keyword, keyword_es, keyword_ru, topic_number,
  rule_summary,
  details,
  signs,
  terms,
  exam_tips,
  common_mistakes,
  related_rules,
  practical_example
) VALUES (
  'estrechamiento',
  'estrechamiento',
  'сужение',
  1,
  'При сужении проезжей части приоритет определяется знаками R-5/R-6, кто въехал первым, или иерархией транспорта.',
  '{"штраф": "200€", "баллы": 4, "знаки_приоритета": ["R-5 уступи", "R-6 приоритет"], "иерархия": ["автобус", "легковая с прицепом", "легковая"]}',
  ARRAY['R-5', 'R-6'],
  ARRAY['estrechamiento', 'paso estrecho', 'сужение', 'narrow'],
  ARRAY[
    'На экзамене часто ситуация без знаков — тогда смотри кто въехал первым',
    'Ловушка: автобус ВСЕГДА имеет приоритет над легковой с прицепом',
    'Если неясно кто первый — применяется иерархия транспорта'
  ],
  ARRAY[
    'Путают с rotonda — там приоритет у кого на круге',
    'Забывают про иерархию когда нет знаков'
  ],
  ARRAY['prioridad', 'señales_prioridad', 'jerarquia_vehiculos'],
  'Узкий мост: автобус и легковая въехали одновременно — автобус проезжает первым по иерархии.'
);

-- Правило 2: Prioridad rotonda
INSERT INTO public.dgt_rules_compact (
  keyword, keyword_es, keyword_ru, topic_number,
  rule_summary,
  details,
  signs,
  terms,
  exam_tips,
  common_mistakes,
  related_rules,
  practical_example
) VALUES (
  'prioridad_rotonda',
  'prioridad en rotonda',
  'приоритет на круге',
  1,
  'На rotonda приоритет имеет транспорт, уже находящийся на круге. Въезжающие уступают.',
  '{"штраф": "200€", "баллы": 4, "правило": "quien está dentro tiene prioridad"}',
  ARRAY['R-1', 'R-2', 'R-402'],
  ARRAY['rotonda', 'glorieta', 'círculo', 'круг'],
  ARRAY[
    'На экзамене могут показать rotonda БЕЗ знака — правило то же!',
    'Ловушка: даже если ты справа, уступаешь тому кто на круге'
  ],
  ARRAY[
    'Путают с обычным перекрёстком (там приоритет справа)',
    'Забывают уступить при въезде'
  ],
  ARRAY['prioridad', 'interseccion', 'derecha'],
  'Въезжаешь на rotonda — уступи даже если машина на круге слева от тебя.'
);

-- Правило 3: Velocidad autopista
INSERT INTO public.dgt_rules_compact (
  keyword, keyword_es, keyword_ru, topic_number,
  rule_summary,
  details,
  signs,
  terms,
  exam_tips,
  common_mistakes,
  related_rules,
  practical_example
) VALUES (
  'velocidad_autopista',
  'velocidad en autopista',
  'скорость на автомагистрали',
  2,
  'Максимальная скорость на autopista: легковые 120 км/ч, с прицепом 90 км/ч, минимум 60 км/ч.',
  '{"max_turismo": "120 км/ч", "max_con_remolque": "90 км/ч", "min": "60 км/ч", "multa_20": "100€", "multa_30": "300€+2б", "multa_40": "400€+4б", "multa_50": "600€+6б"}',
  ARRAY['S-1', 'S-17'],
  ARRAY['autopista', 'velocidad', 'límite', 'скорость'],
  ARRAY[
    'На экзамене путают autopista (120) с autovía (100)',
    'Ловушка: с прицепом ВСЕГДА 90, даже на autopista',
    'Минимум 60 км/ч — ехать медленнее запрещено!'
  ],
  ARRAY[
    'Путают autopista (120) с autovía (100)',
    'Забывают про минимум 60 км/ч',
    'Думают что с прицепом можно 120'
  ],
  ARRAY['velocidad_autovia', 'velocidad_carretera', 'adelantamiento'],
  'Едешь на autopista с прицепом — максимум 90 км/ч, штраф за 120 км/ч будет 300€.'
);

-- ============================================================================
-- ГОТОВО! Выполни этот файл и всё заработает!
-- ============================================================================

SELECT 'Миграция завершена успешно! Создано ' || COUNT(*) || ' правил.' as result
FROM public.dgt_rules_compact;

