-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ TRANSACTIONS
-- ============================================
-- Эта миграция позволяет пользователям создавать свои транзакции
-- (необходимо для покупки бустов в Telegram Web App)
-- ============================================

-- Удаляем старую политику, если она существует
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;

-- Создаем новую политику, которая позволяет пользователям вставлять свои транзакции
CREATE POLICY "Users can insert their own transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
        OR telegram_id = ((current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint)
    )
  );

-- Также разрешаем service role вставлять транзакции (для webhooks и т.д.)
CREATE POLICY "Service role can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- ГОТОВО! Теперь пользователи могут создавать транзакции
-- ============================================
