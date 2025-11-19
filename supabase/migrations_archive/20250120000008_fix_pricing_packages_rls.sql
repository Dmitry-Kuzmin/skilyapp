-- Исправление RLS политик для pricing_packages
-- Убедимся, что все могут читать активные пакеты (нужно для Edge Function)

-- Удаляем старую политику если есть
DROP POLICY IF EXISTS "Anyone can view active pricing packages" ON public.pricing_packages;

-- Создаем политику, которая позволяет читать активные пакеты всем (включая анонимных пользователей)
CREATE POLICY "Anyone can view active pricing packages"
  ON public.pricing_packages FOR SELECT
  USING (is_active = true);

-- Проверка: убедимся что RLS включен
ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
