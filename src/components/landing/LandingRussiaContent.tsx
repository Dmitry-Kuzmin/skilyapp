import React, { useState, useEffect } from "react";
import { 
  Zap, Crown, Coins, Globe, Infinity as InfinityIcon, 
  Sparkles, Trophy, Swords, Target, Brain, 
  Rocket, MapPin, Heart, Headset, Users, 
  Landmark, School, FileText, Languages,
  CheckCircle, ChevronRight, ArrowRight,
  Trophy as TrophyIcon, Timer, Star, Gift, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQItem } from "./FAQItem";
const LandingQuizDemo = React.lazy(() => import("./LandingQuizDemo").then(m => ({ default: m.LandingQuizDemo })));
const LandingDuelPassSection = React.lazy(() => import('./LandingDuelPassSection').then(module => ({ default: module.LandingDuelPassSection })));
import { PartnershipExpansionPortal } from "./PartnershipExpansionPortal";

interface Props {
  language: any;
  copy: any;
  DEMO_VARIANTS: any;
  demoVariantIndex: number;
  faqContent: any;
  selectedCountry: any;
  isPartnershipOpen: boolean;
  setIsPartnershipOpen: (val: boolean) => void;
  navigate: (path: string) => void;
  handleEnter: () => void;
}

export const LandingRussiaContent: React.FC<Props> = ({ 
  language, copy, DEMO_VARIANTS, demoVariantIndex, 
  faqContent, selectedCountry, isPartnershipOpen, 
  setIsPartnershipOpen, navigate, handleEnter 
}) => {
  const [shouldLoadQuizDemo, setShouldLoadQuizDemo] = useState(false);
  const quizDemoContainerRef = React.useRef<HTMLDivElement>(null);
  const [shouldLoadDemo, setShouldLoadDemo] = useState(false);
  const demoContainerRef = React.useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!demoContainerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoadDemo) {
            setShouldLoadDemo(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0, rootMargin: '600px' }
    );
    observer.observe(demoContainerRef.current);
    return () => observer.disconnect();
  }, [shouldLoadDemo]);

  return (
    <>
      {/* TRUST STRIP */}
      <section className="relative z-20 border-y border-white/5 bg-slate-900/30 backdrop-blur-sm shadow-xl mt-8">
        <div className="max-w-[1400px] mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {copy.stats.map((stat: any) => (
              <div key={stat.label} className="flex flex-col items-center justify-center text-center md:px-8 py-4 md:py-0">
                <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-2">
                  {stat.value}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    {stat.label}
                  </span>
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium max-w-[200px] mx-auto leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE DEMO */}
      <section className="relative z-10 px-6 py-20 md:py-32 max-w-[1400px] mx-auto overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen"></div>

        <div className="relative z-10 text-center mb-16 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            LIVE DEMO
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
            {DEMO_VARIANTS[language][demoVariantIndex].title}
          </h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            {DEMO_VARIANTS[language][demoVariantIndex].text}
          </p>
        </div>

        <div ref={quizDemoContainerRef} className="relative z-10 max-w-5xl mx-auto rounded-[2.5rem] bg-slate-900/50 backdrop-blur-xl border border-white/10 p-4 md:p-8 min-h-[500px]">
          {shouldLoadQuizDemo && (
            <React.Suspense fallback={<div className="h-[500px] flex items-center justify-center"><Sparkles className="animate-spin text-indigo-500" /></div>}>
              <LandingQuizDemo />
            </React.Suspense>
          )}
        </div>
      </section>

      {/* DUEL PASS SECTION */}
      <section ref={demoContainerRef}>
        {shouldLoadDemo && (
          <React.Suspense fallback={<div className="h-[600px]" />}>
            <LandingDuelPassSection language={language} onRequestAccess={handleEnter} />
          </React.Suspense>
        )}
      </section>

      {/* FAQ SECTION */}
      <section className="relative z-10 px-6 py-24 max-w-[1400px] mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
            {faqContent[language].sectionTitle}
          </h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
            {faqContent[language].sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faqContent[language].categories.flatMap((cat: any) =>
            cat.questions.map((q: any) => ({ ...q, category: cat.title }))
          ).map((item: any, idx: number) => (
            <FAQItem
              key={idx}
              question={item.q}
              answer={item.a}
              icon={item.icon}
              category={item.category}
            />
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-800 bg-[#0f172a] py-16">
        <div className="max-w-[1400px] mx-auto px-6 text-center text-slate-500 text-sm">
           <p>© {new Date().getFullYear()} SkilyApp. All rights reserved.</p>
        </div>
      </footer>

      <PartnershipExpansionPortal
        isOpen={isPartnershipOpen}
        onClose={() => setIsPartnershipOpen(false)}
      />
    </>
  );
};
