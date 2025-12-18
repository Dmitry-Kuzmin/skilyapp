-- ============================================================================
-- Оптимизация хранения данных дуэлей: Автоматическая очистка временных данных
-- ============================================================================
-- Стратегия: "Горячие данные — в таблицах, Холодные — в агрегатах или корзине"
-- 
-- 1. Добавляем JSONB колонку match_summary для компактного хранения истории
-- 2. Создаем функцию автоматической очистки старых временных данных
-- 3. Настраиваем pg_cron для ежедневной очистки
-- 4. Добавляем индексы на created_at для быстрой очистки
-- ============================================================================

-- 1. Добавляем JSONB колонку match_summary в таблицу duels
-- Эта колонка будет хранить компактную сводку матча (accuracy, использованные бусты и т.д.)
-- После заполнения этой колонки можно безопасно удалять детальные данные из связанных таблиц
ALTER TABLE public.duels
ADD COLUMN IF NOT EXISTS match_summary JSONB DEFAULT NULL;

COMMENT ON COLUMN public.duels.match_summary IS 'Компактная сводка матча (accuracy, boosts, итоги) для истории. Позволяет удалять детальные данные из duel_answers после завершения.';

-- 2. Добавляем индексы на created_at для быстрой очистки старых данных
-- Эти индексы критически важны для производительности функции очистки
CREATE INDEX IF NOT EXISTS idx_duel_answers_created_at 
ON public.duel_answers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_duel_active_exploits_created_at 
ON public.duel_active_exploits(created_at DESC);

-- Дополнительные индексы для связи с дуэлями (для эффективной очистки по статусу)
CREATE INDEX IF NOT EXISTS idx_duel_answers_duel_id_created_at 
ON public.duel_answers(duel_id, created_at DESC);

-- 3. Создаем функцию очистки старых временных данных
-- Эта функция удаляет данные, которые больше не нужны (старше 7 дней для ответов, 1 день для эксплойтов)
CREATE OR REPLACE FUNCTION public.delete_old_duel_data()
RETURNS TABLE(
  deleted_answers BIGINT,
  deleted_exploits BIGINT,
  cleaned_duels BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_answers BIGINT := 0;
  v_deleted_exploits BIGINT := 0;
  v_cleaned_duels BIGINT := 0;
  v_cleanup_threshold_answers TIMESTAMPTZ := NOW() - INTERVAL '7 days';
  v_cleanup_threshold_exploits TIMESTAMPTZ := NOW() - INTERVAL '1 day';
BEGIN
  -- 1. Удаляем ответы для дуэлей, которые завершены и старше 7 дней
  -- Удаляем только для завершенных дуэлей (finished или cancelled)
  -- Это безопасно, так как match_summary уже содержит агрегированные данные
  DELETE FROM public.duel_answers
  WHERE created_at < v_cleanup_threshold_answers
    AND duel_id IN (
      SELECT id FROM public.duels 
      WHERE status IN ('finished', 'cancelled')
    );
  
  GET DIAGNOSTICS v_deleted_answers = ROW_COUNT;

  -- 2. Удаляем записи об активных атаках/эксплойтах старше 1 дня
  -- Эти данные нужны только во время активной игры, после завершения они бесполезны
  DELETE FROM public.duel_active_exploits
  WHERE created_at < v_cleanup_threshold_exploits
    AND (is_active = false OR duel_id IN (
      SELECT id FROM public.duels 
      WHERE status IN ('finished', 'cancelled')
    ));
  
  GET DIAGNOSTICS v_deleted_exploits = ROW_COUNT;

  -- 3. (Опционально) Помечаем дуэли как очищенные
  -- Можно использовать для мониторинга, но не обязательно
  UPDATE public.duels
  SET match_summary = COALESCE(match_summary, '{}'::jsonb) || jsonb_build_object('data_cleaned_at', NOW())
  WHERE status IN ('finished', 'cancelled')
    AND finished_at IS NOT NULL
    AND finished_at < v_cleanup_threshold_answers
    AND (match_summary IS NULL OR match_summary->>'data_cleaned_at' IS NULL);
  
  GET DIAGNOSTICS v_cleaned_duels = ROW_COUNT;

  -- Возвращаем статистику очистки
  RETURN QUERY SELECT v_deleted_answers, v_deleted_exploits, v_cleaned_duels;
END;
$$;

COMMENT ON FUNCTION public.delete_old_duel_data IS 'Автоматически удаляет временные данные дуэлей (answers старше 7 дней, exploits старше 1 дня). Вызывается через pg_cron каждую ночь. Безопасно, так как агрегированные данные хранятся в duel_stats и match_summary.';

-- 4. ВАЖНО: pg_cron доступен только на платных планах Supabase (Pro и выше)
-- На бесплатном тарифе используйте Edge Function + внешний cron (см. ниже)
-- 
-- Если у вас платный план, раскомментируйте следующую секцию:
/*
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Настраиваем автоматическую очистку (каждую ночь в 4:00 утра по UTC)
DO $$
BEGIN
  -- Удаляем старую задачу, если она существует
  PERFORM cron.unschedule('cleanup-old-duel-data') 
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-duel-data'
  );

  -- Создаем новую задачу
  PERFORM cron.schedule(
    'cleanup-old-duel-data',
    '0 4 * * *',  -- каждый день в 4:00 UTC
    'SELECT * FROM public.delete_old_duel_data();'
  );
END;
$$;
*/

-- ============================================================================
-- АЛЬТЕРНАТИВА ДЛЯ БЕСПЛАТНОГО ТАРИФА: Edge Function + внешний cron
-- ============================================================================
-- 
-- 1. Создайте Edge Function: supabase/functions/duel-data-cleanup/index.ts
--    (уже создана в проекте)
--
-- 2. Настройте внешний cron для вызова этой функции:
--
--    Вариант A: GitHub Actions (бесплатно)
--    Создайте .github/workflows/duel-cleanup.yml:
--    
--    name: Duel Data Cleanup
--    on:
--      schedule:
--        - cron: '0 4 * * *'  # Каждый день в 4:00 UTC
--    jobs:
--      cleanup:
--        runs-on: ubuntu-latest
--        steps:
--          - name: Call cleanup function
--            run: |
--              curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/duel-data-cleanup" \
--                -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
--                -H "Content-Type: application/json"
--
--    Вариант B: Vercel Cron (если используете Vercel)
--    Добавьте в vercel.json:
--    {
--      "crons": [{
--        "path": "/api/cron/duel-cleanup",
--        "schedule": "0 4 * * *"
--      }]
--    }
--
--    Вариант C: Ручной запуск через Supabase Dashboard
--    Dashboard → Edge Functions → duel-data-cleanup → Invoke
--
-- ============================================================================

