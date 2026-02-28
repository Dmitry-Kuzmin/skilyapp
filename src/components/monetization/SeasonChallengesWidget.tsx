import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useActiveSeason } from "@/hooks/useActiveSeason";
import { Trophy, Target, CheckCircle2, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Challenge = {
  id: string;
  challenge_type: 'daily' | 'weekly' | 'season';
  title_ru: string;
  description_ru: string;
  target_type: string;
  target_value: number;
  reward_sp: number;
  reward_coins: number;
  start_date: string | null;
  end_date: string | null;
};

type ChallengeProgress = {
  challenge_id: string;
  progress: number;
  completed: boolean;
  reward_claimed: boolean;
};

export function SeasonChallengesWidget() {
  const { profileId } = useUserContext();
  // ОПТИМИЗАЦИЯ: Используем хук, который берет данные из Super RPC Dashboard
  const { data: activeSeason, isLoading: seasonLoading } = useActiveSeason();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Map<string, ChallengeProgress>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId || !activeSeason) return;
    loadChallenges();
  }, [profileId, activeSeason]);

  const loadChallenges = async () => {
    if (!activeSeason) return;

    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];

      // Получаем активные челленджи
      const { data: challengesData, error: challengesError } = await supabase
        .from("season_challenges")
        .select("*")
        .eq("season_id", activeSeason.id)
        .eq("is_active", true)
        .order("challenge_type", { ascending: true })
        .order("created_at", { ascending: true });

      if (challengesError) {
        console.error("[SeasonChallengesWidget] load challenges error", challengesError);
        setLoading(false);
        return;
      }

      if (challengesData) {
        // Фильтруем по датам
        const activeChallenges = challengesData.filter((challenge: any) => {
          const startOk = !challenge.start_date || challenge.start_date <= today;
          const endOk = !challenge.end_date || challenge.end_date >= today;
          return startOk && endOk;
        });

        // Дедупликация челленджей по ID (на случай дубликатов в БД)
        const uniqueChallenges = activeChallenges.filter((challenge: any, index: number, self: any[]) =>
          index === self.findIndex((c: any) => c.id === challenge.id)
        );

        setChallenges(uniqueChallenges as Challenge[]);

        // Загружаем прогресс пользователя
        if (uniqueChallenges.length > 0 && profileId) {
          const challengeIds = uniqueChallenges.map((c: any) => c.id);
          const { data: progressData } = await supabase
            .from("user_challenge_progress")
            .select("*")
            .eq("user_id", profileId)
            .in("challenge_id", challengeIds);

          if (progressData) {
            const progressMap = new Map<string, ChallengeProgress>();
            progressData.forEach((p: any) => {
              progressMap.set(p.challenge_id, {
                challenge_id: p.challenge_id,
                progress: p.progress || 0,
                completed: p.completed || false,
                reward_claimed: p.reward_claimed || false,
              });
            });
            setProgress(progressMap);
          }
        }
      }
    } catch (error) {
      console.error("[SeasonChallengesWidget] load error", error);
    } finally {
      setLoading(false);
    }
  };

  if (seasonLoading || loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <svg className="w-6 h-6 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </Card>
    );
  }

  const claimChallengeReward = async (challengeId: string) => {
    if (!profileId) return;

    try {
      // Вызываем Edge Function для получения награды
      const { error } = await supabase.functions.invoke("season-challenges-reward", {
        body: {
          user_id: profileId,
          challenge_id: challengeId,
        },
      });

      if (error) {
        toast.error("Ошибка при получении награды", {
          description: error.message || "Попробуйте позже",
        });
        return;
      }

      toast.success("Награда получена!");
      // Перезагружаем данные
      loadChallenges();
    } catch (err: any) {
      console.error("[SeasonChallengesWidget] Claim error", err);
      toast.error("Ошибка при получении награды");
    }
  };

  if (!activeSeason || challenges.length === 0) {
    return null;
  }

  // Подсчитываем завершенные челленджи
  const completedCount = Array.from(progress.values()).filter(p => p.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Челленджи</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {completedCount} / {challenges.length}
        </Badge>
      </div>

      {/* Компактные карточки челленджей */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {challenges.map((challenge) => {
          const challengeProgress = progress.get(challenge.id) || {
            challenge_id: challenge.id,
            progress: 0,
            completed: false,
            reward_claimed: false,
          };
          const progressPercent = Math.min(
            ((challengeProgress.progress || 0) / challenge.target_value) * 100,
            100
          );
          const isCompleted = challengeProgress.completed;
          const isClaimed = challengeProgress.reward_claimed;

          return (
            <div
              key={challenge.id}
              className={cn(
                "relative p-3 rounded-lg border transition-all",
                isCompleted && !isClaimed
                  ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/50 ring-2 ring-green-500/20"
                  : isCompleted
                    ? "bg-green-500/5 border-green-500/30"
                    : "bg-background border-border"
              )}
            >
              {/* Индикатор типа */}
              <div className="absolute top-2 right-2">
                {challenge.challenge_type === 'daily' && (
                  <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                    День
                  </Badge>
                )}
                {challenge.challenge_type === 'weekly' && (
                  <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                    Неделя
                  </Badge>
                )}
                {challenge.challenge_type === 'season' && (
                  <Badge className="text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    Сезон
                  </Badge>
                )}
              </div>

              {/* Контент */}
              <div className="space-y-2 pr-16">
                <p className="text-sm font-semibold line-clamp-1">
                  {challenge.title_ru}
                </p>

                {/* Прогресс */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {challengeProgress.progress || 0} / {challenge.target_value}
                    </span>
                    <span className="font-semibold">{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-1.5" />
                </div>

                {/* Награды */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-blue-600">
                    <Trophy className="w-3 h-3" />
                    <span className="font-semibold">+{challenge.reward_sp} SP</span>
                  </div>
                  {challenge.reward_coins > 0 && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Coins className="w-3 h-3" />
                      <span className="font-semibold">+{challenge.reward_coins}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Кнопка действия */}
              {isCompleted && !isClaimed && (
                <Button
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => claimChallengeReward(challenge.id)}
                >
                  Забрать награду
                </Button>
              )}
              {isClaimed && (
                <div className="flex items-center justify-center mt-2 text-xs text-green-600">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Получено
                </div>
              )}
            </div>
          );
        })}
      </div>

      {challenges.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Нет активных челленджей в этом сезоне
        </div>
      )}
    </div>
  );
}

