-- Продление активного сезона Duel Pass
-- Используйте этот скрипт когда сезон закончился

UPDATE public.duel_pass_seasons 
SET 
  end_date = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE season_number = 1
  AND is_active = true;

-- Проверка: покажет новую дату окончания
SELECT 
  season_number,
  name_ru,
  start_date,
  end_date,
  EXTRACT(EPOCH FROM (end_date - NOW()))::INTEGER / 86400 as days_remaining
FROM public.duel_pass_seasons
WHERE season_number = 1;
