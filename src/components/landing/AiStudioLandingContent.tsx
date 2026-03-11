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
import { LandingGameModesShowcase } from "./LandingGameModesShowcase";
import { LandingLogo } from "./LandingLogo";
import { useNavigate } from "react-router-dom";

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

      <div className="max-w-6xl mx-auto px-6 py-20">
        <SkilyComparisonCard copy={copy} />
      </div>

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

      <LandingGameModesShowcase language={language} />

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
