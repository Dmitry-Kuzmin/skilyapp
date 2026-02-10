import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StartupCurtain } from "@/components/StartupCurtain";
import { PageLoader } from "@/components/PageLoader";

// ОПТИМИЗАЦИЯ: AuthModal lazy loaded - содержит UserContext и Supabase
const AuthModalNew = lazy(() => import("@/components/AuthModalNew").then(m => ({ default: m.AuthModalNew })));
import { AiStudioLanding } from "@/components/landing/AiStudioLanding";
import { LandingRussia } from "@/components/landing/LandingRussia";
// ОПТИМИЗАЦИЯ: PartnerInviteBanner lazy-loaded - использует Button, который тянет Radix UI
// Это критично для уменьшения initial bundle - Radix UI не должен грузиться на лендинге
const PartnerInviteBanner = lazy(() => import("@/components/landing/PartnerInviteBanner").then(m => ({ default: m.PartnerInviteBanner })));
// ОПТИМИЗАЦИЯ: Легкая проверка авторизации БЕЗ Supabase (через localStorage)
import { checkTelegramAuth } from "@/utils/authCheck";
// ОПТИМИЗАЦИЯ: Убираем статический импорт Supabase - используем сервисные функции с динамическим импортом
import { loadReferralInfo, loadPartnerInfo, type ReferrerInfo, type PartnerInfo } from "@/services/referralService";
import { isTelegramMiniApp, hasTelegramWebApp } from "@/lib/telegram";
import { getTelegramUser } from "@/core/TelegramInit";
import { useTelegram } from "@/contexts/TelegramContext";
import { useCountry } from "@/contexts/CountryContext";


