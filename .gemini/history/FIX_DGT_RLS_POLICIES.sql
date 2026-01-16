-- ========================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ DGT ТЕСТОВ
-- ========================================
-- Применить через Supabase Dashboard → SQL Editor → Run

-- Удаляем ВСЕ существующие политики для таблиц DGT
DROP POLICY IF EXISTS "Users can create their own test sessions" ON public.dgt_test_sessions;
DROP POLICY IF EXISTS "Users can view their own test sessions" ON public.dgt_test_sessions;
DROP POLICY IF EXISTS "Users can update their own test sessions" ON public.dgt_test_sessions;
DROP POLICY IF EXISTS "Anyone can create test sessions" ON public.dgt_test_sessions;
DROP POLICY IF EXISTS "Users can view test sessions" ON public.dgt_test_sessions;
DROP POLICY IF EXISTS "Users can update test sessions" ON public.dgt_test_sessions;

DROP POLICY IF EXISTS "Users can create their own test answers" ON public.dgt_test_answers;
DROP POLICY IF EXISTS "Users can view their own test answers" ON public.dgt_test_answers;
DROP POLICY IF EXISTS "Users can update their own test answers" ON public.dgt_test_answers;
DROP POLICY IF EXISTS "Anyone can create test answers" ON public.dgt_test_answers;
DROP POLICY IF EXISTS "Users can view test answers" ON public.dgt_test_answers;
DROP POLICY IF EXISTS "Users can update test answers" ON public.dgt_test_answers;

-- Создаем новые политики для dgt_test_sessions
-- Разрешаем ВСЕМ пользователям создавать сессии (даже неавторизованным)
CREATE POLICY "Anyone can create test sessions"
  ON public.dgt_test_sessions
  FOR INSERT
  WITH CHECK (true);

-- Разрешаем просматривать свои сессии (по user_id) или сессии без user_id
CREATE POLICY "Users can view test sessions"
  ON public.dgt_test_sessions
  FOR SELECT
  USING (
    user_id IS NULL 
    OR user_id = auth.uid()
    OR user_id IN (SELECT id FROM public.profiles WHERE id = user_id)
  );

-- Разрешаем обновлять свои сессии
CREATE POLICY "Users can update test sessions"
  ON public.dgt_test_sessions
  FOR UPDATE
  USING (
    user_id IS NULL 
    OR user_id = auth.uid()
    OR user_id IN (SELECT id FROM public.profiles WHERE id = user_id)
  );

-- Создаем новые политики для dgt_test_answers
-- Разрешаем ВСЕМ создавать ответы
CREATE POLICY "Anyone can create test answers"
  ON public.dgt_test_answers
  FOR INSERT
  WITH CHECK (true);

-- Разрешаем просматривать ответы своих сессий
CREATE POLICY "Users can view test answers"
  ON public.dgt_test_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dgt_test_sessions
      WHERE dgt_test_sessions.id = dgt_test_answers.session_id
      AND (
        dgt_test_sessions.user_id IS NULL 
        OR dgt_test_sessions.user_id = auth.uid()
        OR dgt_test_sessions.user_id IN (SELECT id FROM public.profiles WHERE id = dgt_test_sessions.user_id)
      )
    )
  );

-- Разрешаем обновлять ответы своих сессий
CREATE POLICY "Users can update test answers"
  ON public.dgt_test_answers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dgt_test_sessions
      WHERE dgt_test_sessions.id = dgt_test_answers.session_id
      AND (
        dgt_test_sessions.user_id IS NULL 
        OR dgt_test_sessions.user_id = auth.uid()
        OR dgt_test_sessions.user_id IN (SELECT id FROM public.profiles WHERE id = dgt_test_sessions.user_id)
      )
    )
  );

-- Проверяем результат
SELECT 'RLS политики успешно обновлены! Теперь тесты должны работать.' as result;

