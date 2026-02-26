-- ДИАГНОСТИЧЕСКИЙ ЗАПРОС 1: Проверь триггер
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'duels';

-- ДИАГНОСТИЧЕСКИЙ ЗАПРОС 2: Последние транзакции дуэли (монеты)
SELECT 
    dt.duel_id,
    dt.user_id,
    dt.amount,
    dt.transaction_type,
    dt.created_at,
    p.coins as current_coins,
    p.xp as current_xp
FROM duel_transactions dt
JOIN profiles p ON p.id = dt.user_id
ORDER BY dt.created_at DESC
LIMIT 20;

-- ДИАГНОСТИЧЕСКИЙ ЗАПРОС 3: Последние дуэли и их winner_id
SELECT 
    d.id,
    d.status,
    d.winner_id,
    d.is_draw,
    d.bet_amount,
    d.finished_at,
    dp.user_id,
    dp.score,
    dp.is_bot
FROM duels d
JOIN duel_players dp ON dp.duel_id = d.id
WHERE d.status = 'finished'
ORDER BY d.finished_at DESC
LIMIT 10;

-- ДИАГНОСТИЧЕСКИЙ ЗАПРОС 4: Текущие очки лицензии
SELECT id, license_points, last_daily_point_at, xp, coins
FROM profiles
WHERE id = '2b6e3b89-8699-498f-9275-065f69781912';
