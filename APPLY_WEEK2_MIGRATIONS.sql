-- ============================================
-- Применить миграции Недели 2 вручную
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================

-- 1. Создать bulk функцию для атомарного обновления нескольких полей
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_profile_stats(
  p_user_id UUID,
  p_coins INTEGER DEFAULT 0,
  p_xp INTEGER DEFAULT 0,
  p_sp INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_rows_updated INTEGER;
  v_new_coins INTEGER;
BEGIN
  -- Проверяем, существует ли профиль
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Профиль с id % не найден', p_user_id;
  END IF;

  -- Получаем текущее значение coins для проверки отрицательного баланса
  IF p_coins < 0 THEN
    SELECT COALESCE(coins, 0) INTO v_new_coins FROM profiles WHERE id = p_user_id;
    
    IF (v_new_coins + p_coins) < 0 THEN
      RAISE EXCEPTION 'Недостаточно монет. Текущий баланс: %, требуется: %', v_new_coins, ABS(p_coins);
    END IF;
  END IF;

  -- ОДИН атомарный UPDATE для всех полей
  UPDATE public.profiles
  SET 
    coins = COALESCE(coins, 0) + p_coins,
    xp = COALESCE(xp, 0) + p_xp,
    sp = COALESCE(sp, 0) + p_sp,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- Проверяем, что обновление произошло
  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Не удалось обновить профиль с id %', p_user_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.increment_profile_stats IS 'Оптимизированная bulk функция для атомарного обновления coins, xp, sp одним запросом';

-- 2. Создать RPC функцию для получения размера БД
-- ============================================
CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_database_size(current_database());
$$;

COMMENT ON FUNCTION public.get_database_size IS 'Возвращает размер текущей базы данных в байтах. Используется для мониторинга Free Tier (лимит 500 MB)';

-- ============================================
-- Проверка успешного применения
-- ============================================
DO $$
BEGIN
  -- Проверяем, что функции созданы
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_profile_stats') THEN
    RAISE NOTICE '✅ Функция increment_profile_stats создана успешно';
  ELSE
    RAISE WARNING '❌ Функция increment_profile_stats не найдена';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_database_size') THEN
    RAISE NOTICE '✅ Функция get_database_size создана успешно';
  ELSE
    RAISE WARNING '❌ Функция get_database_size не найдена';
  END IF;
END $$;

