-- ============================================================
-- Миграция: Ротация сезонов Duel Pass
-- 1. Продлить сезон "Операция Асфальт" до конца марта 2026
-- 2. Добавить 3 новых сезона (апрель–июнь 2026)
-- 3. Создать функцию auto_transition_season()
-- 4. Настроить ежедневный pg_cron
-- Дата: 2026-02-28
-- ============================================================

-- -------------------------------------------------------
-- 1. Продление текущего сезона "Операция Асфальт" до 31 марта
-- -------------------------------------------------------
UPDATE public.duel_pass_seasons
SET
  end_date  = '2026-03-31 23:59:59+00'::timestamptz,
  is_active = true
WHERE id = 1;

-- -------------------------------------------------------
-- 2. Добавление 3 новых сезонов
--    Они НЕ активны (is_active = false) — активируются автоматически
-- -------------------------------------------------------

-- Сезон 2: "Операция Буря" — апрель 2026
INSERT INTO public.duel_pass_seasons
  (season_number, name_ru, name_es, name_en, theme, start_date, end_date, is_active)
VALUES
  (2,
   'Операция Буря',
   'Operación Tormenta',
   'Operation Storm',
   'winter',                          -- тема: синие/электрические цвета
   '2026-04-01 00:00:00+00'::timestamptz,
   '2026-04-30 23:59:59+00'::timestamptz,
   false)
ON CONFLICT (season_number) DO UPDATE SET
  name_ru    = EXCLUDED.name_ru,
  name_es    = EXCLUDED.name_es,
  name_en    = EXCLUDED.name_en,
  theme      = EXCLUDED.theme,
  start_date = EXCLUDED.start_date,
  end_date   = EXCLUDED.end_date;

-- Сезон 3: "Операция Скорость" — май 2026
INSERT INTO public.duel_pass_seasons
  (season_number, name_ru, name_es, name_en, theme, start_date, end_date, is_active)
VALUES
  (3,
   'Операция Скорость',
   'Operación Velocidad',
   'Operation Speed',
   'summer',                          -- тема: оранжево-красные цвета
   '2026-05-01 00:00:00+00'::timestamptz,
   '2026-05-31 23:59:59+00'::timestamptz,
   false)
ON CONFLICT (season_number) DO UPDATE SET
  name_ru    = EXCLUDED.name_ru,
  name_es    = EXCLUDED.name_es,
  name_en    = EXCLUDED.name_en,
  theme      = EXCLUDED.theme,
  start_date = EXCLUDED.start_date,
  end_date   = EXCLUDED.end_date;

-- Сезон 4: "Операция Ночной Город" — июнь 2026
INSERT INTO public.duel_pass_seasons
  (season_number, name_ru, name_es, name_en, theme, start_date, end_date, is_active)
VALUES
  (4,
   'Операция Ночной Город',
   'Operación Ciudad Nocturna',
   'Operation Night City',
   'special',                         -- тема: тёмно-синие/неоновые цвета
   '2026-06-01 00:00:00+00'::timestamptz,
   '2026-06-30 23:59:59+00'::timestamptz,
   false)
ON CONFLICT (season_number) DO UPDATE SET
  name_ru    = EXCLUDED.name_ru,
  name_es    = EXCLUDED.name_es,
  name_en    = EXCLUDED.name_en,
  theme      = EXCLUDED.theme,
  start_date = EXCLUDED.start_date,
  end_date   = EXCLUDED.end_date;

-- -------------------------------------------------------
-- 3. Функция автоматической ротации сезонов
--    Вызывается ежедневно cron-джобом
--    Логика:
--    a) Деактивирует все истёкшие активные сезоны
--    b) Активирует следующий сезон по расписанию (если дата началась)
--    c) Идемпотентна — безопасно вызывать многократно
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_transition_season()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deactivated INTEGER := 0;
  v_activated   INTEGER := 0;
  v_next_id     INTEGER;
BEGIN
  -- a) Деактивируем все истёкшие сезоны
  UPDATE public.duel_pass_seasons
  SET is_active = false
  WHERE is_active = true
    AND end_date < CURRENT_TIMESTAMP
  RETURNING id INTO v_next_id; -- просто для подсчёта

  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  -- b) Активируем ближайший подходящий сезон, если нет активного
  IF NOT EXISTS (
    SELECT 1 FROM public.duel_pass_seasons
    WHERE is_active = true
      AND start_date <= CURRENT_TIMESTAMP
      AND end_date   >= CURRENT_TIMESTAMP
  ) THEN
    SELECT id INTO v_next_id
    FROM public.duel_pass_seasons
    WHERE is_active = false
      AND start_date <= CURRENT_TIMESTAMP
      AND end_date   >= CURRENT_TIMESTAMP
    ORDER BY season_number ASC
    LIMIT 1;

    IF v_next_id IS NOT NULL THEN
      UPDATE public.duel_pass_seasons
      SET is_active = true
      WHERE id = v_next_id;

      GET DIAGNOSTICS v_activated = ROW_COUNT;
    END IF;
  END IF;

  RETURN format(
    'auto_transition_season: deactivated=%s, activated=%s, next_id=%s, ts=%s',
    v_deactivated,
    v_activated,
    COALESCE(v_next_id::TEXT, 'none'),
    CURRENT_TIMESTAMP
  );
END;
$$;

-- -------------------------------------------------------
-- 4. Настройка pg_cron: ежедневный запуск в 00:05 UTC
--    Удаляем старый weekly-джоб и создаём ежедневный
-- -------------------------------------------------------

-- Удаляем старый еженедельный джоб (он заменяется ежедневным)
SELECT cron.unschedule('weekly-season-rewards-check');

-- Новый ежедневный джоб — ротация сезонов в 00:05 UTC
SELECT cron.schedule(
  'daily-season-auto-transition',  -- имя джоба
  '5 0 * * *',                      -- каждый день в 00:05 UTC
  $$ SELECT auto_transition_season(); $$
);

-- Сохраняем функцию проверки истёкших сезонов (она всё ещё может быть полезна для логов)
-- Но запускаем её тоже ежедневно в рамках того же джоба
-- (check_and_log_ended_seasons() — не трогаем, она логирует)
