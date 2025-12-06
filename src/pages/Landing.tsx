import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AuthModalNew as AuthModal } from "@/components/AuthModalNew";
import { AiStudioLanding } from "@/components/landing/AiStudioLanding";
import { PartnerInviteBanner } from "@/components/landing/PartnerInviteBanner";
import { useUserContext } from "@/contexts/UserContext";
// ОПТИМИЗАЦИЯ: Убираем статический импорт Supabase - используем сервисные функции с динамическим импортом
import { loadReferralInfo, loadPartnerInfo, type ReferrerInfo, type PartnerInfo } from "@/services/referralService";

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

    // ОПТИМИЗАЦИЯ: Проверяем коды, но НЕ блокируем рендер лендинга
    // Лендинг рендерится сразу, а данные загружаются асинхронно когда придут
    
    // Проверяем партнерский код (приоритет над реферальным)
    const partnerDataStr = sessionStorage.getItem('partner_code');
    console.log('[Landing] Checking partner code from sessionStorage:', partnerDataStr);
    
    if (partnerDataStr) {
      try {
        const partnerData = JSON.parse(partnerDataStr);
        console.log('[Landing] Parsed partner data:', partnerData);
        
        // ОПТИМИЗАЦИЯ: Используем сервисную функцию - Supabase загружается динамически
        (async () => {
          setLoadingPartner(true);
          try {
            console.log('[Landing] Loading partner info for code:', partnerData.code);
            const partner = await loadPartnerInfo(partnerData.code);
            
            if (partner) {
              console.log('[Landing] Setting partner info:', partner);
              setPartnerInfo(partner);
            } else {
              console.error('[Landing] Partner not found or not active');
              sessionStorage.removeItem('partner_code');
            }
          } catch (error) {
            console.error('[Landing] Error loading partner:', error);
            sessionStorage.removeItem('partner_code');
          } finally {
            setLoadingPartner(false);
          }
        })();
        
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

    // ОПТИМИЗАЦИЯ: Используем сервисную функцию - Supabase загружается динамически
    (async () => {
      setLoadingReferrer(true);
      try {
        const referrer = await loadReferralInfo(referralCode);
        
        if (referrer) {
          setReferrerInfo(referrer);
        } else {
          console.error('[Landing] Referrer not found');
          // Удаляем невалидный код
          sessionStorage.removeItem('referral_code');
        }
      } catch (error) {
        console.error('[Landing] Error loading referrer:', error);
        sessionStorage.removeItem('referral_code');
      } finally {
        setLoadingReferrer(false);
      }
    })();
  }, [isAuthenticated, location]);

  return (
    <>
      {partnerInfo && <PartnerInviteBanner />}
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