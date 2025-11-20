-- =====================================================
-- CHAT FRIENDS SYSTEM: Друзья из Telegram групп/чатов
-- =====================================================

-- Таблица для хранения участников Telegram групп/чатов
CREATE TABLE IF NOT EXISTS public.telegram_chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL,  -- ID группы/чата в Telegram
  chat_type TEXT NOT NULL CHECK (chat_type IN ('group', 'supergroup', 'channel')),
  chat_title TEXT,  -- Название группы
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,  -- Telegram ID пользователя
  is_active BOOLEAN DEFAULT true,  -- Активен ли пользователь в группе
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),  -- Последнее взаимодействие с ботом в группе
  joined_at TIMESTAMPTZ DEFAULT NOW(),  -- Когда впервые обнаружен в группе
  metadata JSONB DEFAULT '{}'::jsonb,  -- Дополнительная информация
  UNIQUE(chat_id, user_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id 
  ON public.telegram_chat_members(chat_id, is_active);

CREATE INDEX IF NOT EXISTS idx_chat_members_user_id 
  ON public.telegram_chat_members(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_chat_members_telegram_id 
  ON public.telegram_chat_members(telegram_id);

-- RLS политики
ALTER TABLE public.telegram_chat_members ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть участников групп, в которых они состоят
CREATE POLICY "Users can view chat members from their chats"
  ON public.telegram_chat_members
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR chat_id IN (
      SELECT chat_id FROM telegram_chat_members 
      WHERE user_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Service role может управлять участниками
CREATE POLICY "Service role can manage chat members"
  ON public.telegram_chat_members
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Функция для добавления/обновления участника группы
CREATE OR REPLACE FUNCTION upsert_chat_member(
  p_chat_id BIGINT,
  p_chat_type TEXT,
  p_chat_title TEXT,
  p_telegram_id BIGINT,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_member_id UUID;
BEGIN
  -- Если user_id не передан, ищем по telegram_id
  IF p_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM profiles
    WHERE telegram_id = p_telegram_id
    LIMIT 1;
  ELSE
    v_user_id := p_user_id;
  END IF;

  -- Если пользователь не найден, выходим
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Добавляем или обновляем участника
  INSERT INTO telegram_chat_members (
    chat_id,
    chat_type,
    chat_title,
    user_id,
    telegram_id,
    is_active,
    last_seen_at
  )
  VALUES (
    p_chat_id,
    p_chat_type,
    p_chat_title,
    v_user_id,
    p_telegram_id,
    true,
    NOW()
  )
  ON CONFLICT (chat_id, user_id) DO UPDATE
  SET 
    is_active = true,
    last_seen_at = NOW(),
    chat_title = COALESCE(EXCLUDED.chat_title, telegram_chat_members.chat_title)
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

-- Функция для получения друзей из групп
CREATE OR REPLACE FUNCTION get_chat_friends(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_friend_ids UUID[];
BEGIN
  -- Находим всех пользователей, которые состоят в тех же группах
  SELECT ARRAY_AGG(DISTINCT cm2.user_id) INTO v_friend_ids
  FROM telegram_chat_members cm1
  INNER JOIN telegram_chat_members cm2 
    ON cm1.chat_id = cm2.chat_id
    AND cm1.user_id != cm2.user_id
  WHERE cm1.user_id = p_user_id
    AND cm1.is_active = true
    AND cm2.is_active = true
    AND cm2.user_id IS NOT NULL;

  RETURN COALESCE(v_friend_ids, ARRAY[]::UUID[]);
END;
$$;

-- Гранты
GRANT EXECUTE ON FUNCTION upsert_chat_member(BIGINT, TEXT, TEXT, BIGINT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_chat_friends(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_friends(UUID) TO anon;

COMMENT ON TABLE telegram_chat_members IS 'Участники Telegram групп/чатов для определения друзей';
COMMENT ON FUNCTION upsert_chat_member IS 'Добавляет или обновляет участника группы';
COMMENT ON FUNCTION get_chat_friends IS 'Возвращает список друзей из общих Telegram групп';

