-- ============================================
-- Add Cryptolocker Boost (Encryption Layer Attack)
-- ============================================

-- Добавляем новый буст Cryptolocker в категорию OFFENSE
INSERT INTO public.boost_definitions (
  type,
  name_ru,
  name_es,
  description_ru,
  description_es,
  icon,
  cost_coins,
  is_premium
) VALUES (
  'cryptolocker',
  'Cryptolocker',
  'Cryptolocker',
  'Шифрует текст вопроса и ответов. Для чтения нужно водить курсором/пальцем по экрану',
  'Encripta el texto de la pregunta y las respuestas. Para leer, debes mover el cursor/dedo por la pantalla',
  '🔒',
  40,
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

