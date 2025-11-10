import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, SmilePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

export const DuolingoDailyChallenges = () => {
  const { profileId } = useUserContext();
  const [challenges, setChallenges] = useState([
    {
      icon: <Zap className="w-6 h-6 text-warning" />,
      title: "Получите 10 очков опыта",
      progress: 0,
      total: 10,
      reward: "🏆",
    },
    {
      icon: <Target className="w-6 h-6 text-success" />,
      title: "Пройдите 1 урок с результатом 90% или выше",
      progress: 0,
      total: 1,
      reward: "🎯",
    },
    {
      icon: <SmilePlus className="w-6 h-6 text-success" />,
      title: "Дайте 5 верных ответов подряд в 2 уроках",
      progress: 0,
      total: 2,
      reward: "🏅",
    },
  ]);

  useEffect(() => {
    if (profileId) {
      loadChallengesProgress();
    }
  }, [profileId]);

  const loadChallengesProgress = async () => {
    if (!profileId) return;

    try {
      // Загружаем прогресс пользователя за сегодня
      const today = new Date().toISOString().split("T")[0];
      
      // Получаем XP за сегодня
      const { data: xpData } = await supabase
        .from("game_sessions")
        .select("score")
        .eq("user_id", profileId)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      const todayXp = xpData?.reduce((sum, session) => sum + (session.score || 0), 0) || 0;

      // Обновляем прогресс вызовов
      setChallenges(prev => prev.map((challenge, idx) => {
        if (idx === 0) {
          return { ...challenge, progress: Math.min(todayXp, challenge.total) };
        }
        return challenge;
      }));
    } catch (error) {
      console.error("Error loading challenges progress:", error);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Задания дня</h2>
        <button className="text-sm font-bold text-info hover:text-info/80 transition-colors">
          ВСЕ
        </button>
      </div>
      
      <div className="space-y-4">
        {challenges.map((challenge, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-background rounded-xl flex items-center justify-center border border-border">
              {challenge.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-2">{challenge.title}</p>
              <div className="flex items-center gap-2">
                <Progress value={(challenge.progress / challenge.total) * 100} className="h-3" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {challenge.progress} / {challenge.total}
                </span>
                <span className="text-lg">{challenge.reward}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

