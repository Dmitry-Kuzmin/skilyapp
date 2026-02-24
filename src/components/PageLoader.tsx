import { useState, useEffect, useMemo } from 'react';
import { StartupCurtain } from "@/components/StartupCurtain";
import { useLanguage } from "@/contexts/LanguageContext";
import { loadingPhrasesByLang } from "@/data/loadingPhrases";

export const PageLoader = () => {
  const { language } = useLanguage();

  // Get phrases for current language, fallback to 'en'
  const basePhrases = useMemo(() => {
    return loadingPhrasesByLang[language] || loadingPhrasesByLang['en'];
  }, [language]);

  // Shuffle tips (all except the first one) and combine with the first phrase
  const phrases = useMemo(() => {
    const tips = basePhrases.slice(1).sort(() => Math.random() - 0.5);
    return [basePhrases[0], ...tips];
  }, [basePhrases]);

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setOpacity(0);

      setTimeout(() => {
        // Change text and fade in
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        setOpacity(1);
      }, 300);
    }, 3500);

    return () => clearInterval(interval);
  }, [phrases.length]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#09090b] flex flex-col items-center justify-center overflow-hidden">
      <StartupCurtain />

      {/* Эффект сетки - такой же как в index.html */}
      <div className="absolute inset-0 opacity-[0.1]" style={{
        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), 
                          linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}></div>

      {/* Радиальный градиент по центру */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(circle at center, transparent 0%, #09090b 80%)'
      }}></div>

      <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-sm px-6">
        <div className="relative flex flex-col items-center justify-center w-40 h-40">
          {/* Внутреннее свечение */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full" style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
            animation: 'pulse-glow 2s ease-in-out infinite'
          }}></div>

          {/* Логотип */}
          <div className="font-['Outfit',sans-serif] text-2xl font-black tracking-widest text-white relative z-10 
                        drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] flex gap-1">
            SKILY
          </div>

          {/* Круги загрузки вокруг логотипа */}
          <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_4s_linear_infinite]"
            style={{ borderTopColor: 'rgba(99, 102, 241, 0.5)', borderRightColor: 'rgba(99, 102, 241, 0.2)' }}></div>
          <div className="absolute inset-2 rounded-full border border-white/5 animate-[spin_3s_linear_infinite_reverse]"
            style={{ borderBottomColor: 'rgba(168, 85, 247, 0.5)', borderLeftColor: 'rgba(168, 85, 247, 0.2)' }}></div>
          <div className="absolute inset-4 rounded-full border border-dashed border-white/10 animate-[spin_5s_linear_infinite]"
            style={{ borderTopColor: 'rgba(255, 255, 255, 0.3)' }}></div>
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          <div
            className="font-['Outfit',sans-serif] text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase text-center min-h-[3em] flex items-center transition-opacity duration-500"
            style={{ opacity }}
          >
            {phrases[currentPhraseIndex]}
          </div>
          <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[progress-scan_1.5s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes progress-scan {
          0% { left: -33%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};


