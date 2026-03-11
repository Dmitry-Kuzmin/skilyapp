// Skily Landing Page - Russia Market (ГИБДД)
import React, { useState, useEffect, lazy, Suspense } from "react";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { playClickSound, playEngineSound } from "@/services/audioService";
import { LandingRussiaHero } from "./LandingRussiaHero";
const LandingRussiaContent = lazy(() => import("./LandingRussiaContent").then(m => ({ default: m.LandingRussiaContent })));
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useCountry } from "@/contexts/CountryContext";
import { landingTranslations } from "@/translations/landing";
import { School, Timer, Target, Brain, Sparkles, Coins, Landmark, Languages, FileText } from "lucide-react";

// Types
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

interface AiStudioLandingProps {
  onRequestAccess: () => void;
  referrerInfo?: ReferrerInfo | null;
  loadingReferrer?: boolean;
  partnerInfo?: PartnerInfo | null;
  loadingPartner?: boolean;
}

export const LandingRussia: React.FC<AiStudioLandingProps> = ({
  onRequestAccess,
  referrerInfo,
  partnerInfo,
}) => {
  const isTouchDevice = useIsTouchDevice();
  const isMobile = useIsMobile();
  const [isStarting, setIsStarting] = useState(false);
  const [isEchoActive, setIsEchoActive] = useState(false);
  const [isPartnershipOpen, setIsPartnershipOpen] = useState(false);
  const [demoVariantIndex, setDemoVariantIndex] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { selectedCountry } = useCountry();
  const navigate = useNavigate();
  const copy = landingTranslations[language];

  const faqContent: any = {
    ru: {
      sectionTitle: 'Почему Skily лучше зубрежки билетов?',
      sectionSubtitle: 'Развеиваем мифы о подготовке к экзамену ГИБДД.',
      categories: [
        {
          id: 'money', title: 'Экономия и Законы',
          questions: [
            { q: 'Можно ли сдать теорию ГИБДД самостоятельно?', a: 'Да! Многие сдают с первого раза...', icon: School },
            { q: 'Сколько времени нужно?', a: 'С умным алгоритмом Skily — от 2 недель...', icon: Timer },
            { q: 'Что делать с ловушками?', a: 'В ГИБДД любят подвохи. Skily AI разбирает каждую...', icon: Target }
          ]
        },
        {
          id: 'lang', title: 'Технологии',
          questions: [
            { q: 'Как AI помогает учить?', a: 'AI не просто показывает ответ, он объясняет ПОЧЕМУ...', icon: Brain },
            { q: 'Насколько актуальны вопросы?', a: 'Мы обновляем базу при каждом изменении ПДД...', icon: Sparkles }
          ]
        }
      ]
    }
  };

  const DEMO_VARIANTS: any = {
    ru: [{ title: 'Мы научили AI думать как экзаменатор', text: 'Skily AI знает каждый подвох в билетах ГИБДД...' }],
    es: [{ title: 'DGT AI', text: '...' }],
    en: [{ title: 'Driver AI', text: '...' }]
  };

  useEffect(() => {
    const currentVariants = DEMO_VARIANTS[language] || DEMO_VARIANTS['en'];
    if (currentVariants) {
      setDemoVariantIndex(Math.floor(Math.random() * currentVariants.length));
    }
  }, [language]);

  const handleStartEngine = () => {
    if (isMobile) {
      playEngineSound();
      setTimeout(() => navigate('/login'), 300);
      return;
    }
    if (isStarting) return;
    setIsStarting(true);
    playEngineSound();
    setTimeout(() => {
      onRequestAccess();
      setIsStarting(false);
    }, 1500);
  };

  const handleEnter = () => {
    if (isMobile) { navigate('/login'); return; }
    playClickSound();
    onRequestAccess();
  };

  const handleLanguageChange = (code: Language) => {
    if (language !== code) setLanguage(code);
  };

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'url("/noise.svg")' }}></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      <Suspense fallback={<div className="h-[600px] flex items-center justify-center"><Sparkles className="animate-spin text-blue-500" /></div>}>
        <LandingRussiaHero
          language={language}
          copy={copy}
          selectedCountry={selectedCountry}
          referrerInfo={referrerInfo}
          partnerInfo={partnerInfo}
          handleEnter={handleEnter}
          handleStartEngine={handleStartEngine}
          handleLanguageChange={handleLanguageChange}
          isStarting={isStarting}
          isTouchDevice={isTouchDevice}
          avatarError={avatarError}
          setAvatarError={setAvatarError}
          isEchoActive={isEchoActive}
          setIsEchoActive={setIsEchoActive}
        />
      </Suspense>

      <Suspense fallback={<div className="h-[400px]" />}>
        <LandingRussiaContent
          language={language}
          copy={copy}
          DEMO_VARIANTS={DEMO_VARIANTS}
          demoVariantIndex={demoVariantIndex}
          faqContent={faqContent}
          selectedCountry={selectedCountry}
          isPartnershipOpen={isPartnershipOpen}
          setIsPartnershipOpen={setIsPartnershipOpen}
          navigate={navigate}
          handleEnter={handleEnter}
          referrerInfo={referrerInfo}
        />
      </Suspense>
    </div>
  );
};
