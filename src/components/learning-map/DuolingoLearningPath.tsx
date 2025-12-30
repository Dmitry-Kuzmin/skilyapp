import { Play, BookOpen, Sparkles } from "lucide-react";
import { Topic, TopicProgress } from "./TopicCard";
import { DuolingoPathNode } from "./DuolingoPathNode";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "@/components/optimized/Motion";

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
      {/* Персонаж справа от пути (Duolingo style) */}
      {activeIndex >= 0 && (
        <motion.div
          initial={false}
          animate={{
            right: "calc(50% - 200px)", // Справа от пути
            top: `${activeIndex * 85 + 15}px`,
          }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="absolute z-20 hidden lg:block"
        >
          <div className="relative">
            {/* Персонаж - упрощенная версия (можно заменить на SVG) */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                y: [0, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="relative"
            >
              {/* Тело персонажа */}
              <div className="w-20 h-20 bg-gradient-to-br from-[#FFB84D] to-[#FF8C42] rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                {/* Лицо */}
                <div className="relative">
                  {/* Глаза */}
                  <div className="flex gap-2 mb-1">
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                  </div>
                  {/* Улыбка */}
                  <div className="w-6 h-3 border-2 border-black rounded-b-full border-t-0"></div>
                </div>
              </div>
              {/* Голова с повязкой */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-8 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-full border-2 border-white"></div>
              {/* Костёр (маленький) */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-gradient-to-t from-[#FF6B35] to-[#FF8C42] rounded-t-full opacity-80"></div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Вертикальный путь с зигзагом - уменьшены отступы */}
      <div className="relative flex flex-col items-center py-4">
        {topics.map((topic, index) => {
          const progress = topicsProgress.get(topic.id);
          const isLocked = progress ? !progress.isUnlocked : index > 0;
          const isActive = topic.id === activeTopicId;
          const isNext = topic.id === nextTopicId;
          const isCompleted = progress?.completed ?? false;
          const nodeOffset = getNodeOffset(index);
          const nextNodeOffset = index < topics.length - 1 ? getNodeOffset(index + 1) : 0;

          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="relative flex flex-col items-center"
              style={{
                transform: `translateX(${nodeOffset}px)`,
              }}
            >

              {/* Кривая соединительная линия для зигзага - уменьшена высота */}
              {index < topics.length - 1 && (
                <div
                  className="relative mb-1"
                  style={{ height: "70px", width: "220px" }}
                >
                  <svg
                    className="absolute"
                    style={{ 
                      width: "220px", 
                      height: "70px", 
                      left: '50%', 
                      transform: 'translateX(-50%)',
                      overflow: 'visible'
                    }}
                    viewBox="0 0 220 70"
                  >
                    {/* Вычисляем контрольную точку для плавной кривой - адаптировано под новую высоту */}
                    <path
                      d={`M 110 0 Q ${110 + (nextNodeOffset - nodeOffset) / 2} 35 110 70`}
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
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <DuolingoPathNode
                  topic={topic}
                  progress={progress}
                  isLocked={isLocked}
                  isActive={isActive}
                  isNext={isNext}
                  onClick={() => onTopicClick(topic)}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Кнопка "ПЕРЕЙТИ СЮДА?" внизу пути (Duolingo style) */}
      {nextTopicId && topics.find(t => t.id === nextTopicId) && !topicsProgress.get(nextTopicId)?.completed && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="mt-8 flex justify-center"
          >
            <button
              onClick={onStartClick}
              className="relative bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3B82F6] text-white border-0 px-8 py-5 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-3 group"
            >
              {/* Иконка play в круге */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Play className="w-6 h-6 text-white" fill="white" />
                </div>
                {/* Маленькая звездочка в углу */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                  <Sparkles className="w-3 h-3 text-yellow-600" fill="currentColor" />
                </div>
              </div>
              <span className="font-bold text-white text-lg">ПЕРЕЙТИ СЮДА?</span>
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

