import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StartupCurtain } from "@/components/StartupCurtain";
import { checkTelegramAuth } from "@/utils/authCheck";
import { loadReferralInfo, loadPartnerInfo, type ReferrerInfo, type PartnerInfo } from "@/services/referralService";
import { isTelegramMiniApp, hasTelegramWebApp } from "@/lib/telegram";
import { getTelegramUser } from "@/core/TelegramInit";
import { useTelegram } from "@/contexts/TelegramContext";
import { useCountry } from "@/contexts/CountryContext";

// Lazy loaded компоненты
const AuthModalNew = lazy(() =>
  import("@/components/AuthModalNew").then(m => ({ default: m.AuthModalNew }))
);
const AiStudioLanding = lazy(() =>
  import("@/components/landing/AiStudioLanding").then(m => ({ default: m.AiStudioLanding }))
);
const LandingRussia = lazy(() =>
  import("@/components/landing/LandingRussia").then(m => ({ default: m.LandingRussia }))
);
const PartnerInviteBanner = lazy(() =>
  import("@/components/landing/PartnerInviteBanner").then(m => ({ default: m.PartnerInviteBanner }))
);

const Landing = () => {
  const webApp = useTelegram();
  // Стабильный ref — читается внутри эффекта без добавления в deps,
  // чтобы избежать циклического перезапуска при каждом ререндере TelegramContext.
  const webAppRef = useRef(webApp);
  webAppRef.current = webApp;

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);
  const [isCheckingTelegram, setIsCheckingTelegram] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  // КРИТИЧНО: Проверка Telegram авторизации — только один раз при монтировании.
  // webApp читается через стабильный ref без попадания в deps-массив эффекта.
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setIsCheckingTelegram(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 20;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let webAppDetected = false;
    let hasRedirected = false;

    const checkTelegram = () => {
      if (hasRedirected) return;

      attempts++;

      const hasWebApp = hasTelegramWebApp() || !!window.Telegram?.WebApp;
      if (hasWebApp) webAppDetected = true;

      const currentWebApp = webAppRef.current;
      let telegramUser = null;

      if (currentWebApp?.initDataUnsafe?.user) {
        const u = currentWebApp.initDataUnsafe.user;
        if (u.id !== 123456789 && u.username !== 'test_user') {
          telegramUser = u;
        }
      }

      if (!telegramUser) {
        const fallback = getTelegramUser();
        if (fallback && fallback.id !== 123456789 && fallback.username !== 'test_user') {
          telegramUser = fallback;
        }
      }

      const hasAuth = checkTelegramAuth();
      const isMiniApp = isTelegramMiniApp();
      const hasRealInitData = !!(
        currentWebApp?.initData &&
        currentWebApp.initData !== '' &&
        !currentWebApp.initData.startsWith('mock_')
      );

      // Telegram Mini App — редирект в дашборд
      if (isMiniApp && (telegramUser || hasAuth || hasRealInitData)) {
        hasRedirected = true;
        navigate('/dashboard', { replace: true });
        return;
      }

      // Обычный браузер — сразу показываем лендинг
      if (!hasWebApp) {
        setIsCheckingTelegram(false);
        return;
      }

      // WebApp есть, но initData ещё не пришёл — ждём
      if (!hasRealInitData && attempts < maxAttempts) {
        timeoutId = setTimeout(checkTelegram, 250);
        return;
      }

      // Таймаут истёк и WebApp был — редиректим
      if (webAppDetected && attempts >= maxAttempts) {
        hasRedirected = true;
        navigate('/dashboard', { replace: true });
        return;
      }

      setIsCheckingTelegram(false);
    };

    checkTelegram();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // navigate стабилен; webApp читается через ref

  // Загрузка партнёрской/реферальной информации — только при монтировании
  useEffect(() => {
    const partnerDataStr = sessionStorage.getItem('partner_code');

    if (partnerDataStr) {
      try {
        const partnerData = JSON.parse(partnerDataStr);
        (async () => {
          setLoadingPartner(true);
          try {
            const partner = await loadPartnerInfo(partnerData.code);
            if (partner) {
              setPartnerInfo(partner);
            } else {
              sessionStorage.removeItem('partner_code');
            }
          } catch {
            sessionStorage.removeItem('partner_code');
          } finally {
            setLoadingPartner(false);
          }
        })();
        return;
      } catch {
        sessionStorage.removeItem('partner_code');
      }
    }

    const referralCode = sessionStorage.getItem('referral_code');
    if (!referralCode) return;

    (async () => {
      setLoadingReferrer(true);
      try {
        const referrer = await loadReferralInfo(referralCode);
        if (referrer) {
          setReferrerInfo(referrer);
        } else {
          sessionStorage.removeItem('referral_code');
        }
      } catch {
        sessionStorage.removeItem('referral_code');
      } finally {
        setLoadingReferrer(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Только при монтировании — sessionStorage не меняется во время сессии

  const { selectedCountry } = useCountry();

  // Во время проверки Telegram оставляем HTML-скелетон на экране
  if (isCheckingTelegram) {
    return null;
  }

  const LandingComponent = selectedCountry.code === 'ru' ? LandingRussia : AiStudioLanding;

  return (
    <>
      <StartupCurtain />
      {partnerInfo && (
        <Suspense fallback={null}>
          <PartnerInviteBanner />
        </Suspense>
      )}
      <LandingComponent
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