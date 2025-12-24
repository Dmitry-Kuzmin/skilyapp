-- Оптимизация для расчета комбо и истории ответов
CREATE INDEX IF NOT EXISTS idx_duel_answers_player_duel_created 
ON public.duel_answers(player_id, duel_id, created_at DESC);

-- Оптимизация для поиска конкретного ответа (idempotency)
CREATE INDEX IF NOT EXISTS idx_duel_answers_player_question_id 
ON public.duel_answers(player_id, duel_question_id);
