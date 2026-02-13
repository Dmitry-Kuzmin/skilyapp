-- Расширение статусов дуэлей для обработки несостоявшихся дуэлей
ALTER TABLE public.duels 
DROP CONSTRAINT IF EXISTS duels_status_check;

ALTER TABLE public.duels 
ADD CONSTRAINT duels_status_check 
CHECK (status IN ('waiting', 'active', 'finished', 'cancelled', 'technical_draw', 'under_review', 'abandoned'));

-- Добавляем поля для отслеживания активности игроков
ALTER TABLE public.duel_players
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS activity_status TEXT DEFAULT 'online' CHECK (activity_status IN ('online', 'thinking', 'answering', 'reconnecting', 'offline')),
ADD COLUMN IF NOT EXISTS disconnect_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_disconnect_at TIMESTAMPTZ;

-- Индекс для быстрой проверки активности
CREATE INDEX IF NOT EXISTS idx_duel_players_heartbeat ON public.duel_players(duel_id, last_heartbeat_at);

-- Таблица для логирования инцидентов дуэлей
CREATE TABLE IF NOT EXISTS public.duel_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID REFERENCES public.duels(id) ON DELETE CASCADE NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('disconnect', 'timeout', 'stall', 'technical_error', 'suspicious_disconnect')),
  player_id UUID REFERENCES public.duel_players(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duel_incidents_duel_id ON public.duel_incidents(duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_incidents_type ON public.duel_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_duel_incidents_resolved ON public.duel_incidents(resolved_at) WHERE resolved_at IS NULL;

-- Функция для автоматического обновления статуса офлайн (если heartbeat не обновлялся > 10 секунд)
CREATE OR REPLACE FUNCTION public.update_inactive_players()
RETURNS void AS $$
BEGIN
  UPDATE public.duel_players
  SET 
    is_connected = false,
    activity_status = 'offline'
  WHERE 
    last_heartbeat_at < now() - INTERVAL '10 seconds'
    AND is_connected = true
    AND activity_status != 'offline'
    AND duel_id IN (
      SELECT id FROM public.duels 
      WHERE status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS для duel_incidents
ALTER TABLE public.duel_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view incidents in their duels"
ON public.duel_incidents FOR SELECT
USING (
  duel_id IN (
    SELECT duel_id FROM public.duel_players 
    WHERE user_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() 
      OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  )
);

CREATE POLICY "System can create incidents"
ON public.duel_incidents FOR INSERT
WITH CHECK (true);

