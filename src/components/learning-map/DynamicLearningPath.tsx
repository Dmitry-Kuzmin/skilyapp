import { DynamicModuleCard } from "./DynamicModuleCard";
import { Topic, TopicProgress } from "./TopicCard";
import { useEffect, useState, useMemo, useCallback } from "react";

interface DynamicLearningPathProps {
  topics: Topic[];
  topicsProgress: Map<string, TopicProgress>;
  currentTopicId: string | null;
  currentSubtopicIndex: number;
  onSubtopicClick: (subtopicId: string) => void;
  onTopicClick?: (topicId: string) => void;
}

export const DynamicLearningPath = ({
  topics,
  topicsProgress,
  currentTopicId,
  currentSubtopicIndex,
  onSubtopicClick,
  onTopicClick,
}: DynamicLearningPathProps) => {
  // Кэш для загруженных подтем
  const [subtopicsCache, setSubtopicsCache] = useState<Map<string, any[]>>(new Map());
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Функция для загрузки подтем конкретной темы
  const loadSubtopicsForTopic = useCallback(async (topicId: string) => {
    // Если уже загружены, не загружаем снова
    if (subtopicsCache.has(topicId)) {
      return;
    }

    // Если уже загружается, не загружаем повторно
    if (loadingTopics.has(topicId)) {
      return;
    }

    setLoadingTopics(prev => new Set(prev).add(topicId));

    try {
      // Динамический импорт для оптимизации
      const { subtopicApi } = await import("@/utils/materialApi");
      const subtopics = await subtopicApi.getByTopic(topicId);
      setSubtopicsCache(prev => new Map(prev).set(topicId, subtopics));
    } catch (error) {
      console.error(`Error loading subtopics for topic ${topicId}:`, error);
      setSubtopicsCache(prev => new Map(prev).set(topicId, []));
    } finally {
      setLoadingTopics(prev => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
    }
  }, [subtopicsCache, loadingTopics]);

  // Определяем первую разблокированную тему
  const firstUnlockedTopic = useMemo(() => {
    return topics.find((topic, idx) => {
      const progress = topicsProgress.get(topic.id);
      return progress?.isUnlocked ?? idx === 0;
    });
  }, [topics, topicsProgress]);

  // Предзагружаем подтемы для первых 3 разблокированных тем параллельно
  useEffect(() => {
    if (topics.length === 0) return;

    const unlockedTopics = topics.filter((topic, idx) => {
      const progress = topicsProgress.get(topic.id);
      return progress?.isUnlocked ?? idx === 0;
    }).slice(0, 3); // Загружаем только первые 3 темы

    unlockedTopics.forEach(topic => {
      if (!subtopicsCache.has(topic.id) && !loadingTopics.has(topic.id)) {
        loadSubtopicsForTopic(topic.id);
        setExpandedTopics(prev => new Set(prev).add(topic.id));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics.length, topicsProgress.size]);

  // Обработчик раскрытия темы
  const handleExpand = useCallback((topicId: string) => {
    if (!expandedTopics.has(topicId)) {
      setExpandedTopics(prev => new Set(prev).add(topicId));
      loadSubtopicsForTopic(topicId);
    }
  }, [expandedTopics, loadSubtopicsForTopic]);

  // Обработчик кнопки "Начать"
  const handleStart = useCallback((topicId: string) => {
    const subtopics = subtopicsCache.get(topicId);
    if (subtopics && subtopics.length > 0) {
      onSubtopicClick(subtopics[0].id);
    }
  }, [subtopicsCache, onSubtopicClick]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Карта обучения</h1>
        <p className="text-slate-600 text-lg">Изучайте темы последовательно, шаг за шагом</p>
      </div>

      {/* Topics List */}
      <div className="space-y-6">
        {topics.map((topic, topicIdx) => {
          const subtopics = subtopicsCache.get(topic.id) || [];
          const progress = topicsProgress.get(topic.id);
          const isUnlocked = progress?.isUnlocked ?? topicIdx === 0;
          const isLoading = loadingTopics.has(topic.id);
          const isExpanded = expandedTopics.has(topic.id);
          
          // Определяем текущий индекс подтемы
          let currentSubtopicIdx = -1;
          if (topic.id === currentTopicId) {
            currentSubtopicIdx = currentSubtopicIndex;
          } else if (progress?.completed) {
            currentSubtopicIdx = subtopics.length;
          } else if (progress && progress.completedSubtopicCount > 0) {
            currentSubtopicIdx = progress.completedSubtopicCount;
          }

          // Определяем, должна ли тема быть развернута
          const shouldBeExpanded = isExpanded || topicIdx === 0 || (isUnlocked && !progress?.completed);

          return (
            <DynamicModuleCard
              key={topic.id}
              topic={topic}
              topicIndex={topicIdx}
              subtopics={subtopics}
              isUnlocked={isUnlocked}
              currentSubtopicIndex={currentSubtopicIdx}
              onSubtopicClick={onSubtopicClick}
              progress={progress}
              isLoading={isLoading && shouldBeExpanded}
              onExpand={() => handleExpand(topic.id)}
              onStartClick={() => handleStart(topic.id)}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-slate-200 text-center">
        <p className="text-sm text-slate-500">
          Продолжайте обучение регулярно для лучших результатов
        </p>
      </div>
    </div>
  );
};

