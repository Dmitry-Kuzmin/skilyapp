import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { StartupCurtain } from "@/components/StartupCurtain";
import { loadReferralInfo, loadPartnerInfo, type ReferrerInfo, type PartnerInfo } from "@/services/referralService";
import { isTelegramMiniApp, hasTelegramWebApp } from "@/lib/telegram";
import { getTelegramUser } from "@/core/TelegramInit";
import { checkTelegramAuth } from "@/utils/authCheck";
import { useTelegram } from "@/contexts/TelegramContext";
import { useCountry } from "@/contexts/CountryContext";

const AiStudioLanding = lazy(() =>
  import("@/components/landing/AiStudioLanding").then(m => ({ default: m.AiStudioLanding }))
);
const LandingRussia = lazy(() =>
  import("@/components/landing/LandingRussia").then(m => ({ default: m.LandingRussia }))
);
const AuthModalNew = lazy(() =>
  import("@/components/AuthModalNew").then(m => ({ default: m.AuthModalNew }))
);
const PartnerInviteBanner = lazy(() =>
  import("@/components/landing/PartnerInviteBanner").then(m => ({ default: m.PartnerInviteBanner }))
);

// Минимальный заглушка с правильным цветом — пользователь не видит белой вспышки
const LandingFallback = () => (
  <div
    style={{
      minHeight: '100dvh',
      width: '100%',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        border: '2px solid rgba(99,102,241,0.15)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'ls 0.8s linear infinite',
      }}
    />
    <style>{`@keyframes ls { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Landing = () => {
  const navigate = useNavigate();
  const webApp = useTelegram();
  /**
   * КРИТИЧНО: webApp читаем через ref чтобы useEffect не пере-запускался
   * когда TelegramContext обновляет webApp (это вызывало бесконечные ре-рендеры).
   */
  const webAppRef = useRef(webApp);
  webAppRef.current = webApp;

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);
  // true = ждём, false = готово показывать лендинг
  const [ready, setReady] = useState(false);

  const { selectedCountry } = useCountry();

  // ─── Шаг 1: Один раз при монтировании — проверяем Telegram и при необходимости редиректим ───
  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 16; // 4 секунды max

    const check = () => {
      if (cancelled) return;
      attempts++;

      const isMiniApp = isTelegramMiniApp();
      const hasRealInitData =
        !!webAppRef.current?.initData &&
        webAppRef.current.initData !== '' &&
        !webAppRef.current.initData.startsWith('mock_');
      const hasTgUser = (() => {
        const u = webAppRef.current?.initDataUnsafe?.user;
        if (u && u.id !== 123456789) return true;
        const tu = getTelegramUser();
        return !!(tu && tu.id !== 123456789);
      })();
      const hasAuth = checkTelegramAuth();

      // Находимся в Telegram Mini App — редиректим
      if (isMiniApp && (hasTgUser || hasAuth || hasRealInitData)) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Есть Telegram WebApp, но initData ещё не готов — ждём ещё
      const hasWebApp = hasTelegramWebApp() || !!window.Telegram?.WebApp;
      if (hasWebApp && !hasRealInitData && attempts < MAX_ATTEMPTS) {
        timerId = setTimeout(check, 250);
        return;
      }

      // WebApp был, но таймаут — редиректим
      if (hasWebApp && isMiniApp && attempts >= MAX_ATTEMPTS) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Обычный браузер — показываем лендинг
      if (!cancelled) setReady(true);
    };

    // Запускаем немедленно
    check();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Намеренно пусто: запускается РОВНО ОДИН раз при монтировании

  // ─── Шаг 2: Загружаем реферальные/партнёрские данные (независимо от step 1) ───
  useEffect(() => {
    const partnerDataStr = sessionStorage.getItem('partner_code');
    if (partnerDataStr) {
      try {
        const partnerData = JSON.parse(partnerDataStr);
        setLoadingPartner(true);
        loadPartnerInfo(partnerData.code)
          .then(partner => {
            if (partner) {
              setPartnerInfo(partner);
            } else {
              sessionStorage.removeItem('partner_code');
            }
          })
          .catch(() => sessionStorage.removeItem('partner_code'))
          .finally(() => setLoadingPartner(false));
      } catch {
        sessionStorage.removeItem('partner_code');
      }
      return;
    }

    const referralCode = sessionStorage.getItem('referral_code');
    if (!referralCode) return;

    setLoadingReferrer(true);
    loadReferralInfo(referralCode)
      .then(referrer => {
        if (referrer) {
          setReferrerInfo(referrer);
        } else {
          sessionStorage.removeItem('referral_code');
        }
      })
      .catch(() => sessionStorage.removeItem('referral_code'))
      .finally(() => setLoadingReferrer(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Намеренно пусто: данные в sessionStorage не меняются во время сессии

  // Пока идёт проверка Telegram — показываем заглушку с нужным фоном
  if (!ready) return <LandingFallback />;

  const LandingComponent = selectedCountry.code === 'ru' ? LandingRussia : AiStudioLanding;

  return (
    <>
      <StartupCurtain />
      {partnerInfo && (
        <Suspense fallback={null}>
          <PartnerInviteBanner />
        </Suspense>
      )}
      <Suspense fallback={<LandingFallback />}>
        <LandingComponent
          onRequestAccess={() => setAuthModalOpen(true)}
          referrerInfo={referrerInfo}
          loadingReferrer={loadingReferrer}
          partnerInfo={partnerInfo}
          loadingPartner={loadingPartner}
        />
      </Suspense>
      <Suspense fallback={null}>
        <AuthModalNew open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </Suspense>
    </>
  );
};

export default Landing;