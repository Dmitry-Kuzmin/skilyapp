-- =====================================================
-- Потоки курса DGT — course_streams
-- Единый источник правды: бот + лендинг + админка
-- =====================================================

CREATE TABLE IF NOT EXISTS course_streams (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number        INTEGER NOT NULL,             -- Номер потока (51, 52, ...)
  start_date    DATE NOT NULL,                -- Дата первого занятия
  spots_total   INTEGER DEFAULT 8,            -- Всего мест в потоке
  spots_enrolled INTEGER DEFAULT 0,           -- Записалось (оплатило)
  status        TEXT DEFAULT 'open',          -- open | closed | finished
  notes         TEXT,                         -- Внутренние заметки
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_course_streams_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_streams_updated_at
  BEFORE UPDATE ON course_streams
  FOR EACH ROW EXECUTE FUNCTION update_course_streams_updated_at();

-- Привязываем лидов к потокам
ALTER TABLE course_leads ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES course_streams(id);

-- Seed: 3 ближайших потока
INSERT INTO course_streams (number, start_date, spots_total, spots_enrolled, status)
VALUES
  (51, '2026-04-07', 8, 4, 'open'),
  (52, '2026-05-05', 8, 0, 'open'),
  (53, '2026-06-02', 8, 0, 'open')
ON CONFLICT DO NOTHING;

-- Убираем устаревшие конфиги (теперь данные берём из course_streams)
DELETE FROM course_config WHERE key IN ('next_stream_date', 'spots_remaining');
