import { Button } from '@/components/ui/button';
import { X, Grid3x3, Bookmark, BookmarkCheck, MoreVertical, CheckCircle2, XCircle, Clock, Sparkles, Flag, Coins, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePDDContext } from '@/contexts/PDDContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CompactStreakJewel } from './shared/CompactStreakJewel';

interface QuestionProgressBarProps {
  currentIndex: number;
  totalQuestions: number;
  onClose?: () => void;
  showClose?: boolean;

  // Optional: Question map button
  onShowQuestionMap?: () => void;
  showQuestionMap?: boolean;

  // Optional: Bookmark button
  onToggleBookmark?: () => void;
  isBookmarked?: boolean;
  bookmarkLoading?: boolean;

  // Optional: Settings menu
  onOpenSettings?: () => void;
  SettingsMenuComponent?: React.ReactNode;

  // Optional: Timer or other custom content
  customLeftContent?: React.ReactNode;

  // Optional: Answers for visual indicators
  answers?: Array<{ isCorrect: boolean }>;

  // Optional: Hide correct/incorrect indicators (e.g. in exam mode)
  hideScoreIndicators?: boolean;

  className?: string;
  layout?: 'standard' | 'focus';
  streak?: number;
  onToggleTranslation?: () => void;
  showTranslation?: boolean;
  onToggleSmartVocabulary?: () => void;
  smartVocabularyEnabled?: boolean;
  onReportProblem?: () => void;
  betInfo?: {
    betAmount: number;
    totalBank: number;
    currency: string;
  } | null;
}

