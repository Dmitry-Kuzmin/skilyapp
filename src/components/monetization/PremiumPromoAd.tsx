import { useState, useEffect, useCallback, useRef } from 'react';
import { Crown, Zap, Sparkles, Trophy, BookOpen, Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface PremiumPromoAdProps {
  duration?: number;        // Total duration in seconds (default: 15)
  onComplete: () => void;   // Called when promo finishes
  onTryPremium?: () => void; // Optional: navigate to Premium tab
}

const SLIDES = [
  {
    icon: Crown,
    title: 'Premium подписка',
    subtitle: 'Максимальное ускорение обучения',
    features: ['X2 монеты', 'Без рекламы', 'AI-наставник'],
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    glow: 'bg-violet-600/40',
    iconColor: 'text-amber-300',
    accentBorder: 'border-violet-400/30',
  },
  {
    icon: Zap,
    title: 'X2 Монеты',
    subtitle: 'Удвоенные награды за каждое действие',
    features: ['Тесты', 'Дуэли', 'Ежедневные бонусы'],
    gradient: 'from-amber-600 via-orange-600 to-red-600',
    glow: 'bg-amber-500/40',
    iconColor: 'text-yellow-300',
    accentBorder: 'border-amber-400/30',
  },
  {
    icon: Sparkles,
    title: 'Без рекламы',
    subtitle: 'Чистый интерфейс без отвлечений',
    features: ['Нулевая реклама', 'Быстрый доступ', 'Фокус на учёбе'],
    gradient: 'from-sky-600 via-cyan-600 to-teal-600',
    glow: 'bg-sky-500/40',
    iconColor: 'text-sky-300',
    accentBorder: 'border-sky-400/30',
  },
  {
    icon: Trophy,
    title: 'Турниры & Duel Pass+',
    subtitle: 'Соревнуйся с лучшими',
    features: ['Эксклюзивные турниры', 'Уникальные скины', 'Рейтинг PRO'],
    gradient: 'from-emerald-600 via-green-600 to-teal-600',
    glow: 'bg-emerald-500/40',
    iconColor: 'text-emerald-300',
    accentBorder: 'border-emerald-400/30',
  },
  {
    icon: BookOpen,
    title: 'Все тесты открыты',
    subtitle: 'Полный доступ к базе вопросов',
    features: ['3000+ вопросов', 'AI-разбор ошибок', 'Умные подсказки'],
    gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    glow: 'bg-fuchsia-500/40',
    iconColor: 'text-fuchsia-300',
    accentBorder: 'border-fuchsia-400/30',
  },
];

export function PremiumPromoAd({
  duration = 15,
  onComplete,
  onTryPremium,
}: PremiumPromoAdProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const slideIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const slideInterval = (duration / SLIDES.length) * 1000; // ms per slide

  // Main timer
  useEffect(() => {
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      const pct = Math.min(100, (elapsed / duration) * 100);

      setTimeLeft(Math.ceil(remaining));
      setProgress(pct);

      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(intervalRef.current);
        clearInterval(slideIntervalRef.current);
        onComplete();
      }
    }, 100);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [duration, onComplete]);

  // Slide auto-advance
  useEffect(() => {
    slideIntervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, slideInterval);

    return () => {
      clearInterval(slideIntervalRef.current);
    };
  }, [slideInterval]);

  const slide = SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  return (
    <motion.div
      className="relative w-full h-full min-h-[420px] overflow-hidden flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated background gradient */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${currentSlide}`}
          className={cn("absolute inset-0 bg-gradient-to-br", slide.gradient)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      </AnimatePresence>

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        {/* Glow orbs */}
        <motion.div
          className={cn("absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30", slide.glow)}
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className={cn("absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl opacity-20", slide.glow)}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Top bar: progress + timer */}
      <div className="relative z-20 px-4 pt-4 space-y-2">
        {/* Segment progress */}
        <div className="flex gap-1">
          {SLIDES.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{
                  width: i < currentSlide ? '100%' : i === currentSlide ? `${((progress - (i * (100 / SLIDES.length))) / (100 / SLIDES.length)) * 100}%` : '0%',
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          ))}
        </div>

        {/* Timer badge */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-white/60" />
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Premium Ad</span>
          </div>
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-white/90 tabular-nums">{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Main slide content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-${currentSlide}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center space-y-5"
          >
            {/* Icon with glow */}
            <motion.div className="relative">
              <motion.div
                className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl"
                animate={{ rotateY: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <SlideIcon className={cn("w-10 h-10", slide.iconColor)} />
              </motion.div>
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-3xl border-2 border-white/30"
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            {/* Text */}
            <div className="space-y-2">
              <motion.h2
                className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {slide.title}
              </motion.h2>
              <motion.p
                className="text-sm sm:text-base text-white/70 font-medium max-w-[280px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {slide.subtitle}
              </motion.p>
            </div>

            {/* Feature pills */}
            <motion.div
              className="flex flex-wrap justify-center gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {slide.features.map((feature, i) => (
                <motion.span
                  key={feature}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold text-white/90 bg-white/10 backdrop-blur-sm border",
                    slide.accentBorder
                  )}
                >
                  {feature}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-20 px-5 pb-5">
        {onTryPremium && (
          <motion.button
            onClick={onTryPremium}
            className="w-full py-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/25 active:scale-[0.98] transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>Попробовать Premium</span>
            <ChevronRight className="w-4 h-4 text-white/60" />
          </motion.button>
        )}

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-3">
          {SLIDES.map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "rounded-full transition-all duration-300",
                i === currentSlide
                  ? "w-5 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/30"
              )}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
