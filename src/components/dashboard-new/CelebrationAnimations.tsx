import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Trophy, Sparkles, Star, Award, Zap, Crown, Flame } from 'lucide-react';
import { 
  playLevelUpSound, 
  playSuccessSound, 
  playCelebrationSound,
  playCelebrationSoundFanfare,
  playCelebrationSoundBells,
  playCelebrationSoundSynth,
  playCelebrationSoundOrchestral,
  playCelebrationSoundPop
} from '@/services/audioService';
import { sounds } from '@/lib/sounds';

export type CelebrationType = 
  | 'confetti' 
  | 'fireworks' 
  | 'stars' 
  | 'burst' 
  | 'sparkles' 
  | 'trophy' 
  | 'gradient' 
  | 'particles'
  | 'mega-burst'
  | 'galaxy'
  | 'rainbow'
  | 'champion'
  | 'victory-fanfare'
  | 'explosion'
  | 'cosmic'
  | 'golden-rain'
  | 'diamond-shower'
  | 'phoenix'
  | 'supernova';

export type CelebrationSoundType = 
  | 'default'      // Триумфальный аккорд
  | 'fanfare'      // Фанфары
  | 'bells'        // Колокола
  | 'synth'        // Электронный синтезатор
  | 'orchestral'   // Оркестровый финал
  | 'pop';         // Поп-конфетти

interface CelebrationAnimationsProps {
  type: CelebrationType;
  show: boolean;
  onComplete?: () => void;
  duration?: number;
  withSound?: boolean;
  soundType?: CelebrationSoundType;
  fullScreen?: boolean;
  message?: string;
}

/**
 * Компонент с различными типами анимаций поздравления
 * 
 * Варианты:
 * - confetti: Классическое конфетти (уже используется)
 * - fireworks: Фейерверк с частицами
 * - stars: Звезды, разлетающиеся от центра
 * - burst: Взрыв частиц от центра
 * - sparkles: Искры вокруг элемента
 * - trophy: Анимация трофея с частицами
 * - gradient: Градиентная волна
 * - particles: Частицы с физикой
 */
// Рекомендуемые длительности для разных типов анимаций
const getRecommendedDuration = (type: CelebrationType): number => {
  switch (type) {
    case 'confetti':
    case 'pop':
      return 3000; // 3 секунды - короткие
    case 'sparkles':
    case 'gradient':
      return 4000; // 4 секунды
    case 'fireworks':
    case 'burst':
    case 'stars':
    case 'particles':
      return 6000; // 6 секунд - средние
    case 'trophy':
    case 'champion':
    case 'victory-fanfare':
      return 7000; // 7 секунд
    case 'mega-burst':
    case 'explosion':
    case 'rainbow':
      return 8000; // 8 секунд
    case 'phoenix':
      return 8000; // 8 секунд - эпичная трансформация
    case 'galaxy':
    case 'cosmic':
    case 'golden-rain':
    case 'diamond-shower':
      return 7000; // 7 секунд
    case 'supernova':
      return 10000; // 10 секунд - самый эпичный!
    default:
      return 6000; // 6 секунд по умолчанию
  }
};

