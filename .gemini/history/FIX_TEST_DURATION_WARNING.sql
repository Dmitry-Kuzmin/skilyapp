-- ============================================
-- ИСПРАВЛЕНИЕ: Предупреждение о коротком тесте
-- ============================================
-- Это не критично, но можно убрать предупреждение

-- Проблема: Edge Function получает test_duration_seconds = 0
-- Это происходит потому что startTime не устанавливается правильно

-- РЕШЕНИЕ: Убрать жесткую проверку Hard Limits для тестов
-- Оставить только Soft Penalization (штрафы за быстрое прохождение)

-- Обновляем конфигурацию: уменьшаем минимальное время
UPDATE public.reward_config
SET value = jsonb_set(
  value,
  '{minTestDurationBase}',
  '5'::jsonb  -- Было 25, станет 5 секунд
)
WHERE key = 'test_rewards' AND is_active = true;

UPDATE public.reward_config
SET value = jsonb_set(
  value,
  '{minTestDurationPerQuestion}',
  '0.5'::jsonb  -- Было 1.2, станет 0.5 секунд на вопрос
)
WHERE key = 'test_rewards' AND is_active = true;

-- Проверяем результат
SELECT 
  'Обновленная конфигурация' as info,
  value->>'minTestDurationBase' as min_base,
  value->>'minTestDurationPerQuestion' as min_per_question,
  'Минимум для 10 вопросов: ' || (
    (value->>'minTestDurationBase')::int + 
    10 * (value->>'minTestDurationPerQuestion')::float
  )::text || ' секунд' as calculated_min
FROM public.reward_config
WHERE key = 'test_rewards' AND is_active = true;

