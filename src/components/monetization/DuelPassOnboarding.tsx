import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Trophy, Coins, Crown, Sparkles, X, BookOpen, Calendar, Zap, 
  Gift, Star, ArrowRight, Shield, Sticker, Target, Flame, 
  Swords, ChevronLeft, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

const seasonTheme = {
  gradient: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800",
  border: "border-cyan-500/30",
  chip: "bg-white/10 text-white/80",
  accent: "text-cyan-200",
  glow: "shadow-[0_0_40px_rgba(34,211,238,0.35)]",
  decorativePrimary: "bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.35),transparent_60%)]",
  decorativeSecondary: "bg-[radial-gradient(circle_at_80%_100%,rgba(251,191,36,0.25),transparent_55%)]",
};

interface DuelPassOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  seasonData?: {
    name_ru?: string;
    days_remaining?: number;
    end_date?: string;
  };
}

export function DuelPassOnboarding({ open, onOpenChange, onComplete, seasonData }: DuelPassOnboardingProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const totalSlides = 5;

  // Логирование для отладки - только при изменении open
  useEffect(() => {
    if (open) {
      console.log('[DuelPassOnboarding] ✅ OPENED', { isMobile, currentSlide });
          // Помогаем найти элемент в DOM и принудительно устанавливаем opacity
          setTimeout(() => {
            const dialogElement = document.querySelector('[data-duel-pass-onboarding="true"]') as HTMLElement;
            if (dialogElement) {
              console.log('[DuelPassOnboarding] ✅ Dialog element found in DOM:', dialogElement);
              // Принудительно устанавливаем opacity: 1
              dialogElement.style.setProperty('opacity', '1', 'important');
              dialogElement.style.setProperty('visibility', 'visible', 'important');
              // Принудительно устанавливаем правильное позиционирование
              dialogElement.style.setProperty('top', '50%', 'important');
              dialogElement.style.setProperty('left', '50%', 'important');
              dialogElement.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
              
              // Используем видимую область экрана (window.innerHeight), а не общую высоту страницы
              const viewportHeight = window.innerHeight;
              const viewportWidth = window.innerWidth;
              
              // Принудительно устанавливаем позицию относительно видимого окна
              // Для fixed позиции используем видимую область экрана
              const centerY = viewportHeight / 2;
              const centerX = viewportWidth / 2;
              dialogElement.style.setProperty('top', `${centerY}px`, 'important');
              dialogElement.style.setProperty('left', `${centerX}px`, 'important');
              dialogElement.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
              dialogElement.style.setProperty('position', 'fixed', 'important');
              // Убеждаемся, что элемент не скрыт
              dialogElement.style.setProperty('pointer-events', 'auto', 'important');
              
              // Получаем computed styles после применения позиционирования
              const computed = window.getComputedStyle(dialogElement);
              const rect = dialogElement.getBoundingClientRect();
              const isVisible = rect.top >= 0 && rect.top < viewportHeight && rect.left >= 0 && rect.left < viewportWidth;
              
              // Устанавливаем адаптивную высоту модалки
              const maxHeight = Math.min(viewportHeight * 0.9, viewportHeight - 32); // 90vh или viewport - 2rem
              dialogElement.style.setProperty('max-height', `${maxHeight}px`, 'important');
              dialogElement.style.setProperty('height', 'auto', 'important');
              
              // Проверяем и настраиваем контент внутри
              const contentWrapper = dialogElement.querySelector('.relative.z-10') as HTMLElement;
              if (contentWrapper) {
                console.log('[DuelPassOnboarding] ✅ Content element found:', contentWrapper);
                contentWrapper.style.setProperty('opacity', '1', 'important');
                contentWrapper.style.setProperty('visibility', 'visible', 'important');
                // Устанавливаем адаптивную высоту для контента - используем высоту диалога минус отступы
                // Header и footer занимают примерно 100-120px вместе, используем адаптивный расчет
                const headerFooterHeight = Math.min(120, maxHeight * 0.35); // Максимум 35% от высоты диалога или 120px
                const contentMaxHeight = Math.max(250, maxHeight - headerFooterHeight - 20); // Минимум 250px для контента, -20px для отступов
                // Устанавливаем высоту контента - используем всю доступную высоту диалога
                const actualDialogHeight = dialogElement.getBoundingClientRect().height;
                const actualContentHeight = Math.max(300, actualDialogHeight - headerFooterHeight - 20);
                // Устанавливаем высоту контента равной доступной высоте диалога
                contentWrapper.style.setProperty('height', `${actualContentHeight}px`, 'important');
                contentWrapper.style.setProperty('min-height', `${actualContentHeight}px`, 'important');
                // Убираем жесткое ограничение max-height, позволяем контенту расширяться
                contentWrapper.style.setProperty('max-height', 'none', 'important');
                contentWrapper.style.setProperty('overflow-y', 'auto', 'important');
                contentWrapper.style.setProperty('flex', '1 1 auto', 'important'); // Позволяем flex расширяться
                contentWrapper.style.setProperty('display', 'flex', 'important');
                contentWrapper.style.setProperty('flex-direction', 'column', 'important');
                console.log('[DuelPassOnboarding] Content height set:', {
                  maxHeight: `${contentMaxHeight}px`,
                  dialogMaxHeight: `${maxHeight}px`,
                  viewportHeight,
                  headerFooterHeight
                });
              } else {
                console.error('[DuelPassOnboarding] ❌ Content element NOT found!');
              }
              
              // Проверяем overlay - он не должен перекрывать диалог
              const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
              if (overlay) {
                const overlayZIndex = window.getComputedStyle(overlay).zIndex;
                console.log('[DuelPassOnboarding] Overlay found, z-index:', overlayZIndex);
                // Overlay должен быть ниже диалога
                if (parseInt(overlayZIndex) >= parseInt(computed.zIndex)) {
                  overlay.style.setProperty('z-index', '2147483645', 'important');
                  console.log('[DuelPassOnboarding] Overlay z-index fixed to 2147483645');
                }
              } else {
                console.log('[DuelPassOnboarding] Overlay not found');
              }
              
              // ОПТИМИЗАЦИЯ: Кэшируем getBoundingClientRect() чтобы избежать forced layout
              // Прокручиваем страницу к диалогу, если он не в видимой области
              setTimeout(() => {
                // Используем requestAnimationFrame для батчинга layout операций
                requestAnimationFrame(() => {
                  const newRect = dialogElement.getBoundingClientRect();
                  const isInViewport = newRect.top >= 0 && newRect.top < viewportHeight && 
                                     newRect.left >= 0 && newRect.left < viewportWidth;
                console.log('[DuelPassOnboarding] After positioning - isInViewport:', isInViewport, 'rect:', {
                  top: Math.round(newRect.top),
                  left: Math.round(newRect.left),
                  width: Math.round(newRect.width),
                  height: Math.round(newRect.height),
                });
                  if (!isInViewport) {
                    dialogElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                });
              }, 50);
              
              console.log('[DuelPassOnboarding] ===== POSITIONING DEBUG =====');
              console.log('[DuelPassOnboarding] Computed styles:', {
                zIndex: computed.zIndex,
                opacity: computed.opacity,
                visibility: computed.visibility,
                display: computed.display,
                width: computed.width,
                height: computed.height,
                left: computed.left,
                top: computed.top,
                transform: computed.transform,
                position: computed.position,
              });
              console.log('[DuelPassOnboarding] Bounding rect:', {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                bottom: Math.round(rect.bottom),
              });
              console.log('[DuelPassOnboarding] Viewport:', {
                width: viewportWidth,
                height: viewportHeight,
              });
              console.log('[DuelPassOnboarding] Is visible in viewport:', isVisible);
              console.log('[DuelPassOnboarding] Expected center:', {
                centerX: Math.round(viewportWidth / 2),
                centerY: Math.round(viewportHeight / 2),
                actualX: Math.round(rect.left + rect.width / 2),
                actualY: Math.round(rect.top + rect.height / 2),
                offsetX: Math.round((rect.left + rect.width / 2) - viewportWidth / 2),
                offsetY: Math.round((rect.top + rect.height / 2) - viewportHeight / 2),
              });
              console.log('[DuelPassOnboarding] ===============================');
            } else {
              console.error('[DuelPassOnboarding] ❌ Dialog element NOT found in DOM!');
            }
          }, 100);
    }
  }, [open, isMobile, currentSlide]);

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem('duel-pass-onboarding-seen', 'true');
    }
    onComplete();
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete();
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const slideTransition = {
    x: { type: "spring", stiffness: 300, damping: 30 },
    opacity: { duration: 0.2 },
  };

  // Экран 1: Welcome
  const Slide1 = () => (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-8 md:py-12 px-4 min-h-0">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        <motion.div
          animate={{ 
            boxShadow: [
              "0 0 40px rgba(34,211,238,0.35)",
              "0 0 60px rgba(34,211,238,0.5)",
              "0 0 40px rgba(34,211,238,0.35)"
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className={cn(
            "w-24 h-24 md:w-36 md:h-36 rounded-3xl flex items-center justify-center",
            seasonTheme.gradient,
            seasonTheme.border,
            "border-2 relative overflow-hidden"
          )}>
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativePrimary)} />
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none", seasonTheme.decorativeSecondary)} />
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Trophy className="w-12 h-12 md:w-20 md:h-20 text-yellow-400 relative z-10 drop-shadow-2xl" />
          </motion.div>
        </motion.div>
      </motion.div>
      
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="space-y-4"
      >
        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight" dangerouslySetInnerHTML={{ __html: t("duelPass.onboarding.slide1.title") }} />
        <p className="text-base md:text-lg text-white/80 max-w-lg mx-auto leading-relaxed px-4">
          {t("duelPass.onboarding.slide1.description")}
        </p>
      </motion.div>
    </div>
  );

  // Экран 2: Что такое SP?
  const Slide2 = () => (
    <div className="space-y-6 py-6 md:py-8 px-4 min-h-0 flex flex-col justify-center">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-2 mb-6"
      >
        <h2 className="text-2xl md:text-4xl font-black text-white">
          {t("duelPass.onboarding.slide2.title")}
        </h2>
        <p className="text-sm md:text-base text-white/70">
          {t("duelPass.onboarding.slide2.subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {[
          { icon: BookOpen, label: t("duelPass.onboarding.slide2.tests"), sp: "+25", color: "text-blue-400", bg: "bg-blue-500/30", border: "border-blue-500/50" },
          { icon: Swords, label: t("duelPass.onboarding.slide2.duels"), sp: "+30", color: "text-purple-400", bg: "bg-purple-500/30", border: "border-purple-500/50" },
          { icon: Calendar, label: t("duelPass.onboarding.slide2.daily"), sp: "+15", color: "text-green-400", bg: "bg-green-500/30", border: "border-green-500/50" },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * index, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className={cn(
              "relative overflow-hidden rounded-2xl border-2 p-5 md:p-6 text-white",
              item.border,
              "backdrop-blur-sm cursor-pointer"
            )}
          >
            <div className={cn("absolute inset-0 opacity-40", seasonTheme.decorativePrimary)} />
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
              className={cn("absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-xl", item.bg)}
            />
            <div className="relative z-10 space-y-4">
              <div className={cn("w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mx-auto", item.bg)}>
                <item.icon className={cn("w-7 h-7 md:w-8 md:h-8", item.color)} />
              </div>
              <div className="text-center">
                <p className="text-xs md:text-sm uppercase tracking-wide text-white/60 mb-2">{item.label}</p>
                <motion.p 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.15, type: "spring" }}
                  className="text-3xl md:text-4xl font-black"
                >
                  {item.sp}
                </motion.p>
                <p className="text-xs text-white/70 mt-1">{t("duelPass.onboarding.slide2.spPerAction")}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={cn(
          "rounded-2xl border-2 p-4 md:p-5 text-center",
          "border-yellow-500/50",
          "bg-gradient-to-r from-yellow-500/30 via-orange-500/30 to-yellow-500/30",
          "backdrop-blur-sm"
        )}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className="w-6 h-6 md:w-7 md:h-7 text-yellow-400" />
          </motion.div>
          <span className="text-sm md:text-base font-bold text-white">Premium: +20% к SP</span>
        </div>
        <p className="text-xs md:text-sm text-white/80">С Premium подпиской получай больше SP за каждое действие</p>
      </motion.div>
    </div>
  );

  // Экран 3: Награды
  const Slide3 = () => (
    <div className="space-y-6 md:space-y-8 py-6 md:py-8 px-4 min-h-[400px] md:min-h-[500px] flex flex-col justify-center">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-2 mb-6"
      >
        <h2 className="text-2xl md:text-4xl font-black text-white">
          30 уровней уникальных наград
        </h2>
        <p className="text-sm md:text-base text-white/70">
          Больше SP = выше уровень = больше наград!
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {[
          { icon: Coins, label: "Монеты", color: "text-yellow-400", bg: "bg-yellow-500/30", border: "border-yellow-500/50", glow: "shadow-yellow-500/30" },
          { icon: Sparkles, label: "Скины", color: "text-purple-400", bg: "bg-purple-500/30", border: "border-purple-500/50", glow: "shadow-purple-500/30" },
          { icon: Shield, label: "Бейджи", color: "text-blue-400", bg: "bg-blue-500/30", border: "border-blue-500/50", glow: "shadow-blue-500/30" },
          { icon: Zap, label: "Бусты", color: "text-orange-400", bg: "bg-orange-500/30", border: "border-orange-500/50", glow: "shadow-orange-500/30" },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.1, y: -8, rotate: 2 }}
            className={cn(
              "relative overflow-hidden rounded-2xl border-2 p-5 md:p-6 text-center",
              item.border,
              "cursor-pointer backdrop-blur-sm",
              "shadow-lg hover:shadow-2xl",
              `hover:${item.glow}`
            )}
          >
            <div className={cn("absolute inset-0 opacity-40", seasonTheme.decorativePrimary)} />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
              className={cn("absolute inset-0 rounded-2xl", item.bg)}
            />
            <div className="relative z-10 space-y-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
                className={cn("w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl flex items-center justify-center", item.bg)}
              >
                <item.icon className={cn("w-8 h-8 md:w-10 md:h-10", item.color)} />
              </motion.div>
              <p className="text-xs md:text-sm font-bold text-white uppercase tracking-wide">{item.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={cn(
          "rounded-2xl border-2 p-5 md:p-6",
          "border-cyan-500/50",
          "bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30",
          "backdrop-blur-sm"
        )}
      >
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Target className="w-10 h-10 md:w-12 md:h-12 text-cyan-400" />
          </motion.div>
          <div>
            <p className="text-sm md:text-base font-bold text-white mb-1">Прогресс по уровням</p>
            <p className="text-xs md:text-sm text-white/80">Каждый уровень открывает новые эксклюзивные награды</p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  // Экран 4: Premium Pass
  const Slide4 = () => (
    <div className="space-y-6 md:space-y-8 py-6 md:py-8 px-4 min-h-[400px] md:min-h-[500px] flex flex-col justify-center">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-2 mb-6"
      >
        <h2 className="text-2xl md:text-4xl font-black text-white">
          Раскрывай сезон полностью
        </h2>
        <p className="text-sm md:text-base text-white/70">
          Premium Pass открывает лучшее
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {/* Free */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={cn(
            "relative overflow-hidden rounded-2xl border-2 p-6 md:p-7",
            "border-white/30 bg-white/10 backdrop-blur-sm"
          )}
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white">Free Pass</h3>
            </div>
            <ul className="space-y-3 text-sm md:text-base text-white/90">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Доступ к миссиям</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Базовые награды</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Прогресс по уровням</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Premium */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={cn(
            "relative overflow-hidden rounded-2xl border-2 p-6 md:p-7",
            "border-yellow-500/70 bg-gradient-to-br from-yellow-500/30 via-orange-500/30 to-pink-500/30",
            "shadow-2xl shadow-yellow-500/30"
          )}
        >
          <div className={cn("absolute inset-0 opacity-50", seasonTheme.decorativePrimary)} />
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-3 right-3 z-20"
          >
            <Crown className="w-8 h-8 text-yellow-400 drop-shadow-lg" />
          </motion.div>
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-xl bg-yellow-500/40 flex items-center justify-center"
              >
                <Star className="w-6 h-6 text-yellow-300" />
              </motion.div>
              <h3 className="text-xl md:text-2xl font-black text-white">Premium Pass</h3>
            </div>
            <ul className="space-y-3 text-sm md:text-base text-white/95">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="font-bold">Все Free награды</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="font-bold">+20% к SP</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="font-bold">Эксклюзивные награды</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="font-bold">Ускоренный прогресс</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );

  // Экран 5: FOMO - время ограничено
  const Slide5 = () => {
    const daysLeft = seasonData?.days_remaining || 28;
    
    return (
      <div className="space-y-6 md:space-y-8 py-6 md:py-8 px-4 min-h-[400px] md:min-h-[500px] flex flex-col justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4 md:space-y-6"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.15, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-block"
          >
            <div className={cn(
              "w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mx-auto",
              "bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500",
              "border-4 border-white/30 shadow-2xl",
              "relative overflow-hidden"
            )}>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-white/20 rounded-full"
              />
              <Flame className="w-12 h-12 md:w-16 md:h-16 text-white relative z-10" />
            </div>
          </motion.div>

          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl md:text-4xl font-black text-white"
          >
            Сезон ограничен по времени!
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-base md:text-xl text-white/90 max-w-lg mx-auto"
          >
            Награды исчезнут через{" "}
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="font-black text-yellow-400 inline-block"
            >
              {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}
            </motion.span>
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={cn(
            "rounded-2xl border-2 p-6 md:p-8 text-center",
            "border-red-500/50",
            "bg-gradient-to-br from-red-500/30 via-orange-500/30 to-yellow-500/30",
            "backdrop-blur-sm"
          )}
        >
          <p className="text-sm md:text-base text-white/95 font-medium leading-relaxed">
            Начни фармить SP прямо сейчас и получи все награды до закрытия сезона!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-3 text-sm md:text-base pt-2"
        >
          <input
            type="checkbox"
            id="dont-show"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-transparent cursor-pointer transition-all"
          />
          <label htmlFor="dont-show" className="text-white/80 cursor-pointer hover:text-white transition-colors">
            Больше не показывать
          </label>
        </motion.div>
      </div>
    );
  };

  const slides = [Slide1, Slide2, Slide3, Slide4, Slide5];
  const CurrentSlide = slides[currentSlide];
  const [direction, setDirection] = useState(0);

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const content = (
    <div className="relative flex flex-col" style={{ height: '100%', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {currentSlide > 0 && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </motion.div>
          )}
          <span className="text-xs md:text-sm text-white/60 font-medium">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-white/70 hover:text-white hover:bg-white/10 text-xs md:text-sm rounded-lg"
          >
            Пропустить
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 px-4 md:px-6 pb-4 pt-3">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <motion.button
            key={index}
            onClick={() => goToSlide(index)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "h-2 rounded-full transition-all",
              index === currentSlide
                ? "w-10 bg-white shadow-lg"
                : "w-2 bg-white/30 hover:bg-white/50"
            )}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative min-h-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="absolute inset-0"
          >
            <CurrentSlide />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="p-4 md:p-6 pt-2 space-y-3 border-t border-white/10">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleNext}
            className={cn(
              "w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500",
              "hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600",
              "text-white font-bold shadow-xl hover:shadow-2xl",
              "h-12 md:h-14 text-base md:text-lg",
              "relative overflow-hidden group"
            )}
          >
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {currentSlide === totalSlides - 1 ? (
                <>
                  Начать фармить SP!
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                  </motion.div>
                </>
              ) : (
                <>
                  Далее
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                </>
              )}
            </span>
          </Button>
        </motion.div>
      </div>
    </div>
  );

  // Не логируем каждый рендер - только при изменении open
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className={cn(
            "max-h-[95vh] overflow-hidden p-0 border-0 rounded-t-[32px]",
            seasonTheme.gradient,
            seasonTheme.border,
            seasonTheme.glow,
            "relative backdrop-blur-xl"
          )}
          hideCloseButton
        >
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none z-0", seasonTheme.decorativePrimary)} />
          <div className={cn("absolute inset-0 opacity-70 pointer-events-none z-0", seasonTheme.decorativeSecondary)} />
          <div className="relative z-10 h-full flex flex-col w-full">
            {content ? content : <div className="text-white p-4">Content not loaded (mobile)</div>}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-duel-pass-onboarding="true"
        className={cn(
          "w-[95vw] max-w-3xl p-0 border-0 rounded-3xl",
          seasonTheme.gradient,
          seasonTheme.border,
          seasonTheme.glow,
          "relative backdrop-blur-xl",
          "[&>button]:hidden",
          "bg-slate-950",
          "!grid !grid-rows-1",
          "!z-[2147483646]",
          // Переопределяем анимацию fade-in чтобы opacity был 1 сразу
          "!opacity-100",
          // Отключаем fade-in анимацию полностью
          "[&[data-state=open]]:!opacity-100",
          // Убираем fade-in анимацию
          "[&[data-state=open]]:animate-none",
          // Исправляем позиционирование - убираем все translate классы которые конфликтуют
          "!translate-x-0 !translate-y-0",
          // Переопределяем transform через !important
          "[transform:translate(-50%,-50%)!important]"
        )}
        style={{ 
          opacity: 1, 
          visibility: 'visible', 
          display: 'grid',
          // Исправляем позиционирование - центрируем через top вместо translate-y
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
        hideCloseButton
      >
        <DialogTitle className="sr-only">Duel Pass Onboarding</DialogTitle>
        <DialogDescription className="sr-only">{t("duelPass.onboarding.dialogDescription")}</DialogDescription>
        <div className={cn("absolute inset-0 opacity-70 pointer-events-none z-0", seasonTheme.decorativePrimary)} />
        <div className={cn("absolute inset-0 opacity-70 pointer-events-none z-0", seasonTheme.decorativeSecondary)} />
        <div 
          className="relative z-10 w-full h-full flex flex-col pointer-events-auto" 
          style={{ 
            opacity: 1, 
            visibility: 'visible',
            minHeight: '100%'
          }}
        >
          {content ? (
            content
          ) : (
            <div className="text-white p-4">Content is null or undefined!</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
