-- ============================================================
-- БЫСТРЫЙ ТЕСТ ПАРТНЕРСКОЙ ПРОГРАММЫ 2.0
-- ============================================================
-- Цель: Проверить что все миграции применены и работают
-- Время: 5 минут
-- Запускать ПОСЛЕ применения всех 8 миграций
-- ============================================================

-- ✅ ШАГ 1: Проверить что таблицы созданы
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
  'partner_conversions',
  'partner_links',
  'partner_payouts',
  'partner_commission_releases',
  'partner_stats_daily',
  'fraud_blacklist',
  'partner_fraud_alerts',
  'autoschool_students'
)
ORDER BY table_name;

-- Ожидается: 8 таблиц

-- ============================================================
-- ✅ ШАГ 2: Создать тестового партнера
-- ============================================================

INSERT INTO public.partners (
  name,
  email,
  partner_type,
  partner_code,
  registration_status,
  status,
  promo_code,
  promo_code_discount,
  promo_code_commission
) VALUES (
  'Test Blog',
  'testblog@example.com',
  'barter',
  'TESTBLOG',
  'approved',
  'active',
  'TEST20',
  20,
  0.30
) RETURNING id, is_partner_premium, partner_code;

-- Ожидается: is_partner_premium = true ✅

-- ============================================================
-- ✅ ШАГ 3: Проверить что Premium активирован
-- ============================================================

SELECT 
  p.partner_code,
  p.is_partner_premium,
  p.partner_premium_activated_at
FROM public.partners p
WHERE p.partner_code = 'TESTBLOG';

-- Ожидается: 
-- is_partner_premium = true
-- partner_premium_activated_at = NOW()

-- ============================================================
-- ✅ ШАГ 4: Создать тестовые конверсии
-- ============================================================

-- Клик
SELECT track_partner_conversion(
  p_partner_code := 'TESTBLOG',
  p_event_type := 'click',
  p_session_id := 'test-session-001',
  p_utm_campaign := 'youtube-test',
  p_device_type := 'mobile',
  p_os := 'ios'
);

-- Регистрация
SELECT track_partner_conversion(
  p_partner_code := 'TESTBLOG',
  p_event_type := 'registration',
  p_session_id := 'test-session-001',
  p_utm_campaign := 'youtube-test'
);

-- Покупка (эмуляция)
SELECT track_partner_conversion(
  p_partner_code := 'TESTBLOG',
  p_event_type := 'purchase',
  p_session_id := 'test-session-001',
  p_utm_campaign := 'youtube-test'
);

-- Проверка: должно вернуть success = true для каждого

-- ============================================================
-- ✅ ШАГ 5: Проверить статистику воронки
-- ============================================================

SELECT * FROM get_partner_funnel_stats(
  (SELECT id FROM public.partners WHERE partner_code = 'TESTBLOG'),
  30
);

-- Ожидается:
-- clicks = 1
-- registrations = 1
-- purchases = 1
-- reg_to_purchase_rate = 100.00

-- ============================================================
-- ✅ ШАГ 6: Сгенерировать партнерскую ссылку
-- ============================================================

SELECT * FROM generate_partner_link(
  (SELECT id FROM public.partners WHERE partner_code = 'TESTBLOG'),
  'premium',
  'test-campaign',
  NULL,
  NULL
);

-- Ожидается:
-- success = true
-- link_code = 'TESTBLOG-XXXX'
-- full_url = 'https://skily.app/go/TESTBLOG-XXXX'

-- ============================================================
-- ✅ ШАГ 7: Проверить генерацию ссылки в БД
-- ============================================================

SELECT 
  link_code,
  destination,
  utm_campaign,
  clicks_count,
  is_active
FROM public.partner_links
WHERE partner_id = (SELECT id FROM public.partners WHERE partner_code = 'TESTBLOG')
ORDER BY created_at DESC
LIMIT 1;

-- Ожидается:
-- destination = 'premium'
-- utm_campaign = 'test-campaign'
-- clicks_count = 0
-- is_active = true

-- ============================================================
-- ✅ ШАГ 8: Тест промокода
-- ============================================================

SELECT * FROM apply_partner_promo_code(
  '00000000-0000-0000-0000-000000000000', -- Любой UUID (не партнера)
  'TEST20',
  9.99
);

-- Ожидается:
-- success = true
-- final_price = 7.99
-- discount_amount = 2.00
-- discount_percent = 20

