import { PremiumLessonNode } from "./PremiumLessonNode";
import { Topic, TopicProgress } from "./TopicCard";
import { Subtopic } from "@/utils/materialApi";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumModuleSectionProps {
  topic: Topic;
  topicIndex: number;
  subtopics: Subtopic[];
  isUnlocked: boolean;
  currentSubtopicIndex: number;
  onSubtopicClick: (subtopicId: string) => void;
  progress?: TopicProgress;
}

export const PremiumModuleSection = ({
  topic,
  topicIndex,
  subtopics,
  isUnlocked,
  currentSubtopicIndex,
  onSubtopicClick,
  progress,
}: PremiumModuleSectionProps) => {
  const progressPercent = progress?.progressPercent || 0;
  const isCompleted = progress?.completed || false;

  return (
    <div className="mb-16">
      {/* Module Header - Minimalist */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold",
              isCompleted 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : isUnlocked
                ? "bg-slate-50 text-slate-700 border border-slate-200"
                : "bg-slate-100 text-slate-400 border border-slate-200"
            )}>
              {topic.number || topicIndex + 1}
            </div>
            <div>
              <h2 className={cn(
                "text-xl font-semibold tracking-tight",
                isUnlocked ? "text-slate-900" : "text-slate-400"
              )}>
                {topic.title_ru}
              </h2>
              {topic.description_ru && (
                <p className="text-sm text-slate-500 mt-0.5">{topic.description_ru}</p>
              )}
            </div>
          </div>
          {isUnlocked && (
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
              <BookOpen className="w-4 h-4" />
              <span>Справочник</span>
            </button>
          )}
        </div>
        
        {/* Progress Bar - Subtle */}
        {isUnlocked && progress && progress.totalSubtopicCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {progress.completedSubtopicCount} из {progress.totalSubtopicCount} уроков
              </span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lessons List - Clean Vertical Layout */}
      {subtopics.length > 0 ? (
        <div className="space-y-3">
          {subtopics.map((subtopic, subtopicIdx) => {
            const isSubtopicUnlocked = isUnlocked && subtopicIdx <= currentSubtopicIndex + 1;
            const isActive = isUnlocked && subtopicIdx === currentSubtopicIndex;
            const isCompleted = isUnlocked && subtopicIdx < currentSubtopicIndex;

            return (
              <PremiumLessonNode
                key={subtopic.id}
                subtopic={subtopic}
                lessonIndex={subtopicIdx}
                isUnlocked={isSubtopicUnlocked}
                isActive={isActive}
                isCompleted={isCompleted}
                onClick={() => isSubtopicUnlocked && onSubtopicClick(subtopic.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-sm">
          Уроки будут добавлены в ближайшее время
        </div>
      )}
    </div>
  );
};

