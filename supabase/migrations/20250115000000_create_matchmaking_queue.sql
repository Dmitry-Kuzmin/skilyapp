-- Matchmaking Queue для поиска соперников
CREATE TABLE IF NOT EXISTS public.duel_matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duel_id UUID REFERENCES duels(id) ON DELETE CASCADE, -- Заполнится, когда пара найдена
  num_questions INTEGER NOT NULL CHECK (num_questions BETWEEN 5 AND 30),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'mix')),
  categories JSONB,
  bet_amount INTEGER NOT NULL DEFAULT 0 CHECK (bet_amount >= 0),
  bet_type TEXT CHECK (bet_type IN ('none', 'fixed', 'custom')) DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ставим 30 сек как "жесткий лимит", но бот подхватит раньше (через 5-10 сек)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 seconds'),
  matched BOOLEAN NOT NULL DEFAULT false
);

-- ОПТИМИЗИРОВАННЫЙ ИНДЕКС
-- Сначала точные совпадения (ставка, сложность), потом статус, потом время
-- Примечание: не используем now() в предикате, т.к. это не IMMUTABLE функция
-- Фильтрацию по expires_at делаем в запросах
CREATE INDEX IF NOT EXISTS idx_matchmaking_active 
  ON public.duel_matchmaking_queue(bet_amount, difficulty, matched, expires_at)
  WHERE matched = false;

-- Индекс для быстрого поиска своей заявки
CREATE INDEX IF NOT EXISTS idx_matchmaking_profile 
  ON public.duel_matchmaking_queue(profile_id);

-- RLS политики
ALTER TABLE public.duel_matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- 1. Чтение: Вижу только свою заявку
CREATE POLICY "Users can view own matchmaking requests"
  ON public.duel_matchmaking_queue
  FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

-- 2. Вставка: Могу создать заявку только для себя
CREATE POLICY "Users can insert own matchmaking requests"
  ON public.duel_matchmaking_queue
  FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

-- 3. Удаление: Могу отменить (удалить) только свою заявку
CREATE POLICY "Users can delete own matchmaking requests"
  ON public.duel_matchmaking_queue
  FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

-- 4. Service Role (Server): Полный доступ для Edge Function
CREATE POLICY "Service role can manage matchmaking"
  ON public.duel_matchmaking_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Функция для поиска соперника с защитой от race condition (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION find_matchmaking_opponent(
  p_profile_id UUID,
  p_bet_amount INTEGER,
  p_difficulty TEXT
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  num_questions INTEGER,
  difficulty TEXT,
  categories JSONB,
  bet_amount INTEGER,
  bet_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opponent RECORD;
BEGIN
  -- Ищем подходящего соперника с FOR UPDATE SKIP LOCKED для защиты от race condition
  -- FOR UPDATE SKIP LOCKED гарантирует, что если другая функция уже забрала эту запись,
  -- мы просто пропустим её и возьмем следующую
  SELECT 
    q.id,
    q.profile_id,
    q.num_questions,
    q.difficulty,
    q.categories,
    q.bet_amount,
    q.bet_type
  INTO v_opponent
  FROM duel_matchmaking_queue q
  WHERE q.matched = false
    AND q.bet_amount = p_bet_amount
    AND (q.difficulty = p_difficulty OR q.difficulty = 'mix' OR p_difficulty = 'mix')
    AND q.profile_id != p_profile_id
    AND q.expires_at > now()
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Если нашли - помечаем как matched и возвращаем
  IF v_opponent.id IS NOT NULL THEN
    UPDATE duel_matchmaking_queue
    SET matched = true
    WHERE id = v_opponent.id;

    RETURN QUERY SELECT 
      v_opponent.id,
      v_opponent.profile_id,
      v_opponent.num_questions,
      v_opponent.difficulty,
      v_opponent.categories,
      v_opponent.bet_amount,
      v_opponent.bet_type;
  END IF;

  -- Если не нашли - возвращаем пустой результат
  RETURN;
END;
$$;

-- Функция для очистки устаревших запросов (вызывается периодически)
CREATE OR REPLACE FUNCTION cleanup_expired_matchmaking()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.duel_matchmaking_queue
  WHERE expires_at < now() - INTERVAL '1 minute';
END;
$$;

COMMENT ON TABLE public.duel_matchmaking_queue IS 'Очередь поиска соперников для дуэлей. Автоматически очищается от устаревших записей.';
COMMENT ON FUNCTION cleanup_expired_matchmaking IS 'Очищает устаревшие записи из очереди поиска (старше 1 минуты после истечения)';
COMMENT ON FUNCTION find_matchmaking_opponent IS 'Ищет подходящего соперника в очереди с защитой от race condition (FOR UPDATE SKIP LOCKED)';

