-- Добавляем поле для отслеживания явной сдачи игрока
ALTER TABLE public.duel_players
ADD COLUMN IF NOT EXISTS surrendered BOOLEAN DEFAULT false;

-- Обновляем тип инцидента для поддержки surrender
ALTER TABLE public.duel_incidents
DROP CONSTRAINT IF EXISTS duel_incidents_incident_type_check;

ALTER TABLE public.duel_incidents
ADD CONSTRAINT duel_incidents_incident_type_check
CHECK (incident_type IN ('disconnect', 'timeout', 'stall', 'technical_error', 'suspicious_disconnect', 'surrender'));

-- Индекс для быстрого поиска сдавшихся игроков
CREATE INDEX IF NOT EXISTS idx_duel_players_surrendered ON public.duel_players(duel_id, surrendered) WHERE surrendered = true;


