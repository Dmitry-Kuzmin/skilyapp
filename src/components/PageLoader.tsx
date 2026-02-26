import { useState, useEffect } from 'react';
import { StartupCurtain } from "@/components/StartupCurtain";
import { loadingPhrasesByLang, LoadingPhrase } from "@/data/loadingPhrases";
import { motion, AnimatePresence, Motion } from '@/components/optimized/Motion';
import { Sparkles, Zap, Shield, Trophy, Clock, Target } from 'lucide-react';

const IconMap = {
  Sparkles: <Sparkles className="w-5 h-5 text-cyan-400" />,
  Zap: <Zap className="w-5 h-5 text-yellow-400" />,
  Shield: <Shield className="w-5 h-5 text-blue-400" />,
  Trophy: <Trophy className="w-5 h-5 text-purple-400" />,
  Clock: <Clock className="w-5 h-5 text-emerald-400" />,
  Target: <Target className="w-5 h-5 text-rose-400" />
};

export const PageLoader = () => {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app_language') || 'en';
    }
    return 'en';
  });

  const list: LoadingPhrase[] = loadingPhrasesByLang[language as keyof typeof loadingPhrasesByLang] || loadingPhrasesByLang['en'];

  const [currentPhrase, setCurrentPhrase] = useState(() => {
    return list[Math.floor(Math.random() * list.length)];
  });

  useEffect(() => {
    const currentList = loadingPhrasesByLang[language] || loadingPhrasesByLang['en'];
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => {
        let next = prev;
        while (next.text === prev.text && currentList.length > 1) {
          next = currentList[Math.floor(Math.random() * currentList.length)];
        }
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [language]);

  return (
    <Motion>
      <div className="fixed inset-0 z-[9999] bg-[#06080F] flex flex-col items-center justify-center overflow-hidden font-sans">
        <StartupCurtain />

        {/* Эффект сетки - такой же как в index.html */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), 
                                  linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>

        {/* Ambient Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-2xl px-6">

          {/* Cyber-Ring Animation Container */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center">
            {/* Ring 1 - Outer Slow */}
            <div className="absolute inset-0 rounded-full border border-white/5 border-t-indigo-500 animate-[spin_4s_linear_infinite]" />

            {/* Ring 2 - Inner Fast Reverse */}
            <div className="absolute inset-6 md:inset-8 rounded-full border border-white/5 border-b-purple-500 animate-[spin_2.5s_linear_infinite_reverse] shadow-[0_0_15px_rgba(168,85,247,0.1)]" />

            {/* Ring 3 - Dashed Core */}
            <div className="absolute inset-12 md:inset-16 outline outline-1 outline-dashed outline-white/10 rounded-full animate-[spin_10s_linear_infinite]" />

            {/* Logo & Status Text exactly in the middle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center z-10"
            >
              {/* Внутреннее свечение */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full" style={{
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
              }}></div>

              <span className="text-white/40 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase mb-2">
                Skily System
              </span>
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent mb-2" />
              <span className="text-white font-black text-2xl tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                SKILY
              </span>
            </motion.div>
          </div>

          {/* Rotating Skily Feature Tips */}
          <div className="relative h-24 w-full flex items-center justify-center -mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhrase.text}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
              >
                <div className="flex items-center gap-3 mb-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)]">
                  {IconMap[currentPhrase.icon as keyof typeof IconMap] || IconMap.Sparkles}
                  <span className="text-xs font-bold tracking-widest text-white/50 uppercase">
                    {language === 'ru' ? 'Секрет Skily' : (language === 'en' ? 'Skily Secret' : 'Secreto Skily')}
                  </span>
                </div>
                <p className="text-sm md:text-base text-white/80 max-w-md font-medium leading-relaxed drop-shadow-md">
                  {currentPhrase.text}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Cyber Decoration */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30">
          <div className="flex gap-1 mb-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
          <div className="text-[9px] font-mono tracking-[0.5em] text-white/50">
            S K I L Y  V 2 . 0
          </div>
        </div>
      </div>
    </Motion>
  );
};
