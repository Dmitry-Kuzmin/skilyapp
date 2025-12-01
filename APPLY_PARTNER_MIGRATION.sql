-- Add self-registration support for partners
-- Partners can register themselves and access their dashboard

-- 1. Add user_id to partners table for authentication
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id) WHERE user_id IS NOT NULL;

-- 2. Add fields for self-registration
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS channel_name TEXT, -- Название канала/блога
ADD COLUMN IF NOT EXISTS channel_url TEXT, -- Ссылка на канал
ADD COLUMN IF NOT EXISTS subscribers_count INTEGER, -- Количество подписчиков
ADD COLUMN IF NOT EXISTS social_links JSONB, -- Соцсети (telegram, instagram, youtube и т.д.)
ADD COLUMN IF NOT EXISTS description TEXT, -- Описание канала/блога
ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')); -- Статус модерации

-- 3. Create table for marketing materials
CREATE TABLE IF NOT EXISTS public.marketing_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('logo', 'banner', 'text', 'video', 'other')),
  file_url TEXT, -- URL файла (если есть)
  description TEXT,
  usage_instructions TEXT, -- Инструкции по использованию
  tags TEXT[], -- Теги для поиска
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create table for partner access to materials
CREATE TABLE IF NOT EXISTS public.partner_materials_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.marketing_materials(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  download_count INTEGER DEFAULT 0,
  UNIQUE(partner_id, material_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marketing_materials_type ON public.marketing_materials(type);
CREATE INDEX IF NOT EXISTS idx_marketing_materials_active ON public.marketing_materials(is_active);
CREATE INDEX IF NOT EXISTS idx_partner_materials_access_partner ON public.partner_materials_access(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_materials_access_material ON public.partner_materials_access(material_id);

-- Enable RLS
ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_materials_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partners - partners can view and update their own data
DROP POLICY IF EXISTS "Partners can view their own data" ON public.partners;
CREATE POLICY "Partners can view their own data"
ON public.partners
FOR SELECT
USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "Partners can update their own data" ON public.partners;
CREATE POLICY "Partners can update their own data"
ON public.partners
FOR UPDATE
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
  -- Partners can only update their own profile fields, not status or registration_status
  -- Status and registration_status can only be changed by admins
);

-- Partners can insert their own registration (pending status)
DROP POLICY IF EXISTS "Partners can register themselves" ON public.partners;
CREATE POLICY "Partners can register themselves"
ON public.partners
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND registration_status = 'pending'
  AND status = 'inactive' -- New partners start as inactive
);

-- RLS Policies for marketing_materials
-- All active materials are viewable by approved partners
DROP POLICY IF EXISTS "Approved partners can view active materials" ON public.marketing_materials;
CREATE POLICY "Approved partners can view active materials"
ON public.marketing_materials
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.user_id = auth.uid()
    AND partners.registration_status = 'approved'
  )
);

-- Admins can manage all materials
DROP POLICY IF EXISTS "Admins can manage marketing materials" ON public.marketing_materials;
CREATE POLICY "Admins can manage marketing materials"
ON public.marketing_materials
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- RLS Policies for partner_materials_access
-- Partners can view their own access records
DROP POLICY IF EXISTS "Partners can view their material access" ON public.partner_materials_access;
CREATE POLICY "Partners can view their material access"
ON public.partner_materials_access
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_materials_access.partner_id
    AND partners.user_id = auth.uid()
  )
);

-- Partners can insert access records (when downloading)
DROP POLICY IF EXISTS "Partners can track material access" ON public.partner_materials_access;
CREATE POLICY "Partners can track material access"
ON public.partner_materials_access
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_materials_access.partner_id
    AND partners.user_id = auth.uid()
    AND partners.registration_status = 'approved'
  )
);

-- Partners can update download count
DROP POLICY IF EXISTS "Partners can update their download count" ON public.partner_materials_access;
CREATE POLICY "Partners can update their download count"
ON public.partner_materials_access
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.partners
    WHERE partners.id = partner_materials_access.partner_id
    AND partners.user_id = auth.uid()
  )
);

-- Function to register new partner
CREATE OR REPLACE FUNCTION register_partner(
  p_name TEXT,
  p_email TEXT,
  p_channel_name TEXT,
  p_channel_url TEXT,
  p_subscribers_count INTEGER,
  p_social_links JSONB,
  p_description TEXT,
  p_partner_type TEXT DEFAULT 'barter'
)
RETURNS TABLE(
  success BOOLEAN,
  partner_id UUID,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_partner_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'User not authenticated'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user already has a partner account
  IF EXISTS (SELECT 1 FROM public.partners WHERE user_id = v_user_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'You already have a partner account'::TEXT;
    RETURN;
  END IF;
  
  -- Create partner record
  INSERT INTO public.partners (
    user_id,
    name,
    email,
    channel_name,
    channel_url,
    subscribers_count,
    social_links,
    description,
    partner_type,
    status,
    registration_status
  ) VALUES (
    v_user_id,
    p_name,
    p_email,
    p_channel_name,
    p_channel_url,
    p_subscribers_count,
    p_social_links,
    p_description,
    p_partner_type,
    'inactive', -- Start as inactive until approved
    'pending' -- Pending moderation
  )
  RETURNING id INTO v_partner_id;
  
  RETURN QUERY SELECT true, v_partner_id, 'Partner registration submitted successfully. Waiting for approval.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get partner dashboard data
CREATE OR REPLACE FUNCTION get_partner_dashboard(p_user_id UUID)
RETURNS TABLE(
  partner_data JSONB,
  keys_data JSONB,
  stats JSONB
) AS $$
DECLARE
  v_partner RECORD;
  v_keys JSONB;
  v_stats JSONB;
BEGIN
  -- Get partner data
  SELECT row_to_json(p.*)::JSONB INTO v_partner
  FROM public.partners p
  WHERE p.user_id = p_user_id
  LIMIT 1;
  
  IF v_partner IS NULL THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::JSONB, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Get keys data
  SELECT jsonb_agg(
    jsonb_build_object(
      'key', pk.key,
      'status', pk.status,
      'issued_at', pk.issued_at,
      'activated_at', pk.activated_at
    )
  ) INTO v_keys
  FROM public.premium_keys pk
  WHERE pk.partner_id = (v_partner->>'id')::UUID;
  
  -- Get stats
  SELECT jsonb_build_object(
    'total_keys_issued', (v_partner->>'total_keys_issued')::INTEGER,
    'total_keys_activated', (v_partner->>'total_keys_activated')::INTEGER,
    'activation_rate', CASE 
      WHEN (v_partner->>'total_keys_issued')::INTEGER > 0 
      THEN ROUND((v_partner->>'total_keys_activated')::NUMERIC / (v_partner->>'total_keys_issued')::NUMERIC * 100, 2)
      ELSE 0
    END,
    'accumulated_commission', (v_partner->>'accumulated_commission')::DECIMAL
  ) INTO v_stats;
  
  RETURN QUERY SELECT v_partner, COALESCE(v_keys, '[]'::JSONB), v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_partner IS 'Allows users to register as partners';
COMMENT ON FUNCTION get_partner_dashboard IS 'Returns partner dashboard data for authenticated partner';

