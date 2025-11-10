-- Таблица для хранения истории AI чатов пользователей
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Пользователь
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- Для неавторизованных
  
  -- Контекст чата
  conversation_id UUID NOT NULL, -- Группирует сообщения одной беседы
  message_index INTEGER NOT NULL, -- Порядок сообщения в беседе
  
  -- Сообщение
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Метаданные
  topic_number INTEGER,
  model_used TEXT, -- groq, gemini
  used_knowledge BOOLEAN DEFAULT false,
  response_time_ms INTEGER,
  token_count INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON public.ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_conversation ON public.ai_chat_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created ON public.ai_chat_history(created_at DESC);

-- RLS
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can view own chat history" ON public.ai_chat_history;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.ai_chat_history;
DROP POLICY IF EXISTS "Admins can view all chat history" ON public.ai_chat_history;

-- Пользователи видят только свою историю
CREATE POLICY "Users can view own chat history"
  ON public.ai_chat_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут добавлять свои сообщения
CREATE POLICY "Users can insert own messages"
  ON public.ai_chat_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Админы видят всю историю (через RPC функцию has_role)
CREATE POLICY "Admins can view all chat history"
  ON public.ai_chat_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.has_role(auth.uid(), 'admin') as hr
      WHERE hr = true
    )
  );

COMMENT ON TABLE public.ai_chat_history IS 'История AI чатов пользователей';

