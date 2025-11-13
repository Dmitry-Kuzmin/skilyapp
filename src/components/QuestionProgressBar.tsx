import { Button } from '@/components/ui/button';
import { X, Grid3x3, Bookmark, BookmarkCheck, MoreVertical } from 'lucide-react';
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
  className,
}: QuestionProgressBarProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

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

        {/* Horizontal Progress Bar */}
        <div className="flex-1 h-2.5 sm:h-3 bg-muted/50 rounded-full overflow-hidden shadow-inner border border-border/30 min-w-[60px]">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
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

