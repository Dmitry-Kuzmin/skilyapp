import { Lock, CheckCircle2, BookOpen, FileText, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Subtopic } from "@/utils/materialApi";

interface PremiumLessonNodeProps {
  subtopic: Subtopic;
  lessonIndex: number;
  isUnlocked: boolean;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

export const PremiumLessonNode = ({
  subtopic,
  lessonIndex,
  isUnlocked,
  isActive,
  isCompleted,
  onClick,
}: PremiumLessonNodeProps) => {
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

  return (
    <button
      onClick={onClick}
      disabled={!isUnlocked}
      className={cn(
        "w-full group relative",
        "flex items-center gap-4 p-4 rounded-xl",
        "border transition-all duration-200",
        "text-left",
        !isUnlocked && "cursor-not-allowed opacity-50",
        isUnlocked && !isActive && !isCompleted && "hover:bg-slate-50 hover:border-slate-200 cursor-pointer",
        isActive && "bg-blue-50 border-blue-200 shadow-sm",
        isCompleted && "bg-emerald-50 border-emerald-200",
        !isUnlocked && "bg-slate-50 border-slate-200"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
        "transition-colors duration-200",
        isCompleted && "bg-emerald-100 text-emerald-700",
        isActive && "bg-blue-100 text-blue-700",
        !isUnlocked && "bg-slate-100 text-slate-400",
        isUnlocked && !isActive && !isCompleted && "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
      )}>
        {!isUnlocked ? (
          <Lock className="w-5 h-5" />
        ) : isCompleted ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "text-sm font-semibold truncate",
              isCompleted && "text-emerald-900",
              isActive && "text-blue-900",
              !isUnlocked && "text-slate-400",
              isUnlocked && !isActive && !isCompleted && "text-slate-900"
            )}>
              {subtopic.title_ru}
            </h3>
            <p className={cn(
              "text-xs mt-0.5",
              isCompleted && "text-emerald-600",
              isActive && "text-blue-600",
              !isUnlocked && "text-slate-400",
              isUnlocked && !isActive && !isCompleted && "text-slate-500"
            )}>
              {getTypeLabel()}
            </p>
          </div>
          
          {/* Status Indicator */}
          {isUnlocked && (
            <div className="flex-shrink-0">
              {isCompleted ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              ) : isActive ? (
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

