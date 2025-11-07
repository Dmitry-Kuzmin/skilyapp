import { Play, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topic, TopicProgress } from "./TopicCard";
import { DuolingoPathNode } from "./DuolingoPathNode";
import { cn } from "@/lib/utils";

interface DuolingoLearningPathProps {
  topics: Topic[];
  topicsProgress: Map<string, TopicProgress>;
  activeTopicId: string | null;
  nextTopicId: string | null;
  onTopicClick: (topic: Topic) => void;
  onStartClick: () => void;
  className?: string;
}

export const DuolingoLearningPath = ({
  topics,
  topicsProgress,
  activeTopicId,
  nextTopicId,
  onTopicClick,
  onStartClick,
  className,
}: DuolingoLearningPathProps) => {
  // Находим индекс активной темы для позиционирования персонажа
  const activeIndex = nextTopicId
    ? topics.findIndex((t) => t.id === nextTopicId)
    : activeTopicId
    ? topics.findIndex((t) => t.id === activeTopicId)
    : -1;

  return (
    <div className={cn("flex justify-center relative min-h-[600px]", className)}>
      {/* Персонаж Duolingo на пути (позиционируется слева от активной темы) */}
      {activeIndex >= 0 && (
        <div
          className="absolute left-[-100px] md:left-[-120px] transition-all duration-500 z-20 hidden md:block"
          style={{
            top: `${activeIndex * 140 + 60}px`,
          }}
        >
          <div className="relative">
            {/* Простой персонаж (зеленый круг с иконкой) */}
            <div className="w-16 h-16 bg-[#58CC02] rounded-full flex items-center justify-center shadow-lg border-4 border-white">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Вертикальный путь */}
      <div className="relative flex flex-col items-center py-8">
        {topics.map((topic, index) => {
          const progress = topicsProgress.get(topic.id);
          const isLocked = progress ? !progress.isUnlocked : index > 0;
          const isActive = topic.id === activeTopicId;
          const isNext = topic.id === nextTopicId;
          const isCompleted = progress?.completed ?? false;

          return (
            <div key={topic.id} className="relative flex flex-col items-center">
              {/* Кнопка "ПЕРЕЙТИ СЮДА?" для следующего урока */}
              {isNext && !isCompleted && (
                <div className="mb-6">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white hover:bg-gray-50 text-gray-800 border-gray-300 px-8 py-4 text-base font-semibold rounded-lg shadow-md"
                    onClick={onStartClick}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    ПЕРЕЙТИ СЮДА?
                  </Button>
                </div>
              )}

              {/* Соединительная линия */}
              {index < topics.length - 1 && (
                <div
                  className={cn(
                    "w-1 transition-colors duration-300",
                    isCompleted
                      ? "bg-[#58CC02]"
                      : progress?.isUnlocked
                      ? "bg-[#8CD4FF]"
                      : "bg-[#E5E5E5]"
                  )}
                  style={{ height: "100px", minHeight: "100px" }}
                />
              )}

              {/* Узел темы */}
              <DuolingoPathNode
                topic={topic}
                progress={progress}
                isLocked={isLocked}
                isActive={isActive}
                isNext={isNext}
                onClick={() => onTopicClick(topic)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

