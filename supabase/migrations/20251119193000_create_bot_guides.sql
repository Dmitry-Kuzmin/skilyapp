-- =====================================================
-- bot_guides: FAQ / onboarding контент для Telegram-бота
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bot_guide_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT NOT NULL,
  category_title TEXT NOT NULL,
  section_slug TEXT NOT NULL,
  section_title TEXT NOT NULL,
  icon TEXT DEFAULT 'ℹ️',
  language TEXT NOT NULL DEFAULT 'ru',
  summary TEXT,
  content TEXT NOT NULL,
  cta_text TEXT,
  cta_deeplink TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(language, section_slug)
);

CREATE INDEX IF NOT EXISTS idx_bot_guide_sections_category
  ON public.bot_guide_sections(category_slug, language, sort_order);

CREATE INDEX IF NOT EXISTS idx_bot_guide_sections_language
  ON public.bot_guide_sections(language);

CREATE OR REPLACE FUNCTION public.update_bot_guide_sections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_bot_guide_sections ON public.bot_guide_sections;
CREATE TRIGGER trg_update_bot_guide_sections
  BEFORE UPDATE ON public.bot_guide_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bot_guide_sections_timestamp();

-- =====================================================
-- Seed content (RU/EN/ES)
-- =====================================================

INSERT INTO public.bot_guide_sections (
  category_slug, category_title, section_slug, section_title,
  icon, language, summary, content, cta_text, cta_deeplink, sort_order
) VALUES
  -- RU
  (
    'onboarding', 'Онбординг', 'skily_intro', 'Как устроен Skilyapp',
    '🚀', 'ru',
    'Карта обучения, сезоны, дуэли и умный тренер Skily.',
    'Skilyapp = карта тем + мини-тренировки каждый день. Сезон даёт жирные бонусы SP, дуэли поддерживают азарт, а Skily следит за прогрессом и напомнит, когда пора повторить сложные места.',
    'Открыть карту', '/learning-map', 1
  ),
  (
    'onboarding', 'Онбординг', 'season_pass', 'Что такое сезон',
    '🏁', 'ru',
    'Сезон — это 30-дневный спринт с уровнями и наградами.',
    'Ты зарабатываешь Season Points за тесты, дуэли, челленджи. Каждый уровень открывает награду. Пропуск можно ускорить бустами, но даже free трек даёт полезные бонусы.',
    'К сезону', '/duel-pass', 2
  ),
  (
    'duels', 'Дуэли и челленджи', 'duel_flow', 'Как работает дуэль',
    '⚔️', 'ru',
    'Выбираешь ставку, темы и зовёшь друга или авто-соперника.',
    '10 вопросов на скорость. Видишь ход соперника в реальном времени. Набрал больше очков — забираешь монеты и SP. Если кто-то не ответил, дуэль завершится таймером и бот сообщит результат.',
    'Создать дуэль', '/duels?mode=create', 1
  ),
  (
    'productivity', 'Скорость и фокус', 'express_tests', 'Экспресс-тесты',
    '⚡️', 'ru',
    'Мини-сессии по 3 вопроса с ключевых тем.',
    'Используй /express, когда нет времени на полный тест. Я подберу 3 вопросы из твоих ошибок и покажу разбор прямо в Telegram. Лимит — 3 попытки в день, чтобы не выгореть.',
    'Запустить экспресс', '/express', 1
  ),
  (
    'payments', 'Покупки и бусты', 'premium_value', 'Зачем нужен Premium',
    '💎', 'ru',
    'Безлимитные AI-подсказки в боте, ускоренный доступ к материалам и двойные награды.',
    'Premium снимает лимиты на вопросы к Skily, открывает Pro-топики и сохраняет дуэльный прогресс даже при поражении. Если активно тренируешься каждый день — окупается за неделю.',
    'Активировать Premium', '/store/premium', 1
  ),
  -- EN
  (
    'onboarding', 'Onboarding', 'skily_intro_en', 'How Skilyapp works',
    '🚀', 'en',
    'Learning map + seasons + duels in one flow.',
    'Pick a topic, take a mini-session, earn SP during the season and let Skily nudge you when a tricky subject appears again. Consistency first, grind second.',
    'Open learning map', '/learning-map', 1
  ),
  (
    'duels', 'Duels & Challenges', 'duel_flow_en', 'Duel basics',
    '⚔️', 'en',
    'Set a stake, choose topics and invite a friend.',
    '10 questions, realtime score. Higher score takes the reward. Timeouts are auto-handled — the bot will ping both players with the result.',
    'Create duel', '/duels?mode=create', 1
  ),
  -- ES
  (
    'onboarding', 'Onboarding', 'skily_intro_es', 'Cómo funciona Skilyapp',
    '🚀', 'es',
    'Mapa de temas + temporada + duelos.',
    'Elige una temática, completa micro sesiones y gana SP en la temporada. Skily detecta tus errores y recuerda cuándo repetirlos.',
    'Abrir mapa', '/es/learning-map', 1
  ),
  (
    'productivity', 'Productividad', 'express_tests_es', 'Tests express',
    '⚡️', 'es',
    '3 preguntas clave para repasar rápido.',
    'Usa /express cuando tengas poco tiempo. Selecciono preguntas de tus errores recientes y muestro el análisis en Telegram.',
    'Lanzar express', '/es/express', 1
  )
ON CONFLICT (language, section_slug) DO NOTHING;




