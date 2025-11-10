import { LessonNode } from "./DuolingoLessonNode";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Topic, TopicProgress } from "./TopicCard";
import { Subtopic } from "@/utils/materialApi";

interface DuolingoModuleSectionProps {
  topic: Topic;
  topicIndex: number;
  subtopics: Subtopic[];
  isUnlocked: boolean;
  currentSubtopicIndex: number;
  onSubtopicClick: (subtopicId: string) => void;
  progress?: TopicProgress;
}

const moduleColors = [
  "from-blue-500 to-blue-600",
  "from-green-500 to-green-600",
  "from-purple-500 to-purple-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-red-500 to-red-600",
  "from-teal-500 to-teal-600",
  "from-indigo-500 to-indigo-600",
  "from-yellow-500 to-yellow-600",
  "from-cyan-500 to-cyan-600",
];

export const DuolingoModuleSection = ({
  topic,
  topicIndex,
  subtopics,
  isUnlocked,
  currentSubtopicIndex,
  onSubtopicClick,
  progress,
}: DuolingoModuleSectionProps) => {
  const gradientColor = moduleColors[topicIndex % moduleColors.length];
  
  // Используем градиент темы, если он задан, иначе используем предустановленный градиент
  const hasCustomGradient = topic.gradient_from && topic.gradient_to;
  const defaultGradientClass = `bg-gradient-to-r ${gradientColor}`;
  
  return (
    <div className="relative mb-12">
      {/* Module Header Card */}
      <Card 
        className={`p-6 mb-8 border-none shadow-xl ${!hasCustomGradient ? defaultGradientClass : ''}`}
        style={hasCustomGradient ? {
          background: `linear-gradient(to right, ${topic.gradient_from}, ${topic.gradient_to})`
        } : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-bold text-white/90 uppercase tracking-wider mb-2">
              Тема {topic.number || topicIndex + 1}
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              {topic.title_ru}
            </h2>
            {topic.description_ru && (
              <p className="text-white/80 text-sm mt-2">{topic.description_ru}</p>
            )}
          </div>
          <button className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-2xl text-sm font-bold text-white transition-all backdrop-blur-sm border border-white/30 shadow-lg hover:scale-105 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            СПРАВОЧНИК
          </button>
        </div>
      </Card>

      <div className="relative">
        {/* Connection line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-border -translate-x-1/2 -z-10" />

        <div className="space-y-6">
          {subtopics.map((subtopic, subtopicIdx) => {
            const isSubtopicUnlocked = isUnlocked && subtopicIdx <= currentSubtopicIndex + 1;
            const isActive = isUnlocked && subtopicIdx === currentSubtopicIndex;
            const isCompleted = isUnlocked && subtopicIdx < currentSubtopicIndex;

            return (
              <LessonNode
                key={subtopic.id}
                subtopic={subtopic}
                lessonIndex={subtopicIdx}
                isUnlocked={isSubtopicUnlocked}
                isActive={isActive}
                isCompleted={isCompleted}
                onClick={() => isSubtopicUnlocked && onSubtopicClick(subtopic.id)}
                align={subtopicIdx % 2 === 0 ? "left" : "right"}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

