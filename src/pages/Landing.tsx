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
  // Стабильный ref — читается внутри эффекта без добавления в deps.
  // Это ключевой трюк: webApp меняется → ref обновляется → эффект НЕ перезапускается.
  const webAppRef = useRef(webApp);
  webAppRef.current = webApp;

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);
  // КРИТИЧНО: Показываем лендинг немедленно, НЕ ждём Telegram
  // Только если мы реально в Mini App — перехватываем и редиректим
  const [isCheckingTelegram, setIsCheckingTelegram] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  // КРИТИЧНО: Проверка Telegram авторизации.
  // ЛОГИКА: Лендинг показывается СРАЗУ если это не Mini App.
  // Только реальный Telegram Mini App (isMiniApp() === true) делает редирект.
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setIsCheckingTelegram(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 20; // 5 секунд максимум (20 * 250ms)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let hasRedirected = false;

    const checkTelegram = () => {
      if (hasRedirected) return;

      attempts++;

      const isMiniApp = isTelegramMiniApp();

      // Если точно НЕ в Mini App — немедленно показываем лендинг.
      // Telegram SDK может быть загружен на странице, но это не значит Mini App.
      if (!isMiniApp) {
        setIsCheckingTelegram(false);
        return;
      }

      // Дальше — мы точно внутри Telegram Mini App.
      // Проверяем авторизацию для редиректа.
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
      const hasRealInitData = !!(
        currentWebApp?.initData &&
        currentWebApp.initData !== '' &&
        !currentWebApp.initData.startsWith('mock_')
      );

      // Есть данные — редиректим в дашборд
      if (telegramUser || hasAuth || hasRealInitData) {
        hasRedirected = true;
        navigate('/dashboard', { replace: true });
        return;
      }

      // Мы в Mini App, но данных ещё нет — ждём (до 5 секунд)
      if (attempts < maxAttempts) {
        timeoutId = setTimeout(checkTelegram, 250);
        return;
      }

      // Таймаут истёк — редиректим всё равно, UserContext разберётся с авторизацией
      hasRedirected = true;
      navigate('/dashboard', { replace: true });
    };

    // Быстрая первая проверка: если точно не Mini App — покажем лендинг без задержки
    const isMiniAppNow = isTelegramMiniApp();
    if (!isMiniAppNow) {
      setIsCheckingTelegram(false);
      return; // Не запускаем polling вообще
    }

    // Мы в Mini App — запускаем polling
    checkTelegram();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // navigate стабилен; webApp через ref (не в deps намеренно)

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
  }, []); // Только при монтировании — sessionStorage стабилен в сессию

  const { selectedCountry } = useCountry();

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