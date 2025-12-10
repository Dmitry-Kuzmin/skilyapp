-- Проверка наличия колонок в таблице purchases
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchases'
  AND column_name IN (
    'cryptomus_order_id',
    'cryptomus_payment_id',
    'paddle_transaction_id',
    'paddle_subscription_id'
  )
ORDER BY column_name;





