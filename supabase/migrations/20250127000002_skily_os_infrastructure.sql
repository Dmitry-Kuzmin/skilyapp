-- ============================================
-- Фаза 0: Skily O.S. - Подготовка инфраструктуры
-- ============================================

-- 1. Обновляем таблицу определений бустов (добавляем режимы)
ALTER TABLE public.boost_definitions 
ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('safe', 'root')) DEFAULT 'safe',
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('utility', 'exploit', 'defense')) DEFAULT 'utility',
ADD COLUMN IF NOT EXISTS target_type TEXT CHECK (target_type IN ('self', 'opponent', 'both')) DEFAULT 'self';

-- 2. Обновляем существующие бусты (Safe Mode)
UPDATE public.boost_definitions 
SET mode = 'safe', category = 'utility', target_type = 'self' 
WHERE type IN ('fifty_fifty', 'time_extend', 'hint', 'skip', 'translate');

-- 3. Добавляем новые бусты (Root Mode / Exploits)
-- Используем правильные поля: name_ru, name_es, description_ru, description_es, icon, cost_coins
-- 
-- ЦЕНОВАЯ ПОЛИТИКА (Balanced Pricing):
-- - Screen Injector: 15 монет (€0.45) - дешевая, массовая атака
-- - GPS Spoofing: 20 монет (€0.60) - средняя пакость
-- - Input Lag: 30 монет (€0.90) - мощная атака
-- - Police Backdoor: 40 монет (€1.20) - "ульта" для добивания
-- - Firewall: 50 монет (€1.50) - защита не должна стоить как 3 атаки
-- - Rewind (ADAS): 50 монет (€1.50) - дорого, но спасает экзамен (высокая ценность)
INSERT INTO public.boost_definitions (
  type, 
  name_ru, 
  name_es, 
  description_ru, 
  description_es, 
  icon, 
  cost_coins, 
  mode, 
  category, 
  target_type
) VALUES 
  (
    'screen_injector', 
    'Screen Injector', 
    'Screen Injector', 
    'Взлом дисплея соперника спам-рекламой. На экране врага всплывают окна ошибок, которые нужно закрывать.',
    'Hack de la pantalla del oponente con spam. Aparecen ventanas de error que hay que cerrar.',
    '💉', 
    15, 
    'root', 
    'exploit', 
    'opponent'
  ),
  (
    'input_lag', 
    'Input Lag', 
    'Input Lag', 
    'DDOS-атака на сенсоры машины соперника. Враг нажимает на ответ, а клик срабатывает через 1.5 секунды.',
    'Ataque DDOS a los sensores del oponente. El clic se retrasa 1.5 segundos.',
    '🕸️', 
    30, 
    'root', 
    'exploit', 
    'opponent'
  ),
  (
    'gps_spoofing', 
    'GPS Spoofing', 
    'GPS Spoofing', 
    'Подмена координат навигатора врага. Варианты ответов (А, Б, В) начинают меняться местами прямо под пальцем.',
    'Sustitución de coordenadas del navegador. Las opciones de respuesta se mezclan.',
    '🌀', 
    20, 
    'root', 
    'exploit', 
    'opponent'
  ),
  (
    'police_backdoor', 
    'Police Backdoor', 
    'Police Backdoor', 
    'Ложный вызов полиции на машину врага. Экран блокируется проверкой документов. Нужно пройти капчу (слайдер).',
    'Falsa llamada policial. La pantalla se bloquea con verificación de documentos. Hay que pasar el captcha.',
    '🚨', 
    40, 
    'root', 
    'exploit', 
    'opponent'
  ),
  (
    'firewall', 
    'Firewall', 
    'Firewall', 
    'Защита системы. Отражение входящих атак. Если враг кинул в тебя "Лаг", он отрикошетит обратно в него.',
    'Protección del sistema. Refleja ataques entrantes. Si el enemigo lanzó "Lag", rebota hacia él.',
    '🔥', 
    50, 
    'root', 
    'defense', 
    'self'
  ),
  (
    'rewind', 
    'ADAS: Rewind', 
    'ADAS: Rewind', 
    'Advanced Driver Assistance. Система записала аварийную ситуацию. Мы можем "симулировать" её заново. Отмена ошибки - экран "перематывается" назад с эффектом VHS-помех. Жизнь возвращается.',
    'Advanced Driver Assistance. El sistema grabó una situación de emergencia. Podemos "simularla" de nuevo. Cancelación del error - la pantalla "rebobina" hacia atrás con efecto de interferencias VHS. La vida regresa.',
    '📼', 
    50, 
    'safe', 
    'utility', 
    'self'
  )
ON CONFLICT (type) DO UPDATE 
SET 
  mode = EXCLUDED.mode, 
  category = EXCLUDED.category, 
  target_type = EXCLUDED.target_type,
  name_ru = EXCLUDED.name_ru,
  name_es = EXCLUDED.name_es,
  description_ru = EXCLUDED.description_ru,
  description_es = EXCLUDED.description_es,
  icon = EXCLUDED.icon,
  cost_coins = EXCLUDED.cost_coins;

-- 4. Создаем таблицу для State Recovery (Активные атаки)
CREATE TABLE IF NOT EXISTS public.duel_active_exploits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  target_player_id UUID NOT NULL REFERENCES duel_players(id) ON DELETE CASCADE,
  exploit_type TEXT NOT NULL,
  attacker_player_id UUID NOT NULL REFERENCES duel_players(id),
  effect_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска при реконнекте
CREATE INDEX IF NOT EXISTS idx_duel_active_exploits_target 
ON public.duel_active_exploits(duel_id, target_player_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_duel_active_exploits_expires 
ON public.duel_active_exploits(expires_at) 
WHERE is_active = true;

-- RLS (Безопасность)
ALTER TABLE public.duel_active_exploits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view exploits affecting them"
ON public.duel_active_exploits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM duel_players dp
    WHERE dp.id = duel_active_exploits.target_player_id
    AND dp.user_id IN (
      SELECT id FROM profiles 
      WHERE user_id = auth.uid() 
         OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
);

-- Комментарии для документации
COMMENT ON TABLE public.duel_active_exploits IS 'Активные exploits в дуэлях для State Recovery при реконнекте';
COMMENT ON COLUMN public.duel_active_exploits.effect_data IS 'JSON с данными эффекта (duration_ms, popup_count, delay_ms и т.д.)';

