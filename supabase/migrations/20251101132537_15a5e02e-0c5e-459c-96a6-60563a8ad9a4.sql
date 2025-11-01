-- Создать таблицу определений типов бустов
CREATE TABLE IF NOT EXISTS public.boost_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT UNIQUE NOT NULL,
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_ru TEXT,
  description_es TEXT,
  icon TEXT,
  cost_coins INTEGER NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Инвентарь бустов пользователя
CREATE TABLE IF NOT EXISTS public.boost_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boost_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, boost_type)
);

-- История использования бустов в дуэлях
CREATE TABLE IF NOT EXISTS public.duel_boosts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES duel_players(id) ON DELETE CASCADE,
  duel_question_id UUID REFERENCES duel_questions(id) ON DELETE SET NULL,
  boost_type TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавить поля в таблицу duel_answers
ALTER TABLE public.duel_answers 
  ADD COLUMN IF NOT EXISTS boost_used TEXT,
  ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT false;

-- Изменить selected_option_id на nullable для пропусков
ALTER TABLE public.duel_answers 
  ALTER COLUMN selected_option_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE public.boost_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_boosts_used ENABLE ROW LEVEL SECURITY;

-- RLS политики для boost_definitions
CREATE POLICY "Anyone can view boost definitions"
  ON public.boost_definitions FOR SELECT
  USING (true);

-- RLS политики для boost_inventory
CREATE POLICY "Users can view their own inventory"
  ON public.boost_inventory FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can insert their own inventory"
  ON public.boost_inventory FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

CREATE POLICY "Users can update their own inventory"
  ON public.boost_inventory FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- RLS политики для duel_boosts_used
CREATE POLICY "Players can view boosts used in their duels"
  ON public.duel_boosts_used FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duel_players
      WHERE duel_players.duel_id = duel_boosts_used.duel_id
        AND duel_players.user_id IN (
          SELECT id FROM profiles 
          WHERE user_id = auth.uid() 
             OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
        )
    )
  );

CREATE POLICY "Authenticated users can insert boost usage"
  ON public.duel_boosts_used FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Создать функцию для модификации инвентаря бустов
CREATE OR REPLACE FUNCTION public.modify_boost_inventory(
  p_user_id UUID,
  p_boost_type TEXT,
  p_change INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO boost_inventory (user_id, boost_type, quantity, updated_at)
  VALUES (p_user_id, p_boost_type, GREATEST(0, p_change), NOW())
  ON CONFLICT (user_id, boost_type) 
  DO UPDATE SET 
    quantity = GREATEST(0, boost_inventory.quantity + p_change),
    updated_at = NOW();
END;
$$;

-- Создать функцию для проверки наличия буста
CREATE OR REPLACE FUNCTION public.has_boost(
  p_user_id UUID,
  p_boost_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_quantity
  FROM boost_inventory
  WHERE user_id = p_user_id 
    AND boost_type = p_boost_type;
  
  RETURN COALESCE(v_quantity, 0) > 0;
END;
$$;

-- Наполнить таблицу определений бустов
INSERT INTO public.boost_definitions (type, name_ru, name_es, description_ru, description_es, icon, cost_coins) VALUES
('fifty_fifty', '50/50', '50/50', 'Убирает 2 неправильных ответа', 'Elimina 2 respuestas incorrectas', '⚡', 10),
('time_extend', '+30 секунд', '+30 segundos', 'Добавляет 30 секунд к таймеру', 'Añade 30 segundos al temporizador', '⏱️', 15),
('hint', 'Подсказка', 'Pista', 'Показывает объяснение к вопросу', 'Muestra la explicación de la pregunta', '💡', 20),
('skip', 'Пропустить', 'Saltar', 'Пропустить вопрос без штрафа', 'Saltar pregunta sin penalización', '⏭️', 25)
ON CONFLICT (type) DO NOTHING;

-- Создать триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_boost_inventory_updated_at
  BEFORE UPDATE ON public.boost_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();