-- ============================================================
-- ✅ ШАГ 9: Тест self-referral защиты (должен заблокировать)
-- ============================================================

SELECT check_self_referral(
  (SELECT id FROM public.partners WHERE partner_code = 'TESTBLOG'),
  (SELECT user_id FROM public.partners WHERE partner_code = 'TESTBLOG')
);

-- Ожидается: true (self-referral detected!)

-- ============================================================
-- ✅ ШАГ 10: Тест баланса
-- ============================================================

-- Добавить комиссию в hold
SELECT add_partner_commission_to_hold(
  (SELECT id FROM public.partners WHERE partner_code = 'TESTBLOG'),
  15.50,
  NULL
);

-- Проверить баланс
SELECT 
  balance_available,
  balance_hold,
  balance_paid
FROM public.partners
WHERE partner_code = 'TESTBLOG';

-- Ожидается:
-- balance_available = 0.00 (еще в холде)
-- balance_hold = 15.50
-- balance_paid = 0.00

-- ============================================================
-- ✅ ШАГ 11: Проверить функции
-- ============================================================

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%partner%'
ORDER BY routine_name;

-- Ожидается: ~30 функций

-- ============================================================
-- ✅ ШАГ 12: Проверить Cron Jobs (если настроены)
-- ============================================================

SELECT 
  jobname,
  schedule,
  command
FROM cron.job
WHERE jobname LIKE '%partner%' OR jobname IN (
  'release-commissions',
  'aggregate-stats',
  'detect-fraud',
  'cleanup-alerts',
  'archive-conversions'
)
ORDER BY jobname;

-- Ожидается: 5 jobs

-- ============================================================
-- 🎉 ФИНАЛЬНАЯ ПРОВЕРКА
-- ============================================================

-- Если все запросы выше вернули ожидаемые результаты:
SELECT '✅ ВСЁ РАБОТАЕТ! СИСТЕМА ГОТОВА К ЗАПУСКУ!' as status;

-- ============================================================
-- 🧹 ОЧИСТКА (опционально, если нужно удалить тестовые данные)
-- ============================================================

-- Удалить тестового партнера
DELETE FROM public.partners WHERE partner_code = 'TESTBLOG';

-- Удалить тестовые конверсии
DELETE FROM public.partner_conversions 
WHERE partner_code = 'TESTBLOG';

-- Удалить тестовые ссылки
DELETE FROM public.partner_links 
WHERE partner_id NOT IN (SELECT id FROM public.partners);

-- ============================================================
-- 📊 МОНИТОРИНГ (запускать периодически)
-- ============================================================

-- Размер партнерских таблиц
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'partner%'
ORDER BY pg_total_relation_size('public.' || tablename) DESC;

-- Index hit ratio (должно быть >99%)
SELECT 
  ROUND(
    sum(idx_blks_hit)::numeric / 
    NULLIF(sum(idx_blks_hit + idx_blks_read), 0) * 100, 
    2
  ) as index_hit_rate_percent
FROM pg_statio_user_indexes
WHERE schemaname = 'public';

-- Топ-10 медленных функций
SELECT 
  funcname,
  calls,
  ROUND(self_time::numeric, 2) as self_time_ms,
  ROUND(total_time::numeric, 2) as total_time_ms
FROM pg_stat_user_functions
WHERE schemaname = 'public'
AND funcname LIKE '%partner%'
ORDER BY total_time DESC
LIMIT 10;

-- ============================================================
-- 🎯 PRODUCTION READY CHECK
-- ============================================================

-- Проверить что всё настроено правильно
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM public.partner_conversions) >= 0
    AND (SELECT COUNT(*) FROM public.partner_links) >= 0
    AND (SELECT COUNT(*) FROM public.partner_payouts) >= 0
    AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'track_partner_conversion') > 0
    AND (SELECT COUNT(*) FROM cron.job WHERE jobname IN ('release-commissions', 'aggregate-stats')) >= 2
    THEN '🎉 PRODUCTION READY!'
    ELSE '⚠️ Не все компоненты настроены'
  END as production_status;

-- ============================================================
-- КОНЕЦ БЫСТРОГО ТЕСТА
-- ============================================================
-- Если все запросы выполнились без ошибок → ГОТОВО! 🚀
-- Документация: START_HERE.md
-- Детальное тестирование: AFFILIATE_TESTING_GUIDE.md
-- ============================================================

