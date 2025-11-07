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
    <Card className={cn("p-5 space-y-4 bg-white border border-gray-200 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-gray-900">Задания дня</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs h-7 text-[#1CB0F6] hover:text-[#1CB0F6]/80 hover:bg-[#1CB0F6]/10 px-2"
        >
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
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              {/* Иконка - Duolingo style colors */}
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  isCompleted 
                    ? "bg-[#58CC02]" 
                    : task.task_type.toLowerCase().includes("опыт") || task.task_type.toLowerCase().includes("xp")
                    ? "bg-[#FFC800]"
                    : "bg-[#1CB0F6]"
                )}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>

              {/* Контент */}
              <div className="flex-1 min-w-0 space-y-2">
                <p
                  className={cn(
                    "text-sm font-medium leading-tight text-gray-900",
                    isCompleted && "line-through text-gray-400"
                  )}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2">
                  {/* Прогресс-бар - Duolingo style */}
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300 rounded-full",
                        isCompleted ? "bg-[#58CC02]" : "bg-[#1CB0F6]"
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                    {task.progress}/{task.max_progress}
                  </span>
                  {/* Сундук награды - Duolingo style */}
                  {isCompleted && (
                    <div className="w-5 h-5 bg-[#FFC800] rounded flex items-center justify-center flex-shrink-0">
                      <Gift className="w-3 h-3 text-[#FF9600]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

