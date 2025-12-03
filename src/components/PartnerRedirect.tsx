import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';

/**
 * Компонент для обработки партнерских ссылок /partner/:code
 * - Если пользователь авторизован → проверяем и активируем Premium
 * - Если не авторизован → сохраняем код и редирект на главную с баннером
 */
export function PartnerRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, supabaseUser, profileId } = useUserContext();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!code) {
      navigate('/');
      return;
    }

    const upperCode = code.toUpperCase();

    // Если авторизация еще загружается, ждем
    if (isLoading) {
      return;
    }

    // Извлекаем UTM параметры
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');

    // Если пользователь уже авторизован
    if (isAuthenticated && profileId) {
      // Пытаемся активировать Premium сразу
      activatePremiumForAuthenticatedUser(upperCode, utmSource, utmMedium, utmCampaign);
      return;
    }

    // Если не авторизован - сохраняем код и редиректим
    const partnerData = {
      code: upperCode,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      timestamp: Date.now(),
    };
    
    sessionStorage.setItem('partner_code', JSON.stringify(partnerData));
    console.log('[PartnerRedirect] Partner code saved:', partnerData);
    
    // Редирект на главную, где покажется баннер партнера
    navigate('/', { replace: true });
  }, [code, isAuthenticated, isLoading, navigate, profileId, searchParams]);

  const activatePremiumForAuthenticatedUser = async (
    partnerCode: string,
    utmSource: string | null,
    utmMedium: string | null,
    utmCampaign: string | null
  ) => {
    if (!profileId) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Получаем IP и User-Agent для защиты от злоупотребления
      const ipAddress = await getClientIP();
      const userAgent = navigator.userAgent;

      const { data, error } = await supabase.functions.invoke('activate-partner-premium', {
        body: {
          partner_code: partnerCode,
          user_id: profileId,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('🎉 Premium активирован на 30 дней!', {
          description: `Доступ до ${new Date(data.premium_until).toLocaleDateString()}`,
          duration: 5000,
        });
        // Обновляем статус Premium
        window.dispatchEvent(new CustomEvent('premium-status-updated'));
      } else {
        toast.info(data.message || 'Premium уже активирован от этого партнера', {
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error('[PartnerRedirect] Activation error:', error);
      toast.error('Ошибка активации Premium', {
        description: error.message || 'Попробуйте позже',
      });
    } finally {
      // Редирект на главную в любом случае
      navigate('/', { replace: true });
    }
  };

  // Получение IP адреса (через Edge Function или внешний сервис)
  const getClientIP = async (): Promise<string | null> => {
    try {
      // Можно использовать внешний сервис или Edge Function
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || null;
    } catch {
      return null;
    }
  };

  // Показываем минимальный лоадер во время редиректа
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
}






