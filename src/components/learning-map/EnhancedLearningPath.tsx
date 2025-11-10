import { EnhancedModuleSection } from "./EnhancedModuleSection";
import { Topic, TopicProgress } from "./TopicCard";
import { useEffect, useState, useMemo } from "react";

interface EnhancedLearningPathProps {
  topics: Topic[];
  topicsProgress: Map<string, TopicProgress>;
  currentTopicId: string | null;
  currentSubtopicIndex: number;
  onSubtopicClick: (subtopicId: string) => void;
  onTopicClick?: (topicId: string) => void;
}

export const EnhancedLearningPath = ({
  topics,
  topicsProgress,
  currentTopicId,
  currentSubtopicIndex,
  onSubtopicClick,
  onTopicClick,
}: EnhancedLearningPathProps) => {
  // Кэш для загруженных подтем
  const [subtopicsCache, setSubtopicsCache] = useState<Map<string, any[]>>(new Map());
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());

  // Функция для загрузки подтем конкретной темы
  const loadSubtopicsForTopic = async (topicId: string) => {
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
  };

  // Определяем первую разблокированную тему
  const firstUnlockedTopic = useMemo(() => {
    return topics.find((topic, idx) => {
      const progress = topicsProgress.get(topic.id);
      return progress?.isUnlocked ?? idx === 0;
    });
  }, [topics, topicsProgress]);

  // Предзагружаем подтемы для первой разблокированной темы
  useEffect(() => {
    if (!firstUnlockedTopic) return;
    
    const topicId = firstUnlockedTopic.id;
    if (!subtopicsCache.has(topicId) && !loadingTopics.has(topicId)) {
      loadSubtopicsForTopic(topicId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstUnlockedTopic?.id]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Карта обучения</h1>
        <p className="text-slate-600">Изучайте темы последовательно, шаг за шагом</p>
      </div>

      {/* Topics List */}
      <div className="space-y-4">
        {topics.map((topic, topicIdx) => {
          const subtopics = subtopicsCache.get(topic.id) || [];
          const progress = topicsProgress.get(topic.id);
          const isUnlocked = progress?.isUnlocked ?? topicIdx === 0;
          const isLoading = loadingTopics.has(topic.id);
          
          // Определяем текущий индекс подтемы
          let currentSubtopicIdx = -1;
          if (topic.id === currentTopicId) {
            currentSubtopicIdx = currentSubtopicIndex;
          } else if (progress?.completed) {
            currentSubtopicIdx = subtopics.length;
          } else if (progress && progress.completedSubtopicCount > 0) {
            currentSubtopicIdx = progress.completedSubtopicCount;
          }

          return (
            <EnhancedModuleSection
              key={topic.id}
              topic={topic}
              topicIndex={topicIdx}
              subtopics={subtopics}
              isUnlocked={isUnlocked}
              currentSubtopicIndex={currentSubtopicIdx}
              onSubtopicClick={onSubtopicClick}
              progress={progress}
              isLoading={isLoading}
              onExpand={() => loadSubtopicsForTopic(topic.id)}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-slate-200">
        <p className="text-center text-sm text-slate-500">
          Продолжайте обучение регулярно для лучших результатов
        </p>
      </div>
    </div>
  );
};
