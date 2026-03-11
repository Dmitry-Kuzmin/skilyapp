// Skily Landing Page - Optimized for High Conversions
import React, { useState, useEffect, lazy, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { playClickSound, playEngineSound } from "@/services/audioService";
import { AiStudioLandingHero } from "./AiStudioLandingHero";
const AiStudioLandingContent = lazy(() => import("./AiStudioLandingContent").then(m => ({ default: m.AiStudioLandingContent })));
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useCountry } from "@/contexts/CountryContext";
import { landingTranslations } from "@/translations/landing";
import { Sparkles, School, Timer, Target, Brain } from "lucide-react";

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
  partnerInfo?: PartnerInfo | null;
}

export const AiStudioLanding: React.FC<AiStudioLandingProps> = ({
  onRequestAccess,
  referrerInfo,
  partnerInfo,
}) => {
  const isMobile = useIsMobile();
  const [isStarting, setIsStarting] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { selectedCountry } = useCountry();
  const navigate = useNavigate();
  const copy = landingTranslations[language];

  // Logic from original component
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

  const faqContent: any = {
    ru: {
      sectionTitle: 'Почему Skily лучше?',
      sectionSubtitle: '...',
      categories: [{ id: '1', title: 'Tech', questions: [{ q: 'AI?', a: 'Yes', icon: Brain }] }]
    },
    es: {
      sectionTitle: '¿Por qué Skily?',
      sectionSubtitle: '...',
      categories: [{ id: '1', title: 'Tech', questions: [{ q: '¿IA?', a: 'Sí', icon: Brain }] }]
    },
    en: {
      sectionTitle: 'Why Skily?',
      sectionSubtitle: '...',
      categories: [{ id: '1', title: 'Tech', questions: [{ q: 'AI?', a: 'Yes', icon: Brain }] }]
    }
  };

  const DEMO_VARIANTS: any = {
    ru: [{ title: 'DGT AI', text: '...' }],
    es: [{ title: 'IA de DGT', text: '...' }],
    en: [{ title: 'DGT AI', text: '...' }]
  };

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'url("/noise.svg")' }}></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      <AiStudioLandingHero
        language={language}
        copy={copy}
        selectedCountry={selectedCountry}
        referrerInfo={referrerInfo}
        handleEnter={handleEnter}
        handleStartEngine={handleStartEngine}
        handleLanguageChange={handleLanguageChange}
        isStarting={isStarting}
        isPartner={!!partnerInfo}
      />

      <Suspense fallback={<div className="h-[400px]" />}>
        <AiStudioLandingContent
          language={language}
          copy={copy}
          DEMO_VARIANTS={DEMO_VARIANTS}
          handleEnter={handleEnter}
          faqContent={faqContent}
        />
      </Suspense>
    </div>
  );
};