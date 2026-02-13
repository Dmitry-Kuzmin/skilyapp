-- Примеры компактных правил для быстрого старта

-- Пример 1: Estrechamiento (Сужение)
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
  ARRAY['estrechamiento', 'paso estrecho', 'сужение'],
  ARRAY[
    'На экзамене часто показывают ситуацию без знаков — тогда смотри кто въехал первым',
    'Ловушка: автобус ВСЕГДА имеет приоритет над легковой с прицепом',
    'Если неясно кто первый — применяется иерархия транспорта'
  ],
  ARRAY[
    'Путают с rotonda — там приоритет у кто на круге',
    'Забывают про иерархию когда нет знаков'
  ],
  ARRAY['prioridad', 'señales_prioridad', 'jerarquia_vehiculos'],
  'Узкий мост: автобус и легковая въехали одновременно — автобус проезжает первым по иерархии.'
);

-- Пример 2: Prioridad rotonda (Приоритет на круговом движении)
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
  ARRAY['rotonda', 'glorieta', 'círculo'],
  ARRAY[
    'На экзамене могут спросить про rotonda БЕЗ знака — правило то же!',
    'Ловушка: даже если ты справа, уступаешь тому кто на круге'
  ],
  ARRAY[
    'Путают с обычным перекрёстком (там приоритет справа)',
    'Забывают уступить при въезде'
  ],
  ARRAY['prioridad', 'interseccion', 'derecha'],
  'Въезжаешь на rotonda — уступи даже если машина на круге слева от тебя.'
);

-- Пример 3: Velocidad autopista (Скорость на автомагистрали)
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
  ARRAY['autopista', 'velocidad', 'límite'],
  ARRAY[
    'На экзамене путают autopista (120) с autovía (100)',
    'Ловушка: с прицепом ВСЕГДА 90, даже на autopista',
    'Минимум 60 км/ч — ехать медленнее запрещено!'
  ],
  ARRAY[
    'Путают autopista (120) с autovía (100)',
    'Забывают про минимум 60 км/ч'
  ],
  ARRAY['velocidad_autovia', 'velocidad_carretera', 'adelantamiento'],
  'Едешь на autopista с прицепом — максимум 90 км/ч, штраф за 120 км/ч будет 300€.'
);

COMMENT ON TABLE public.dgt_rules_compact IS 'Компактные структурированные правила DGT (замена длинным текстам)';

