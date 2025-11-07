-- Добавить буст "Перевод" в таблицу boost_definitions
INSERT INTO public.boost_definitions (type, name_ru, name_es, description_ru, description_es, icon, cost_coins, is_premium) 
VALUES (
  'translate', 
  'Перевод', 
  'Traducción', 
  'Переводит вопрос на русский или английский язык', 
  'Traduce la pregunta al ruso o al inglés', 
  '🌐', 
  12, 
  false
)
ON CONFLICT (type) DO UPDATE SET
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  icon = EXCLUDED.icon,
  cost_coins = EXCLUDED.cost_coins,
  is_premium = EXCLUDED.is_premium;