export const CelebrationAnimations: React.FC<CelebrationAnimationsProps> = ({
  type,
  show,
  onComplete,
  duration, // Если не указана, используем рекомендуемую
  withSound = true,
  soundType = 'fanfare', // По умолчанию фанфары
  fullScreen = true
}) => {
  // Используем рекомендуемую длительность, если не указана
  const finalDuration = duration || getRecommendedDuration(type);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Звуковые эффекты
  useEffect(() => {
    if (show && withSound) {
      // Выбираем звук по soundType
      switch (soundType) {
        case 'fanfare':
          playCelebrationSoundFanfare();
          break;
        case 'bells':
          playCelebrationSoundBells();
          break;
        case 'synth':
          playCelebrationSoundSynth();
          break;
        case 'orchestral':
          playCelebrationSoundOrchestral();
          break;
        case 'pop':
          playCelebrationSoundPop();
          break;
        case 'default':
        default:
          playCelebrationSound();
          break;
      }

      // Дополнительные звуки для особых анимаций
      switch (type) {
        case 'victory-fanfare':
        case 'champion':
        case 'trophy':
        case 'supernova':
          sounds.victory();
          playLevelUpSound();
          break;
        case 'fireworks':
        case 'mega-burst':
        case 'explosion':
        case 'phoenix':
          sounds.confetti();
          playSuccessSound();
          break;
        case 'galaxy':
        case 'cosmic':
        case 'rainbow':
          sounds.victory();
          break;
        default:
          sounds.victory();
          playSuccessSound();
      }
    }
  }, [show, withSound, type, soundType]);

  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, finalDuration);
      return () => clearTimeout(timer);
    }
  }, [show, finalDuration, onComplete]);

  if (!show) return null;

  switch (type) {
    case 'confetti':
      return (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}
        />
      );

    case 'fireworks':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={300}
            gravity={0.2}
            initialVelocityY={-20}
            initialVelocityX={5}
            colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']}
          />
          {/* Дополнительные частицы фейерверка */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${50 + (Math.random() - 0.5) * 20}%`,
                top: `${50 + (Math.random() - 0.5) * 20}%`,
                background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'][i % 4],
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.05,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      );

    case 'stars':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {[...Array(100)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
              }}
              initial={{ scale: 0, opacity: 1, rotate: 0 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
                x: (Math.cos((i / 100) * Math.PI * 2) * 500),
                y: (Math.sin((i / 100) * Math.PI * 2) * 500),
                rotate: 720,
              }}
              transition={{
                duration: 3,
                delay: i * 0.03,
                ease: 'easeOut',
              }}
            >
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            </motion.div>
          ))}
        </div>
      );

    case 'burst':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                background: `hsl(${i * 12}, 70%, 60%)`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
                x: (Math.cos((i / 30) * Math.PI * 2) * 250),
                y: (Math.sin((i / 30) * Math.PI * 2) * 250),
              }}
              transition={{
                duration: 1.2,
                delay: i * 0.03,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      );

    case 'sparkles':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${50 + (Math.random() - 0.5) * 30}%`,
                top: `${50 + (Math.random() - 0.5) * 30}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.2, 0],
                opacity: [0, 1, 0],
                rotate: 360,
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.05,
                repeat: 1,
                ease: 'easeInOut',
              }}
            >
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </motion.div>
          ))}
        </div>
      );

    case 'trophy':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative"
          >
            <Trophy className="w-32 h-32 text-yellow-400 fill-yellow-400" />
            {/* Частицы вокруг трофея */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-yellow-400"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                  x: (Math.cos((i / 20) * Math.PI * 2) * 100),
                  y: (Math.sin((i / 20) * Math.PI * 2) * 100),
                }}
                transition={{
                  duration: 1,
                  delay: 0.3 + i * 0.05,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        </div>
      );

    case 'gradient':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0, 0.5, 0],
              scale: [0.8, 1.2, 1.5],
            }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
          {/* Волны */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 border-4 border-yellow-400/30 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{
                scale: [0, 3],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: 2,
                delay: i * 0.3,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      );

    case 'particles':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {[...Array(100)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-yellow-400"
              style={{
                left: `${50 + (Math.random() - 0.5) * 10}%`,
                top: `${50 + (Math.random() - 0.5) * 10}%`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, Math.random() * 2 + 0.5, 0],
                opacity: [1, 1, 0],
                x: (Math.random() - 0.5) * 500,
                y: (Math.random() - 0.5) * 500,
              }}
              transition={{
                duration: Math.random() * 1 + 1,
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      );

    case 'mega-burst':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] bg-black/20">
          {/* Множественные взрывы */}
          {[...Array(5)].map((_, burstIndex) => (
            <div key={burstIndex} className="absolute" style={{ left: `${20 + burstIndex * 20}%`, top: `${20 + burstIndex * 15}%` }}>
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-4 h-4 rounded-full"
                  style={{
                    background: `hsl(${(burstIndex * 72 + i * 7) % 360}, 100%, 60%)`,
                    boxShadow: `0 0 20px hsl(${(burstIndex * 72 + i * 7) % 360}, 100%, 60%)`,
                  }}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 2, 0],
                    opacity: [1, 1, 0],
                    x: (Math.cos((i / 50) * Math.PI * 2) * 400),
                    y: (Math.sin((i / 50) * Math.PI * 2) * 400),
                  }}
                  transition={{
                    duration: 2,
                    delay: burstIndex * 0.3 + i * 0.02,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );

    case 'galaxy':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-black/50">
          {/* Спиральная галактика */}
          {[...Array(200)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                background: `hsl(${i * 2 % 360}, 100%, ${50 + (i % 3) * 20}%)`,
                boxShadow: `0 0 10px hsl(${i * 2 % 360}, 100%, 60%)`,
              }}
              initial={{ scale: 0, opacity: 0, rotate: 0 }}
              animate={{
                scale: [0, 1.5, 0.8, 0],
                opacity: [0, 1, 1, 0],
                rotate: 720,
                x: (Math.cos((i / 200) * Math.PI * 4 + i * 0.1) * (200 + i * 2)),
                y: (Math.sin((i / 200) * Math.PI * 4 + i * 0.1) * (200 + i * 2)),
              }}
              transition={{
                duration: 3,
                delay: i * 0.01,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      );

    case 'rainbow':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {/* Радужные волны */}
          {[...Array(7)].map((_, waveIndex) => (
            <motion.div
              key={waveIndex}
              className="absolute inset-0"
              style={{
                background: `conic-gradient(from ${waveIndex * 45}deg, 
                  hsl(${waveIndex * 60}, 100%, 50%), 
                  hsl(${(waveIndex * 60 + 60) % 360}, 100%, 50%), 
                  hsl(${(waveIndex * 60 + 120) % 360}, 100%, 50%))`,
                opacity: 0.3,
              }}
              initial={{ scale: 0, rotate: 0 }}
              animate={{
                scale: [0, 2, 3],
                rotate: 360,
                opacity: [0.3, 0.6, 0],
              }}
              transition={{
                duration: 2.5,
                delay: waveIndex * 0.2,
                ease: 'easeOut',
              }}
            />
          ))}
          {/* Радужные частицы */}
          {[...Array(150)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                background: `hsl(${i * 2.4 % 360}, 100%, 60%)`,
                boxShadow: `0 0 15px hsl(${i * 2.4 % 360}, 100%, 60%)`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
                x: (Math.cos((i / 150) * Math.PI * 2) * 600),
                y: (Math.sin((i / 150) * Math.PI * 2) * 600),
              }}
              transition={{
                duration: 2,
                delay: i * 0.01,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      );

    case 'champion':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center bg-gradient-to-br from-yellow-900/40 via-orange-900/40 to-red-900/40">
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], rotate: [0, 10, -10, 0], opacity: 1 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, duration: 1 }}
            className="relative"
          >
            <Crown className="w-40 h-40 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" />
            {/* Золотые частицы */}
            {[...Array(100)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-yellow-400"
                style={{
                  left: '50%',
                  top: '50%',
                  boxShadow: '0 0 10px #FFD700',
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0],
                  x: (Math.cos((i / 100) * Math.PI * 2) * 300),
                  y: (Math.sin((i / 100) * Math.PI * 2) * 300),
                }}
                transition={{
                  duration: 2,
                  delay: 0.5 + i * 0.02,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        </div>
      );

    case 'victory-fanfare':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-pink-900/30">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
            transition={{ type: 'spring', stiffness: 150, damping: 12, duration: 1 }}
            className="relative"
          >
            <Trophy className="w-48 h-48 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_40px_rgba(251,191,36,1)]" />
            {/* Фанфары - множественные взрывы */}
          </motion.div>
          {[...Array(3)].map((_, burstIndex) => (
            <div key={burstIndex} className="absolute" style={{ left: `${30 + burstIndex * 20}%`, top: `${30 + burstIndex * 20}%` }}>
              {[...Array(60)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: `hsl(${(burstIndex * 120 + i * 6) % 360}, 100%, 60%)`,
                    boxShadow: `0 0 20px hsl(${(burstIndex * 120 + i * 6) % 360}, 100%, 60%)`,
                  }}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 2, 0],
                    opacity: [1, 1, 0],
                    x: (Math.cos((i / 60) * Math.PI * 2) * 500),
                    y: (Math.sin((i / 60) * Math.PI * 2) * 500),
                  }}
                  transition={{
                    duration: 2.5,
                    delay: burstIndex * 0.5 + i * 0.03,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );

    case 'explosion':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] bg-black/30">
          {/* Центральный взрыв */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
            style={{
              background: 'radial-gradient(circle, #FFD700, #FF6B6B, #4ECDC4)',
              boxShadow: '0 0 100px rgba(255, 215, 0, 0.8)',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{
              scale: [0, 15, 20],
              opacity: [1, 0.8, 0],
            }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          {/* Частицы взрыва */}
          {[...Array(200)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                background: `hsl(${i * 1.8 % 360}, 100%, 60%)`,
                boxShadow: `0 0 15px hsl(${i * 1.8 % 360}, 100%, 60%)`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 2, 0],
                opacity: [1, 1, 0],
                x: (Math.random() - 0.5) * 800,
                y: (Math.random() - 0.5) * 800,
              }}
              transition={{
                duration: 2,
                delay: Math.random() * 0.3,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      );

    case 'cosmic':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/50">
          {/* Космические частицы */}
          {[...Array(300)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `hsl(${i * 1.2 % 360}, 100%, ${50 + Math.random() * 50}%)`,
                boxShadow: `0 0 10px hsl(${i * 1.2 % 360}, 100%, 60%)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, Math.random() * 3 + 1, 0],
                opacity: [0, 1, 0],
                x: (Math.random() - 0.5) * 1000,
                y: (Math.random() - 0.5) * 1000,
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                delay: Math.random() * 1,
                ease: 'easeOut',
              }}
            />
          ))}
          {/* Центральная звезда */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: [0, 1.5, 1], rotate: 360 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          >
            <Star className="w-32 h-32 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_50px_rgba(251,191,36,1)]" />
          </motion.div>
        </div>
      );

    case 'golden-rain':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] bg-gradient-to-b from-yellow-900/20 to-transparent">
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.5}
            colors={['#FFD700', '#FFA500', '#FF8C00', '#FFD700']}
            initialVelocityY={-30}
          />
          {/* Золотые капли */}
          {[...Array(200)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-8 rounded-full"
              style={{
                left: `${(i * 3.7) % 100}%`,
                top: '-10%',
                background: 'linear-gradient(to bottom, #FFD700, #FFA500)',
                boxShadow: '0 0 10px #FFD700',
              }}
              initial={{ y: -100, opacity: 0, rotate: 0 }}
              animate={{
                y: windowSize.height + 100,
                opacity: [0, 1, 1, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      );

    case 'diamond-shower':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] bg-gradient-to-b from-cyan-900/30 to-transparent">
          {/* Алмазные частицы */}
          {[...Array(300)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${(i * 2.3) % 100}%`,
                top: '-5%',
                width: '12px',
                height: '12px',
                background: 'linear-gradient(135deg, #00FFFF, #0080FF, #00FFFF)',
                clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                boxShadow: '0 0 20px #00FFFF',
              }}
              initial={{ y: -50, opacity: 0, rotate: 0 }}
              animate={{
                y: windowSize.height + 50,
                opacity: [0, 1, 1, 0],
                rotate: 720,
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                delay: Math.random() * 2,
                ease: 'easeIn',
              }}
            />
          ))}
        </div>
      );

    case 'phoenix':
      // Предвычисляем позиции частиц для оптимизации
      const particleCount = 180; // Уменьшено с 400 до 180
      const particles = Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 600 + (i % 3) * 100; // Вариация радиуса
        const randomOffset = (i % 7) * 0.1; // Детерминированный offset вместо Math.random()
        return {
          x: Math.cos(angle) * radius + (randomOffset - 0.35) * 200,
          y: Math.sin(angle) * radius + (randomOffset - 0.35) * 200 - 200,
          hue: 15 + (i % 50),
          // Синхронизируем с трансформацией иконки: искры начинают появляться когда иконка достигает scale 2
          delay: 0.6 + (i * 0.01), // Начинаем чуть позже начала трансформации иконки
        };
      });

      return (
        <div 
          className="fixed inset-0 pointer-events-none z-[9999] bg-gradient-to-br from-orange-900/40 via-red-900/40 to-yellow-900/40"
          style={{ 
            willChange: 'contents',
            transform: 'translateZ(0)', // GPU acceleration
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Начальная иконка пламени - трансформируется из маленькой в большую */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ willChange: 'transform, opacity' }}
            initial={{ scale: 0.3, opacity: 1, y: 0 }}
            animate={{ 
              scale: [0.3, 1.5, 2.5, 3, 2.8, 0], // Увеличена длительность для синхронизации
              opacity: [1, 1, 1, 0.9, 0.7, 0],
              y: [0, -30, -60, -100, -130, -150],
              rotate: [0, 90, 180, 270, 360, 450]
            }}
            transition={{ 
              duration: 2.5, // Увеличена длительность для синхронизации с искрами
              ease: [0.4, 0, 0.2, 1],
              times: [0, 0.2, 0.4, 0.6, 0.8, 1]
            }}
          >
            <Flame className="w-8 h-8 text-orange-500 fill-orange-500" style={{ filter: 'drop-shadow(0 0 30px rgba(251,146,60,1))' }} />
          </motion.div>
          
          {/* Феникс - огненные частицы (оптимизировано) */}
          {particles.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                background: `hsl(${particle.hue}, 100%, 60%)`,
                willChange: 'transform, opacity',
                transform: 'translateZ(0)', // GPU acceleration
                backfaceVisibility: 'hidden',
                // Убрали box-shadow, используем только цвет
              }}
              initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 0.5, 2, 1.5, 0], // Искры начинают появляться когда иконка растет
                opacity: [0, 0.3, 1, 1, 0],
                x: particle.x,
                y: particle.y,
              }}
              transition={{
                duration: 3.5,
                delay: particle.delay,
                ease: [0.4, 0, 0.2, 1],
              }}
            />
          ))}
          
          {/* Крылья феникса - упрощенные (без clipPath) */}
          {[...Array(6)].map((_, wingIndex) => {
            const angle = (wingIndex / 6) * Math.PI * 2;
            const hue = 20 + wingIndex * 5;
            return (
              <motion.div
                key={`wing-${wingIndex}`}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: '180px',
                  height: '180px',
                  background: `radial-gradient(circle, hsla(${hue}, 100%, 60%, 0.6) 0%, transparent 70%)`,
                  willChange: 'transform, opacity',
                  transform: 'translateZ(0)', // GPU acceleration
                  backfaceVisibility: 'hidden',
                  // Убрали clipPath - используем простой круг
                }}
                initial={{ scale: 0, opacity: 0, rotate: angle * (180 / Math.PI) }}
                animate={{
                  scale: [0, 1.5, 2, 0],
                  opacity: [0, 0.5, 0.3, 0],
                  rotate: [angle * (180 / Math.PI), angle * (180 / Math.PI) + 60, angle * (180 / Math.PI) + 120],
                }}
                transition={{
                  duration: 3.5, // Синхронизировано с искрами
                  delay: 0.8 + wingIndex * 0.12, // Начинаются после начала разлета искр
                  ease: 'easeOut',
                }}
              />
            );
          })}
          
          {/* Финальное большое пламя в центре */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ willChange: 'transform, opacity' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1.8, 2, 1.5, 0],
              opacity: [0, 0.8, 1, 0.9, 0.6, 0],
              rotate: [0, 90, 180, 270, 360]
            }}
            transition={{ 
              duration: 3.5, // Синхронизировано с общей анимацией
              delay: 1.8, // Появляется когда маленькая иконка почти исчезла
              ease: 'easeOut'
            }}
          >
            <Flame className="w-48 h-48 text-orange-500 fill-orange-500" style={{ filter: 'drop-shadow(0 0 80px rgba(251,146,60,1))' }} />
          </motion.div>
        </div>
      );

    case 'supernova':
      return (
        <div className="fixed inset-0 pointer-events-none z-[9999] bg-black/50">
          {/* Супернова - взрыв с множественными волнами */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
            style={{
              background: 'radial-gradient(circle, #FFFFFF, #FFD700, #FF6B6B, #4ECDC4, #000000)',
              boxShadow: '0 0 200px rgba(255, 255, 255, 0.9)',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{
              scale: [0, 30, 40],
              opacity: [1, 0.9, 0],
            }}
            transition={{ duration: 5, ease: 'easeOut' }}
          />
          {/* Волны энергии */}
          {[...Array(15)].map((_, waveIndex) => (
            <motion.div
              key={waveIndex}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4"
              style={{
                borderColor: `hsl(${waveIndex * 24}, 100%, 60%)`,
                boxShadow: `0 0 80px hsl(${waveIndex * 24}, 100%, 60%)`,
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{
                scale: [0, 25],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: 5,
                delay: waveIndex * 0.3,
                ease: 'easeOut',
              }}
            />
          ))}
          {/* Частицы суперновы */}
          {[...Array(600)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                background: `hsl(${i * 0.6 % 360}, 100%, 60%)`,
                boxShadow: `0 0 30px hsl(${i * 0.6 % 360}, 100%, 60%)`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 4, 0],
                opacity: [1, 1, 0],
                x: (Math.cos((i / 600) * Math.PI * 2) * (1000 + Math.random() * 500)),
                y: (Math.sin((i / 600) * Math.PI * 2) * (1000 + Math.random() * 500)),
              }}
              transition={{
                duration: 5,
                delay: Math.random() * 1,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      );

    default:
      return null;
  }
};

/**
 * Компонент для выбора и тестирования анимаций
 */
export const CelebrationAnimationSelector: React.FC<{
  onSelect: (type: CelebrationType) => void;
  currentType?: CelebrationType;
}> = ({ onSelect, currentType = 'confetti' }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<CelebrationType>(currentType);

  const animations: { type: CelebrationType; name: string; description: string }[] = [
    { type: 'confetti', name: 'Конфетти', description: 'Классическое конфетти' },
    { type: 'fireworks', name: 'Фейерверк', description: 'Яркий фейерверк с цветными частицами' },
    { type: 'stars', name: 'Звезды', description: 'Звезды, разлетающиеся от центра' },
    { type: 'burst', name: 'Взрыв', description: 'Взрыв цветных частиц от центра' },
    { type: 'sparkles', name: 'Искры', description: 'Искры вокруг элемента' },
    { type: 'trophy', name: 'Трофей', description: 'Анимация трофея с частицами' },
    { type: 'gradient', name: 'Градиент', description: 'Градиентная волна' },
    { type: 'particles', name: 'Частицы', description: 'Физические частицы' },
    { type: 'mega-burst', name: 'Мега-взрыв', description: 'Множественные взрывы по экрану' },
    { type: 'galaxy', name: 'Галактика', description: 'Спиральная галактика из частиц' },
    { type: 'rainbow', name: 'Радуга', description: 'Радужные волны и частицы' },
    { type: 'champion', name: 'Чемпион', description: 'Корона с золотыми частицами' },
    { type: 'victory-fanfare', name: 'Фанфары', description: 'Трофей с фанфарами' },
    { type: 'explosion', name: 'Взрыв', description: 'Мощный центральный взрыв' },
    { type: 'cosmic', name: 'Космос', description: 'Космические частицы и звезда' },
    { type: 'golden-rain', name: 'Золотой дождь', description: 'Дождь из золотых капель' },
    { type: 'diamond-shower', name: 'Алмазный дождь', description: 'Дождь из алмазов' },
    { type: 'phoenix', name: 'Феникс', description: 'Огненный феникс' },
    { type: 'supernova', name: 'Супернова', description: 'Взрыв суперновы (самый мощный!)' },
  ];

  const handlePreview = (type: CelebrationType) => {
    setPreviewType(type);
    setShowPreview(true);
    setTimeout(() => setShowPreview(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {animations.map((anim) => (
          <motion.button
            key={anim.type}
            onClick={() => {
              onSelect(anim.type);
              handlePreview(anim.type);
            }}
            className={`p-3 rounded-lg border-2 transition-all ${
              currentType === anim.type
                ? 'border-yellow-400 bg-yellow-400/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-sm font-bold text-white mb-1">{anim.name}</div>
            <div className="text-xs text-slate-400">{anim.description}</div>
          </motion.button>
        ))}
      </div>

      <CelebrationAnimations
        type={previewType}
        show={showPreview}
        withSound={true}
        fullScreen={true}
      />
    </div>
  );
};

