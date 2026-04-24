import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { StartupCurtain } from "@/components/StartupCurtain";
import { SeoHead } from "@/components/seo/SeoHead";
import { useCrispChat } from "@/hooks/useCrispChat";
import { loadReferralInfo, loadPartnerInfo, type ReferrerInfo, type PartnerInfo } from "@/services/referralService";
import { isTelegramMiniApp, hasTelegramWebApp } from "@/lib/telegram";
import { checkTelegramAuth } from "@/utils/authCheck";
import { useTelegram } from "@/contexts/TelegramContext";
import { useCountry } from "@/contexts/CountryContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { examYear } from "@/utils/dateUtils";

const PATH_LANG_MAP: Record<string, Language> = {
  "/ru": "ru",
  "/es": "es",
  "/en": "en",
};

const PATH_COUNTRY_MAP: Record<string, "RU" | "ES"> = {
  "/ru": "RU",
  "/es": "ES",
  "/en": "ES",
};

// Unique titles per path-based route — avoids duplicate-title penalty vs root /
const PATH_SEO: Record<string, { title: string; description: string }> = {
  es: {
    title: `Test Teórico DGT ${examYear} en Español | App Autoescuela Online — Skilyapp`,
    description: `Prepara el examen teórico DGT ${examYear} en español. Preguntas oficiales actualizadas, simulacros con temporizador, tutor IA 24/7. Gratis — 9 de cada 10 aprueban a la primera.`,
  },
  en: {
    title: `Spain Driving Theory Test ${examYear} in English | DGT Exam Prep — Skilyapp`,
    description: `Prepare for the Spanish DGT driving theory test ${examYear} in English. Official questions, timed mock exams, AI tutor 24/7. Free — 9 out of 10 pass first try.`,
  },
  ru: {
    title: `ПДД Испании ${examYear} на русском | Подготовка к экзамену DGT — Skilyapp`,
    description: `Подготовка к теоретическому экзамену DGT ${examYear} на русском языке. Официальные билеты, симулятор экзамена, ИИ-репетитор 24/7. Бесплатно — 9 из 10 сдают с первой попытки.`,
  },
};

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
  const location = useLocation();
  const webApp = useTelegram();
  const webAppRef = useRef(webApp);
  webAppRef.current = webApp;

  const pathLang = PATH_LANG_MAP[location.pathname];
  const pathCountry = PATH_COUNTRY_MAP[location.pathname];

  useCrispChat();

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

  const { selectedCountry, setCountryByCode } = useCountry();
  const { language, setLanguage } = useLanguage();

  // Sync contexts on SPA navigation between landing routes (/ru ↔ /es ↔ /)
  // Both contexts already detect pathname at init; this handles in-app navigation without remount.
  useEffect(() => {
    if (pathLang && language !== pathLang) setLanguage(pathLang);
    if (pathCountry && selectedCountry.code !== pathCountry) setCountryByCode(pathCountry);
  }, [pathLang, pathCountry, language, selectedCountry.code, setLanguage, setCountryByCode]);

  // Signal to prerender script that lazy-loaded landing chunk has mounted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __LANDING_MOUNTED__?: boolean }).__LANDING_MOUNTED__ = true;
    }
  }, []);

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

  // pathLang gives synchronous path-based forcing (/ru → RU). Fallback to selectedCountry
  // for the unauthenticated landing (/) where country comes from localStorage/navigator.
  const LandingComponent = (pathLang === 'ru' || (!pathLang && selectedCountry.code === 'RU'))
    ? LandingRussia
    : LandingSpain;

  // For path-based language routes, use clean canonical URL so Google indexes each language
  // as a separate page. Home (/) uses x-default/root canonical.
  const canonicalUrl = pathLang
    ? `https://skilyapp.com/${pathLang}`
    : "https://skilyapp.com";

  const hreflangAlternates = [
    { hreflang: "es", href: "https://skilyapp.com/es" },
    { hreflang: "en", href: "https://skilyapp.com/en" },
    { hreflang: "ru", href: "https://skilyapp.com/ru" },
    { hreflang: "x-default", href: "https://skilyapp.com" },
  ];

  const pathSeo = pathLang ? PATH_SEO[pathLang] : undefined;

  return (
    <>
      <SeoHead
        canonicalUrl={canonicalUrl}
        hreflangAlternates={hreflangAlternates}
        title={pathSeo?.title}
        description={pathSeo?.description}
      />
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