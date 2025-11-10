import { Card } from "@/components/ui/card";
import { DuolingoModuleSection } from "./DuolingoModuleSection";
import { Topic, TopicProgress } from "./TopicCard";
import { Subtopic, subtopicApi } from "@/utils/materialApi";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface DuolingoNewLearningPathProps {
  topics: Topic[];
  topicsProgress: Map<string, TopicProgress>;
  currentTopicId: string | null;
  currentSubtopicIndex: number;
  onSubtopicClick: (subtopicId: string) => void;
  onTopicClick?: (topicId: string) => void;
}

export const DuolingoNewLearningPath = ({
  topics,
  topicsProgress,
  currentTopicId,
  currentSubtopicIndex,
  onSubtopicClick,
  onTopicClick,
}: DuolingoNewLearningPathProps) => {
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Current Module Banner */}
      {currentTopicId && topics.find((t) => t.id === currentTopicId) && (
        <Card className="p-6 mb-6 bg-gradient-to-r from-secondary to-secondary/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-foreground/80 mb-1">
                ТЕМА {topics.findIndex((t) => t.id === currentTopicId) + 1}
              </p>
              <h2 className="text-2xl font-bold text-secondary-foreground">
                {topics.find((t) => t.id === currentTopicId)?.title_ru}
              </h2>
            </div>
            <button className="px-4 py-2 bg-secondary-foreground/10 hover:bg-secondary-foreground/20 rounded-xl text-sm font-bold text-secondary-foreground transition-colors backdrop-blur-sm">
              СПРАВОЧНИК
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-8">
        {topics.map((topic, topicIdx) => {
          const subtopics = subtopicsMap.get(topic.id) || [];
          const progress = topicsProgress.get(topic.id);
          const isUnlocked = progress?.isUnlocked ?? topicIdx === 0;
          const isCurrentTopic = topic.id === currentTopicId;
          
          // Определяем текущий индекс подтемы: для активной темы используем переданный индекс,
          // для завершенных тем - последний индекс, для остальных - -1
          let currentSubtopicIdx = -1;
          if (isCurrentTopic) {
            currentSubtopicIdx = currentSubtopicIndex;
          } else if (progress?.completed) {
            currentSubtopicIdx = subtopics.length; // Все подтемы завершены
          } else if (progress && progress.completedSubtopicCount > 0) {
            currentSubtopicIdx = progress.completedSubtopicCount;
          }

          return (
            <DuolingoModuleSection
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

      <div className="mt-12 text-center py-8">
        <p className="text-muted-foreground text-sm">
          Используйте настоящее время для привычек
        </p>
      </div>
    </div>
  );
};

