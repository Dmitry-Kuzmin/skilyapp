import React from "react";
import { Coins, Crown, ArrowRight, Gift } from "lucide-react";
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
  partnerInfo: any;
  handleEnter: () => void;
  handleStartEngine: () => void;
  handleLanguageChange: (code: any) => void;
  isStarting: boolean;
  isTouchDevice: boolean;
  avatarError: boolean;
  setAvatarError: (val: boolean) => void;
  isEchoActive: boolean;
  setIsEchoActive: (val: boolean) => void;
}

export const LandingRussiaHero: React.FC<HeroProps> = ({
  language,
  copy,
  selectedCountry,
  referrerInfo,
  partnerInfo,
  handleEnter,
  handleStartEngine,
  handleLanguageChange,
  isStarting,
  isTouchDevice,
  avatarError,
  setAvatarError,
  isEchoActive,
  setIsEchoActive
}) => {
  return (
    <>
      <nav className="relative z-[100] px-6 md:px-12 pt-[max(2rem,env(safe-area-inset-top))] pb-4 md:pb-6 flex items-center justify-between max-w-[1400px] mx-auto gap-2 md:gap-4" style={{ overflow: 'visible' }}>
        <div className="flex items-center gap-0 md:gap-4" style={{ overflow: 'visible', position: 'relative' }}>
          <LandingLogo
            theme="dark"
            variant="header"
            className="scale-90 md:scale-105 origin-left -mr-5 md:mr-0"
            onInteraction={() => {
              if (!isEchoActive) {
                setIsEchoActive(true);
                setTimeout(() => setIsEchoActive(false), 600);
              }
            }}
          />
          <div className="h-4 w-px bg-white/20 self-center mx-0.5" />
          <CountrySelector />
        </div>

        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          <LanguageSelector
            language={language}
            onSelect={handleLanguageChange}
            label={copy.controls.languageLabel}
          />

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

      {/* Partner Banner */}
      {partnerInfo && (
        <div className="relative z-40 px-6 pt-6 pb-0 max-w-[1400px] mx-auto animate-fade-in">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-yellow-500/10 pointer-events-none" />
            <div className="relative p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg border border-amber-500/30 overflow-hidden backdrop-blur-sm">
                    <span className="bg-gradient-to-br from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                      {partnerInfo.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-black text-white mb-1.5 leading-tight">
                    {partnerInfo.name} {language === 'ru' ? 'дарит Premium!' : 'regala Premium!'}
                  </h3>
                  <p className="text-sm md:text-base text-slate-300">
                    <span className="font-bold text-amber-400">Premium на 30 дней</span> {language === 'ru' ? 'при регистрации' : 'al registrarse'}
                  </p>
                </div>
              </div>
              <button onClick={handleEnter} className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-black text-sm md:text-base flex items-center justify-center gap-2">
                <Crown className="h-4 w-4" />
                <span>{language === 'ru' ? 'Получить Premium' : 'Obtener Premium'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Banner */}
      {!partnerInfo && referrerInfo && (
        <div className="relative z-40 px-6 pt-6 pb-0 max-w-[1400px] mx-auto animate-fade-in">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 shadow-2xl">
            <div className="relative p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg border border-slate-700/50 overflow-hidden">
                  {referrerInfo.photo_url && !avatarError ? (
                    <img src={referrerInfo.photo_url} alt={referrerInfo.first_name} className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                  ) : (
                    <span className="bg-gradient-to-br from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">{referrerInfo.first_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-black text-white mb-1.5 leading-tight">{referrerInfo.first_name} {copy.referral.invitesYou}</h3>
                  <p className="text-sm md:text-base text-slate-300"><span className="font-bold text-indigo-400">+50 {language === 'ru' ? 'монет' : 'coins'}</span> {copy.referral.coinsOnRegistration}</p>
                </div>
              </div>
              <button onClick={handleEnter} className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white font-black text-sm md:text-base flex items-center justify-center gap-2">
                <Gift className="h-4 w-4" />
                <span>{copy.referral.join}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="relative z-10 px-6 py-20 md:py-32 max-w-[1400px] mx-auto flex flex-col items-center justify-center text-center">
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
          <div className="scale-75 md:scale-90 transform-gpu">
            <StartEngineButton onClick={handleStartEngine} isIgniting={isStarting} />
          </div>
          <div className="flex items-center gap-4 opacity-60">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-500"></div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              {copy.hero.pressStart}
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-500"></div>
          </div>
        </div>
      </section>
    </>
  );
};
