import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { StartupCurtain } from "@/components/StartupCurtain";
import { checkTelegramAuth } from "@/utils/authCheck";
import { loadReferralInfo, loadPartnerInfo, type ReferrerInfo, type PartnerInfo } from "@/services/referralService";
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

/**
 * Проверяет, открыт ли сайт ВНУТРИ Telegram Mini App (не просто в браузере с загруженным SDK).
 * Ключевой признак: есть непустой реальный initData (подпись от Telegram).
 */
function isInsideTelegramMiniApp(): boolean {
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;

  // Реальный Mini App всегда имеет непустой initData с подписью
  const initData = tg.initData;
  if (!initData || initData === '' || initData.startsWith('mock_')) return false;

  // Дополнительно: реальный пользователь — не мок
  const user = tg.initDataUnsafe?.user;
  if (user && user.id === 123456789 && user.username === 'test_user') return false;

  return true;
}

const Landing = () => {
  const webApp = useTelegram();
  // Стабильный ref — читается внутри эффекта без добавления в deps.
  const webAppRef = useRef(webApp);
  webAppRef.current = webApp;

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);

  const navigate = useNavigate();
  const { selectedCountry } = useCountry();

  // КРИТИЧНО: Проверяем реальный Telegram Mini App по наличию initData.
  // Это происходит сразу синхронно — без задержки и polling.
  // Обычный браузер с загруженным SDK не имеет initData -> показываем лендинг.
  useEffect(() => {
    if (isInsideTelegramMiniApp()) {
      // Мы точно внутри Telegram Mini App — редиректим немедленно
      navigate('/dashboard', { replace: true });
      return;
    }

    // Дополнительная проверка через checkTelegramAuth (localStorage)
    // только если есть реальный initData в webAppRef
    if (checkTelegramAuth()) {
      const currentWebApp = webAppRef.current;
      const hasRealInitData = !!(
        currentWebApp?.initData &&
        currentWebApp.initData !== '' &&
        !currentWebApp.initData.startsWith('mock_')
      );
      if (hasRealInitData) {
        navigate('/dashboard', { replace: true });
        return;
      }
    }

    // Также проверяем через getTelegramUser (fallback для edge cases)
    const tgUser = getTelegramUser();
    if (tgUser && tgUser.id !== 123456789 && tgUser.username !== 'test_user') {
      const currentWebApp = webAppRef.current;
      const hasRealInitData = !!(
        currentWebApp?.initData &&
        !currentWebApp.initData.startsWith('mock_')
      );
      if (hasRealInitData) {
        navigate('/dashboard', { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // Только при монтировании; webApp через ref

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
  }, []); // Только при монтировании

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