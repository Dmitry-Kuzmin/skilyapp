import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Coins, Zap, Trophy, Lock } from 'lucide-react';
import Confetti from 'react-confetti';
import { playSuccessSound, playCelebrationSound } from '@/services/audioService';
import { useTheme } from 'next-themes';

interface MysteryBoxProps {
  type: 'common' | 'rare' | 'epic';
  onComplete: (reward: any) => void;
  show: boolean;
  reward?: any; // Опциональная награда от сервера
}

type Stage = 'idle' | 'appearing' | 'locked' | 'unlocking' | 'opening' | 'explosion' | 'reveal';

export const MysteryBoxOpening = ({ type, show, onComplete, reward: serverReward }: MysteryBoxProps) => {
  const [stage, setStage] = useState<Stage>('idle');
  const [reward, setReward] = useState<any>(null);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? 'dark') !== 'light';

  useEffect(() => {
    if (show && stage === 'idle') {
      // Запускаем sequence анимаций
      setStage('appearing');
      
      // Stage 1: Appearing (0.5s)
      setTimeout(() => setStage('locked'), 500);
      
      // Stage 2: Locked & shaking (1.5s)
      setTimeout(() => setStage('unlocking'), 2000);
      
      // Stage 3: Unlocking (1s)
      setTimeout(() => {
        setStage('opening');
        playSuccessSound();
      }, 3000);
      
      // Stage 4: Opening (1s)
      setTimeout(() => {
        setStage('explosion');
        playCelebrationSound();
        
        // Устанавливаем награду
        setReward(serverReward || generateMockReward(type));
      }, 4000);
      
      // Stage 5: Explosion (1.5s)
      setTimeout(() => {
        setStage('reveal');
      }, 5500);
      
      // Stage 6: Complete (2s для чтения)
      setTimeout(() => {
        onComplete(reward || serverReward);
        setStage('idle');
      }, 7500);
    }
  }, [show, stage, type, serverReward]);

  // Reset при закрытии
  useEffect(() => {
    if (!show && stage !== 'idle') {
      setStage('idle');
    }
  }, [show]);

  if (!show) return null;

  const boxColors = {
    common: {
      gradient: 'from-slate-600 via-slate-700 to-slate-800',
      glow: 'rgba(148, 163, 184, 0.5)',
      shine: 'from-slate-400 to-slate-600'
    },
    rare: {
      gradient: 'from-blue-600 via-purple-600 to-blue-700',
      glow: 'rgba(147, 51, 234, 0.8)',
      shine: 'from-blue-400 to-purple-400'
    },
    epic: {
      gradient: 'from-purple-600 via-pink-600 to-orange-500',
      glow: 'rgba(236, 72, 153, 1)',
      shine: 'from-yellow-400 to-pink-400'
    }
  };

  const config = boxColors[type];
  const displayReward = reward || serverReward;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <AnimatePresence mode="wait">
        {/* Stage: Appearing */}
        {stage === 'appearing' && (
          <motion.div
            key="appearing"
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative w-48 h-48"
          >
            <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${config.gradient} shadow-2xl`}
              style={{ boxShadow: `0 0 60px ${config.glow}` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Gift className="w-24 h-24 text-white/90" strokeWidth={1.5} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Stage: Locked */}
        {stage === 'locked' && (
          <motion.div
            key="locked"
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="relative w-48 h-48"
          >
            <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${config.gradient} shadow-2xl`}
              style={{ boxShadow: `0 0 60px ${config.glow}` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Gift className="w-24 h-24 text-white/90" strokeWidth={1.5} />
              </div>
              
              {/* Lock indicator */}
              <motion.div 
                className="absolute top-6 right-6"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <div className="w-10 h-12 bg-yellow-500 rounded-lg flex flex-col items-center justify-center shadow-lg">
                  <div className="w-4 h-4 bg-yellow-300 rounded-full mb-1" />
                  <div className="w-6 h-3 bg-yellow-400 rounded-b-lg" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Stage: Unlocking */}
        {stage === 'unlocking' && (
          <motion.div
            key="unlocking"
            animate={{ 
              rotateY: [0, 180, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 1 }}
            className="relative w-48 h-48"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${config.gradient} shadow-2xl`}
              style={{ boxShadow: `0 0 80px ${config.glow}` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Gift className="w-24 h-24 text-white/90" strokeWidth={1.5} />
              </div>
            </div>
            
            {/* Spinning particles */}
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-yellow-400"
                style={{
                  left: '50%',
                  top: '50%',
                  boxShadow: '0 0 10px #fbbf24'
                }}
                animate={{
                  x: Math.cos(i / 16 * Math.PI * 2) * 100,
                  y: Math.sin(i / 16 * Math.PI * 2) * 100,
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: 1,
                  repeat: 1,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Stage: Opening */}
        {stage === 'opening' && (
          <motion.div
            key="opening"
            animate={{ 
              scale: [1, 1.3, 1.1]
            }}
            transition={{ duration: 1 }}
            className="relative w-48 h-48"
          >
            <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${config.gradient} shadow-2xl`}
              style={{ boxShadow: `0 0 100px ${config.glow}` }}
            >
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1.5] }}
                transition={{ duration: 1 }}
              >
                <Gift className="w-24 h-24 text-white" strokeWidth={2} />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Stage: Explosion */}
        {stage === 'explosion' && (
          <motion.div
            key="explosion"
            className="relative"
          >
            {/* Confetti */}
            <Confetti 
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={300}
              gravity={0.3}
              colors={type === 'epic' 
                ? ['#FFD700', '#FF6B6B', '#a855f7', '#06b6d4', '#10b981']
                : type === 'rare'
                ? ['#3b82f6', '#8b5cf6', '#06b6d4', '#ffffff']
                : ['#94a3b8', '#64748b', '#ffffff']
              }
            />
            
            {/* Central explosion particles */}
            {[...Array(60)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-4 h-4 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  background: `hsl(${i * 6}, 100%, 60%)`,
                  boxShadow: `0 0 15px hsl(${i * 6}, 100%, 60%)`
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 2, 0],
                  opacity: [1, 1, 0],
                  x: (Math.cos(i / 60 * Math.PI * 2) * (200 + Math.random() * 200)),
                  y: (Math.sin(i / 60 * Math.PI * 2) * (200 + Math.random() * 200))
                }}
                transition={{ 
                  duration: 1.5, 
                  ease: 'easeOut'
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Stage: Reveal */}
        {stage === 'reveal' && displayReward && (
          <motion.div
            key="reveal"
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className={`
              ${isDark 
                ? 'bg-gradient-to-br from-slate-900/95 to-slate-800/95' 
                : 'bg-gradient-to-br from-white to-slate-50'
              }
              backdrop-blur-xl 
              border-2 ${type === 'epic' 
                ? 'border-yellow-400/60' 
                : type === 'rare' 
                ? 'border-purple-400/60' 
                : 'border-slate-400/40'
              }
              rounded-3xl p-8 min-w-[320px] max-w-md
              shadow-2xl
            `}
            style={{
              boxShadow: type === 'epic' 
                ? '0 0 100px rgba(251, 191, 36, 0.6)' 
                : type === 'rare'
                ? '0 0 80px rgba(167, 139, 250, 0.5)'
                : '0 0 50px rgba(148, 163, 184, 0.3)'
            }}
          >
            {/* Glowing background */}
            <motion.div
              className={`absolute -inset-4 rounded-3xl blur-2xl -z-10 ${
                type === 'epic' 
                  ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30' 
                  : type === 'rare'
                  ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30'
                  : 'bg-slate-500/20'
              }`}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            <div className="text-center relative z-10">
              {/* Reward icon/emoji */}
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
                className="text-7xl mb-6"
              >
                {displayReward?.emoji || '🎁'}
              </motion.div>

              {/* Reward name */}
              <motion.h3
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`text-2xl sm:text-3xl font-bold mb-4 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {displayReward?.name || 'Награда!'}
              </motion.h3>

              {/* Rewards display */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-4 mb-6"
              >
                {displayReward?.xp > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/20 border border-orange-500/40">
                    <Zap className="w-5 h-5 text-orange-400" />
                    <span className="text-lg font-bold text-orange-300">
                      +{displayReward.xp}
                    </span>
                    <span className="text-sm text-orange-400/70">XP</span>
                  </div>
                )}
                
                {displayReward?.coins > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/40">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <span className="text-lg font-bold text-yellow-300">
                      +{displayReward.coins}
                    </span>
                  </div>
                )}

                {displayReward?.badge && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-bold text-purple-300">
                      Badge!
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Sparkles around */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                    x: Math.cos(i / 8 * Math.PI * 2) * 120,
                    y: Math.sin(i / 8 * Math.PI * 2) * 120,
                    rotate: 360,
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background particles (всегда видимы после explosion) */}
      {(stage === 'explosion' || stage === 'reveal') && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `hsl(${i * 12}, 100%, 60%)`,
                boxShadow: `0 0 10px hsl(${i * 12}, 100%, 60%)`
              }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
                y: [0, -100 - Math.random() * 100]
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: Math.random() * 0.5,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Mock function для генерации награды (в реальности от сервера)
const generateMockReward = (type: string) => {
  const rewards = {
    common: [
      { name: 'Бонус монет', emoji: '🪙', coins: 10, xp: 0 },
      { name: 'Бонус XP', emoji: '⚡', coins: 0, xp: 20 },
      { name: 'Обычный стикер', emoji: '🎨', coins: 5, xp: 10 }
    ],
    rare: [
      { name: 'Золотой сундук', emoji: '💰', coins: 50, xp: 0 },
      { name: 'Boost тикет', emoji: '🎫', coins: 0, xp: 30 },
      { name: 'Редкий скин', emoji: '✨', coins: 20, xp: 40 }
    ],
    epic: [
      { name: 'МЕГА ПРИЗ!', emoji: '💎', coins: 100, xp: 100 },
      { name: 'Double SP Hour', emoji: '⚡', coins: 50, xp: 50, badge: true },
      { name: 'Легендарный бейдж', emoji: '🏆', coins: 75, xp: 75, badge: true }
    ]
  };
  
  const pool = rewards[type] || rewards.common;
  return pool[Math.floor(Math.random() * pool.length)];
};



