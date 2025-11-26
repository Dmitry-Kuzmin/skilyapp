-- Исправление CHECK constraint для уровней в user_claimed_rewards
-- Старая версия ограничивала уровни 1-10, но сезоны поддерживают до 30 уровней

-- Удаляем старый constraint
ALTER TABLE public.user_claimed_rewards 
DROP CONSTRAINT IF EXISTS user_claimed_rewards_level_check;

-- Добавляем новый constraint с поддержкой до 30 уровней
ALTER TABLE public.user_claimed_rewards 
ADD CONSTRAINT user_claimed_rewards_level_check 
CHECK (level BETWEEN 1 AND 30);

