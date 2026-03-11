import React, { useState, useEffect } from "react";
import { 
  Zap, Crown, Coins, Globe, Infinity as InfinityIcon, 
  Sparkles, Trophy, Swords, Target, Brain, 
  Rocket, MapPin, Heart, Headset, Users, 
  Landmark, School, FileText, Languages,
  CheckCircle, ChevronRight, ArrowRight,
  CheckCircle2, Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQItem } from "./FAQItem";
import { LandingLogo } from "./LandingLogo";
import { useNavigate } from "react-router-dom";
const InfiniteMarquee = React.lazy(() => import("./InfiniteMarquee").then(m => ({ default: m.InfiniteMarquee })));
const LandingGameModesShowcase = React.lazy(() => import("./LandingGameModesShowcase").then(m => ({ default: m.LandingGameModesShowcase })));
const LandingQuizDemo = React.lazy(() => import("./LandingQuizDemo").then(m => ({ default: m.LandingQuizDemo })));

interface Props {
  language: any;
  copy: any;
  DEMO_VARIANTS: any;
  handleEnter: () => void;
  faqContent: any;
  referrerInfo: any;
  setIsPartnershipOpen: (val: boolean) => void;
}

const SkilyComparisonCard = ({ copy }: { copy: any }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      onMouseMove={handleSpotlightMove}
      className="relative bg-slate-900/40 backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_60px_-10px_rgba(99,102,241,0.3),inset_0_0_30px_rgba(255,255,255,0.03)] overflow-hidden transition-all duration-300 group"
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2.5rem]"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.15), transparent 40%)`
        }}
      />
      <h3 className="relative z-10 text-2xl font-black text-white text-center uppercase tracking-widest mb-10 flex items-center justify-center gap-3">
        {copy.comparison.skily} <Crown size={24} className="text-amber-400" />
      </h3>
      <div className="text-center relative">
        <div className="text-6xl font-black text-white">{copy.comparison.rows[0].skily}</div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full mt-4 border border-emerald-500/20">
          <Zap size={12} className="fill-current" /> SAVE 95%
        </div>
      </div>
      <div className="w-1/2 mx-auto border-t border-white/10 my-8"></div>
      <div className="space-y-8 px-2 relative z-10">
        {copy.comparison.rows.slice(1).map((row: any, i: number) => (
          <div key={i} className="flex flex-col items-center text-center">
            <span className="flex items-center gap-3 text-white font-black text-xl">
              {row.skily} <CheckCircle size={24} className="text-indigo-400" />
            </span>
            {row.skilyDesc && <span className="text-sm font-medium text-indigo-100/80 mt-1.5">{row.skilyDesc}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export const AiStudioLandingContent: React.FC<Props> = ({ 
  language, copy, DEMO_VARIANTS, handleEnter, faqContent, referrerInfo, setIsPartnershipOpen 
}) => {
  const [demoVariantIndex, setDemoVariantIndex] = useState(0);
  const [shouldLoadQuizDemo, setShouldLoadQuizDemo] = useState(false);
  const quizDemoContainerRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (DEMO_VARIANTS && DEMO_VARIANTS[language]) {
      setDemoVariantIndex(Math.floor(Math.random() * DEMO_VARIANTS[language].length));
    }
  }, [language, DEMO_VARIANTS]);

  useEffect(() => {
    if (!quizDemoContainerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoadQuizDemo) {
            setShouldLoadQuizDemo(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0, rootMargin: '600px' }
    );
    observer.observe(quizDemoContainerRef.current);
    return () => observer.disconnect();
  }, [shouldLoadQuizDemo]);

  return (
    <>
      <section className="relative z-20 border-y border-white/5 bg-slate-900/30 backdrop-blur-sm shadow-xl mt-8">
        <div className="max-w-[1400px] mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 divide-x divide-white/10">
            {copy.stats.map((stat: any) => (
              <div key={stat.label} className="flex flex-col items-center text-center md:px-8">
                <div className="text-4xl md:text-5xl font-black text-white mb-2">{stat.value}</div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{stat.label}</span>
                <p className="text-[10px] md:text-xs text-slate-500 font-medium max-w-[200px] mx-auto mt-1">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-20 group">
        <SkilyComparisonCard copy={copy} />
      </div>

      {/* ECOSYSTEM SECTION */}
      <section className="px-6 py-24 max-w-[1400px] mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-white">{copy.ecosystem.title}</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">{copy.ecosystem.description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] hover:border-indigo-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
              <FileText className="text-indigo-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">{copy.ecosystem.cards.totalQuestions}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{copy.ecosystem.cards.totalQuestionsDescription}</p>
          </div>
          <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] hover:border-indigo-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-6">
              <Globe className="text-sky-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">{copy.ecosystem.cards.categoriesTitle}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{copy.ecosystem.cards.categoriesDescription}</p>
          </div>
          <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] hover:border-indigo-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
              <Target className="text-emerald-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">{copy.ecosystem.cards.simulationTitle}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{copy.ecosystem.cards.simulationDescription}</p>
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section className="relative px-6 py-24 max-w-[1400px] mx-auto overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
              {copy.aiSection.poweredBy}
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">{copy.aiSection.title}</h2>
            <p className="text-slate-400 text-lg leading-relaxed">{copy.aiSection.description}</p>
            <ul className="space-y-4">
              {copy.aiSection.bullets.map((b: string, i: number) => (
                <li key={i} className="flex gap-3 text-slate-200 font-medium">
                  <div className="mt-1 w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="text-indigo-400" size={12} />
                  </div>
                  {b}
                </li>
              ))}
            </ul>
            <div className="pt-4">
              <button 
                 onClick={handleEnter}
                 className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20"
              >
                {copy.controls.studentAccess}
              </button>
            </div>
          </div>
          <div className="flex-1 w-full lg:w-auto">
             <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-8 md:p-12 rounded-[3rem] shadow-2xl relative">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
                <div className="space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                         <Brain className="text-white" size={28} />
                      </div>
                      <div>
                         <h4 className="text-white font-black text-xl">{copy.aiSection.challengeBank}</h4>
                         <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Powered by Gemini</p>
                      </div>
                   </div>
                   <p className="text-slate-300 leading-relaxed">{copy.aiSection.challengeBankDescription}</p>
                   <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                      <div className="flex -space-x-2">
                         {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800"></div>)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1,200+ active sessions</span>
                   </div>
                </div>
             </div>

              {/* TELEGRAM MINI APP CARD */}
              <div className="mt-8 bg-gradient-to-br from-indigo-600/20 to-sky-600/20 backdrop-blur-xl border border-white/5 p-8 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Zap size={80} className="text-white" />
                 </div>
                 <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                          <Rocket className="text-white" size={20} />
                       </div>
                       <h4 className="text-white font-black text-lg">{copy.aiSection.telegramTitle}</h4>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-sm">{copy.aiSection.telegramDescription}</p>
                    <a 
                      href="https://t.me/skilyapp_bot" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest hover:gap-3 transition-all"
                    >
                      {copy.aiSection.telegramCTA} <ArrowRight size={14} />
                    </a>
                 </div>
              </div>
           </div>
        </div>
      </section>

      <div ref={quizDemoContainerRef} className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-black text-center mb-12 text-white">
          {DEMO_VARIANTS[language]?.[demoVariantIndex]?.title || copy?.hero?.titleBottom}
        </h2>
        {shouldLoadQuizDemo && (
          <React.Suspense fallback={<div className="h-[600px] flex items-center justify-center"><Sparkles className="animate-spin text-indigo-500" /></div>}>
            <LandingQuizDemo 
              language={language === 'es' ? 'es' : language === 'ru' ? 'ru' : 'en'} 
              onRegisterClick={handleEnter} 
            />
          </React.Suspense>
        )}
      </div>

      <React.Suspense fallback={<div className="h-[400px]" />}>
        <LandingGameModesShowcase language={language} />
      </React.Suspense>

      {/* ARENA GAMES GRID */}
      <section className="px-6 py-24 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">{copy.arena.gamesTitle}</h2>
            <p className="text-slate-400">{copy.arena.bannerDescription}</p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            {copy.arena.onlineText}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {copy.arena.games.map((game: any, i: number) => (
            <div key={i} className="group p-8 rounded-[2.5rem] bg-slate-900/40 border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
               <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {i === 0 && <Rocket className="text-indigo-400" size={28} />}
                  {i === 1 && <Swords className="text-indigo-400" size={28} />}
                  {i === 2 && <Target className="text-indigo-400" size={28} />}
                  {i === 3 && <Brain className="text-indigo-400" size={28} />}
               </div>
               <h3 className="text-xl font-bold text-white mb-3">{game.title}</h3>
               <p className="text-slate-400 text-sm leading-relaxed">{game.description}</p>
            </div>
          ))}
        </div>
      </section>

      <React.Suspense fallback={<div className="h-[200px]" />}>
        <InfiniteMarquee />
      </React.Suspense>

      {/* PRICING PLANS */}
      <section className="px-6 py-24 max-w-[1400px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{copy.pricing.title}</h2>
          <p className="text-slate-400">{copy.pricing.description}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
          {Object.entries(copy.pricing.plans).map(([key, plan]: [string, any]) => {
            const isHighlighted = key === 'biannual';
            return (
              <div key={key} className={cn(
                "flex flex-col p-6 rounded-[2rem] transition-all duration-300 relative group",
                isHighlighted ? "bg-indigo-900/40 border-2 border-indigo-500 scale-[1.03] z-10" : "bg-[#11141D] border border-white/5"
              )}>
                <h3 className="font-black text-lg mb-2 text-indigo-300">{plan.title}</h3>
                <div className="text-2xl font-black text-white mb-6">{plan.price}</div>
                <ul className="space-y-3 mb-8 text-xs flex-grow">
                  {plan.features.map((f: string) => (
                    <li key={f} className="flex gap-2 text-slate-300">
                      <CheckCircle2 size={14} className="shrink-0 text-indigo-400" />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={handleEnter} className="w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white">
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 px-6 py-24 max-w-[1400px] mx-auto">
        <h2 className="text-3xl md:text-5xl font-black text-white text-center mb-16">{faqContent[language].sectionTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faqContent[language].categories.flatMap((cat: any) =>
            cat.questions.map((q: any) => ({ ...q, category: cat.title }))
          ).map((item: any, idx: number) => (
            <FAQItem key={idx} question={item.q} answer={item.a} icon={item.icon} category={item.category} />
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-800 bg-[#0f172a] pt-16 pb-8">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <LandingLogo theme="dark" variant="bold" />
              <p className="text-slate-400 text-sm mt-6 max-w-sm">
                First driver training platform with AI, gamification and PvP duels.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Product</h4>
              <ul className="space-y-4">
                {copy.footer.menu.filter((m: any) => !m.href.includes('/legal/')).map((item: any) => (
                  <li key={item.label}>
                    <button onClick={() => item.href === '#partnership' ? setIsPartnershipOpen(true) : navigate(item.href)} className="text-slate-400 hover:text-white text-sm">
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Legal</h4>
              <ul className="space-y-4">
                {copy.footer.menu.filter((m: any) => m.href.includes('/legal/')).map((item: any) => (
                  <li key={item.label}>
                    <button onClick={() => navigate(item.href)} className="text-slate-400 hover:text-white text-sm">
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-slate-500 text-xs text-center uppercase tracking-widest">
            {copy.footer.note}
          </div>
        </div>
      </footer>
    </>
  );
};
