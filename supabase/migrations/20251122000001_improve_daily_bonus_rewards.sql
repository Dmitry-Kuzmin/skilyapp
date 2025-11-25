-- ============================================
-- Улучшенная система ежедневных наград
-- Основано на анализе и рекомендациях
-- ============================================

-- 1. Обновляем daily_bonus_def с улучшенными наградами
TRUNCATE TABLE public.daily_bonus_def;

-- Улучшенные награды с учетом рекомендаций:
-- - Дни 1-3: добавляем микро-лут (стикеры) для мотивации
-- - День 4: Boost + дополнительные награды (не только Boost)
-- - День 6: рандомный лут (стикер/скин/рамка)
-- - День 7: сезонный бейдж (будет определяться динамически)
INSERT INTO public.daily_bonus_def (day_number, reward, description) VALUES
-- День 1: Первый шаг - мягкий вход
(1, '{"xp": 10, "coins": 5, "boost": false, "badge": null, "random_loot": null}'::jsonb, 'Первый шаг'),

-- День 2: Продолжаем - добавляем микро-лут (рандомный стикер)
(2, '{"xp": 15, "coins": 5, "boost": false, "badge": null, "random_loot": {"type": "sticker", "pool": "common"}}'::jsonb, 'Продолжаем'),

-- День 3: Набираем темп - еще один стикер
(3, '{"xp": 20, "coins": 10, "boost": false, "badge": null, "random_loot": {"type": "sticker", "pool": "common"}}'::jsonb, 'Набираем темп'),

-- День 4: Boost день! - теперь Boost + награды (не только Boost)
(4, '{"xp": 25, "coins": 10, "boost": true, "badge": null, "random_loot": null}'::jsonb, 'Boost день!'),

-- День 5: Почти неделя - самый сильный XP-день
(5, '{"xp": 30, "coins": 15, "boost": false, "badge": null, "random_loot": null}'::jsonb, 'Почти неделя'),

-- День 6: День покупок - рандомный лут (60% монеты, 40% косметика)
(6, '{"xp": 40, "coins": 20, "boost": false, "badge": null, "random_loot": {"type": "surprise", "pool": "mixed"}}'::jsonb, 'День покупок'),

-- День 7: Недельный герой! - кульминация + сезонный бейдж (определяется динамически)
(7, '{"xp": 60, "coins": 30, "boost": true, "badge": "seasonal", "random_loot": null}'::jsonb, 'Недельный герой!')
ON CONFLICT (day_number) DO UPDATE
SET reward = EXCLUDED.reward,
    description = EXCLUDED.description;

