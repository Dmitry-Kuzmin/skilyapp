/**
 * Сервис для загрузки реферальной и партнерской информации
 * Использует динамический импорт Supabase для уменьшения initial bundle
 */

export interface ReferrerInfo {
  first_name: string;
  username: string | null;
  referral_code: string;
  total_referrals: number;
  photo_url: string | null;
}

export interface PartnerInfo {
  id: string;
  name: string;
  channel_name: string | null;
  channel_url: string | null;
  photo_url: string | null;
  partner_code: string;
  total_link_activations: number;
}

/**
 * Загружает информацию о реферере по коду
 * Supabase загружается динамически только при вызове функции
 */
export async function loadReferralInfo(code: string): Promise<ReferrerInfo | null> {
  try {
    // Динамический импорт Supabase - не попадает в initial bundle
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name, username, referral_code, total_referrals, photo_url')
      .eq('referral_code', code.toUpperCase())
      .single();

    if (error || !profile) {
      console.error('[referralService] Referrer not found:', error);
      return null;
    }

    return {
      first_name: profile.first_name,
      username: profile.username,
      referral_code: profile.referral_code,
      total_referrals: profile.total_referrals || 0,
      photo_url: profile.photo_url,
    };
  } catch (error) {
    console.error('[referralService] Error loading referrer:', error);
    return null;
  }
}

/**
 * Загружает информацию о партнере по коду
 * Supabase загружается динамически только при вызове функции
 */
export async function loadPartnerInfo(code: string): Promise<PartnerInfo | null> {
  try {
    // Динамический импорт Supabase - не попадает в initial bundle
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: partner, error } = await supabase
      .from('partners')
      .select('id, name, channel_name, channel_url, partner_code, total_link_activations, registration_status, status')
      .eq('partner_code', code.toUpperCase())
      .single();

    if (error || !partner) {
      console.error('[referralService] Partner not found:', error);
      return null;
    }

    // Проверяем, что партнер одобрен и активен
    if (partner.registration_status !== 'approved' || partner.status !== 'active') {
      console.log('[referralService] Partner not active:', {
        registration_status: partner.registration_status,
        status: partner.status
      });
      return null;
    }

    return {
      id: partner.id,
      name: partner.name,
      channel_name: partner.channel_name,
      channel_url: partner.channel_url,
      photo_url: null, // Partners don't have photo_url in current schema
      partner_code: partner.partner_code,
      total_link_activations: partner.total_link_activations || 0,
    };
  } catch (error) {
    console.error('[referralService] Error loading partner:', error);
    return null;
  }
}

