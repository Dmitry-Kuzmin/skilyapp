import { Button } from '@/components/ui/button';
import { X, Grid3x3, Bookmark, BookmarkCheck, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  
  className?: string;
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
  className,
}: QuestionProgressBarProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const correctCount = answers.filter(a => a.isCorrect).length;
  const incorrectCount = answers.filter(a => !a.isCorrect).length;

  return (
    <div className={cn("flex items-center gap-2 sm:gap-3", className)}>
      {/* Close button слева */}
      {showClose && onClose && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors shadow-sm border border-border/30"
        >
          <X className="h-4 w-4 sm:h-5 sm:h-5" />
        </Button>
      )}

      {/* Custom left content (e.g. timer) */}
      {customLeftContent}

      {/* Progress Bar - растягивается по центру */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {/* Question Counter */}
        {showQuestionMap && onShowQuestionMap ? (
          <button
            onClick={onShowQuestionMap}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-background/80 backdrop-blur-md shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 border border-border/50 hover:border-accent/50 group shrink-0"
          >
            <Grid3x3 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-accent group-hover:scale-110 transition-transform" />
            <span className="font-bold text-foreground text-sm sm:text-base">
              {currentIndex + 1}<span className="text-muted-foreground text-xs sm:text-sm">/{totalQuestions}</span>
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/80 backdrop-blur-md shadow-sm border border-border/30 shrink-0">
            <span className="font-bold text-foreground text-sm">
              {currentIndex + 1}<span className="text-muted-foreground text-xs">/{totalQuestions}</span>
            </span>
          </div>
        )}

        {/* Horizontal Progress Bar with visual indicators */}
        <div className="flex-1 h-2.5 sm:h-3 bg-muted/50 rounded-full overflow-hidden shadow-inner border border-border/30 min-w-[60px] relative">
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
          
          {/* Visual indicators for answered questions - современные компактные индикаторы */}
          {answers.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              {answers.map((answer, idx) => {
                const position = ((idx + 1) / totalQuestions) * 100;
                return (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.03, duration: 0.2, type: "spring", stiffness: 300 }}
                    className={cn(
                      "absolute rounded-full transition-all duration-200",
                      answer.isCorrect
                        ? "w-2 h-2 bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2),0_1px_2px_rgba(0,0,0,0.1)]"
                        : "w-2 h-2 bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2),0_1px_2px_rgba(0,0,0,0.1)]"
                    )}
                    style={{ 
                      left: `calc(${position}% - 4px)`,
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  >
                    {/* Тонкий блик для современного вида */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent" />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Score indicators */}
        {answers.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
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

      {/* Right Side Controls - Bookmark + Settings */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Bookmark Button */}
        {onToggleBookmark && (
          <button
            id="challenge-bank-bookmark-button"
            onClick={onToggleBookmark}
            disabled={bookmarkLoading}
            className={cn(
              "flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 backdrop-blur-sm border",
              isBookmarked
                ? "bg-blue-500 border-blue-500 text-white hover:bg-blue-600"
                : "bg-background border-border/50 hover:bg-muted/50"
            )}
            title={isBookmarked ? "Удалить из закладок" : "Добавить в закладки"}
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
      </div>
    </div>
  );
}

