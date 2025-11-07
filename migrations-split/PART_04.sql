-- ============================================
-- Безопасные миграции для Supabase
-- Часть 4
-- ============================================

-- Миграция 31/53: 20251104000002_fix_realtime_binding_mismatch.sql
-- ============================================

-- Исправление ошибки "mismatch between server and client bindings"
-- Проблема: фильтр в клиенте (user_id=eq.${profileId}) не совпадает с RLS политикой на сервере
-- Решение: использовать RLS политику, которая работает с прямым сравнением user_id

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем старые функции, если они есть
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем функцию для получения profile_id текущего пользователя
-- Эта функция будет использоваться в RLS политике
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles
  WHERE user_id = auth.uid() 
     OR telegram_id = COALESCE(
       (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
       0
     )
  LIMIT 1;
$$;

-- Создаем политику, которая использует функцию для прямого сравнения
-- Это должно работать с фильтром user_id=eq.${profileId} на клиенте
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
CREATE POLICY "Users can view their own notifications" ON duel_notifications
  FOR SELECT
  USING (user_id = get_current_profile_id());

-- Убеждаемся, что realtime включен для таблицы
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
  END IF;
END $$;



-- Миграция 32/53: 20251104000003_fix_realtime_simple_rls.sql
-- ============================================

-- Финальное исправление: упрощенная RLS политика для Realtime
-- Проблема: функции в RLS политике могут не работать с Realtime фильтрами
-- Решение: использовать простую политику без функций, которая работает напрямую

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функции
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем простую политику, которая работает напрямую с user_id
-- user_id в duel_notifications это profile_id из таблицы profiles
-- Мы сравниваем его с текущим profile_id пользователя через подзапрос
-- Это должно работать с Realtime, так как подзапрос вычисляется на сервере
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
CREATE POLICY "Users can view their own notifications" ON duel_notifications
  FOR SELECT
  USING (
    user_id = (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
         OR telegram_id = COALESCE(
           (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
           0
         )
      LIMIT 1
    )
  );

-- Убеждаемся, что realtime включен для таблицы
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
  END IF;
END $$;




-- Миграция 33/53: 20251104120000_final_notification_and_profiles_fix.sql
-- ============================================

-- ФИНАЛЬНАЯ МИГРАЦИЯ: Исправление RLS политик для уведомлений и профилей
-- Применяет все необходимые исправления для работы уведомлений и отображения имен

-- 1. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ ПРОФИЛЕЙ
-- Разрешить чтение профилей для участников дуэли (для отображения имен)

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем политику, которая разрешает чтение всех профилей
-- Это необходимо для отображения имени соперника в дуэли
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT
  USING (true);

-- Также создаем политику для чтения своего профиля (для обратной совместимости)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    (telegram_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'telegram_id'::text)::bigint)
  );

-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ УВЕДОМЛЕНИЙ
-- Упрощенная политика для работы с Realtime (без фильтров на клиенте)

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функции, если они есть
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем простую политику, которая работает напрямую с user_id
-- user_id в duel_notifications это profile_id из таблицы profiles
-- Используем подзапрос для получения текущего profile_id пользователя
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
CREATE POLICY "Users can view their own notifications" ON duel_notifications
  FOR SELECT
  USING (
    user_id = (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
         OR telegram_id = COALESCE(
           (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
           0
         )
      LIMIT 1
    )
  );

-- 3. ВКЛЮЧЕНИЕ REALTIME ДЛЯ УВЕДОМЛЕНИЙ

-- Убеждаемся, что realtime включен для таблицы
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'duel_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
  END IF;
END $$;

-- Проверяем, что таблица в publication
DO $$
DECLARE
  table_in_publication boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'duel_notifications'
  ) INTO table_in_publication;
  
  IF NOT table_in_publication THEN
    RAISE EXCEPTION 'Table duel_notifications is not in supabase_realtime publication';
  ELSE
    RAISE NOTICE '✅ Table duel_notifications is in supabase_realtime publication';
  END IF;
END $$;

-- 4. ПРОВЕРКА РЕЗУЛЬТАТА

-- Проверяем, что политики созданы
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Profiles are viewable by everyone'
  ) THEN
    RAISE NOTICE '✅ Profiles policy created successfully';
  ELSE
    RAISE WARNING '⚠️ Profiles policy not found';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'duel_notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    RAISE NOTICE '✅ Notifications policy created successfully';
  ELSE
    RAISE WARNING '⚠️ Notifications policy not found';
  END IF;
END $$;




-- Миграция 34/53: 20251104130000_rollback_fix_rls_policies.sql
-- ============================================

-- ОТКАТ И ИСПРАВЛЕНИЕ: Восстановление работоспособности RLS политик
-- Эта миграция откатывает проблемные изменения и восстанавливает работоспособность

-- 1. ВОССТАНОВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ ПРОФИЛЕЙ
-- Возвращаем политику, которая разрешает чтение всех профилей (для отображения имен)

