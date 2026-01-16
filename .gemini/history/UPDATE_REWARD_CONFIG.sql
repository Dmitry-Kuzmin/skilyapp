-- Обновляем конфигурацию наград: уменьшаем минимальную длительность теста

UPDATE reward_config
SET value = jsonb_set(
  jsonb_set(
    value,
    '{minTestDurationBase}',
    '10'::jsonb
  ),
  '{minTestDurationPerQuestion}',
  '0.5'::jsonb
)
WHERE key = 'test_rewards' AND is_active = true;

-- Проверяем результат
SELECT 
  id,
  key,
  value->>'minTestDurationBase' as min_duration_base,
  value->>'minTestDurationPerQuestion' as min_duration_per_question
FROM reward_config
WHERE key = 'test_rewards' AND is_active = true;
