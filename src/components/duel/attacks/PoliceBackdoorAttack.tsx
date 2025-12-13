import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ChevronRight } from 'lucide-react';

interface PoliceBackdoorProps {
  isActive: boolean;
  onUnlock: () => void; // Вызывается, когда юзер прошел капчу
}

export const PoliceBackdoorAttack: React.FC<PoliceBackdoorProps> = ({ isActive, onUnlock }) => {
  const [sliderValue, setSliderValue] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Сброс при новой атаке
  useEffect(() => {
    if (isActive) {
      setSliderValue(0);
      setIsUnlocked(false);
      // Тут можно запустить звук сирены
    }
  }, [isActive]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSliderValue(val);
    
    // Если дотянул до конца (90%+)
    if (val > 90 && !isUnlocked) {
      setIsUnlocked(true);
      // Вибрация успеха
      if (navigator.vibrate) navigator.vibrate(50);
      
      // Небольшая задержка перед разблокировкой для анимации
      setTimeout(() => {
        onUnlock();
      }, 300);
    }
  };

  return (
    <AnimatePresence>
      {isActive && !isUnlocked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-blue-950/90 backdrop-blur-md p-6"
        >
          {/* Мигалка */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-transparent to-blue-500 animate-pulse" />
          
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mb-8"
          >
            <ShieldAlert className="w-24 h-24 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
          </motion.div>

          <h2 className="text-3xl font-black text-white text-center uppercase tracking-widest mb-2">
            Police Raid
          </h2>
          <p className="text-blue-200 text-center mb-12 font-mono text-sm">
            Обнаружена подозрительная активность. <br/> Предъявите документы для продолжения.
          </p>

          {/* Слайдер Капчи */}
          <div className="relative w-full max-w-xs h-14 bg-black/50 rounded-full border border-white/20 overflow-hidden shadow-inner">
            {/* Текст внутри */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white/30 font-bold uppercase text-xs tracking-widest animate-pulse">
                Свайп для разблокировки
              </span>
            </div>

            {/* Заполненная часть */}
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-75 ease-out opacity-80"
              style={{ width: `${sliderValue}%` }}
            />

            {/* Ползунок (Input Range) - невидимый, но функциональный */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {/* Визуальная кнопка ползунка */}
            <div 
              className="absolute top-1 bottom-1 w-12 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-none transition-all duration-75 ease-out"
              style={{ left: `calc(${sliderValue}% - ${sliderValue * 0.48}px)` }} // Корректировка позиции
            >
              <ChevronRight className="text-black w-6 h-6" />
            </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

