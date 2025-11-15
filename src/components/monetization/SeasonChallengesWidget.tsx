import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { Loader2, Trophy, Target, Calendar, Zap, CheckCircle2, Clock, Coins } from "lucide-react";
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
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Map<string, ChallengeProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'daily' | 'weekly' | 'season'>('all');

  useEffect(() => {
    if (!profileId) return;
    loadChallenges();
  }, [profileId]);

  const loadChallenges = async () => {
    try {
      setLoading(true);

      // Получаем активный сезон
      const { data: seasonData, error: seasonError } = await supabase
        .rpc("get_active_season");

      if (seasonError) {
        console.error("[SeasonChallengesWidget] Error loading season", seasonError);
        if (seasonError.code === 'PGRST116' || seasonError.message?.includes('404')) {
          console.error("[SeasonChallengesWidget] ⚠️ Миграция не применена!");
        }
        setLoading(false);
        return;
      }

      if (!seasonData || seasonData.length === 0) {
        setLoading(false);
        return;
      }

      const season = seasonData[0];
      setActiveSeason(season);

      const today = new Date().toISOString().split('T')[0];

      // Получаем активные челленджи
      const { data: challengesData, error: challengesError } = await supabase
        .from("season_challenges")
        .select("*")
        .eq("season_id", season.id)
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

        setChallenges(activeChallenges as Challenge[]);

        // Загружаем прогресс пользователя
        if (activeChallenges.length > 0) {
          const challengeIds = activeChallenges.map((c: any) => c.id);
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

  const claimChallengeReward = async (challenge: Challenge) => {
    if (!profileId) return;

    try {
      const challengeProgress = progress.get(challenge.id);
      if (!challengeProgress?.completed) {
        toast.error("Челлендж еще не завершен");
        return;
      }

      if (challengeProgress.reward_claimed) {
        toast.info("Награда уже получена");
        return;
      }

      // Вызываем Edge Function для получения награды
      const { error } = await supabase.functions.invoke("season-challenges-reward", {
        body: {
          user_id: profileId,
          completed_challenges: [{
            challenge_id: challenge.id,
            title: challenge.title_ru,
            reward_sp: challenge.reward_sp,
            reward_coins: challenge.reward_coins,
          }],
        },
      });

      if (error) {
        toast.error("Ошибка при получении награды", {
          description: error.message || "Попробуйте позже",
        });
        return;
      }

      // Обновляем локальное состояние
      setProgress((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(challenge.id);
        if (current) {
          newMap.set(challenge.id, {
            ...current,
            reward_claimed: true,
          });
        }
        return newMap;
      });

      toast.success("Награда получена!", {
        description: `+${challenge.reward_sp} SP${challenge.reward_coins > 0 ? `, +${challenge.reward_coins} монет` : ''}`,
      });

      // Перезагружаем данные
      loadChallenges();
    } catch (err: any) {
      console.error("[SeasonChallengesWidget] Claim error", err);
      toast.error("Ошибка при получении награды");
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return <Calendar className="w-4 h-4" />;
      case 'weekly':
        return <Calendar className="w-4 h-4" />;
      case 'season':
        return <Trophy className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getTargetLabel = (targetType: string, targetValue: number) => {
    switch (targetType) {
      case 'tests_completed':
        return `Пройди ${targetValue} тест${targetValue > 1 ? 'ов' : ''}`;
      case 'tests_perfect':
        return `Пройди ${targetValue} тест${targetValue > 1 ? 'ов' : ''} без ошибок`;
      case 'questions_answered':
        return `Ответь на ${targetValue} вопрос${targetValue > 1 ? 'ов' : ''}`;
      case 'duels_played':
        return `Сыграй ${targetValue} дуэл${targetValue > 1 ? 'ей' : 'ь'}`;
      case 'duels_won':
        return `Выиграй ${targetValue} дуэл${targetValue > 1 ? 'ей' : 'ь'}`;
      case 'streak_days':
        return `Держи streak ${targetValue} дней`;
      case 'sp_earned':
        return `Набери ${targetValue} SP`;
      case 'coins_earned':
        return `Заработай ${targetValue} монет`;
      default:
        return `${targetValue}`;
    }
  };

  const formatTimeRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} дн.`;
    if (hours > 0) return `${hours} ч.`;
    return 'Скоро';
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!activeSeason || challenges.length === 0) {
    return null;
  }

  // Группируем челленджи по типам
  const dailyChallenges = challenges.filter(c => c.challenge_type === 'daily');
  const weeklyChallenges = challenges.filter(c => c.challenge_type === 'weekly');
  const seasonChallenges = challenges.filter(c => c.challenge_type === 'season');

  // Фильтруем челленджи по выбранному типу
  const filteredChallenges = filterType === 'all' 
    ? challenges 
    : filterType === 'daily' 
    ? dailyChallenges 
    : filterType === 'weekly' 
    ? weeklyChallenges 
    : seasonChallenges;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Сезонные челленджи</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {challenges.length} активных
        </Badge>
      </div>

      {/* Табы для фильтрации */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setFilterType('all')}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
            filterType === 'all'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Все ({challenges.length})
        </button>
        <button
          onClick={() => setFilterType('daily')}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
            filterType === 'daily'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Ежедневные ({dailyChallenges.length})
        </button>
        <button
          onClick={() => setFilterType('weekly')}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
            filterType === 'weekly'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Еженедельные ({weeklyChallenges.length})
        </button>
        <button
          onClick={() => setFilterType('season')}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
            filterType === 'season'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Сезонные ({seasonChallenges.length})
        </button>
      </div>

      {/* Карточки челленджей */}
      <div className="space-y-2">
        {filteredChallenges.map((challenge) => {
          const challengeProgress = progress.get(challenge.id) || {
            challenge_id: challenge.id,
            progress: 0,
            completed: false,
            reward_claimed: false,
          };
          const progressPercent = Math.min(
            (challengeProgress.progress / challenge.target_value) * 100,
            100
          );
          const isCompleted = challengeProgress.completed;
          const isClaimed = challengeProgress.reward_claimed;

          return (
            <div
              key={challenge.id}
              className={cn(
                "p-4 rounded-lg border transition-all",
                isCompleted && !isClaimed
                  ? "bg-green-500/10 border-green-500/50 shadow-sm"
                  : isClaimed
                  ? "bg-muted/30 border-muted"
                  : "bg-background border-border"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getChallengeIcon(challenge.challenge_type)}
                    <h4 className="font-semibold text-sm">{challenge.title_ru}</h4>
                    {isClaimed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3">
                    {getTargetLabel(challenge.target_type, challenge.target_value)}
                  </p>
                  
                  {/* Прогресс */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Прогресс</span>
                      <span className="font-medium">
                        {challengeProgress.progress} / {challenge.target_value}
                      </span>
                    </div>
                    <Progress 
                      value={progressPercent} 
                      className="h-2" 
                    />
                  </div>
                  
                  {/* Награды */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-purple-600">
                      <Trophy className="w-3 h-3" />
                      <span className="font-medium">+{challenge.reward_sp} SP</span>
                    </div>
                    {challenge.reward_coins > 0 && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Coins className="w-3 h-3" />
                        <span className="font-medium">+{challenge.reward_coins} монет</span>
                      </div>
                    )}
                    {challenge.end_date && !isCompleted && (
                      <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                        <Clock className="w-3 h-3" />
                        {formatTimeRemaining(challenge.end_date)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Кнопка действия */}
                {isCompleted && !isClaimed ? (
                  <Button 
                    size="sm" 
                    onClick={() => claimChallengeReward(challenge)}
                    className="shrink-0"
                  >
                    Забрать
                  </Button>
                ) : isCompleted && isClaimed ? (
                  <Badge className="bg-green-500 text-white shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Получено
                  </Badge>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {filteredChallenges.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Нет челленджей для отображения
        </div>
      )}
    </div>
  );
}
