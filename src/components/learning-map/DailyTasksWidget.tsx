import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, Flame, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DailyTask {
  id: string;
  title: string;
  task_type: string;
  progress: number;
  max_progress: number;
  completed: boolean;
  reward?: number;
}

interface DailyTasksWidgetProps {
  profileId?: string;
  className?: string;
}

// Определяем иконку для типа задания
const getTaskIcon = (taskType: string) => {
  const typeLower = taskType.toLowerCase();
  if (typeLower.includes("опыт") || typeLower.includes("xp") || typeLower.includes("experience")) {
    return Zap;
  }
  if (typeLower.includes("урок") || typeLower.includes("lesson") || typeLower.includes("без ошибок")) {
    return Target;
  }
  if (typeLower.includes("серия") || typeLower.includes("streak") || typeLower.includes("дней")) {
    return Flame;
  }
  return Gift;
};

export const DailyTasksWidget = ({ profileId, className }: DailyTasksWidgetProps) => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) {
      loadDailyTasks();
    }
  }, [profileId]);

  const loadDailyTasks = async () => {
    if (!profileId) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('user_id', profileId)
        .eq('date', today)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setTasks((data || []) as DailyTask[]);
    } catch (error) {
      console.error('Error loading daily tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="space-y-3">
          <div className="h-6 bg-muted/20 rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Нет заданий на сегодня</p>
        </div>
      </Card>
    );
  }

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Задания дня</h3>
        <Button variant="ghost" size="sm" className="text-xs h-7">
          ВСЕ
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const Icon = getTaskIcon(task.task_type);
          const progressPercent = task.max_progress > 0 
            ? Math.min((task.progress / task.max_progress) * 100, 100)
            : 0;
          const isCompleted = task.completed || progressPercent >= 100;

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                isCompleted ? "bg-success/10" : "bg-muted/20"
              )}
            >
              {/* Иконка */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  isCompleted ? "bg-success/20" : "bg-primary/20"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isCompleted ? "text-success" : "text-primary"
                  )}
                />
              </div>

              {/* Контент */}
              <div className="flex-1 min-w-0 space-y-1">
                <p
                  className={cn(
                    "text-sm font-medium leading-tight",
                    isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={progressPercent}
                    className={cn(
                      "h-1.5 flex-1",
                      isCompleted && "opacity-50"
                    )}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {task.progress}/{task.max_progress}
                  </span>
                  {/* Сундук награды */}
                  {isCompleted && (
                    <Gift className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Прогресс выполнения */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Выполнено заданий</span>
          <span className="font-semibold text-foreground">
            {completedCount} / {tasks.length}
          </span>
        </div>
      </div>
    </Card>
  );
};

