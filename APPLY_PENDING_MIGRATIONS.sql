-- ============================================
-- ПРИМЕНЕНИЕ ОЖИДАЮЩИХ МИГРАЦИЙ
-- ============================================
-- Эти миграции должны быть применены, но зависли
-- Применяем их вручную через SQL Editor

-- Проверяем, какие миграции уже применены
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version LIKE '20250125%'
ORDER BY version;

-- Если миграций нет в списке выше, значит они не применены
-- Примените их по порядку:
-- 1. 20250125000006_add_partner_links_system.sql
-- 2. 20250125000007_update_partner_dashboard_function.sql  
-- 3. 20250125000008_fix_partners_public_read.sql






















