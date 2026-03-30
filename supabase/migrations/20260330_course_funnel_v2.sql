-- Переименовываем stripe_link → payment_link (Paddle вместо Stripe)
ALTER TABLE course_plans RENAME COLUMN stripe_link TO payment_link;