-- Удаляем все политики profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем политику, которая разрешает чтение всех профилей
-- Это необходимо для отображения имени соперника в дуэли
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT
  USING (true);

-- 2. ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ УВЕДОМЛЕНИЙ
-- Используем простую политику БЕЗ подзапросов для совместимости с Realtime

-- Удаляем все существующие политики SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON duel_notifications;

-- Удаляем функции, если они есть
DROP FUNCTION IF EXISTS get_user_profile_id();
DROP FUNCTION IF EXISTS get_current_profile_id();

-- Создаем простую политику БЕЗ подзапросов
-- Это критично для работы с Realtime - подзапросы могут вызывать binding mismatch
-- Используем прямую проверку через функцию, которая возвращает profile_id
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles
  WHERE user_id = auth.uid() 
     OR telegram_id = COALESCE(
       (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
       0
     )
  LIMIT 1;
$$;

-- Политика с использованием функции (без подзапроса в USING)
DROP POLICY IF EXISTS "Users can view their own notifications" ON duel_notifications;
CREATE POLICY "Users can view their own notifications" ON duel_notifications
  FOR SELECT
  USING (user_id = get_user_profile_id());

-- 3. ВКЛЮЧЕНИЕ REALTIME ДЛЯ УВЕДОМЛЕНИЙ

-- Убеждаемся, что realtime включен для таблицы
-- Удаляем из publication, если есть, затем добавляем
DO $$
BEGIN
  -- Пытаемся удалить из publication (если есть)
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE duel_notifications;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Игнорируем ошибку, если таблицы нет в publication
  END;
  
  -- Добавляем в publication
  ALTER PUBLICATION supabase_realtime ADD TABLE duel_notifications;
END $$;




-- Миграция 35/53: 20251104140000_fix_question_seed_bigint.sql
-- ============================================

-- ИСПРАВЛЕНИЕ: Изменение типа question_seed с INTEGER на BIGINT
-- Проблема: question_seed генерируется как Date.now() * 1000,
-- что дает значение больше 2 миллиардов (превышает INTEGER)
-- Решение: Изменить тип колонки на BIGINT

-- Изменяем тип колонки question_seed с INTEGER на BIGINT
ALTER TABLE public.duels 
  ALTER COLUMN question_seed TYPE BIGINT;

-- Проверяем, что изменение применено
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'duels' 
      AND column_name = 'question_seed' 
      AND data_type = 'bigint'
  ) THEN
    RAISE NOTICE '✅ Колонка question_seed успешно изменена на BIGINT';
  ELSE
    RAISE EXCEPTION '❌ Ошибка: колонка question_seed не изменена на BIGINT';
  END IF;
END $$;




-- Миграция 36/53: 20251105000000_add_test_result_notification_type.sql
-- ============================================

-- Добавление типа 'test_result' для уведомлений о результатах тестов
ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder', 'test_result'));



-- Миграция 37/53: 20251105221723_ecc56e56-4fb5-442b-96cf-e34cffea6238.sql
-- ============================================

-- Добавление типа 'test_result' для уведомлений о результатах тестов
ALTER TABLE duel_notifications 
  DROP CONSTRAINT IF EXISTS duel_notifications_type_check;

ALTER TABLE duel_notifications 
  ADD CONSTRAINT duel_notifications_type_check 
  CHECK (type IN ('start', 'progress', 'boost', 'finish', 'timeout', 'opponent_ahead', 'opponent_behind', 'reminder', 'test_result'));

-- Миграция 38/53: 20251106084202_db892fdc-403c-47a0-a6a4-baa31489d9fa.sql
-- ============================================

-- Drop the legacy questions table with overly permissive RLS policies
-- All data has been migrated to questions_new
DROP TABLE IF EXISTS questions CASCADE;

-- Drop the legacy answer_options table (associated with old questions)
DROP TABLE IF EXISTS answer_options CASCADE;


-- Миграция 39/53: 20251106085708_2e14f2ac-8eb9-47ac-9249-64a7c15191da.sql
-- ============================================

-- Create road race routes table
CREATE TABLE IF NOT EXISTS road_race_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  description_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  total_distance INTEGER NOT NULL DEFAULT 100,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  question_mix JSONB NOT NULL DEFAULT '{"signs": 40, "terms": 30, "questions": 30}'::jsonb,
  icon TEXT,
  gradient_from TEXT NOT NULL DEFAULT '#FF6B6B',
  gradient_to TEXT NOT NULL DEFAULT '#FFA500',
  checkpoint_interval INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create race sessions table
CREATE TABLE IF NOT EXISTS road_race_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  route_id UUID NOT NULL REFERENCES road_race_routes(id),
  total_distance INTEGER NOT NULL,
  distance_completed INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  incorrect_answers INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER NOT NULL DEFAULT 0,
  max_speed INTEGER NOT NULL DEFAULT 0,
  avg_speed INTEGER NOT NULL DEFAULT 0,
  fuel_remaining INTEGER NOT NULL DEFAULT 100,
  combo_max INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  checkpoints_reached INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  session_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS road_race_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  route_id UUID NOT NULL REFERENCES road_race_routes(id),
  score INTEGER NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  avg_speed INTEGER NOT NULL,
  accuracy_percent INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, route_id)
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS road_race_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  description_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  icon TEXT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

