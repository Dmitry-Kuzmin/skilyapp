-- ============================================================
-- FIX: Enable RLS for partner_conversions_archive
-- ============================================================
-- Проблема: Archive таблица не имела RLS (security warning)
-- Решение: Включить RLS и добавить политики
-- ============================================================

-- Включить RLS
ALTER TABLE public.partner_conversions_archive ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Партнеры видят только свои архивные конверсии
CREATE POLICY "Partners can view their archived conversions"
ON public.partner_conversions_archive
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_conversions_archive.partner_id
    AND partners.user_id = auth.uid()
  )
);

-- Админы видят все архивные данные
CREATE POLICY "Admins can view all archived conversions"
ON public.partner_conversions_archive
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Только система может писать в архив (через cron job)
-- Защита от прямых INSERT
CREATE POLICY "Only system can insert to archive"
ON public.partner_conversions_archive
FOR INSERT
WITH CHECK (false);

-- Комментарий
COMMENT ON TABLE public.partner_conversions_archive IS 'Archive for conversions >6 months. RLS enabled for security. Only accessible via cron job archive_old_conversions().';

