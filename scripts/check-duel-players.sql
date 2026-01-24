-- Проверка последних дуэлей и их игроков
SELECT 
    d.id as duel_id,
    d.status,
    d.created_at,
    d.started_at,
    COUNT(dp.id) as players_count,
    COUNT(dq.id) as questions_count
FROM duels d
LEFT JOIN duel_players dp ON d.id = dp.duel_id
LEFT JOIN duel_questions dq ON d.id = dq.duel_id
WHERE d.created_at > NOW() - INTERVAL '30 minutes'
GROUP BY d.id, d.status, d.created_at, d.started_at
ORDER BY d.created_at DESC
LIMIT 10;