-- Enable RLS
ALTER TABLE road_race_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_race_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_race_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_race_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for routes
DROP POLICY IF EXISTS "Anyone can view routes" ON road_race_routes;
CREATE POLICY "Anyone can view routes" ON road_race_routes FOR SELECT
  USING (true);

-- RLS Policies for sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON road_race_sessions;
CREATE POLICY "Users can view their own sessions" ON road_race_sessions FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

DROP POLICY IF EXISTS "Users can insert their own sessions" ON road_race_sessions;
CREATE POLICY "Users can insert their own sessions" ON road_race_sessions FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

DROP POLICY IF EXISTS "Users can update their own sessions" ON road_race_sessions;
CREATE POLICY "Users can update their own sessions" ON road_race_sessions FOR UPDATE
  USING (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

-- RLS Policies for leaderboard
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON road_race_leaderboard;
CREATE POLICY "Anyone can view leaderboard" ON road_race_leaderboard FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage their own leaderboard entries" ON road_race_leaderboard;
CREATE POLICY "Users can manage their own leaderboard entries" ON road_race_leaderboard FOR ALL
  USING (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ))
  WITH CHECK (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

-- RLS Policies for achievements
DROP POLICY IF EXISTS "Users can view their own achievements" ON road_race_achievements;
CREATE POLICY "Users can view their own achievements" ON road_race_achievements FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles 
    WHERE user_id = auth.uid() 
    OR telegram_id = COALESCE((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint, 0)
  ));

DROP POLICY IF EXISTS "System can create achievements" ON road_race_achievements;
CREATE POLICY "System can create achievements" ON road_race_achievements FOR INSERT
  WITH CHECK (true);

-- Insert default routes
-- Ensure unique constraint exists on road_race_routes.name_ru
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
    WHERE c.relname = 'road_race_routes'
    AND a.attname = 'name_ru'
    AND i.indisunique = true
  ) THEN
    ALTER TABLE public.road_race_routes ADD CONSTRAINT road_race_routes_name_ru_key UNIQUE (name_ru);
  END IF;
END $$;

INSERT INTO road_race_routes (name_ru, name_es, name_en, description_ru, description_es, description_en, total_distance, difficulty, is_premium, question_mix, gradient_from, gradient_to, icon) VALUES
  ('Маршрут Испании', 'Ruta de España', 'Spain Route', 'Проедь через всю Испанию и изучи все знаки', 'Recorre toda España y aprende todas las señales', 'Drive through Spain and learn all the signs', 100, 'medium', false, '{"signs": 40, "terms": 30, "questions": 30}'::jsonb, '#FF6B6B', '#FFA500', 'MapPin'),
  ('Путь водителя', 'Camino del Conductor', 'Driver''s Path', 'Полный курс подготовки к экзамену', 'Curso completo de preparación para el examen', 'Complete exam preparation course', 150, 'hard', false, '{"signs": 30, "terms": 30, "questions": 40}'::jsonb, '#9B5CFF', '#FF6B9D', 'Car'),
  ('Знаковый марафон', 'Maratón de Señales', 'Sign Marathon', 'Специализация на дорожных знаках', 'Especialización en señales de tráfico', 'Specialization in road signs', 80, 'easy', false, '{"signs": 70, "terms": 20, "questions": 10}'::jsonb, '#00BFFF', '#39FF14', 'Shield'),
  ('Экспресс-подготовка', 'Preparación Exprés', 'Express Prep', 'Интенсивный курс для премиум пользователей', 'Curso intensivo para usuarios premium', 'Intensive course for premium users', 200, 'hard', true, '{"signs": 35, "terms": 35, "questions": 30}'::jsonb, '#FFD700', '#FF1493', 'Zap')
ON CONFLICT (name_ru) DO NOTHING;

-- Миграция 40/53: 20251106090745_fa7a02b1-cb5e-49d6-bb99-3d95ae07f38d.sql
-- ============================================

-- Create answer_options table for questions_new
CREATE TABLE IF NOT EXISTS public.answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions_new(id) ON DELETE CASCADE,
  text_ru TEXT NOT NULL,
  text_es TEXT NOT NULL,
  text_en TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing answer options
DROP POLICY IF EXISTS "Anyone can view answer options" ON public.answer_options;
CREATE POLICY "Anyone can view answer options" ON public.answer_options
  FOR SELECT
  USING (true);

-- Create policy for admins to manage answer options
DROP POLICY IF EXISTS "Admins can manage answer options" ON public.answer_options;
CREATE POLICY "Admins can manage answer options" ON public.answer_options
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_answer_options_question_id 
  ON public.answer_options(question_id);

CREATE INDEX IF NOT EXISTS idx_answer_options_position 
  ON public.answer_options(question_id, position);

