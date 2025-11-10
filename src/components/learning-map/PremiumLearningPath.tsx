import { PremiumModuleSection } from "./PremiumModuleSection";
import { Topic, TopicProgress } from "./TopicCard";
import { Subtopic, subtopicApi } from "@/utils/materialApi";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface PremiumLearningPathProps {
  topics: Topic[];
  topicsProgress: Map<string, TopicProgress>;
  currentTopicId: string | null;
  currentSubtopicIndex: number;
  onSubtopicClick: (subtopicId: string) => void;
  onTopicClick?: (topicId: string) => void;
}

export const PremiumLearningPath = ({
  topics,
  topicsProgress,
  currentTopicId,
  currentSubtopicIndex,
  onSubtopicClick,
  onTopicClick,
}: PremiumLearningPathProps) => {
  const [subtopicsMap, setSubtopicsMap] = useState<Map<string, Subtopic[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubtopics();
  }, [topics]);

  const loadSubtopics = async () => {
    try {
      setLoading(true);
      const newSubtopicsMap = new Map<string, Subtopic[]>();

      // Загружаем подтемы для всех тем параллельно
      await Promise.all(
        topics.map(async (topic) => {
          try {
            const subtopics = await subtopicApi.getByTopic(topic.id);
            newSubtopicsMap.set(topic.id, subtopics);
          } catch (error) {
            console.error(`Error loading subtopics for topic ${topic.id}:`, error);
            newSubtopicsMap.set(topic.id, []);
          }
        })
      );

      setSubtopicsMap(newSubtopicsMap);
    } catch (error) {
      console.error("Error loading subtopics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Карта обучения</h1>
        <p className="text-slate-600">Изучайте темы последовательно, шаг за шагом</p>
      </div>

      {/* Topics List */}
      <div className="space-y-12">
        {topics.map((topic, topicIdx) => {
          const subtopics = subtopicsMap.get(topic.id) || [];
          const progress = topicsProgress.get(topic.id);
          const isUnlocked = progress?.isUnlocked ?? topicIdx === 0;
          
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
            <PremiumModuleSection
              key={topic.id}
              topic={topic}
              topicIndex={topicIdx}
              subtopics={subtopics}
              isUnlocked={isUnlocked}
              currentSubtopicIndex={currentSubtopicIdx}
              onSubtopicClick={onSubtopicClick}
              progress={progress}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-slate-200">
        <p className="text-center text-sm text-slate-500">
          Продолжайте обучение регулярно для лучших результатов
        </p>
      </div>
    </div>
  );
};

