import React, { useState } from "react";
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
} from "lucide-react";
import { playClickSound, playEngineSound } from "@/services/audioService";
import { LandingLogo } from "./LandingLogo";
import { StartEngineButton } from "./StartEngineButton";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import {
  landingTranslations,
  LANGUAGE_OPTIONS,
} from "@/translations/landing";

interface AiStudioLandingProps {
  onRequestAccess: () => void;
}

export const AiStudioLanding: React.FC<AiStudioLandingProps> = ({
  onRequestAccess,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const { language, setLanguage } = useLanguage();
  const copy = landingTranslations[language];

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
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}
      ></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      <div className="fixed top-[-20%] left-[20%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <nav className="relative z-50 px-6 md:px-10 py-6 flex items-center justify-between max-w-[1400px] mx-auto gap-4 flex-wrap">
        <LandingLogo theme="dark" className="scale-90 origin-left" />
        <div className="flex items-center gap-3 flex-wrap justify-end ml-auto">
          <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
            <Smartphone size={16} />
            <button onClick={() => window.open("https://t.me/sdadimtutbot", "_blank")}>
              {copy.controls.telegramApp}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              {copy.controls.languageLabel}
            </span>
            <div className="flex items-center bg-slate-900/70 border border-slate-800/70 rounded-full p-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-400 shadow-[0_8px_30px_rgba(15,23,42,0.35)]">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  onClick={() => handleLanguageChange(option.code)}
                  className={`min-w-[36px] px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                    option.code === language
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleEnter}
            className="px-6 py-2.5 rounded-full bg-slate-800/50 border border-slate-700 text-sm font-bold text-slate-300 hover:bg-white hover:text-slate-900 transition-all duration-300 hover:scale-105"
          >
            {copy.controls.studentAccess}
          </button>
        </div>
      </nav>

      <section className="relative z-10 px-6 pt-12 pb-10 md:pt-20 md:pb-16 max-w-[1400px] mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-8 animate-fade-in relative z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          {copy.hero.badge}
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight md:tracking-tighter mb-6 md:mb-8 leading-[1.05] sm:leading-[0.95] animate-slide-up select-none drop-shadow-2xl text-balance max-w-4xl">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400 block pb-2">
            {copy.hero.titleTop}
          </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-indigo-400 via-violet-400 to-indigo-600 block pb-4">
            {copy.hero.titleBottom}
          </span>
        </h1>

        <p
          className="max-w-2xl text-lg md:text-xl text-slate-300 leading-relaxed mb-12 animate-slide-up font-medium"
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
              <div className="text-3xl sm:text-4xl font-black text-white mb-2 leading-tight">
                {stat.value}
              </div>
              <p className="text-indigo-300 font-semibold uppercase tracking-[0.2em] text-xs">
                {stat.label}
              </p>
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
            <div className="text-5xl font-black text-white mb-2">
              {copy.ecosystem.cards.totalQuestions}
            </div>
            <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs">
              {copy.stats[1].label}
            </p>
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

        <div className="relative overflow-x-auto rounded-[2.5rem] border border-slate-800 shadow-2xl">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"></div>
          <table className="w-full relative text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="py-6 px-8 text-xs font-bold uppercase tracking-widest text-slate-500 w-1/3">
                  {copy.comparison.featureLabel}
                </th>
                <th className="py-6 px-8 text-xs font-bold uppercase tracking-widest text-rose-400 w-1/3 text-center">
                  {copy.comparison.traditional}
                </th>
                <th className="py-6 px-8 text-xs font-bold uppercase tracking-widest text-indigo-400 w-1/3 text-center bg-indigo-500/5">
                  {copy.comparison.skily}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {copy.comparison.rows.map((row, index) => (
                <tr
                  key={row.feature}
                  className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors"
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
                      <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none"></div>
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
              className="w-full py-3 rounded-xl border border-slate-700 font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {copy.pricing.plans.cadet.cta}
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
              className="w-full py-3 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
            >
              {copy.pricing.plans.monthly.cta}
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
              className="w-full py-3 rounded-xl bg-purple-600 font-bold text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20"
            >
              {copy.pricing.plans.yearly.cta}
            </button>
          </div>
        </div>
      </section>

      <footer className="px-6 py-12 border-t border-slate-800/50 text-center text-slate-600 text-xs font-mono uppercase tracking-widest">
        <div className="flex justify-center gap-6 mb-8">
          {copy.footer.menu.map((item) => (
            <span key={item} className="hover:text-white cursor-pointer transition-colors">
              {item}
            </span>
          ))}
        </div>
        <p>{copy.footer.note}</p>
      </footer>
    </div>
  );
};
