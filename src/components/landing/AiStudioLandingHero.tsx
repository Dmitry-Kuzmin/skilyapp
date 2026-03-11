import React from "react";
import { Zap, Crown, Coins } from "lucide-react";
import { LandingLogo } from "./LandingLogo";
import { StartEngineButton } from "./StartEngineButton";
import { CountrySelector } from "./CountrySelector";
import { LanguageSelector } from "./LanguageSelector";
import { examYear } from "@/utils/dateUtils";

interface HeroProps {
  language: any;
  copy: any;
  selectedCountry: any;
  referrerInfo: any;
  handleEnter: () => void;
  handleStartEngine: () => void;
  handleLanguageChange: (code: any) => void;
  isStarting: boolean;
  isPartner?: boolean;
}

export const AiStudioLandingHero: React.FC<HeroProps> = ({
  language,
  copy,
  selectedCountry,
  referrerInfo,
  handleEnter,
  handleStartEngine,
  handleLanguageChange,
  isStarting,
}) => {
  return (
    <div className="relative z-10">
      <nav className="relative z-[100] px-4 md:px-10 pt-[max(1rem,env(safe-area-inset-top))] pb-4 md:pb-6 flex items-center justify-between max-w-[1400px] mx-auto gap-2 md:gap-4" style={{ overflow: 'visible' }}>
        <div className="flex items-center gap-0 md:gap-4" style={{ overflow: 'visible', position: 'relative' }}>
          <LandingLogo theme="dark" variant="bold" className="scale-75 md:scale-90 origin-left -mr-5 md:mr-0" />
          <div className="h-4 w-px bg-white/20 self-center mx-0.5" />
          <CountrySelector />
        </div>

        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {selectedCountry.code !== 'ru' && (
            <LanguageSelector
              language={language}
              onSelect={handleLanguageChange}
              label={copy.controls.languageLabel}
            />
          )}

          <button
            onClick={handleEnter}
            className="px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-white text-slate-900 text-xs md:text-sm font-bold hover:bg-white/90 transition-all duration-300 hover:scale-105 relative whitespace-nowrap shadow-lg shadow-white/20"
          >
            {referrerInfo ? (
              <>
                {copy.controls.studentAccess}
                <span className="ml-2 text-amber-500 inline-flex items-center gap-1">
                  +50 <Coins className="h-4 w-4 inline" />
                </span>
              </>
            ) : (
              copy.controls.studentAccess
            )}
          </button>
        </div>
      </nav>

      <section className="relative z-10 px-6 pt-12 pb-8 md:pt-20 md:pb-12 max-w-[1400px] mx-auto flex flex-col items-center text-center min-h-[70vh]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[9px] sm:text-[10px] font-bold tracking-[0.25em] uppercase mb-5 sm:mb-6 animate-fade-in relative z-20">
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          {selectedCountry.code === 'ru' ? `ГИБДД ${examYear} · Официальные вопросы` : `DGT Approved · ${examYear}`}
        </div>

        <div className="relative mb-4 md:mb-6 w-full flex flex-col items-center">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[140%] blur-[120px] opacity-25 bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-300 pointer-events-none"></div>
          <h1 className="relative text-[clamp(2.25rem,8vw,5.5rem)] font-black tracking-tighter leading-[1.05] sm:leading-[0.95] animate-slide-up select-none max-w-4xl">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-300 block pb-1 sm:pb-2">
              {copy.hero.titleTop}
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-300 block">
              {copy.hero.titleBottom}
            </span>
          </h1>
        </div>

        <p className="max-w-3xl text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed mb-10 md:mb-12 animate-slide-up font-medium px-1">
          <span className="text-white font-bold">{copy.hero.descriptionHighlight}</span>. {copy.hero.descriptionRest}
        </p>

        <div className="flex flex-col items-center gap-5 animate-slide-up">
          <div className="scale-75 md:scale-90">
            <StartEngineButton onClick={handleStartEngine} isIgniting={isStarting} />
          </div>
          <div className="flex items-center gap-4 opacity-60">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-500 animate-engine-idle"></div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 animate-engine-idle">
              {copy.hero.pressStart}
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-500 animate-engine-idle"></div>
          </div>
        </div>
      </section>
    </div>
  );
};
