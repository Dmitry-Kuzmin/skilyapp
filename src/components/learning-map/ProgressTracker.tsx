import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressStats {
  totalTopics: number;
  completedTopics: number;
  totalSubtopics: number;
  completedSubtopics: number;
  readinessScore: number;
  avgAccuracy: number;
  testSuccessRate: number;
}

interface ProgressTrackerProps {
  stats: ProgressStats;
  className?: string;
}

export const ProgressTracker = ({ stats, className }: ProgressTrackerProps) => {
  const topicCompletionPercent =
    stats.totalTopics > 0 ? (stats.completedTopics / stats.totalTopics) * 100 : 0;
  const subtopicCompletionPercent =
    stats.totalSubtopics > 0 ? (stats.completedSubtopics / stats.totalSubtopics) * 100 : 0;

  const getReadinessStatus = (score: number) => {
    if (score >= 80) return { label: "Готов!", color: "text-emerald-500", bg: "bg-emerald-500/10" };
    if (score >= 60) return { label: "Почти готов", color: "text-orange-500", bg: "bg-orange-500/10" };
    return { label: "Пока рано", color: "text-destructive", bg: "bg-destructive/10" };
  };

  const readinessStatus = getReadinessStatus(stats.readinessScore);

  return (
    <Card className={cn("p-6 space-y-6 gradient-card border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold">Прогресс обучения</h3>
      </div>

      {/* Readiness Score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Готовность к экзамену</span>
          <Badge className={cn(readinessStatus.bg, readinessStatus.color, "border-0")}>
            {readinessStatus.label}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Общий балл</span>
            <span className={cn("font-bold text-2xl", readinessStatus.color)}>
              {Math.round(stats.readinessScore)}%
            </span>
          </div>
          <Progress value={stats.readinessScore} className="h-3" />
        </div>
      </div>

      {/* Topic Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Темы</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {stats.completedTopics} / {stats.totalTopics}
          </span>
        </div>
        <div className="space-y-2">
          <Progress value={topicCompletionPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(topicCompletionPercent)}% завершено</span>
            <span>{stats.totalTopics - stats.completedTopics} осталось</span>
          </div>
        </div>
      </div>

      {/* Subtopic Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm font-semibold">Подтемы</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {stats.completedSubtopics} / {stats.totalSubtopics}
          </span>
        </div>
        <div className="space-y-2">
          <Progress value={subtopicCompletionPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(subtopicCompletionPercent)}% завершено</span>
            <span>{stats.totalSubtopics - stats.completedSubtopics} осталось</span>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-primary">{Math.round(stats.avgAccuracy)}%</div>
          <div className="text-xs text-muted-foreground">Точность</div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-secondary">
            {Math.round(stats.testSuccessRate)}%
          </div>
          <div className="text-xs text-muted-foreground">Успешность тестов</div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-success">
            {Math.round(topicCompletionPercent)}%
          </div>
          <div className="text-xs text-muted-foreground">Завершение тем</div>
        </div>
      </div>
    </Card>
  );
};

