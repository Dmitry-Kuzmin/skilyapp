-- Удаляем дубликаты конфигурации, оставляем только самую новую
DELETE FROM reward_config 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY key, season_id ORDER BY effective_from DESC, revision DESC) as rn
    FROM reward_config
    WHERE key = 'test_rewards' AND season_id IS NULL
  ) t
  WHERE rn > 1
);

-- Проверяем результат
SELECT id, key, revision, effective_from, is_active 
FROM reward_config 
WHERE key = 'test_rewards' 
ORDER BY effective_from DESC;
