-- ============================================
-- ПРОВЕРКА: Применены ли миграции партнёров
-- ============================================
-- Проверяем, действительно ли изменения применены, даже если они не в таблице миграций

-- 1. Проверяем, есть ли колонка partner_code в таблице partners
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'partners' 
      AND column_name = 'partner_code'
    )
    THEN '✅ Колонка partner_code существует'
    ELSE '❌ Колонка partner_code НЕ существует'
  END AS partner_code_check;

-- 2. Проверяем, существует ли таблица partner_link_activations
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'partner_link_activations'
    )
    THEN '✅ Таблица partner_link_activations существует'
    ELSE '❌ Таблица partner_link_activations НЕ существует'
  END AS table_check;

-- 3. Проверяем, существует ли функция activate_partner_premium
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'activate_partner_premium'
    )
    THEN '✅ Функция activate_partner_premium существует'
    ELSE '❌ Функция activate_partner_premium НЕ существует'
  END AS function_check;

-- 4. Проверяем, существует ли политика "Anyone can view active partners by code"
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'partners'
      AND policyname = 'Anyone can view active partners by code'
    )
    THEN '✅ Политика "Anyone can view active partners by code" существует'
    ELSE '❌ Политика "Anyone can view active partners by code" НЕ существует'
  END AS policy_check;

-- 5. Проверяем, обновлена ли функция get_partner_dashboard
-- (проверяем, есть ли в ней логика для partner_link_activations)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'get_partner_dashboard'
      AND p.prosrc LIKE '%partner_link_activations%'
    )
    THEN '✅ Функция get_partner_dashboard обновлена (содержит partner_link_activations)'
    ELSE '❌ Функция get_partner_dashboard НЕ обновлена'
  END AS dashboard_function_check;

-- 6. Проверяем, есть ли у партнёров partner_code
SELECT 
  COUNT(*) AS total_partners,
  COUNT(partner_code) AS partners_with_code,
  COUNT(*) - COUNT(partner_code) AS partners_without_code
FROM public.partners;

-- 7. Итоговый статус
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'partner_code')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_link_activations')
      AND EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'activate_partner_premium')
      AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'partners' AND policyname = 'Anyone can view active partners by code')
    THEN '✅ ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ!'
    ELSE '⚠️ Некоторые миграции не применены - проверьте результаты выше'
  END AS final_status;




