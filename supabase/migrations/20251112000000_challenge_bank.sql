-- Challenge Bank: сохранение вопросов с ошибками для повторной практики
-- Создаем таблицу для сложных вопросов пользователя

CREATE TABLE IF NOT EXISTS user_challenge_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_new(id) ON DELETE CASCADE,
  times_wrong INTEGER DEFAULT 1,
  times_reviewed INTEGER DEFAULT 0,
  last_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  mastered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальная связка пользователь + вопрос
  UNIQUE(user_id, question_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_challenge_questions_user_id ON user_challenge_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_questions_question_id ON user_challenge_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_questions_mastered ON user_challenge_questions(mastered);
CREATE INDEX IF NOT EXISTS idx_user_challenge_questions_last_wrong ON user_challenge_questions(last_wrong_at DESC);

-- RLS политики
ALTER TABLE user_challenge_questions ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои сложные вопросы
CREATE POLICY "Users can view own challenge questions"
  ON user_challenge_questions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Пользователи могут добавлять свои сложные вопросы
CREATE POLICY "Users can insert own challenge questions"
  ON user_challenge_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Пользователи могут обновлять свои сложные вопросы
CREATE POLICY "Users can update own challenge questions"
  ON user_challenge_questions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (user_id = auth.uid() OR user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Пользователи могут удалять свои сложные вопросы
CREATE POLICY "Users can delete own challenge questions"
  ON user_challenge_questions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Функция для получения статистики Challenge Bank
CREATE OR REPLACE FUNCTION get_challenge_bank_stats(p_user_id UUID)
RETURNS TABLE (
  total_questions INTEGER,
  mastered_questions INTEGER,
  needs_practice INTEGER,
  avg_wrong_count NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_questions,
    COUNT(*) FILTER (WHERE mastered = true)::INTEGER as mastered_questions,
    COUNT(*) FILTER (WHERE mastered = false)::INTEGER as needs_practice,
    ROUND(AVG(times_wrong)::NUMERIC, 2) as avg_wrong_count
  FROM user_challenge_questions
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения вопросов Challenge Bank
CREATE OR REPLACE FUNCTION get_challenge_bank_questions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 30,
  p_only_not_mastered BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  question_ru TEXT,
  question_es TEXT,
  question_en TEXT,
  image_url TEXT,
  explanation_ru TEXT,
  explanation_es TEXT,
  explanation_en TEXT,
  times_wrong INTEGER,
  times_reviewed INTEGER,
  last_wrong_at TIMESTAMP WITH TIME ZONE,
  mastered BOOLEAN,
  topic_title_ru TEXT,
  topic_title_es TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.question_ru,
    q.question_es,
    q.question_en,
    q.image_url,
    q.explanation_ru,
    q.explanation_es,
    q.explanation_en,
    ucq.times_wrong,
    ucq.times_reviewed,
    ucq.last_wrong_at,
    ucq.mastered,
    t.title_ru as topic_title_ru,
    t.title_es as topic_title_es
  FROM user_challenge_questions ucq
  JOIN questions_new q ON q.id = ucq.question_id
  LEFT JOIN topics t ON t.id = q.topic_id
  WHERE ucq.user_id = p_user_id
    AND (NOT p_only_not_mastered OR ucq.mastered = false)
  ORDER BY ucq.last_wrong_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии
COMMENT ON TABLE user_challenge_questions IS 'Challenge Bank - сложные вопросы пользователей для повторной практики';
COMMENT ON COLUMN user_challenge_questions.times_wrong IS 'Количество раз, когда пользователь ответил неправильно';
COMMENT ON COLUMN user_challenge_questions.times_reviewed IS 'Количество раз, когда пользователь повторял этот вопрос';
COMMENT ON COLUMN user_challenge_questions.mastered IS 'Вопрос освоен (правильно ответил после повторения)';





























