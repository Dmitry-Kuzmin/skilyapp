-- Миграция 4 вопросов Темы 10 из старого формата options в новый формат answer_options

-- Вопрос 1: 276bfe39-7f37-46d0-b96c-babf3480632d
UPDATE questions_new
SET metadata = jsonb_set(
  metadata,
  '{answer_options}',
  '[
    {"id": "a", "position": 1, "is_correct": true, "text_es": "y reducir de forma importante las emisiones contaminantes.", "text_en": "and significantly reduce polluting emissions.", "text_ru": "и значительно снизить уровень загрязняющих выбросов."},
    {"id": "b", "position": 2, "is_correct": false, "text_es": "pero no pueden reducir las emisiones contaminantes.", "text_en": "but they cannot reduce polluting emissions.", "text_ru": "но не могут снизить уровень загрязняющих выбросов."},
    {"id": "c", "position": 3, "is_correct": false, "text_es": "y reducir las emisiones contaminantes en el mismo volumen.", "text_en": "and reduce polluting emissions in the same volume.", "text_ru": "и снизить уровень загрязняющих выбросов в том же объеме."}
  ]'::jsonb
)
WHERE id = '276bfe39-7f37-46d0-b96c-babf3480632d';

-- Вопрос 2: 286ed5ed-0919-44b7-a088-0e945eb3cee1
UPDATE questions_new
SET metadata = jsonb_set(
  metadata,
  '{answer_options}',
  '[
    {"id": "a", "position": 1, "is_correct": false, "text_es": "La 3ª y la 4ª.", "text_en": "3rd and 4th.", "text_ru": "3-я и 4-я."},
    {"id": "b", "position": 2, "is_correct": false, "text_es": "La 1ª y la 2ª.", "text_en": "1st and 2nd.", "text_ru": "1-я и 2-я."},
    {"id": "c", "position": 3, "is_correct": true, "text_es": "La 4ª y la 5ª.", "text_en": "4th and 5th.", "text_ru": "4-я и 5-я."}
  ]'::jsonb
)
WHERE id = '286ed5ed-0919-44b7-a088-0e945eb3cee1';

-- Вопрос 3: 2ef7ea3d-8618-42a8-8940-e6f3281ae44a
UPDATE questions_new
SET metadata = jsonb_set(
  metadata,
  '{answer_options}',
  '[
    {"id": "a", "position": 1, "is_correct": false, "text_es": "A) A: mantener siempre la misma velocidad.", "text_en": "A) A: always maintain the same speed.", "text_ru": "A) A: всегда поддерживать одну и ту же скорость."},
    {"id": "b", "position": 2, "is_correct": false, "text_es": "B) B: utilizar lo menos posible el transporte público.", "text_en": "B) B: use public transport as little as possible.", "text_ru": "B) B: как можно меньше пользоваться общественным транспортом."},
    {"id": "c", "position": 3, "is_correct": true, "text_es": "C) C: mantener la velocidad lo más uniforme posible, evitando aceleraciones y frenazos bruscos.", "text_en": "C) C: maintain the speed as uniform as possible, avoiding sudden accelerations and braking.", "text_ru": "C) C: поддерживать скорость максимально равномерной, избегая резких ускорений и торможений."}
  ]'::jsonb
)
WHERE id = '2ef7ea3d-8618-42a8-8940-e6f3281ae44a';

-- Вопрос 4: 4b88a19a-cc4d-439a-9fa3-66ccaade1f25
UPDATE questions_new
SET metadata = jsonb_set(
  metadata,
  '{answer_options}',
  '[
    {"id": "a", "position": 1, "is_correct": true, "text_es": "esté siempre preparado para actuar en una situación peligrosa.", "text_en": "is always prepared to act in a dangerous situation.", "text_ru": "всегда был готов к действиям в опасной ситуации."},
    {"id": "b", "position": 2, "is_correct": false, "text_es": "piense que únicamente los demás conductores cometen errores.", "text_en": "thinks that only other drivers make mistakes.", "text_ru": "считал, что только другие водители совершают ошибки."},
    {"id": "c", "position": 3, "is_correct": false, "text_es": "lleve siempre el pie puesto encima del pedal del freno.", "text_en": "always keeps their foot on the brake pedal.", "text_ru": "всегда держал ногу на педали тормоза."}
  ]'::jsonb
)
WHERE id = '4b88a19a-cc4d-439a-9fa3-66ccaade1f25';

-- Проверка результата
SELECT 
  id,
  substring(question_es, 1, 50) as question,
  jsonb_array_length(metadata->'answer_options') as options_count
FROM questions_new
WHERE id IN (
  '276bfe39-7f37-46d0-b96c-babf3480632d',
  '286ed5ed-0919-44b7-a088-0e945eb3cee1',
  '2ef7ea3d-8618-42a8-8940-e6f3281ae44a',
  '4b88a19a-cc4d-439a-9fa3-66ccaade1f25'
)
ORDER BY question_es;
