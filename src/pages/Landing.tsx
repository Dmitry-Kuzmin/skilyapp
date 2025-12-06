import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// ОПТИМИЗАЦИЯ: AuthModal lazy loaded - содержит UserContext и Supabase
const AuthModalNew = lazy(() => import("@/components/AuthModalNew").then(m => ({ default: m.AuthModalNew })));
import { AiStudioLanding } from "@/components/landing/AiStudioLanding";
// ОПТИМИЗАЦИЯ: PartnerInviteBanner lazy-loaded - использует Button, который тянет Radix UI
// Это критично для уменьшения initial bundle - Radix UI не должен грузиться на лендинге
const PartnerInviteBanner = lazy(() => import("@/components/landing/PartnerInviteBanner").then(m => ({ default: m.PartnerInviteBanner })));
// ОПТИМИЗАЦИЯ: Легкая проверка авторизации БЕЗ Supabase (через localStorage)
import { checkAuthFromStorage, checkTelegramAuth } from "@/utils/authCheck";
// ОПТИМИЗАЦИЯ: Убираем статический импорт Supabase - используем сервисные функции с динамическим импортом
import { loadReferralInfo, loadPartnerInfo, type ReferrerInfo, type PartnerInfo } from "@/services/referralService";
import { isTelegramMiniApp } from "@/lib/telegram";
import { initTelegram } from "@/core/TelegramInit";

const Landing = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // КРИТИЧНО: Проверка Telegram авторизации для автоматического редиректа
  useEffect(() => {
    // Проверяем только если мы в Telegram Mini App
    if (!isTelegramMiniApp()) {
      return;
    }

    // Инициализируем Telegram (получаем пользователя)
    const telegramUser = initTelegram();
    
    // Если есть Telegram пользователь, редиректим на dashboard
    // UserContext там загрузится и обработает авторизацию
    if (telegramUser && telegramUser.id !== 123456789 && telegramUser.username !== 'test_user') {
      console.log('[Landing] Telegram user detected, redirecting to dashboard:', telegramUser.first_name);
      navigate('/dashboard', { replace: true });
      return;
    }

    // Также проверяем через checkTelegramAuth (на случай, если initTelegram не сработал)
    if (checkTelegramAuth()) {
      console.log('[Landing] Telegram auth detected via checkTelegramAuth, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    // КРИТИЧНО: Landing НЕ проверяет авторизацию - это делает Index
    // Landing просто рендерится на /, а Index на /dashboard редиректит на / если не авторизован
    // Это предотвращает бесконечный цикл редиректов

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
  }, [location]);

  return (
    <>
      {partnerInfo && (
        <Suspense fallback={null}>
          <PartnerInviteBanner />
        </Suspense>
      )}
      <AiStudioLanding 
        onRequestAccess={() => setAuthModalOpen(true)}
        referrerInfo={referrerInfo}
        loadingReferrer={loadingReferrer}
        partnerInfo={partnerInfo}
        loadingPartner={loadingPartner}
      />
      <Suspense fallback={null}>
        <AuthModalNew open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </Suspense>
    </>
  );
};

export default Landing;