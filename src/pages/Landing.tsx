import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AuthModal } from "@/components/AuthModal";
import { AiStudioLanding } from "@/components/landing/AiStudioLanding";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

interface ReferrerInfo {
  first_name: string;
  username: string | null;
  referral_code: string;
  total_referrals: number;
  photo_url: string | null;
}

interface PartnerInfo {
  id: string;
  name: string;
  channel_name: string | null;
  channel_url: string | null;
  photo_url: string | null;
  partner_code: string;
  total_link_activations: number;
}

const Landing = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);
  const { isAuthenticated } = useUserContext();
  const location = useLocation();

  useEffect(() => {
    // Если пользователь авторизован, перенаправляем в приложение
    if (isAuthenticated) {
      // Очищаем партнерский и реферальный коды (они уже применены при регистрации)
      sessionStorage.removeItem('partner_code');
      sessionStorage.removeItem('referral_code');
      // Перенаправляем в приложение (главная страница)
      window.location.href = '/';
      return;
    }

    // Проверяем партнерский код (приоритет над реферальным)
    const partnerDataStr = sessionStorage.getItem('partner_code');
    console.log('[Landing] Checking partner code from sessionStorage:', partnerDataStr);
    
    if (partnerDataStr) {
      try {
        const partnerData = JSON.parse(partnerDataStr);
        console.log('[Landing] Parsed partner data:', partnerData);
        
        const loadPartnerInfo = async () => {
          setLoadingPartner(true);
          try {
            console.log('[Landing] Loading partner info for code:', partnerData.code);
            
            const { data: partner, error } = await supabase
              .from('partners')
              .select('id, name, channel_name, channel_url, partner_code, total_link_activations, registration_status, status')
              .eq('partner_code', partnerData.code.toUpperCase())
              .single();

            console.log('[Landing] Partner query result:', { partner, error });

            if (error || !partner) {
              console.error('[Landing] Partner not found:', error);
              sessionStorage.removeItem('partner_code');
              return;
            }

            // Проверяем, что партнер одобрен и активен
            if (partner.registration_status !== 'approved' || partner.status !== 'active') {
              console.log('[Landing] Partner not active:', {
                registration_status: partner.registration_status,
                status: partner.status
              });
              sessionStorage.removeItem('partner_code');
              return;
            }

            console.log('[Landing] Setting partner info:', partner);
            
            setPartnerInfo({
              id: partner.id,
              name: partner.name,
              channel_name: partner.channel_name,
              channel_url: partner.channel_url,
              photo_url: null, // Partners don't have photo_url in current schema
              partner_code: partner.partner_code,
              total_link_activations: partner.total_link_activations || 0,
            });
          } catch (error) {
            console.error('[Landing] Error loading partner:', error);
            sessionStorage.removeItem('partner_code');
          } finally {
            setLoadingPartner(false);
          }
        };

        loadPartnerInfo();
        return; // Не загружаем реферальную информацию, если есть партнерская
      } catch (error) {
        console.error('[Landing] Error parsing partner data:', error);
        sessionStorage.removeItem('partner_code');
      }
    } else {
      console.log('[Landing] No partner code in sessionStorage');
    }

    // Получаем код из sessionStorage (сохранен при редиректе с /join/:code)
    const referralCode = sessionStorage.getItem('referral_code');
    
    if (!referralCode) {
      return;
    }

    // Загружаем данные пригласившего
    const loadReferrerInfo = async () => {
      setLoadingReferrer(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, username, referral_code, total_referrals, photo_url')
          .eq('referral_code', referralCode.toUpperCase())
          .single();

        if (error || !profile) {
          console.error('[Landing] Referrer not found:', error);
          // Удаляем невалидный код
          sessionStorage.removeItem('referral_code');
          return;
        }

        setReferrerInfo({
          first_name: profile.first_name,
          username: profile.username,
          referral_code: profile.referral_code,
          total_referrals: profile.total_referrals || 0,
          photo_url: profile.photo_url,
        });
      } catch (error) {
        console.error('[Landing] Error loading referrer:', error);
        sessionStorage.removeItem('referral_code');
      } finally {
        setLoadingReferrer(false);
      }
    };

    loadReferrerInfo();
  }, [isAuthenticated, location]);

  return (
    <>
      <AiStudioLanding 
        onRequestAccess={() => setAuthModalOpen(true)}
        referrerInfo={referrerInfo}
        loadingReferrer={loadingReferrer}
        partnerInfo={partnerInfo}
        loadingPartner={loadingPartner}
      />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Landing;