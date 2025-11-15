import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { Loader2, Trophy, Target, Calendar, Zap, CheckCircle2, Clock } from "lucide-react";
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
        // Если функция не найдена (404), значит миграция не применена
        if (seasonError.code === 'PGRST116' || seasonError.message?.includes('404')) {
          console.error("[SeasonChallengesWidget] ⚠️ Миграция не применена! Примените файл APPLY_SEASON_MIGRATION_NOW.sql в Supabase SQL Editor");
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

  const getChallengeTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return 'Ежедневный';
      case 'weekly':
        return 'Еженедельный';
      case 'season':
        return 'Сезонный';
      default:
        return type;
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

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Сезонные челленджи</h3>
        </div>
        {activeSeason && (
          <Badge variant="secondary" className="text-xs">
            {activeSeason.name_ru}
          </Badge>
        )}
      </div>

      {/* Daily Challenges */}
      {dailyChallenges.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Ежедневные
          </div>
          {dailyChallenges.map((challenge) => {
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

            return (
              <Card
                key={challenge.id}
                className={cn(
                  "p-3 border",
                  isCompleted && "bg-green-50 dark:bg-green-950/20 border-green-500/50"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getChallengeIcon(challenge.challenge_type)}
                        <p className="text-sm font-medium">{challenge.title_ru}</p>
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {getTargetLabel(challenge.target_type, challenge.target_value)}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <Progress value={progressPercent} className="h-1.5 flex-1" />
                        <span className="text-muted-foreground whitespace-nowrap">
                          {challengeProgress.progress} / {challenge.target_value}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isCompleted && (
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Zap className="w-3 h-3" />
                        <span>+{challenge.reward_sp} SP</span>
                      </div>
                      {challenge.reward_coins > 0 && (
                        <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                          <span>+{challenge.reward_coins} монет</span>
                        </div>
                      )}
                      {challenge.end_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Clock className="w-3 h-3" />
                          <span>Осталось: {formatTimeRemaining(challenge.end_date)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Weekly Challenges */}
      {weeklyChallenges.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Еженедельные
          </div>
          {weeklyChallenges.map((challenge) => {
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

            return (
              <Card
                key={challenge.id}
                className={cn(
                  "p-3 border",
                  isCompleted && "bg-green-50 dark:bg-green-950/20 border-green-500/50"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getChallengeIcon(challenge.challenge_type)}
                        <p className="text-sm font-medium">{challenge.title_ru}</p>
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {getTargetLabel(challenge.target_type, challenge.target_value)}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <Progress value={progressPercent} className="h-1.5 flex-1" />
                        <span className="text-muted-foreground whitespace-nowrap">
                          {challengeProgress.progress} / {challenge.target_value}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isCompleted && (
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Zap className="w-3 h-3" />
                        <span>+{challenge.reward_sp} SP</span>
                      </div>
                      {challenge.reward_coins > 0 && (
                        <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                          <span>+{challenge.reward_coins} монет</span>
                        </div>
                      )}
                      {challenge.end_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Clock className="w-3 h-3" />
                          <span>Осталось: {formatTimeRemaining(challenge.end_date)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Season Challenges */}
      {seasonChallenges.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Trophy className="w-4 h-4" />
            Сезонные
          </div>
          {seasonChallenges.map((challenge) => {
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

            return (
              <Card
                key={challenge.id}
                className={cn(
                  "p-3 border-2",
                  isCompleted 
                    ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-500/50" 
                    : "border-primary/30"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getChallengeIcon(challenge.challenge_type)}
                        <p className="text-sm font-semibold">{challenge.title_ru}</p>
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {getTargetLabel(challenge.target_type, challenge.target_value)}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <Progress value={progressPercent} className="h-2 flex-1" />
                        <span className="text-muted-foreground whitespace-nowrap font-medium">
                          {challengeProgress.progress} / {challenge.target_value}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                      <Zap className="w-3 h-3" />
                      <span>+{challenge.reward_sp} SP</span>
                    </div>
                    {challenge.reward_coins > 0 && (
                      <div className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        <span>+{challenge.reward_coins} монет</span>
                      </div>
                    )}
                    {challenge.end_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <Clock className="w-3 h-3" />
                        <span>До конца сезона</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {challenges.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Нет активных челленджей в этом сезоне
        </div>
      )}
    </Card>
  );
}

