import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, BookOpen, FileText, Languages, Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface Subtopic {
  id: string;
  topic_id: string;
  title_ru: string;
  title_es: string;
  title_en: string;
  order_index: number;
  type: "material" | "test" | "terms";
  content_id?: string;
  is_required: boolean;
}

export interface SubtopicProgress {
  subtopic_id: string;
  completed: boolean;
  score?: number;
}

interface SubtopicListProps {
  subtopics: Subtopic[];
  progress?: SubtopicProgress[];
  topicId: string;
  className?: string;
}

const getSubtopicIcon = (type: Subtopic["type"]) => {
  switch (type) {
    case "material":
      return BookOpen;
    case "test":
      return FileText;
    case "terms":
      return Languages;
    default:
      return BookOpen;
  }
};

const getSubtopicTypeLabel = (type: Subtopic["type"]) => {
  switch (type) {
    case "material":
      return "Материал";
    case "test":
      return "Тест";
    case "terms":
      return "Термины";
    default:
      return "Материал";
  }
};

const getSubtopicTypeColor = (type: Subtopic["type"]) => {
  switch (type) {
    case "material":
      return "bg-primary/20 text-primary border-primary/50";
    case "test":
      return "bg-secondary/20 text-secondary border-secondary/50";
    case "terms":
      return "bg-success/20 text-success border-success/50";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const SubtopicList = ({ subtopics, progress = [], topicId, className }: SubtopicListProps) => {
  const navigate = useNavigate();

  const sortedSubtopics = [...subtopics].sort((a, b) => a.order_index - b.order_index);

  const handleSubtopicClick = (subtopic: Subtopic) => {
    navigate(`/subtopic/${subtopic.id}`);
  };

  const getSubtopicProgress = (subtopicId: string): SubtopicProgress | undefined => {
    return progress.find((p) => p.subtopic_id === subtopicId);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {sortedSubtopics.map((subtopic, index) => {
        const subtopicProgress = getSubtopicProgress(subtopic.id);
        const isCompleted = subtopicProgress?.completed ?? false;
        const Icon = getSubtopicIcon(subtopic.type);

        return (
          <Card
            key={subtopic.id}
            className={cn(
              "relative overflow-hidden transition-all duration-300 cursor-pointer group",
              "hover:scale-[1.02] hover:shadow-md",
              isCompleted
                ? "border-success/50 bg-success/5"
                : "border-border/50 hover:border-primary/30"
            )}
            onClick={() => handleSubtopicClick(subtopic)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Icon and Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Order Number */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-sm">
                    {subtopic.order_index}
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                      isCompleted ? "bg-success/20" : "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6",
                        isCompleted ? "text-success" : "text-muted-foreground"
                      )}
                    />
                  </div>

                  {/* Title and Type */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-base truncate">{subtopic.title_ru}</h4>
                      {subtopic.is_required && (
                        <Badge variant="outline" className="text-xs">
                          Обязательно
                        </Badge>
                      )}
                    </div>
                    <Badge className={cn("text-xs", getSubtopicTypeColor(subtopic.type))}>
                      {getSubtopicTypeLabel(subtopic.type)}
                    </Badge>
                  </div>
                </div>

                {/* Right: Status and Action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isCompleted ? (
                    <>
                      {subtopicProgress?.score !== undefined && (
                        <span className="text-sm font-semibold text-success">
                          {subtopicProgress.score}%
                        </span>
                      )}
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubtopicClick(subtopic);
                      }}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Начать
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {sortedSubtopics.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Подтемы пока не добавлены</p>
        </Card>
      )}
    </div>
  );
};

