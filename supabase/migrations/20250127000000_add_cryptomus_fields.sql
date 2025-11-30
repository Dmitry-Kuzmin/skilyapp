-- Добавляем поля для Cryptomus в таблицу purchases
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS cryptomus_order_id TEXT,
ADD COLUMN IF NOT EXISTS cryptomus_payment_id TEXT;

-- Создаем индекс для быстрого поиска по order_id
CREATE INDEX IF NOT EXISTS idx_purchases_cryptomus_order_id 
ON purchases(cryptomus_order_id);

-- Добавляем комментарии
COMMENT ON COLUMN purchases.cryptomus_order_id IS 'Order ID из Cryptomus';
COMMENT ON COLUMN purchases.cryptomus_payment_id IS 'Payment ID из Cryptomus';


