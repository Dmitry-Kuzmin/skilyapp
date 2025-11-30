-- Добавляем поля для Paddle в таблицу purchases
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS paddle_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_purchases_paddle_transaction_id 
ON purchases(paddle_transaction_id);

CREATE INDEX IF NOT EXISTS idx_purchases_paddle_subscription_id 
ON purchases(paddle_subscription_id);

-- Добавляем комментарии
COMMENT ON COLUMN purchases.paddle_transaction_id IS 'Transaction ID из Paddle';
COMMENT ON COLUMN purchases.paddle_subscription_id IS 'Subscription ID из Paddle (для подписок)';

