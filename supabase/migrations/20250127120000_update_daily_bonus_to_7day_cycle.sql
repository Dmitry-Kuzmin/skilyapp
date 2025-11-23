-- ============================================
-- Миграция: Daily Bonus 7-дневный цикл
-- ============================================
-- Обновляем daily_bonus_def: оставляем только 7 дней (циклический цикл)
-- Удаляем все записи с day_number > 7

-- Удаляем все записи кроме 1-7
DELETE FROM public.daily_bonus_def WHERE day_number > 7;

-- Обновляем существующие записи (если нужно изменить награды)
-- Оставляем только 7 дней с правильными наградами
TRUNCATE TABLE public.daily_bonus_def;

-- Вставляем только 7 дней (циклический цикл)
INSERT INTO public.daily_bonus_def (day_number, reward, description) VALUES
(1, '{"xp": 10, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Первый шаг'),
(2, '{"xp": 15, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Продолжаем'),
(3, '{"xp": 20, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Набираем темп'),
(4, '{"xp": 0, "coins": 0, "boost": true, "badge": null}'::jsonb, 'Boost день!'),
(5, '{"xp": 30, "coins": 0, "boost": false, "badge": null}'::jsonb, 'Почти неделя'),
(6, '{"xp": 0, "coins": 20, "boost": false, "badge": null}'::jsonb, 'День покупок'),
(7, '{"xp": 50, "coins": 10, "boost": false, "badge": "weekly_hero"}'::jsonb, 'Недельный герой!')
ON CONFLICT (day_number) DO UPDATE
SET reward = EXCLUDED.reward,
    description = EXCLUDED.description;

