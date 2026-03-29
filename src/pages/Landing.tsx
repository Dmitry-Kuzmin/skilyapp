import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { StartupCurtain } from "@/components/StartupCurtain";
import { SeoHead } from "@/components/seo/SeoHead";
import { loadReferralInfo, loadPartnerInfo, type ReferrerInfo, type PartnerInfo } from "@/services/referralService";
import { isTelegramMiniApp, hasTelegramWebApp } from "@/lib/telegram";
import { checkTelegramAuth } from "@/utils/authCheck";
import { useTelegram } from "@/contexts/TelegramContext";
import { useCountry } from "@/contexts/CountryContext";
import { useLanguage } from "@/contexts/LanguageContext";

const LandingSpain = lazy(() =>
  import("@/components/landing/LandingSpain").then(m => ({ default: m.LandingSpain }))
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

// Тонкий фолбек — только правильный цвет фона, без лишних элементов
const LandingFallback = () => (
  <div style={{ minHeight: '100dvh', width: '100%', background: '#0f172a' }} />
);

const Landing = () => {
  const navigate = useNavigate();
  const webApp = useTelegram();
  const webAppRef = useRef(webApp);
  webAppRef.current = webApp;

  /**
   * КЛЮЧЕВОЕ РЕШЕНИЕ: определяем начальное состояние синхронно.
   * Если Telegram WebApp не обнаружен — мы в обычном браузере.
   * Показываем лендинг НЕМЕДЛЕННО без какого-либо ожидания.
   *
   * Только если WebApp присутствует — запускаем проверку авторизации
   * (пользователь увидит краткий спиннер, но это редкий кейс).
   */
  const [ready, setReady] = useState(() => {
    // Синхронная проверка — если нет Telegram, сразу готовы
    if (!hasTelegramWebApp() && !isTelegramMiniApp()) return true;
    // Если есть авторизация — будем редиректить в dashboard, лендинг не нужен
    if (checkTelegramAuth()) return false;
    return false;
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);

  const { selectedCountry } = useCountry();
  const { language, setLanguage } = useLanguage();

  // Force language to RU only on Russia landing (Spain landing allows all three languages)
  useEffect(() => {
    if (selectedCountry.code === 'RU' && language !== 'ru') {
      setLanguage('ru');
      console.log('[Landing] Forced language to RU for Russia landing');
    }
  }, [selectedCountry.code, language, setLanguage]);

  // Проверка Telegram — только если WebApp был обнаружен при монтировании
  useEffect(() => {
    if (ready) return; // Уже готовы — не нужна проверка

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 12; // 3 секунды максимум

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
        return !!(u && u.id !== 123456789 && u.username !== 'test_user');
      })();
      const hasAuth = checkTelegramAuth();

      // Это Telegram Mini App с авторизацией — редиректим в dashboard
      if (isMiniApp && (hasTgUser || hasAuth || hasRealInitData)) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // WebApp есть, но initData ещё не готов — ждём ещё немного
      if (hasTelegramWebApp() && !hasRealInitData && attempts < MAX_ATTEMPTS) {
        timerId = setTimeout(check, 250);
        return;
      }

      // Таймаут или нет Telegram — показываем лендинг
      if (!cancelled) setReady(true);
    };

    check();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Один раз при монтировании

  // Загрузка реферальных/партнёрских данных
  useEffect(() => {
    const partnerDataStr = sessionStorage.getItem('partner_code');
    if (partnerDataStr) {
      try {
        const partnerData = JSON.parse(partnerDataStr);
        setLoadingPartner(true);
        loadPartnerInfo(partnerData.code)
          .then(p => { if (p) setPartnerInfo(p); else sessionStorage.removeItem('partner_code'); })
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
      .then(r => { if (r) setReferrerInfo(r); else sessionStorage.removeItem('referral_code'); })
      .catch(() => sessionStorage.removeItem('referral_code'))
      .finally(() => setLoadingReferrer(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <LandingFallback />;

  const LandingComponent = selectedCountry.code === 'RU' ? LandingRussia : LandingSpain;

  return (
    <>
      <SeoHead />
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