-- Skily Lingo: user progress per lesson
CREATE TABLE IF NOT EXISTS user_lingo_progress (
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    TEXT NOT NULL,          -- e.g. "ch1-l3"
  stars        SMALLINT NOT NULL DEFAULT 1 CHECK (stars BETWEEN 1 AND 3),
  xp_earned    INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- RLS
ALTER TABLE user_lingo_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own lingo progress"
  ON user_lingo_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own lingo progress"
  ON user_lingo_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own lingo progress"
  ON user_lingo_progress FOR UPDATE
  USING (auth.uid() = user_id);
