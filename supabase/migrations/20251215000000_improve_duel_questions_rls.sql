-- Улучшение RLS политики для duel_questions
-- Более простая и надежная версия, которая работает для всех типов пользователей

-- Удаляем старую политику
DROP POLICY IF EXISTS "Players can view their duel questions" ON public.duel_questions;

-- Создаем новую упрощенную политику
-- Проверяет, что пользователь является участником дуэли через duel_players
CREATE POLICY "Enable read access for duel participants"
ON public.duel_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.duel_players dp
    WHERE dp.duel_id = duel_questions.duel_id
    AND (
      -- Для обычных пользователей: проверяем через profiles.user_id = auth.uid()
      dp.user_id IN (
        SELECT id FROM public.profiles 
        WHERE user_id = auth.uid()
      )
      OR
      -- Для Telegram пользователей: проверяем через telegram_id из JWT
      dp.user_id IN (
        SELECT id FROM public.profiles 
        WHERE telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
      )
    )
  )
);

-- Комментарий для документации
COMMENT ON POLICY "Enable read access for duel participants" ON public.duel_questions IS 
  'Разрешает чтение вопросов дуэли для участников (работает для обычных и Telegram пользователей)';

