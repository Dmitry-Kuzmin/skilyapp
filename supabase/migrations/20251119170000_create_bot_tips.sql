-- =====================================================
-- bot_tips: обучающие советы для Telegram-бота
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bot_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_slug TEXT NOT NULL,
  topic_title TEXT NOT NULL,
  topic_icon TEXT DEFAULT '🧠',
  language TEXT NOT NULL DEFAULT 'ru',
  title TEXT NOT NULL,
  summary TEXT,
  tip_body TEXT NOT NULL,
  cta_text TEXT,
  cta_deeplink TEXT,
  skill_level TEXT DEFAULT 'all',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_tips_topic_lang
  ON public.bot_tips (topic_slug, language, sort_order);

CREATE INDEX IF NOT EXISTS idx_bot_tips_language
  ON public.bot_tips (language);

CREATE OR REPLACE FUNCTION public.update_bot_tips_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_bot_tips ON public.bot_tips;
CREATE TRIGGER trg_update_bot_tips
  BEFORE UPDATE ON public.bot_tips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bot_tips_timestamp();

-- =====================================================
-- Seed tips (RU / EN / ES)
-- =====================================================

INSERT INTO public.bot_tips (
  topic_slug, topic_title, topic_icon, language,
  title, summary, tip_body, cta_text, cta_deeplink, skill_level, sort_order
) VALUES
  (
    'priority-signs', 'Знаки приоритета', '⚠️', 'ru',
    'Смотри на форму раньше текста',
    'Треугольник — уступи, восьмиугольник — стоп.',
    'Перед перекрёстком считай: форма, цвет, текст. Мозг успевает найти ответ быстрее, чем ты дочитаешь табличку.',
    'Открыть тему', '/learning-map?topic=priority', 'base', 1
  ),
  (
    'priority-signs', 'Знаки приоритета', '⚠️', 'ru',
    'Тормози до 5 км/ч',
    'DGT штрафует, если «ползти» быстрее.',
    'У стоп-линии скорость должна быть формально <5 км/ч. Зафиксируй взгляд на правом зеркале — это помогает контролировать скорость.',
    'Повторить тест', '/tests/topic/priority', 'base', 2
  ),
  (
    'night-driving', 'Ночное вождение', '🌙', 'ru',
    'Не смотри в фары',
    'Взгляд на правую линию = меньше усталости.',
    'Когда встречный поток слепит, «зацепись» взглядом за правую кромку. Это держит траекторию и снижает стресс.',
    'Открыть ночные лайфхаки', '/articles/night-driving', 'all', 3
  ),
  (
    'priority-signs', 'Priority signs', '⚠️', 'en',
    'Shape first, text second',
    'Triangle = yield, octagon = stop.',
    'Train the eye to read the silhouette before the words. At exam speed it saves up to 1 second на вопрос.',
    'Review module', '/learning-map?topic=priority', 'base', 1
  ),
  (
    'night-driving', 'Conducción nocturna', '🌙', 'es',
    'Fija la mirada a la línea derecha',
    'Reduce el deslumbramiento y la fatiga ocular.',
    'Cuando un vehículo viene de frente, no mires a los faros: sigue la línea continua derecha y mantén velocidad estable.',
    'Abrir guía nocturna', '/es/articles/night-driving', 'all', 1
  ),
  (
    'roundabouts', 'Ротонды', '🌀', 'ru',
    'Смотри на выезд №+1',
    'Так проще контролировать зеркала.',
    'Подъезжая, оцени не свой, а следующий выезд. Тогда легко понять, кто по внутреннему кольцу и где безопасная траектория.',
    'Симулятор ротонд', '/games/roundabout-sim', 'intermediate', 3
  )
ON CONFLICT DO NOTHING;