const Landing = () => {
  // АРХИТЕКТУРА: Используем TelegramProvider вместо прямого вызова initTelegram()
  const webApp = useTelegram();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);
  // КРИТИЧНО: Состояние проверки Telegram - предотвращает мерцание лендинга
  const [isCheckingTelegram, setIsCheckingTelegram] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // КРИТИЧНО: Проверка Telegram авторизации для автоматического редиректа
  // В десктопной версии Telegram initData может появиться с задержкой (Race Condition)
  useEffect(() => {
    // КРИТИЧНО: Проверяем, что мы не на /dashboard, чтобы избежать бесконечного цикла
    if (location.pathname === '/dashboard') {
      setIsCheckingTelegram(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 20; // 5 секунд максимум (20 * 250ms)
    let timeoutId: NodeJS.Timeout | null = null;
    let webAppDetected = false;
    let hasRedirected = false; // Флаг для предотвращения повторных редиректов

    const checkTelegram = () => {
      // КРИТИЧНО: Если уже редиректили, прекращаем проверки
      if (hasRedirected || location.pathname === '/dashboard') {
        return;
      }

      attempts++;

      // Проверяем наличие Telegram WebApp
      const hasWebApp = hasTelegramWebApp();
      if (hasWebApp) {
        webAppDetected = true;
      }

      // АРХИТЕКТУРА: Используем TelegramProvider (Singleton) вместо прямого вызова initTelegram()
      // Получаем пользователя из уже инициализированного WebApp
      let telegramUser = null;
      if (webApp?.initDataUnsafe?.user) {
        const userData = webApp.initDataUnsafe.user;
        if (userData.id !== 123456789 && userData.username !== 'test_user') {
          telegramUser = userData;
        }
      }

      // Fallback: проверяем другие источники
      if (!telegramUser) {
        telegramUser = getTelegramUser();
        if (telegramUser && (telegramUser.id === 123456789 || telegramUser.username === 'test_user')) {
          telegramUser = null;
        }
      }

      const hasAuth = checkTelegramAuth();

      // КРИТИЧНО: НЕ проверяем hasStoredAuth - это может создать бесконечный цикл
      // Index (dashboard) сам проверит реальную авторизацию из Supabase

      // АВТО-РЕДИРЕКТ: Только если мы ВНУТРИ Telegram Mini App или имеем реальный initData
      const isMiniApp = isTelegramMiniApp();
      const hasRealInitData = webApp?.initData && webApp.initData !== '' && !webApp.initData.startsWith('mock_');

      if (isMiniApp && (telegramUser || hasAuth || hasRealInitData)) {
        if (!hasRedirected) {
          console.log('[Landing] Telegram Mini App detected, auto-redirecting to dashboard');
          hasRedirected = true;
          navigate('/dashboard', { replace: true });
        }
        return;
      }

      // В обычном браузере (Web) НЕ делаем авто-редирект на основе checkTelegramAuth()
      // Это предотвращает ситуацию, когда пользователя кидает в старую сессию.
      console.log('[Landing] Web mode: staying on landing page');
      setIsCheckingTelegram(false);

      // В. Если WebApp обнаружен, но initData еще нет -> продолжаем попытки
      if (hasWebApp && !hasRealInitData && attempts < maxAttempts) {
        console.log(`[Landing] WebApp detected, waiting for initData (attempt ${attempts}/${maxAttempts})`);
        timeoutId = setTimeout(checkTelegram, 250);
        return;
      }

      // Г. Если WebApp был обнаружен, но таймаут истек -> редирект на дашборд
      // UserContext там обработает авторизацию, когда initData появится
      if (webAppDetected && attempts >= maxAttempts && !hasRedirected) {
        console.log('[Landing] WebApp detected but timeout reached, redirecting to dashboard for auth handling');
        hasRedirected = true;
        navigate('/dashboard', { replace: true });
        return;
      }

      // Д. Если нет WebApp и прошло достаточно попыток -> показываем Лендинг
      if (!hasWebApp && attempts >= 3) {
        console.log('[Landing] No Telegram WebApp detected, showing landing page');
        setIsCheckingTelegram(false);
        return;
      }

      // Е. Продолжаем попытки на случай задержки загрузки
      if (attempts < maxAttempts && !hasRedirected) {
        timeoutId = setTimeout(checkTelegram, 250);
      } else if (!hasRedirected) {
        // Финальный fallback - показываем лендинг
        console.log('[Landing] Max attempts reached, showing landing page');
        setIsCheckingTelegram(false);
      }
    };

    // Начинаем проверку сразу
    checkTelegram();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [navigate, webApp]); // CRITICAL: Removed location.pathname to prevent infinite loop

  useEffect(() => {
    // КРИТИЧНО: Landing НЕ проверяет авторизацию - это делает Index
    // Landing просто рендерится на /, а Index на /dashboard редиректит на / если не авторизован
    // Это предотвращает бесконечный цикл редиректов

    // ОПТИМИЗАЦИЯ: Проверяем коды, но НЕ блокируем рендер лендинга
    // Лендинг рендерится сразу, а данные загружаются асинхронно когда придут

    // Проверяем партнерский код (приоритет над реферальным)
    const partnerDataStr = sessionStorage.getItem('partner_code');
    if (import.meta.env.DEV) console.log('[Landing] Checking partner code from sessionStorage:', partnerDataStr);

    if (partnerDataStr) {
      try {
        const partnerData = JSON.parse(partnerDataStr);
        if (import.meta.env.DEV) console.log('[Landing] Parsed partner data:', partnerData);

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

  // Если проверка прошла и это обычный браузер -> Рендерим Лендинг
  const { selectedCountry } = useCountry();

  // КРИТИЧНО: Если идет проверка - показываем лоадер, чтобы избежать мерцания лендинга
  // Пользователь не должен видеть лендинг, который потом резко исчезнет
  // UPD: Используем PageLoader, который так же поднимает шторку (StartupCurtain) и показывает красивый спиннер
  // Это предотвращает "зависание" на HTML скелетоне
  if (isCheckingTelegram) {
    return <PageLoader />;
  }

  // Выбираем лендинг в зависимости от страны
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