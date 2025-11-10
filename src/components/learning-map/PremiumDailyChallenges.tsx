import { Card } from "@/components/ui/card";
import { Zap, Target, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

export const PremiumDailyChallenges = () => {
  const { profileId } = useUserContext();
  const [challenges, setChallenges] = useState([
    {
      icon: <Zap className="w-4 h-4" />,
      title: "Получите 10 очков опыта",
      progress: 0,
      total: 10,
      reward: "🏆",
    },
    {
      icon: <Target className="w-4 h-4" />,
      title: "Пройдите 1 урок с результатом 90% или выше",
      progress: 0,
      total: 1,
      reward: "🎯",
    },
    {
      icon: <Award className="w-4 h-4" />,
      title: "Дайте 5 верных ответов подряд",
      progress: 0,
      total: 5,
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
      const today = new Date().toISOString().split("T")[0];
      
      const { data: xpData } = await supabase
        .from("game_sessions")
        .select("score")
        .eq("user_id", profileId)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      const todayXp = xpData?.reduce((sum, session) => sum + (session.score || 0), 0) || 0;

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
    <Card className="p-6 border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Задания дня</h2>
        <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
          Все
        </button>
      </div>
      
      <div className="space-y-4">
        {challenges.map((challenge, idx) => {
          const progressPercent = (challenge.progress / challenge.total) * 100;
          const isCompleted = challenge.progress >= challenge.total;

          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                  isCompleted 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {challenge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isCompleted ? "text-emerald-900" : "text-slate-900"
                  }`}>
                    {challenge.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${
                      isCompleted ? "text-emerald-700" : "text-slate-600"
                    }`}>
                      {challenge.progress} / {challenge.total}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

