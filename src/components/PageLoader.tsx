import { useState, useEffect } from 'react';
import { StartupCurtain } from "@/components/StartupCurtain";
import { loadingPhrasesByLang, LoadingPhrase } from "@/data/loadingPhrases";
import { motion, AnimatePresence, Motion } from '@/components/optimized/Motion';
import { Sparkles, Zap, Shield, Trophy, Clock, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';

const IconMap = {
  Sparkles: <Sparkles className="w-5 h-5 text-cyan-400" />,
  Zap: <Zap className="w-5 h-5 text-yellow-400" />,
  Shield: <Shield className="w-5 h-5 text-blue-500" />,
  Trophy: <Trophy className="w-5 h-5 text-blue-400" />,
  Clock: <Clock className="w-5 h-5 text-slate-400" />,
  Target: <Target className="w-5 h-5 text-blue-600" />
};

export const PageLoader = () => {
  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

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
      <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-500 ${isDark ? 'bg-[#06080F]' : 'bg-slate-50'}`}>
        <StartupCurtain />

        {/* Эффект сетки */}
        <div className={`absolute inset-0 ${isDark ? 'opacity-[0.05]' : 'opacity-[0.03]'}`} style={{
          backgroundImage: isDark 
            ? `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`
            : `linear-gradient(to right, rgba(15, 23, 42, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>

        {/* Ambient Background Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full blur-[100px] pointer-events-none transition-colors duration-700 ${isDark ? 'bg-blue-500/10' : 'bg-blue-500/5'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full blur-[80px] pointer-events-none transition-colors duration-700 ${isDark ? 'bg-slate-500/10' : 'bg-slate-500/5'}`} />

        <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-2xl px-6">

          {/* Cyber-Ring Animation Container */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center">
            {/* Ring 1 - Outer Slow */}
            <div className={`absolute inset-0 rounded-full border border-t-blue-500 animate-[spin_4s_linear_infinite] ${isDark ? 'border-white/5' : 'border-slate-900/5'}`} />

            {/* Ring 2 - Inner Fast Reverse */}
            <div className={`absolute inset-6 md:inset-8 rounded-full border border-b-blue-600 animate-[spin_2.5s_linear_infinite_reverse] ${isDark ? 'border-white/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-slate-900/5 shadow-[0_0_15px_rgba(37,99,235,0.05)]'}`} />

            {/* Ring 3 - Dashed Core */}
            <div className={`absolute inset-12 md:inset-16 outline outline-1 outline-dashed rounded-full animate-[spin_10s_linear_infinite] ${isDark ? 'outline-white/10' : 'outline-slate-900/10'}`} />

            {/* Logo & Status Text exactly in the middle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center z-10"
            >
              {/* Внутреннее свечение */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full" style={{
                background: isDark 
                  ? 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 70%)'
                  : 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0) 70%)',
              }}></div>

              <span className={`text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase mb-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                {t('pageLoader.system')}
              </span>
              <div className={`h-px w-12 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mb-2`} />
              <span className={`font-black text-2xl tracking-[0.2em] uppercase ${isDark ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'text-slate-900'}`}>
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
                <div className={`flex items-center gap-3 mb-3 px-4 py-1.5 rounded-full border shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-900/5 border-slate-900/10'}`}>
                  {IconMap[currentPhrase.icon as keyof typeof IconMap] || IconMap.Sparkles}
                  <span className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    {t('pageLoader.secret')}
                  </span>
                </div>
                <p className={`text-sm md:text-base max-w-md font-medium leading-relaxed drop-shadow-md ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                  {currentPhrase.text}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Cyber Decoration */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30">
          <div className="flex gap-1 mb-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
          <div className={`text-[9px] font-mono tracking-[0.5em] ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
            S K I L Y  V 2 . 0
          </div>
        </div>
      </div>
    </Motion>
  );
};

