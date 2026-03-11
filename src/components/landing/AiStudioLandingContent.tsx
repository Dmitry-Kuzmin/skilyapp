import React, { useState, useEffect } from "react";
import { 
  Zap, Crown, Coins, Globe, Infinity as InfinityIcon, 
  Sparkles, Trophy, Swords, Target, Brain, 
  Rocket, MapPin, Heart, Headset, Users, 
  Landmark, School, FileText, Languages,
  CheckCircle, ChevronRight, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQItem } from "./FAQItem";
import { LandingGameModesShowcase } from "./LandingGameModesShowcase";
const LandingQuizDemo = React.lazy(() => import("./LandingQuizDemo").then(m => ({ default: m.LandingQuizDemo })));

interface Props {
  language: any;
  copy: any;
  DEMO_VARIANTS: any;
  handleEnter: () => void;
  faqContent: any;
}

export const AiStudioLandingContent: React.FC<Props> = ({ language, copy, DEMO_VARIANTS, handleEnter, faqContent }) => {
  const [demoVariantIndex, setDemoVariantIndex] = useState(0);
  const [shouldLoadQuizDemo, setShouldLoadQuizDemo] = useState(false);
  const quizDemoContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDemoVariantIndex(Math.floor(Math.random() * 3));
  }, []);

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
      {/* STATS STRIP */}
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

      {/* QUIZ DEMO */}
      <div ref={quizDemoContainerRef} className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-black text-center mb-12 text-white">
          {DEMO_VARIANTS[language][demoVariantIndex].title}
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

      {/* GAME MODES */}
      <LandingGameModesShowcase language={language} />

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
    </>
  );
};
