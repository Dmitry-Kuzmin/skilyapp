import { EnhancedLessonNode } from "./EnhancedLessonNode";
import { Topic, TopicProgress } from "./TopicCard";
import { Subtopic } from "@/utils/materialApi";
import { BookOpen, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Card } from "@/components/ui/card";

interface EnhancedModuleSectionProps {
  topic: Topic;
  topicIndex: number;
  subtopics: Subtopic[];
  isUnlocked: boolean;
  currentSubtopicIndex: number;
  onSubtopicClick: (subtopicId: string) => void;
  progress?: TopicProgress;
  isLoading?: boolean;
  onExpand?: () => void;
}

export const EnhancedModuleSection = ({
  topic,
  topicIndex,
  subtopics,
  isUnlocked,
  currentSubtopicIndex,
  onSubtopicClick,
  progress,
  isLoading = false,
  onExpand,
}: EnhancedModuleSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(topicIndex === 0 || (progress?.isUnlocked && !progress?.completed));
  const progressPercent = progress?.progressPercent || 0;
  const isCompleted = progress?.completed || false;
  const hasSubtopics = subtopics.length > 0 || isLoading;

  const handleToggleExpand = () => {
    if (!isExpanded && onExpand) {
      onExpand();
    }
    setIsExpanded(!isExpanded);
  };

  // Определяем цветовую схему для темы
  const getTopicColorScheme = () => {
    const schemes = [
      { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", accent: "bg-blue-500", light: "bg-blue-100" },
      { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", accent: "bg-emerald-500", light: "bg-emerald-100" },
      { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", accent: "bg-purple-500", light: "bg-purple-100" },
      { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", accent: "bg-amber-500", light: "bg-amber-100" },
      { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", accent: "bg-rose-500", light: "bg-rose-100" },
      { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900", accent: "bg-indigo-500", light: "bg-indigo-100" },
    ];
    return schemes[topicIndex % schemes.length];
  };

  const colors = getTopicColorScheme();

  return (
    <Card className={cn(
      "mb-6 overflow-hidden transition-all duration-300",
      colors.bg,
      colors.border,
      "border-2",
      !isUnlocked && "opacity-60"
    )}>
      {/* Module Header */}
      <button
        onClick={handleToggleExpand}
        className={cn(
          "w-full p-6 text-left transition-all duration-200",
          "hover:bg-white/50 cursor-pointer"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Topic Number Badge */}
            <div className={cn(
              "flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm",
              isCompleted 
                ? "bg-emerald-500 text-white" 
                : isUnlocked
                ? `${colors.accent} text-white`
                : "bg-slate-200 text-slate-500"
            )}>
              {isCompleted ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                topic.number || topicIndex + 1
              )}
            </div>

            {/* Topic Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className={cn(
                  "text-xl font-bold tracking-tight",
                  isUnlocked ? colors.text : "text-slate-400"
                )}>
                  {topic.title_ru}
                </h2>
                {!isUnlocked && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600 rounded-md">
                    Заблокировано
                  </span>
                )}
                {isCompleted && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-md">
                    Завершено
                  </span>
                )}
              </div>
              
              {topic.description_ru && (
                <p className={cn(
                  "text-sm mb-3",
                  isUnlocked ? "text-slate-600" : "text-slate-400"
                )}>
                  {topic.description_ru}
                </p>
              )}

              {/* Progress Bar */}
              {isUnlocked && progress && progress.totalSubtopicCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn("font-medium", colors.text)}>
                      {progress.completedSubtopicCount} из {progress.totalSubtopicCount} уроков
                    </span>
                    <span className={cn("font-semibold", colors.text)}>
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isCompleted ? "bg-emerald-500" : colors.accent
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expand/Collapse & Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isUnlocked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to topic detail - можно добавить навигацию позже
                }}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white/70 rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Справочник</span>
              </button>
            )}
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              isUnlocked ? colors.light : "bg-slate-100"
            )}>
              {isExpanded ? (
                <ChevronUp className={cn("w-5 h-5", isUnlocked ? colors.text : "text-slate-400")} />
              ) : (
                <ChevronDown className={cn("w-5 h-5", isUnlocked ? colors.text : "text-slate-400")} />
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Lessons List - Expandable */}
      {isExpanded && (
        <div className={cn(
          "border-t transition-all duration-300",
          colors.border,
          "bg-white/30"
        )}>
          <div className="p-4 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  <span className="text-sm">Загрузка уроков...</span>
                </div>
              </div>
            ) : subtopics.length > 0 ? (
              subtopics.map((subtopic, subtopicIdx) => {
                const isSubtopicUnlocked = isUnlocked && subtopicIdx <= currentSubtopicIndex + 1;
                const isActive = isUnlocked && subtopicIdx === currentSubtopicIndex;
                const isCompleted = isUnlocked && subtopicIdx < currentSubtopicIndex;

                return (
                  <EnhancedLessonNode
                    key={subtopic.id}
                    subtopic={subtopic}
                    lessonIndex={subtopicIdx}
                    isUnlocked={isSubtopicUnlocked}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    onClick={() => isSubtopicUnlocked && onSubtopicClick(subtopic.id)}
                    colorScheme={colors}
                  />
                );
              })
            ) : (
              <div className="px-4 py-6">
                <p className="text-sm text-slate-500 text-center">
                  Уроки будут добавлены в ближайшее время
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