export function QuestionProgressBar({
  currentIndex,
  totalQuestions,
  onClose,
  showClose = true,
  onShowQuestionMap,
  showQuestionMap = true,
  onToggleBookmark,
  isBookmarked = false,
  bookmarkLoading = false,
  onOpenSettings,
  SettingsMenuComponent,
  customLeftContent,
  answers = [],
  hideScoreIndicators = false,
  streak = 0,
  className,
  layout = 'standard',
  onToggleTranslation,
  showTranslation = false,
  onToggleSmartVocabulary,
  smartVocabularyEnabled = false,
  onReportProblem,
  betInfo,
}: QuestionProgressBarProps) {
  const { t } = useLanguage();
  const { selectedCountry } = usePDDContext();
  const isRussia = selectedCountry === 'russia';

  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const correctCount = answers.filter(a => a.isCorrect).length;
  const incorrectCount = answers.filter(a => !a.isCorrect).length;

  // Components for reuse
  const QuestionCountBlock = () => (
    currentIndex !== undefined && totalQuestions !== undefined && (
      onShowQuestionMap ? (
        <button
          onClick={onShowQuestionMap}
          className={cn(
            "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl backdrop-blur-md shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 border group shrink-0",
            isRussia
              ? "bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-blue-500/50"
              : "bg-background/80 border-border/50 hover:border-accent/50"
          )}
        >
          <Grid3x3 className={cn(
            "w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover:scale-110 transition-transform",
            isRussia ? "text-blue-600 dark:text-blue-400" : "text-accent"
          )} />
          <span className="font-bold text-foreground text-sm sm:text-base">
            {currentIndex + 1}<span className="text-muted-foreground text-xs sm:text-sm font-medium">/{totalQuestions}</span>
          </span>
        </button>
      ) : (
        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/20 backdrop-blur-md border border-border/10 shrink-0">
          <span className="font-bold text-foreground text-sm flex items-center gap-0.5">
            {currentIndex + 1}
            <span className="text-muted-foreground/60 text-xs font-semibold">/{totalQuestions}</span>
          </span>
        </div>
      )
    )
  );

  const BankBlock = () => (
    betInfo && betInfo.totalBank > 0 && (
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)] shrink-0"
      >
        <div className="relative">
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-amber-400 blur-[4px] rounded-full -z-10"
          />
        </div>
        <div className="flex flex-col leading-none">
      <span className="text-[7px] xs:text-[8px] font-black text-amber-500/70 uppercase tracking-tighter mb-0.5 text-left">{t('duel.bank') || 'BANK'}</span>
          <span className="text-[12px] font-black tracking-tight text-amber-600 dark:text-amber-400">
            {betInfo.totalBank}
          </span>
        </div>
      </motion.div>
    )
  );

  return (
    <div className={cn("w-full flex flex-col z-[100]", className)}>

      <div className={cn(
        "w-full max-w-[1300px] mx-auto flex items-center justify-between gap-1.5 sm:gap-4 relative py-1",
      )}>
        {/* Close button (Always on left) */}
        {showClose && onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors shadow-sm border border-border/30 h-9 w-9 sm:h-11 sm:w-11",
            )}
          >
            <X className={cn(
              "transition-transform duration-300",
              layout === 'focus' ? "h-5 w-5 sm:h-6 sm:h-6 group-hover:rotate-90" : "h-4 w-4 sm:h-5 sm:h-5"
            )} />
          </Button>
        )}

        {/* Custom left content (e.g. timer) */}
        {customLeftContent}

        {/* Progress Bar - растягивается по центру */}
        <div className="flex items-center gap-1.5 sm:gap-4 flex-1 min-w-0">
          {/* Question Counter - Visible on all screens now */}
          <div>
            <QuestionCountBlock />
          </div>

          {/* ── Capsule / Line Progress ───────────────────────────────── */}
          <div className="flex-1 flex items-center gap-[2px] sm:gap-[3px] min-w-0">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const answered = i < answers.length;
              const isCurrent = i === currentIndex;
              const isCorrect = answered && answers[i].isCorrect;
              const isWrong   = answered && !answers[i].isCorrect;
              const isLast    = i === answers.length - 1;
              const isMobileLines = totalQuestions > 20;

              return (
                <motion.div
                  key={i}
                  initial={answered ? { scale: 0.4, opacity: 0 } : false}
                  animate={
                    isWrong && isLast
                      ? { scale: [0.4, 1.15, 0.95, 1.05, 1], x: [0, -2, 2, -1, 0], opacity: 1 }
                      : isCorrect && isLast
                      ? { scale: [0.4, 1.25, 0.95, 1], opacity: 1 }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={{
                    duration: isLast && answered ? 0.5 : 0.25,
                    ease: isLast && answered ? 'easeOut' : 'backOut',
                  }}
                  className={cn(
                    "flex-1 min-w-0 rounded-full origin-center relative overflow-hidden",
                    "transition-[background,box-shadow] duration-500",
                    isMobileLines
                      ? "h-[3px] sm:h-[7px]"
                      : "h-[7px] sm:h-[9px]",

                    // ── ВЕРНО: глубокий, благородный teal/emerald
                    isCorrect && [
                      "bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-500",
                      "shadow-[0_0_8px_rgba(16,185,129,0.35),inset_0_-1px_2px_rgba(0,0,0,0.2)]",
                    ],

                    // ── ОШИБКА: приглушённый rose, не кричащий
                    isWrong && [
                      "bg-gradient-to-r from-rose-500/80 via-rose-500 to-rose-500/80",
                      "shadow-[0_0_8px_rgba(244,63,94,0.3),inset_0_-1px_2px_rgba(0,0,0,0.25)]",
                    ],

                    // ── ТЕКУЩИЙ: indigo → cyan, пульсация
                    isCurrent && !answered && [
                      "bg-gradient-to-r from-indigo-500 via-blue-400 to-cyan-400",
                      "shadow-[0_0_12px_rgba(99,102,241,0.6)]",
                    ],

                    // ── ПУСТОЙ
                    !answered && !isCurrent && "bg-white/[0.07] dark:bg-white/[0.06]",
                  )}
                  style={
                    isCurrent && !answered
                      ? { animation: 'pulse 1.6s ease-in-out infinite' }
                      : undefined
                  }
                >
                  {/* Бегущий блик на текущем (показывает что юзер ЗДЕСЬ) */}
                  {isCurrent && !answered && (
                    <motion.div
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      style={{ width: '40%' }}
                    />
                  )}

                  {/* Glossy блик-shine на правильных ответах */}
                  {isCorrect && (
                    <div
                      className="absolute inset-x-0 top-0 h-[40%] rounded-t-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none"
                    />
                  )}

                  {/* Glossy на ошибочных */}
                  {isWrong && (
                    <div
                      className="absolute inset-x-0 top-0 h-[40%] rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* 💰 Bank / Pot */}
          <BankBlock />

          {/* Score indicators — только на десктопе, только если hideScoreIndicators=false */}
          {answers.length > 0 && !hideScoreIndicators && (
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{correctCount}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                <XCircle className="w-3 h-3 text-red-500" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">{incorrectCount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Controls - Bookmark + Settings + Close (in focus mode) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">


          {/* Bookmark Button */}
          {onToggleBookmark && (
            <button
              id="challenge-bank-bookmark-button"
              onClick={onToggleBookmark}
              disabled={bookmarkLoading}
              className={cn(
                "flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl transition-all active:scale-95 backdrop-blur-sm border-2",
                isBookmarked
                  ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/10"
                  : "bg-background border-border/50 hover:bg-muted/50 shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              )}
              title={isBookmarked ? t('test.removeFromBookmarks') : t('test.addToBookmarks')}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          )}




          {/* Settings Menu */}
          {SettingsMenuComponent}


          {/* Smart Vocabulary Toggle - Sparkles Icon */}
          {onToggleSmartVocabulary && (
            <button
              onClick={onToggleSmartVocabulary}
              className={cn(
                "flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full transition-all duration-500 active:scale-90 border",
                smartVocabularyEnabled
                  ? "bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/10 ring-4 ring-amber-500/5 animate-pulse"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
              )}
              title={smartVocabularyEnabled ? t('lumiCollapse') : t('test.wordHints')}
            >
              <Sparkles className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-500",
                smartVocabularyEnabled ? "scale-110 rotate-12" : "scale-100 rotate-0"
              )} />
            </button>
          )}


        </div>
      </div>
    </div >
  );
}

