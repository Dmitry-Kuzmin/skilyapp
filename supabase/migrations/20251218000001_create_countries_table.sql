-- ========================================
-- Таблица стран для мультистрановой системы
-- ========================================
CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,  -- 'DGT', 'PDD_RUSSIA', 'PDD_UKRAINE', etc.
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  flag_emoji TEXT,
  is_active BOOLEAN DEFAULT true,
  default_language TEXT NOT NULL DEFAULT 'ru',  -- 'ru', 'es', 'en'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_active ON public.countries(is_active);

-- RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view countries"
  ON public.countries
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage countries"
  ON public.countries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Триггер для updated_at
CREATE TRIGGER update_countries_updated_at
  BEFORE UPDATE ON public.countries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed данные
INSERT INTO public.countries (code, name_ru, name_en, flag_emoji, default_language) VALUES
('DGT', 'Испания (DGT)', 'Spain (DGT)', '🇪🇸', 'es'),
('PDD_RUSSIA', 'Россия (ПДД)', 'Russia (PDD)', '🇷🇺', 'ru')
ON CONFLICT (code) DO NOTHING;

