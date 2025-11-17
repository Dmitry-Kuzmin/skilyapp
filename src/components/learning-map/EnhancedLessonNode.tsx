import { Lock, CheckCircle2, BookOpen, FileText, ClipboardList, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Subtopic } from "@/utils/materialApi";

interface EnhancedLessonNodeProps {
  subtopic: Subtopic;
  lessonIndex: number;
  isUnlocked: boolean;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    accent: string;
    light: string;
  };
}

export const EnhancedLessonNode = ({
  subtopic,
  lessonIndex,
  isUnlocked,
  isActive,
  isCompleted,
  onClick,
  colorScheme,
}: EnhancedLessonNodeProps) => {
  const getIcon = () => {
    if (subtopic.type === "test") return ClipboardList;
    if (subtopic.type === "terms") return BookOpen;
    return FileText; // material
  };

  const Icon = getIcon();

  const getTypeLabel = () => {
    if (subtopic.type === "test") return "Тест";
    if (subtopic.type === "terms") return "Термины";
    return "Материал";
  };

  const getTypeColor = () => {
    if (subtopic.type === "test") return "bg-amber-100 text-amber-700 border-amber-200";
    if (subtopic.type === "terms") return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  return (
    <button
      onClick={onClick}
      disabled={!isUnlocked}
      className={cn(
        "w-full group relative",
        "flex items-center gap-4 p-4 rounded-xl",
        "border-2 transition-all duration-200",
        "text-left",
        !isUnlocked && "cursor-not-allowed opacity-50",
        isUnlocked && !isActive && !isCompleted && "hover:scale-[1.02] hover:shadow-md cursor-pointer",
        isActive && "ring-2 ring-offset-2 shadow-lg ring-blue-500",
        isCompleted && "bg-emerald-50/50 border-emerald-300",
        !isUnlocked && "bg-slate-50 border-slate-200",
        isUnlocked && !isActive && !isCompleted && "bg-white border-slate-200 hover:border-slate-300"
      )}
    >
      {/* Lesson Number & Icon */}
      <div className="flex-shrink-0 flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm",
          "transition-all duration-200",
          isCompleted && "bg-emerald-500 text-white shadow-sm",
          isActive && `${colorScheme.accent} text-white shadow-md scale-110`,
          !isUnlocked && "bg-slate-200 text-slate-400",
          isUnlocked && !isActive && !isCompleted && "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
        )}>
          {!isUnlocked ? (
            <Lock className="w-5 h-5" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isActive ? (
            <Play className="w-5 h-5 fill-current" />
          ) : (
            lessonIndex + 1
          )}
        </div>
        
        {/* Type Icon */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          getTypeColor()
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className={cn(
            "text-sm font-semibold truncate",
            isCompleted && "text-emerald-900",
            isActive && colorScheme.text,
            !isUnlocked && "text-slate-400",
            isUnlocked && !isActive && !isCompleted && "text-slate-900"
          )}>
            {subtopic.title_ru}
          </h3>
          
          {/* Status Badge */}
          {isUnlocked && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {isCompleted && (
                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-md">
                  ✓
                </span>
              )}
              {isActive && (
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-md text-white",
                  colorScheme.accent
                )}>
                  Активно
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-md font-medium",
            getTypeColor()
          )}>
            {getTypeLabel()}
          </span>
          {isUnlocked && !isCompleted && !isActive && (
            <span className="text-xs text-slate-500">
              Готов к изучению
            </span>
          )}
        </div>
      </div>

      {/* Arrow Indicator */}
      {isUnlocked && (
        <div className="flex-shrink-0">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center transition-all",
            isActive && `${colorScheme.light} ${colorScheme.text}`,
            !isActive && "text-slate-400 group-hover:text-slate-600"
          )}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
};