-- 2. Создаем функцию для получения рандомного стикера из пула
CREATE OR REPLACE FUNCTION public.get_random_sticker_from_pool(
  p_pool TEXT DEFAULT 'common'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sticker_id TEXT;
BEGIN
  -- Получаем рандомный стикер из пула
  SELECT id INTO v_sticker_id
  FROM public.sticker_definitions
  WHERE 
    (p_pool = 'common' AND rarity = 'common')
    OR (p_pool = 'rare' AND rarity IN ('common', 'rare'))
    OR (p_pool = 'epic' AND rarity IN ('common', 'rare', 'epic'))
    OR (p_pool = 'all')
  AND is_premium = false
  ORDER BY RANDOM()
  LIMIT 1;
  
  RETURN COALESCE(v_sticker_id, 'sticker_fire'); -- Fallback на базовый стикер
END;
$$;

-- 3. Создаем функцию для получения рандомного лута (стикер/скин/рамка)
CREATE OR REPLACE FUNCTION public.get_random_loot(
  p_loot_type TEXT,
  p_pool TEXT DEFAULT 'common'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_sticker_id TEXT;
  v_skin_id TEXT;
BEGIN
  IF p_loot_type = 'sticker' THEN
    -- Рандомный стикер
    v_sticker_id := public.get_random_sticker_from_pool(p_pool);
    v_result := jsonb_build_object(
      'type', 'sticker',
      'id', v_sticker_id,
      'quantity', 1
    );
  ELSIF p_loot_type = 'surprise' THEN
    -- Сюрпризный лут: 60% монеты (уже в награде), 40% косметика
    -- В коде будем определять случайно
    -- Здесь возвращаем структуру для обработки
    IF RANDOM() < 0.4 THEN
      -- 40% шанс на косметику - выбираем между стикером и скином
      IF RANDOM() < 0.7 THEN
        -- 70% шанс на стикер
        v_sticker_id := public.get_random_sticker_from_pool('rare');
        v_result := jsonb_build_object(
          'type', 'sticker',
          'id', v_sticker_id,
          'quantity', 1
        );
      ELSE
        -- 30% шанс на скин (только common/rare)
        SELECT id INTO v_skin_id
        FROM public.skin_definitions
        WHERE rarity IN ('common', 'rare')
          AND is_premium = false
        ORDER BY RANDOM()
        LIMIT 1;
        
        IF v_skin_id IS NOT NULL THEN
          v_result := jsonb_build_object(
            'type', 'skin',
            'id', v_skin_id,
            'quantity', 1
          );
        ELSE
          -- Fallback на стикер
          v_sticker_id := public.get_random_sticker_from_pool('rare');
          v_result := jsonb_build_object(
            'type', 'sticker',
            'id', v_sticker_id,
            'quantity', 1
          );
        END IF;
      END IF;
    ELSE
      -- 60% - только монеты (уже в награде)
      v_result := jsonb_build_object('type', 'coins_only');
    END IF;
  ELSE
    v_result := jsonb_build_object('type', 'none');
  END IF;
  
  RETURN v_result;
END;
$$;

-- 4. Создаем функцию для получения сезонного бейджа
CREATE OR REPLACE FUNCTION public.get_seasonal_weekly_badge()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season RECORD;
  v_badge_id TEXT;
BEGIN
  -- Получаем активный сезон
  SELECT * INTO v_season FROM public.get_active_season();
  
  IF v_season IS NULL THEN
    -- Если нет активного сезона, используем дефолтный
    RETURN 'badge_streak_7';
  END IF;
  
  -- Формируем ID бейджа на основе сезона
  -- Формат: badge_weekly_season_{season_number}_{theme}
  v_badge_id := 'badge_weekly_season_' || v_season.season_number || '_' || v_season.theme;
  
  -- Проверяем, существует ли такой бейдж
  IF EXISTS (SELECT 1 FROM public.badge_definitions WHERE id = v_badge_id) THEN
    RETURN v_badge_id;
  ELSE
    -- Если бейджа нет, создаем его автоматически
    INSERT INTO public.badge_definitions (
      id,
      name_ru,
      name_es,
      description_ru,
      description_es,
      rarity,
      category,
      is_premium,
      metadata
    ) VALUES (
      v_badge_id,
      CASE v_season.theme
        WHEN 'winter' THEN 'Зимний герой недели'
        WHEN 'spring' THEN 'Весенний герой недели'
        WHEN 'summer' THEN 'Летний герой недели'
        WHEN 'autumn' THEN 'Осенний герой недели'
        ELSE 'Герой недели'
      END,
      CASE v_season.theme
        WHEN 'winter' THEN 'Héroe semanal de invierno'
        WHEN 'spring' THEN 'Héroe semanal de primavera'
        WHEN 'summer' THEN 'Héroe semanal de verano'
        WHEN 'autumn' THEN 'Héroe semanal de otoño'
        ELSE 'Héroe semanal'
      END,
      'Завершил неделю в сезоне ' || v_season.season_number,
      'Completó la semana en la temporada ' || v_season.season_number,
      'rare',
      'seasonal',
      false,
      jsonb_build_object(
        'icon', 'calendar',
        'color', CASE v_season.theme
          WHEN 'winter' THEN '#3b82f6'
          WHEN 'spring' THEN '#10b981'
          WHEN 'summer' THEN '#f59e0b'
          WHEN 'autumn' THEN '#ef4444'
          ELSE '#6366f1'
        END,
        'season_number', v_season.season_number,
        'theme', v_season.theme
      )
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN v_badge_id;
  END IF;
END;
$$;

-- 5. Создаем функцию для начисления рандомного лута пользователю
CREATE OR REPLACE FUNCTION public.grant_random_loot(
  p_user_id UUID,
  p_loot_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loot_type TEXT;
  v_loot_id TEXT;
  v_quantity INTEGER;
  v_result JSONB;
BEGIN
  v_loot_type := p_loot_data->>'type';
  v_loot_id := p_loot_data->>'id';
  v_quantity := COALESCE((p_loot_data->>'quantity')::INTEGER, 1);
  
  IF v_loot_type = 'sticker' AND v_loot_id IS NOT NULL THEN
    -- Добавляем стикер в инвентарь
    INSERT INTO public.user_stickers (user_id, sticker_id, quantity, obtained_from, obtained_metadata)
    VALUES (p_user_id, v_loot_id, v_quantity, 'daily_bonus', jsonb_build_object('day', CURRENT_DATE))
    ON CONFLICT (user_id, sticker_id)
    DO UPDATE SET quantity = user_stickers.quantity + v_quantity;
    
    v_result := jsonb_build_object(
      'success', true,
      'type', 'sticker',
      'id', v_loot_id,
      'quantity', v_quantity
    );
    
  ELSIF v_loot_type = 'skin' AND v_loot_id IS NOT NULL THEN
    -- Добавляем скин в инвентарь
    INSERT INTO public.user_skins (user_id, skin_id, is_active, obtained_from, obtained_metadata)
    VALUES (p_user_id, v_loot_id, false, 'daily_bonus', jsonb_build_object('day', CURRENT_DATE))
    ON CONFLICT (user_id, skin_id) DO NOTHING;
    
    v_result := jsonb_build_object(
      'success', true,
      'type', 'skin',
      'id', v_loot_id
    );
    
  ELSE
    v_result := jsonb_build_object('success', false, 'error', 'invalid_loot_type');
  END IF;
  
  RETURN v_result;
END;
$$;

-- 6. Права доступа
GRANT EXECUTE ON FUNCTION public.get_random_sticker_from_pool(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_random_loot(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_seasonal_weekly_badge() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_random_loot(UUID, JSONB) TO authenticated, service_role;

-- 7. Комментарии для документации
COMMENT ON FUNCTION public.get_random_sticker_from_pool IS 
  'Получает рандомный стикер из указанного пула редкости (common, rare, epic, all)';

COMMENT ON FUNCTION public.get_random_loot IS 
  'Генерирует рандомный лут (стикер/скин) для ежедневных наград';

COMMENT ON FUNCTION public.get_seasonal_weekly_badge IS 
  'Получает или создает сезонный бейдж для завершения недели';

COMMENT ON FUNCTION public.grant_random_loot IS 
  'Начисляет рандомный лут пользователю в инвентарь';

