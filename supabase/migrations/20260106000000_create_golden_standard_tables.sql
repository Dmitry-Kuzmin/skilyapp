-- ========================================
-- GOLDEN STANDARD MIGRATION (v2.0)
-- Миграция на масштабируемую архитектуру
-- ========================================

-- Удаляем старые объекты если существуют (для повторного применения)
DROP TABLE IF EXISTS public.answers_golden CASCADE;
DROP TABLE IF EXISTS public.questions_golden CASCADE;

-- 1️⃣ ТАБЛИЦА ВОПРОСОВ (PARENT)
CREATE TABLE public.questions_golden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Связи
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    
    -- Идентификация
    question_number INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('A1', 'B', 'D')),
    country TEXT NOT NULL DEFAULT 'es' CHECK (country IN ('es', 'ru')),
    
    -- Тексты вопросов (мультиязычность)
    text_es TEXT NOT NULL,
    text_en TEXT,
    text_ru TEXT,
    
    -- Объяснения
    explanation_es TEXT,
    explanation_en TEXT,
    explanation_ru TEXT,
    
    -- Медиа
    image_url TEXT,
    
    -- Метаданные
    source TEXT DEFAULT 'practicalvial',
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    is_premium BOOLEAN DEFAULT false,
    
    -- Служебные поля
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Уникальность: один вопрос на тему + номер
    CONSTRAINT unique_question_per_topic UNIQUE (topic_id, question_number, country)
);

-- 2️⃣ ТАБЛИЦА ОТВЕТОВ (CHILD)
CREATE TABLE public.answers_golden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Связь с вопросом (Foreign Key)
    question_id UUID NOT NULL REFERENCES public.questions_golden(id) ON DELETE CASCADE,
    
    -- Порядок ответа (a, b, c)
    answer_id TEXT NOT NULL CHECK (answer_id IN ('a', 'b', 'c')),
    
    -- Тексты ответов (мультиязычность)
    text_es TEXT NOT NULL,
    text_en TEXT,
    text_ru TEXT,
    
    -- Правильность
    is_correct BOOLEAN NOT NULL DEFAULT false,
    
    -- Служебные
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Уникальность: один answer_id (a/b/c) на вопрос
    CONSTRAINT unique_answer_per_question UNIQUE (question_id, answer_id)
);

-- ========================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ========================================

-- Questions
CREATE INDEX idx_questions_golden_topic ON public.questions_golden(topic_id);
CREATE INDEX idx_questions_golden_category ON public.questions_golden(category);
CREATE INDEX idx_questions_golden_country ON public.questions_golden(country);
CREATE INDEX idx_questions_golden_topic_country ON public.questions_golden(topic_id, country);

-- Answers (важнейший индекс для JOIN'ов)
CREATE INDEX idx_answers_golden_question ON public.answers_golden(question_id);
CREATE INDEX idx_answers_golden_correct ON public.answers_golden(question_id, is_correct);

-- ========================================
-- RLS (Row Level Security)
-- ========================================

ALTER TABLE public.questions_golden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers_golden ENABLE ROW LEVEL SECURITY;

-- Questions: Все могут читать
CREATE POLICY "Anyone can view questions"
    ON public.questions_golden FOR SELECT
    USING (true);

-- Answers: Все могут читать
CREATE POLICY "Anyone can view answers"
    ON public.answers_golden FOR SELECT
    USING (true);

-- Questions: Только authenticated могут писать
CREATE POLICY "Authenticated can insert questions"
    ON public.questions_golden FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated can update questions"
    ON public.questions_golden FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated can delete questions"
    ON public.questions_golden FOR DELETE
    TO authenticated
    USING (true);

-- Answers: Только authenticated могут писать
CREATE POLICY "Authenticated can insert answers"
    ON public.answers_golden FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated can update answers"
    ON public.answers_golden FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated can delete answers"
    ON public.answers_golden FOR DELETE
    TO authenticated
    USING (true);

-- ========================================
-- ТРИГГЕРЫ
-- ========================================

CREATE TRIGGER update_questions_golden_timestamp
    BEFORE UPDATE ON public.questions_golden
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- КОММЕНТАРИИ
-- ========================================

COMMENT ON TABLE public.questions_golden IS 'Golden Standard: Questions table (parent) for Spanish/Russian driving license exams';
COMMENT ON TABLE public.answers_golden IS 'Golden Standard: Answers table (child) - 3 options per question';

COMMENT ON COLUMN public.questions_golden.topic_id IS 'References topics table UUID';
COMMENT ON COLUMN public.questions_golden.question_number IS 'Sequential number within topic/category';
COMMENT ON COLUMN public.questions_golden.category IS 'License type: A1 (motorcycle), B (car), D (bus)';

COMMENT ON COLUMN public.answers_golden.answer_id IS 'Answer identifier: a, b, or c';
COMMENT ON COLUMN public.answers_golden.is_correct IS 'True if this is the correct answer';
