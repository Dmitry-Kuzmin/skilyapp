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

  // Функция для расчета смещения узла (зигзаг)
  // В Duolingo узлы смещены более плавно, создавая красивый зигзаг
  const getNodeOffset = (index: number) => {
    // Чередуем позиции: четные индексы - влево, нечетные - вправо
    // Смещение для красивого зигзага
    const offset = index % 2 === 0 ? -100 : 100;
    return offset;
  };

  return (
    <div className={cn("relative min-h-[600px] w-full", className)}>
      {/* Персонаж Duolingo на пути */}
      {activeIndex >= 0 && (
        <div
          className="absolute transition-all duration-500 z-20 hidden md:block"
          style={{
            left: `calc(50% + ${getNodeOffset(activeIndex)}px - 80px)`,
            top: `${activeIndex * 140 + 28}px`,
          }}
        >
          <div className="relative">
            <div className="w-16 h-16 bg-[#58CC02] rounded-full flex items-center justify-center shadow-lg border-4 border-white">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Вертикальный путь с зигзагом */}
      <div className="relative flex flex-col items-center py-8">
        {topics.map((topic, index) => {
          const progress = topicsProgress.get(topic.id);
          const isLocked = progress ? !progress.isUnlocked : index > 0;
          const isActive = topic.id === activeTopicId;
          const isNext = topic.id === nextTopicId;
          const isCompleted = progress?.completed ?? false;
          const nodeOffset = getNodeOffset(index);
          const nextNodeOffset = index < topics.length - 1 ? getNodeOffset(index + 1) : 0;

          return (
            <div
              key={topic.id}
              className="relative flex flex-col items-center"
              style={{
                transform: `translateX(${nodeOffset}px)`,
                transition: 'transform 0.3s ease',
              }}
            >
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

              {/* Кривая соединительная линия для зигзага */}
              {index < topics.length - 1 && (
                <div
                  className="relative mb-4"
                  style={{ height: "100px", width: "220px" }}
                >
                  <svg
                    className="absolute"
                    style={{ 
                      width: "220px", 
                      height: "100px", 
                      left: '50%', 
                      transform: 'translateX(-50%)',
                      overflow: 'visible'
                    }}
                    viewBox="0 0 220 100"
                  >
                    {/* Вычисляем контрольную точку для плавной кривой */}
                    <path
                      d={`M 110 0 Q ${110 + (nextNodeOffset - nodeOffset) / 2} 50 110 100`}
                      stroke={
                        isCompleted
                          ? "#58CC02"
                          : progress?.isUnlocked
                          ? "#8CD4FF"
                          : "#E5E5E5"
                      }
                      strokeWidth="3"
                      fill="none"
                      className="transition-colors duration-300"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
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

