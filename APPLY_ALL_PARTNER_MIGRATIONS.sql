-- ============================================
-- ПРИМЕНИТЬ ВСЕ МИГРАЦИИ ПАРТНЕРОВ
-- ============================================
-- Эти миграции должны быть применены, но зависли
-- Применяем их вручную через SQL Editor
--
-- ВАЖНО: Выполняйте по порядку, одну за другой!

-- ============================================
-- МИГРАЦИЯ 1: Система партнерских ссылок
-- ============================================
-- Файл: supabase/migrations/20250125000006_add_partner_links_system.sql
-- Или используйте: APPLY_PARTNER_LINKS_MIGRATION.sql
--
-- Скопируйте содержимое APPLY_PARTNER_LINKS_MIGRATION.sql и выполните

-- ============================================
-- МИГРАЦИЯ 2: Обновление функции get_partner_dashboard
-- ============================================
-- Файл: supabase/migrations/20250125000007_update_partner_dashboard_function.sql
-- Или используйте: APPLY_PARTNER_DASHBOARD_UPDATE_FIXED.sql
--
-- Скопируйте содержимое APPLY_PARTNER_DASHBOARD_UPDATE_FIXED.sql и выполните

-- ============================================
-- МИГРАЦИЯ 3: Публичное чтение партнеров
-- ============================================
-- Файл: supabase/migrations/20250125000008_fix_partners_public_read.sql
-- Или используйте готовый SQL ниже:

DROP POLICY IF EXISTS "Anyone can view active partners by code" ON public.partners;

CREATE POLICY "Anyone can view active partners by code"
  ON public.partners
  FOR SELECT
  USING (
    registration_status = 'approved'
    AND status = 'active'
    AND partner_code IS NOT NULL
  );

COMMENT ON POLICY "Anyone can view active partners by code" ON public.partners IS 
  'Разрешает неавторизованным пользователям читать данные одобренных и активных партнеров по partner_code. Необходимо для отображения баннера партнера на посадочной странице.';

-- ============================================
-- ПРОВЕРКА: Убедитесь, что миграции применены
-- ============================================
-- После применения всех миграций выполните:
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version LIKE '20250125%'
ORDER BY version;

-- Должны быть видны:
-- 20250125000006_add_partner_links_system
-- 20250125000007_update_partner_dashboard_function
-- 20250125000008_fix_partners_public_read












