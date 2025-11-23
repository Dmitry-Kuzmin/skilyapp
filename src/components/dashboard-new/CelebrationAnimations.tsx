import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Trophy, Sparkles, Star, Award, Zap } from 'lucide-react';

export type CelebrationType = 
  | 'confetti' 
  | 'fireworks' 
  | 'stars' 
  | 'burst' 
  | 'sparkles' 
  | 'trophy' 
  | 'gradient' 
  | 'particles';

interface CelebrationAnimationsProps {
  type: CelebrationType;
  show: boolean;
  onComplete?: () => void;
  duration?: number;
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
export const CelebrationAnimations: React.FC<CelebrationAnimationsProps> = ({
  type,
  show,
  onComplete,
  duration = 3000
}) => {
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

  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

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
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
              }}
              initial={{ scale: 0, opacity: 1, rotate: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [1, 1, 0],
                x: (Math.cos((i / 50) * Math.PI * 2) * 300),
                y: (Math.sin((i / 50) * Math.PI * 2) * 300),
                rotate: 360,
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.02,
                ease: 'easeOut',
              }}
            >
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
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
    { type: 'confetti', name: 'Конфетти', description: 'Классическое конфетти (текущее)' },
    { type: 'fireworks', name: 'Фейерверк', description: 'Яркий фейерверк с цветными частицами' },
    { type: 'stars', name: 'Звезды', description: 'Звезды, разлетающиеся от центра' },
    { type: 'burst', name: 'Взрыв', description: 'Взрыв цветных частиц от центра' },
    { type: 'sparkles', name: 'Искры', description: 'Искры вокруг элемента' },
    { type: 'trophy', name: 'Трофей', description: 'Анимация трофея с частицами' },
    { type: 'gradient', name: 'Градиент', description: 'Градиентная волна' },
    { type: 'particles', name: 'Частицы', description: 'Физические частицы' },
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
        duration={3000}
      />
    </div>
  );
};

