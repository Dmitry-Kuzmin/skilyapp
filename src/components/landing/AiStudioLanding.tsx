import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Brain,
  Zap,
  Smartphone,
  Crown,
  Car,
  Bike,
  Bus,
  Timer,
  Trophy,
  Swords,
  Target,
  Bookmark,
  XCircle,
  CheckCircle,
  Gift,
  ArrowRight,
  Sparkles,
  Coins,
} from "lucide-react";
import { motion } from "framer-motion";
import { playClickSound, playEngineSound } from "@/services/audioService";
import { LandingLogo } from "./LandingLogo";
import { StartEngineButton } from "./StartEngineButton";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import {
  landingTranslations,
  LANGUAGE_OPTIONS,
} from "@/translations/landing";

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

export const AiStudioLanding: React.FC<AiStudioLandingProps> = ({
  onRequestAccess,
  referrerInfo,
  loadingReferrer = false,
  partnerInfo,
  loadingPartner = false,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const { language, setLanguage } = useLanguage();

  // Reset avatar error when referrerInfo changes
  useEffect(() => {
    if (referrerInfo) {
      setAvatarError(false);
    }
  }, [referrerInfo?.photo_url]);
  const navigate = useNavigate();
  const copy = landingTranslations[language];
  const highlightWord = copy.stats[1].label;
  const totalQuestionsText = copy.ecosystem.cards.totalQuestions;
  const highlightIndex = totalQuestionsText
    .toLowerCase()
    .lastIndexOf(highlightWord.toLowerCase());
  const totalTextBefore =
    highlightIndex >= 0 ? totalQuestionsText.slice(0, highlightIndex) : totalQuestionsText;
  const totalTextHighlight =
    highlightIndex >= 0 ? totalQuestionsText.slice(highlightIndex, highlightIndex + highlightWord.length) : "";
  const totalTextAfter =
    highlightIndex >= 0 ? totalQuestionsText.slice(highlightIndex + highlightWord.length) : "";

  const handleStartEngine = () => {
    if (isStarting) return;
    setIsStarting(true);
    playEngineSound();
    setTimeout(() => {
      onRequestAccess();
    }, 1500);
  };

  const handleEnter = () => {
    playClickSound();
    onRequestAccess();
  };

  const handleLanguageChange = (code: Language) => {
    if (language !== code) {
      setLanguage(code);
    }
  };

  const gameIcons = [Trophy, Swords, Target, Brain];
  const gameColors = [
    "text-yellow-400",
    "text-red-400",
    "text-blue-400",
    "text-purple-400",
  ];

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}
      ></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      <div className="fixed top-[-20%] left-[20%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      {/* ОПТИМИЗАЦИЯ: Скрываем фиолетовый градиент внизу для мобильных браузеров (не Telegram) */}
      <div className="hidden md:block fixed bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      {/* LCP: локальное hero изображение с preload */}
      <img
        src="/images/hero-lcp.webp"
        alt=""
        loading="eager"
        decoding="async"
        fetchpriority="high"
        className="fixed inset-0 w-full h-[120vh] object-cover opacity-70 mix-blend-screen pointer-events-none select-none"
      />

      <nav className="relative z-50 px-6 md:px-10 py-6 flex items-center justify-between max-w-[1400px] mx-auto gap-4 flex-wrap">
        <LandingLogo theme="dark" className="scale-90 origin-left" />
        <div className="flex items-center gap-3 flex-wrap justify-end ml-auto">
          <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
            <Smartphone size={16} />
            <button onClick={() => window.open("https://t.me/sdadimtutbot", "_blank")}>
              {copy.controls.telegramApp}
            </button>
          </div>
          <LanguageSelector
            language={language}
            onSelect={handleLanguageChange}
            label={copy.controls.languageLabel}
          />
          <button
            onClick={handleEnter}
            className="px-6 py-2.5 rounded-full bg-slate-800/50 border border-slate-700 text-sm font-bold text-slate-300 hover:bg-white hover:text-slate-900 transition-all duration-300 hover:scale-105 relative"
          >
            {referrerInfo ? (
              <>
                {copy.controls.studentAccess}
                <span className="ml-2 text-amber-400 inline-flex items-center gap-1">
                  +50 <Coins className="h-4 w-4 inline" />
                </span>
              </>
            ) : (
              copy.controls.studentAccess
            )}
          </button>
        </div>
      </nav>

      {/* Partner Banner (Priority over Referral) */}
      {partnerInfo && !loadingPartner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-40 px-6 pt-6 pb-0 max-w-[1400px] mx-auto"
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 shadow-2xl">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-yellow-500/10 pointer-events-none" />
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50" />
            
            <div className="relative p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar and Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg border border-amber-500/30 overflow-hidden backdrop-blur-sm">
                    <span className="bg-gradient-to-br from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                      {partnerInfo.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-2xl blur-xl -z-10 opacity-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      {language === 'ru' ? 'Партнер' : language === 'es' ? 'Socio' : 'Partner'}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-white mb-1.5 leading-tight">
                    {partnerInfo.name} {language === 'ru' ? 'дарит Premium!' : language === 'es' ? 'regala Premium!' : 'gives Premium!'}
                  </h3>
                  <p className="text-sm md:text-base text-slate-300">
                    <span className="font-bold text-amber-400">Premium на 30 дней</span> {language === 'ru' ? 'при регистрации' : language === 'es' ? 'al registrarse' : 'on registration'}
                  </p>
                  {partnerInfo.channel_name && (
                    <p className="text-xs text-slate-400 mt-1">
                      {partnerInfo.channel_name}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleEnter}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-white font-black text-sm md:text-base shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Crown className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{language === 'ru' ? 'Получить Premium' : language === 'es' ? 'Obtener Premium' : 'Get Premium'}</span>
                <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Referral Banner (Shown only if no partner banner) */}
      {!partnerInfo && referrerInfo && !loadingReferrer && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-40 px-6 pt-6 pb-0 max-w-[1400px] mx-auto"
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 shadow-2xl">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50" />
            
            <div className="relative p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar and Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg border border-slate-700/50 overflow-hidden backdrop-blur-sm">
                    {referrerInfo.photo_url && !avatarError ? (
                      <img
                        src={referrerInfo.photo_url}
                        alt={referrerInfo.first_name}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="bg-gradient-to-br from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                        {referrerInfo.first_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 rounded-2xl blur-xl -z-10 opacity-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {copy.referral.badge}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-white mb-1.5 leading-tight">
                    {referrerInfo.first_name} {copy.referral.invitesYou}
                  </h3>
                  <p className="text-sm md:text-base text-slate-300">
                    <span className="font-bold text-indigo-400">+50 {language === 'ru' ? 'монет' : language === 'es' ? 'monedas' : 'coins'}</span> {copy.referral.coinsOnRegistration}
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleEnter}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:via-violet-500 hover:to-indigo-500 text-white font-black text-sm md:text-base shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Gift className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{copy.referral.join}</span>
                <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <section className="relative z-10 px-6 pt-12 pb-10 md:pt-20 md:pb-16 max-w-[1400px] mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[9px] sm:text-[10px] font-bold tracking-[0.25em] uppercase mb-6 sm:mb-8 animate-fade-in relative z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          {copy.hero.badge}
        </div>

        <h1
          className="text-[clamp(2.25rem,8vw,5.5rem)] font-black tracking-tight md:tracking-tighter mb-5 md:mb-8 leading-[1.05] sm:leading-[0.95] animate-slide-up select-none drop-shadow-2xl text-balance max-w-3xl"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400 block pb-1 sm:pb-2">
            {copy.hero.titleTop}
          </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-indigo-400 via-violet-400 to-indigo-600 block">
            {copy.hero.titleBottom}
          </span>
        </h1>

        <p
          className="max-w-2xl text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed md:leading-loose mb-10 md:mb-12 animate-slide-up font-medium text-balance px-1"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-white font-bold">{copy.hero.descriptionHighlight}</span>. {copy.hero.descriptionRest}
        </p>

        <div
          className="flex flex-col items-center gap-6 animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="scale-75 md:scale-90">
            <StartEngineButton
              onClick={handleStartEngine}
              isIgniting={isStarting}
            />
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

      <section className="relative z-10 px-6 pb-10 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {copy.stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 text-center"
            >
              <div className="font-black text-white mb-2 leading-tight text-balance text-[clamp(1.6rem,5vw,2.4rem)]">
                {stat.value}
              </div>
              <p className="text-slate-400 text-sm mt-2">{stat.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 py-16 max-w-[1400px] mx-auto border-t border-slate-800/50">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-black mb-4">{copy.ecosystem.title}</h2>
          <p className="text-slate-400 max-w-xl">{copy.ecosystem.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] hover:border-indigo-500/30 transition-all">
            <div className="font-black text-white mb-2 leading-snug text-pretty text-[clamp(1.4rem,2vw,2rem)] max-w-[280px]">
              {totalTextBefore}
              {highlightIndex >= 0 && (
                <span className="text-indigo-300">{totalTextHighlight}</span>
              )}
              {totalTextAfter}
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] hover:border-indigo-500/30 transition-all">
            <div className="flex gap-4 mb-4">
              <Car size={32} className="text-indigo-400" />
              <Bike size={32} className="text-emerald-400" />
              <Bus size={32} className="text-orange-400" />
            </div>
            <h3 className="font-bold text-lg mb-1">{copy.ecosystem.cards.categoriesTitle}</h3>
            <p className="text-slate-500 text-sm">
              {copy.ecosystem.cards.categoriesDescription}
            </p>
          </div>
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/20 p-8 rounded-[2rem] relative overflow-hidden flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-indigo-300 font-mono text-xs uppercase tracking-widest">
                <Timer size={14} /> {copy.ecosystem.cards.timer}
              </div>
              <h3 className="font-bold text-2xl text-white mb-2">{copy.ecosystem.cards.simulationTitle}</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                {copy.ecosystem.cards.simulationDescription}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-500 flex items-center justify-center text-xl font-bold bg-indigo-900/20">
                {copy.ecosystem.cards.passRate}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-16 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-10 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Brain size={300} />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-xs font-bold uppercase mb-6">
                <Zap size={12} /> {copy.aiSection.poweredBy}
              </div>
              <h2 className="text-4xl font-bold mb-4">{copy.aiSection.title}</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-md">
                {copy.aiSection.description}
              </p>
              <ul className="space-y-4 text-slate-300">
                {copy.aiSection.bullets.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <CheckCircle2 size={14} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-rows-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <Bookmark className="text-orange-400" size={24} />
                <h3 className="font-bold text-xl">{copy.aiSection.challengeBank}</h3>
              </div>
              <p className="text-slate-400">{copy.aiSection.challengeBankDescription}</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl mb-1">{copy.aiSection.telegramTitle}</h3>
                <p className="text-slate-400 text-sm">{copy.aiSection.telegramDescription}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#229ED9]/20 flex items-center justify-center text-[#229ED9]">
                <Smartphone size={24} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-16 max-w-[1400px] mx-auto border-t border-slate-800/50">
        <div className="text-center mb-16">
          <p className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-xs mb-4">
            {copy.comparison.label}
          </p>
          <h2 className="text-4xl md:text-6xl font-black text-white">{copy.comparison.title}</h2>
        </div>

        <div className="relative rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"></div>
          <div className="relative hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/70">
                  <th className="py-6 px-8 text-xs font-bold uppercase tracking-[0.3em] text-slate-500 w-1/3">
                    {copy.comparison.featureLabel}
                  </th>
                  <th className="py-6 px-8 text-xs font-bold uppercase tracking-[0.3em] text-rose-400 w-1/3 text-center">
                    {copy.comparison.traditional}
                  </th>
                  <th className="py-6 px-8 text-xs font-bold uppercase tracking-[0.3em] text-indigo-400 w-1/3 text-center bg-indigo-500/5">
                    {copy.comparison.skily}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {copy.comparison.rows.map((row, index) => (
                  <tr
                    key={row.feature}
                    className="border-b border-slate-800/70 last:border-0 hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-6 px-8 text-white font-bold">{row.feature}</td>
                    <td className="py-6 px-8 text-slate-400 text-center">
                      <div className="inline-flex items-center gap-2 justify-center">
                        <XCircle size={16} className="text-rose-500" />
                        {row.traditional}
                      </div>
                    </td>
                    <td className="py-6 px-8 text-white text-center bg-indigo-500/5 relative">
                      {index === 0 && (
                        <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none rounded-br-[2.5rem]"></div>
                      )}
                      <div className="inline-flex items-center gap-2 justify-center relative z-10">
                        <CheckCircle size={16} className="text-indigo-400" />
                        {row.skily}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="relative md:hidden p-4 space-y-5">
            {copy.comparison.rows.map((row) => (
              <div
                key={row.feature}
                className="relative rounded-3xl border border-white/5 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.5)] overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-indigo-500/15 to-transparent pointer-events-none"></div>
                <div className="relative space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">
                      {row.feature}
                    </p>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70">
                      сравнение
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
                        <XCircle size={16} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-rose-300">
                          {copy.comparison.traditional}
                        </p>
                        <p className="text-slate-300/90 text-sm leading-snug">{row.traditional}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
                        <CheckCircle size={16} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-200">
                          {copy.comparison.skily}
                        </p>
                        <p className="text-white text-sm leading-snug">{row.skily}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-16 max-w-[1400px] mx-auto">
        <div className="relative rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl mb-10 group">
          <div className="h-24 bg-gradient-to-r from-orange-500 to-red-600 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
          </div>

          <div className="bg-[#0f172a] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1 text-orange-500 font-bold uppercase tracking-widest text-xs">
                <Crown size={14} /> {copy.arena.bannerLabel}
              </div>
              <h3 className="text-3xl font-black text-white mb-2">{copy.arena.bannerTitle}</h3>
              <p className="text-slate-400 text-sm">{copy.arena.bannerDescription}</p>
            </div>

            <div className="flex gap-8 md:gap-12">
              <div className="text-center">
                <div className="text-3xl font-black text-white">90</div>
                <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                  {copy.arena.levels}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                  Epic
                </div>
                <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                  {copy.arena.rewards}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {copy.arena.games.map((game, index) => {
            const Icon = gameIcons[index % gameIcons.length];
            const color = gameColors[index % gameColors.length];
            return (
              <div
                key={game.title}
                className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl hover:border-indigo-500/30 transition-all cursor-pointer group"
              >
                <Icon
                  size={32}
                  className={`${color} mb-4 group-hover:scale-110 transition-transform`}
                />
                <h3 className="font-bold text-white text-lg mb-1">{game.title}</h3>
                <p className="text-xs text-slate-500">{game.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 px-6 py-20 pb-32 max-w-[1400px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{copy.pricing.title}</h2>
          <p className="text-slate-400">{copy.pricing.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem]">
            <h3 className="font-bold text-xl text-slate-300 mb-2">{copy.pricing.plans.cadet.title}</h3>
            <div className="text-3xl font-black text-white mb-6">{copy.pricing.plans.cadet.price}</div>
            <ul className="space-y-3 mb-8 text-sm text-slate-400">
              {copy.pricing.plans.cadet.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <CheckCircle2 size={16} /> {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={handleEnter}
              className="w-full py-3 rounded-xl border border-slate-700 font-bold text-slate-300 hover:bg-slate-800 transition-colors relative"
            >
              {copy.pricing.plans.cadet.cta}
              {referrerInfo && (
                <span className="ml-2 text-amber-400 inline-flex items-center gap-1">
                  +50 <Coins className="h-4 w-4 inline" />
                </span>
              )}
            </button>
          </div>

          <div className="bg-indigo-900/20 border border-indigo-500/30 p-8 rounded-[2rem] relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {copy.pricing.plans.monthly.badge}
            </div>
            <h3 className="font-bold text-xl text-indigo-300 mb-2">{copy.pricing.plans.monthly.title}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-black text-white">{copy.pricing.plans.monthly.price}</span>
              <span className="text-slate-400 text-sm">{copy.pricing.plans.monthly.note}</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-indigo-100/80">
              {copy.pricing.plans.monthly.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <CheckCircle2 size={16} /> {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={handleEnter}
              className="w-full py-3 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 relative"
            >
              {copy.pricing.plans.monthly.cta}
              {referrerInfo && (
                <span className="ml-2 text-amber-300 inline-flex items-center gap-1">
                  +50 <Coins className="h-4 w-4 inline" />
                </span>
              )}
            </button>
          </div>

          <div className="bg-purple-900/20 border border-purple-500/30 p-8 rounded-[2rem]">
            <div className="inline-block bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded mb-2">
              {copy.pricing.plans.yearly.badge}
            </div>
            <h3 className="font-bold text-xl text-purple-300 mb-2">{copy.pricing.plans.yearly.title}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-black text-white">{copy.pricing.plans.yearly.price}</span>
              <span className="text-slate-400 text-sm">{copy.pricing.plans.yearly.note}</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-purple-100/80">
              {copy.pricing.plans.yearly.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <CheckCircle2 size={16} /> {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={handleEnter}
              className="w-full py-3 rounded-xl bg-purple-600 font-bold text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20 relative"
            >
              {copy.pricing.plans.yearly.cta}
              {referrerInfo && (
                <span className="ml-2 text-amber-300 inline-flex items-center gap-1">
                  +50 <Coins className="h-4 w-4 inline" />
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="px-6 py-12 border-y border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>{language === 'ru' ? 'SaaS / Mobile Gaming / EdTech' : language === 'es' ? 'SaaS / Juegos Móviles / EdTech' : 'SaaS / Mobile Gaming / EdTech'}</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            {language === 'ru' ? 
              'SkilyApp — это программная платформа с собственными играми, AI-технологиями и системой геймификации. Мы не продаем доступ к экзаменам или сертификаты. Все наши игры, алгоритмы и интерактивный опыт являются нашей собственной интеллектуальной собственностью.' :
              language === 'es' ?
              'SkilyApp es una plataforma de software con juegos propios, tecnologías de IA y sistema de gamificación. No vendemos acceso a exámenes ni certificados. Todos nuestros juegos, algoritmos y experiencia interactiva son nuestra propiedad intelectual.' :
              'SkilyApp is a software platform with proprietary games, AI technologies, and gamification system. We do not sell exam access or certificates. All our games, algorithms, and interactive experience are our own intellectual property.'
            }
          </p>
          <button
            onClick={() => navigate('/about')}
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
          >
            {language === 'ru' ? 'Подробнее о нас' : language === 'es' ? 'Más sobre nosotros' : 'Learn more about us'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <footer className="px-6 py-12 text-center text-slate-600 text-xs font-mono uppercase tracking-widest">
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
          {copy.footer.menu.map((item) => (
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white cursor-pointer transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <button
                key={item.label}
                onClick={() => navigate(item.href)}
                className="hover:text-white cursor-pointer transition-colors"
              >
                {item.label}
              </button>
            )
          ))}
        </div>
        <p>{copy.footer.note}</p>
      </footer>
    </div>
  );
};