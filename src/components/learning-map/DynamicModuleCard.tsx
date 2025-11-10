import { Topic, TopicProgress } from "./TopicCard";
import { Subtopic } from "@/utils/materialApi";
import { BookOpen, Play, Loader2, Star, Trophy, Lock, CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DynamicModuleCardProps {
  topic: Topic;
  topicIndex: number;
  subtopics: Subtopic[];
  isUnlocked: boolean;
  currentSubtopicIndex: number;
  onSubtopicClick: (subtopicId: string) => void;
  progress?: TopicProgress;
  isLoading?: boolean;
  onExpand?: () => void;
  onStartClick?: () => void;
}

export const DynamicModuleCard = ({
  topic,
  topicIndex,
  subtopics,
  isUnlocked,
  currentSubtopicIndex,
  onSubtopicClick,
  progress,
  isLoading = false,
  onExpand,
  onStartClick,
}: DynamicModuleCardProps) => {
  const progressPercent = progress?.progressPercent || 0;
  const isCompleted = progress?.completed || false;
  const hasSubtopics = subtopics.length > 0;
  
  // Показываем уроки всегда (автоматически развернуто для лучшего UX)
  const isExpanded = true;

  // Определяем цветовую схему для темы с более яркими градиентами
  const getTopicColorScheme = () => {
    const schemes = [
      { 
        gradient: "from-blue-500 via-blue-600 to-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-300",
        text: "text-blue-900",
        accent: "bg-blue-500",
        light: "bg-blue-100",
        button: "bg-white/20 hover:bg-white/30"
      },
      { 
        gradient: "from-emerald-500 via-emerald-600 to-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-300",
        text: "text-emerald-900",
        accent: "bg-emerald-500",
        light: "bg-emerald-100",
        button: "bg-white/20 hover:bg-white/30"
      },
      { 
        gradient: "from-purple-500 via-purple-600 to-purple-700",
        bg: "bg-purple-50",
        border: "border-purple-300",
        text: "text-purple-900",
        accent: "bg-purple-500",
        light: "bg-purple-100",
        button: "bg-white/20 hover:bg-white/30"
      },
      { 
        gradient: "from-amber-500 via-amber-600 to-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-300",
        text: "text-amber-900",
        accent: "bg-amber-500",
        light: "bg-amber-100",
        button: "bg-white/20 hover:bg-white/30"
      },
      { 
        gradient: "from-rose-500 via-rose-600 to-rose-700",
        bg: "bg-rose-50",
        border: "border-rose-300",
        text: "text-rose-900",
        accent: "bg-rose-500",
        light: "bg-rose-100",
        button: "bg-white/20 hover:bg-white/30"
      },
      { 
        gradient: "from-indigo-500 via-indigo-600 to-indigo-700",
        bg: "bg-indigo-50",
        border: "border-indigo-300",
        text: "text-indigo-900",
        accent: "bg-indigo-500",
        light: "bg-indigo-100",
        button: "bg-white/20 hover:bg-white/30"
      },
    ];
    return schemes[topicIndex % schemes.length];
  };

  const colors = getTopicColorScheme();

  const handleToggleExpand = () => {
    if (onExpand) {
      onExpand();
    }
  };

  const handleStart = () => {
    if (onStartClick) {
      onStartClick();
    } else if (hasSubtopics && subtopics.length > 0) {
      onSubtopicClick(subtopics[0].id);
    }
  };

  return (
    <div className="mb-8">
      {/* Module Header Card - Большая яркая карточка с градиентом */}
      <Card className={cn(
        "overflow-hidden border-0 shadow-xl mb-6 transition-all duration-300",
        `bg-gradient-to-r ${colors.gradient}`,
        !isUnlocked && "opacity-70"
      )}>
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                  <span className="text-white text-xs font-bold uppercase tracking-wider">
                    Тема {topic.number || topicIndex + 1}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight">
                {topic.title_ru}
              </h2>
              {topic.description_ru && (
                <p className="text-white/90 text-sm md:text-base leading-relaxed max-w-2xl">
                  {topic.description_ru}
                </p>
              )}
            </div>
            {isUnlocked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to reference
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
                  colors.button,
                  "backdrop-blur-sm border border-white/30 shadow-lg hover:scale-105"
                )}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">СПРАВОЧНИК</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Start Button - только для активной незавершенной темы */}
      {isUnlocked && !isCompleted && hasSubtopics && subtopics.length > 0 && (
        <div className="mb-6 flex justify-center">
          <Button
            onClick={handleStart}
            size="lg"
            className="bg-white text-slate-900 hover:bg-slate-50 font-bold px-8 py-6 text-lg rounded-xl shadow-xl hover:scale-105 transition-all duration-200 border-2 border-slate-200"
          >
            <Play className="w-5 h-5 mr-2" />
            НАЧАТЬ
          </Button>
        </div>
      )}

      {/* Lessons Path - зигзагообразный путь с соединениями */}
      {isExpanded && (
        <div className="relative py-4">
          <div className="space-y-4 relative">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Загрузка уроков...</span>
                </div>
              </div>
            ) : hasSubtopics && subtopics.length > 0 ? (
              subtopics.map((subtopic, subtopicIdx) => {
                const isSubtopicUnlocked = isUnlocked && subtopicIdx <= currentSubtopicIndex + 1;
                const isActive = isUnlocked && subtopicIdx === currentSubtopicIndex;
                const isCompleted = isUnlocked && subtopicIdx < currentSubtopicIndex;
                const align = subtopicIdx % 2 === 0 ? "left" : "right";
                const isLast = subtopicIdx === subtopics.length - 1;
                const nextAlign = !isLast ? (subtopicIdx + 1) % 2 === 0 ? "left" : "right" : null;

                return (
                  <div key={subtopic.id} className="relative">
                    {/* Плавная кривая соединительная линия к следующему уроку */}
                    {!isLast && (
                      <svg
                        className="absolute left-1/2 -translate-x-1/2 z-0 pointer-events-none"
                        style={{
                          top: "calc(100% - 20px)",
                          width: "200px",
                          height: "80px",
                          overflow: "visible",
                        }}
                      >
                        <path
                          d={
                            align === "left" && nextAlign === "right"
                              ? "M 100 20 Q 150 40 100 60"
                              : align === "right" && nextAlign === "left"
                              ? "M 100 20 Q 50 40 100 60"
                              : "M 100 20 L 100 60"
                          }
                          stroke={
                            isCompleted
                              ? "rgb(16, 185, 129)"
                              : isActive
                              ? "rgb(59, 130, 246)"
                              : isSubtopicUnlocked
                              ? "rgb(148, 163, 184)"
                              : "rgb(203, 213, 225)"
                          }
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          className="transition-colors duration-300"
                        />
                      </svg>
                    )}

                    <DynamicLessonNode
                      subtopic={subtopic}
                      lessonIndex={subtopicIdx}
                      isUnlocked={isSubtopicUnlocked}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      onClick={() => isSubtopicUnlocked && onSubtopicClick(subtopic.id)}
                      align={align}
                      colorScheme={colors}
                    />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                Уроки будут добавлены в ближайшее время
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Компонент узла урока с зигзагообразным расположением
interface DynamicLessonNodeProps {
  subtopic: Subtopic;
  lessonIndex: number;
  isUnlocked: boolean;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  align: "left" | "right";
  colorScheme: any;
}

const DynamicLessonNode = ({
  subtopic,
  lessonIndex,
  isUnlocked,
  isActive,
  isCompleted,
  onClick,
  align,
  colorScheme,
}: DynamicLessonNodeProps) => {
  const getIcon = () => {
    if (subtopic.type === "test") return Trophy;
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
    <div className="relative">
      {/* Метка "Начать" для первого активного урока */}
      {lessonIndex === 0 && isActive && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
          <span className="px-4 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg">
            Начать
          </span>
        </div>
      )}

      <div className={cn(
        "flex items-center gap-4 md:gap-6",
        align === "right" && "flex-row-reverse"
      )}>
        {/* Информационная карточка урока */}
        <Card className={cn(
          "flex-1 p-3 md:p-4 transition-all duration-300 border-2 cursor-pointer",
          isCompleted && "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-300 shadow-md hover:shadow-lg",
          isActive && `bg-gradient-to-br ${colorScheme.bg} border-blue-400 shadow-lg ring-2 ring-blue-300 ring-opacity-50`,
          !isUnlocked && "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed",
          isUnlocked && !isActive && !isCompleted && "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
        )}
        onClick={isUnlocked ? onClick : undefined}
        >
          <div className={cn(
            "flex items-center gap-3",
            align === "right" && "flex-row-reverse text-right"
          )}>
            <div className={cn(
              "flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all",
              isCompleted && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm",
              isActive && `bg-gradient-to-br ${colorScheme.accent} text-white shadow-md`,
              !isUnlocked && "bg-slate-200 text-slate-400",
              isUnlocked && !isActive && !isCompleted && "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600"
            )}>
              <Icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm md:text-base font-bold truncate",
                isCompleted && "text-emerald-900",
                isActive && colorScheme.text,
                !isUnlocked && "text-slate-400",
                isUnlocked && !isActive && !isCompleted && "text-slate-900"
              )}>
                {subtopic.title_ru}
              </p>
              <p className={cn(
                "text-xs md:text-sm truncate mt-0.5",
                isCompleted && "text-emerald-700",
                isActive && "text-slate-600",
                !isUnlocked && "text-slate-400",
                isUnlocked && !isActive && !isCompleted && "text-slate-500"
              )}>
                {getTypeLabel()}
              </p>
            </div>
          </div>
        </Card>

        {/* Круглая кнопка урока - большая и выразительная как в Duolingo */}
        <button
          onClick={onClick}
          disabled={!isUnlocked}
          className={cn(
            "relative flex-shrink-0 w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 border-4 shadow-xl z-10",
            isCompleted && "bg-emerald-500 border-white text-white hover:scale-110 cursor-pointer shadow-emerald-500/30",
            isActive && "bg-blue-500 border-white text-white shadow-2xl shadow-blue-500/40 ring-4 ring-blue-300 ring-opacity-50 cursor-pointer animate-pulse",
            !isUnlocked && "bg-slate-300 border-slate-200 text-slate-500 cursor-not-allowed shadow-none",
            isUnlocked && !isActive && !isCompleted && "bg-slate-100 border-white text-slate-600 hover:scale-105 hover:shadow-lg cursor-pointer shadow-slate-200"
          )}
        >
          {!isUnlocked ? (
            <Lock className="w-7 h-7 md:w-9 md:h-9" strokeWidth={2.5} />
          ) : isCompleted ? (
            <CheckCircle2 className="w-8 h-8 md:w-11 md:h-11" strokeWidth={3} />
          ) : (
            <Icon className="w-7 h-7 md:w-9 md:h-9" strokeWidth={2} />
          )}

          {isActive && (
            <>
              <div className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping" style={{ animationDuration: "2s" }} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

