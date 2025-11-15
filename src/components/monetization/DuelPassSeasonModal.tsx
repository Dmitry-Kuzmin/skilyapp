import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { Loader2, Trophy, Coins, Crown, Sparkles, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SeasonChallengesWidget } from "./SeasonChallengesWidget";

export function DuelPassSeasonModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [seasonProgress, setSeasonProgress] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open && profileId) {
      loadSeasonData();
    }
  }, [open, profileId]);

  const loadSeasonData = async () => {
    try {
      setLoading(true);

      // Получаем активный сезон
      const { data: seasonData, error: seasonError } = await supabase
        .rpc("get_active_season");

      if (seasonError) {
        console.error("[DuelPassSeasonModal] Error loading season", seasonError);
        // Если функция не найдена (404), значит миграция не применена
        if (seasonError.code === 'PGRST116' || seasonError.message?.includes('404')) {
          console.error("[DuelPassSeasonModal] ⚠️ Миграция не применена! Примените файл APPLY_SEASON_MIGRATION_NOW.sql в Supabase SQL Editor");
        }
        setLoading(false);
        return;
      }

      if (!seasonData || seasonData.length === 0) {
        console.warn("[DuelPassSeasonModal] No active season found");
        setLoading(false);
        return;
      }

      const season = seasonData[0];
      setActiveSeason(season);

      // Получаем прогресс пользователя в сезоне
      const { data: progressData, error: progressError } = await supabase
        .rpc("get_or_create_season_progress", {
          p_user_id: profileId,
          p_season_id: season.id,
        });

      if (progressError) {
        console.error("[DuelPassSeasonModal] Progress error", progressError);
      } else if (progressData && progressData.length > 0) {
        setSeasonProgress(progressData[0]);
      }

      // Получаем награды сезона
      const { data: rewardsData, error: rewardsError } = await supabase
        .from("duel_pass_season_rewards")
        .select("*")
        .eq("season_id", season.id)
        .order("level", { ascending: true });

      if (rewardsError) {
        console.error("[DuelPassSeasonModal] Rewards error", rewardsError);
      } else if (rewardsData) {
        setRewards(rewardsData);
      }

      // Получаем полученные награды из новой системы
      const { data: claimedData } = await supabase
        .from("user_claimed_rewards")
        .select("level, is_premium")
        .eq("user_id", profileId)
        .eq("season", season.season_number);

      if (claimedData) {
        const claimed = new Set<number>();
        claimedData.forEach((item: { level: number; is_premium: boolean }) => {
          // Если это бесплатная награда или Premium награда (и у пользователя Premium)
          if (!item.is_premium || isPremium) {
            claimed.add(item.level);
          }
        });
        setClaimedRewards(claimed);
      }
    } catch (error) {
      console.error("[DuelPassSeasonModal] Load error", error);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (level: number) => {
    if (!profileId || !activeSeason) return;

    try {
      const { error } = await supabase.functions.invoke("duel-pass-claim", {
        body: {
          user_id: profileId,
          level,
          is_premium: isPremium,
          season: activeSeason.season_number,
        },
      });

      if (error) {
        toast.error("Ошибка при получении награды", {
          description: error.message || "Попробуйте позже",
        });
        return;
      }

      setClaimedRewards((prev) => new Set([...prev, level]));
      toast.success("Награда получена!");
      loadSeasonData(); // Перезагружаем данные
    } catch (err: any) {
      console.error("[DuelPassSeasonModal] Claim error", err);
      toast.error("Ошибка при получении награды");
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!activeSeason || !seasonProgress) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duel Pass</DialogTitle>
          </DialogHeader>
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">Нет активного сезона</p>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="font-semibold mb-2">⚠️ Миграция не применена</p>
              <p className="text-xs mb-2">
                Для работы системы сезонов нужно применить миграцию в Supabase:
              </p>
              <ol className="text-xs list-decimal list-inside space-y-1 text-left">
                <li>Откройте SQL Editor в Supabase Dashboard</li>
                <li>Скопируйте содержимое файла <code className="bg-background px-1 rounded">APPLY_SEASON_MIGRATION_NOW.sql</code></li>
                <li>Выполните SQL запрос</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentSP = seasonProgress.season_points || 0;
  const currentLevel = seasonProgress.level || 1;
  const maxLevel = rewards.length || 30;
  const totalSPNeeded = rewards[rewards.length - 1]?.sp_required || 3000;
  const progressPercent = Math.min((currentSP / totalSPNeeded) * 100, 100);

  // Находим текущий уровень
  const currentLevelReward = rewards.find((r) => r.level === currentLevel);
  const nextLevelReward = rewards.find((r) => r.level === currentLevel + 1);
  const spToNextLevel = nextLevelReward
    ? nextLevelReward.sp_required - currentSP
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <DialogTitle className="text-2xl">Duel Pass</DialogTitle>
            </div>
            <Badge variant="secondary" className="text-sm">
              {activeSeason.name_ru}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Season Info */}
          <div className="rounded-xl border p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{activeSeason.name_ru}</h3>
                <p className="text-sm text-muted-foreground">
                  {activeSeason.description_ru}
                </p>
              </div>
              {activeSeason.days_remaining !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {activeSeason.days_remaining} дн. до конца
                  </span>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Уровень {currentLevel} из {maxLevel}
                </span>
                <span className="font-medium">
                  {currentSP} SP
                  {spToNextLevel > 0 && currentLevel < maxLevel && (
                    <span className="text-muted-foreground text-xs ml-1">
                      · до {currentLevel + 1} уровня: {spToNextLevel} SP
                    </span>
                  )}
                </span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progressPercent.toFixed(0)}% прогресса</span>
                <span>{totalSPNeeded} SP всего</span>
              </div>
            </div>
          </div>

          {/* How to earn SP */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Sparkles className="w-4 h-4" />
            <span>
              Получайте SP за тесты (25 SP), дуэли (30 SP за победу), ежедневный вход (15 SP)
            </span>
            {isPremium && (
              <Badge variant="secondary" className="ml-auto">
                +20% SP с Premium
              </Badge>
            )}
          </div>

          {/* Rewards Grid */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold">Награды по уровням</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
              {rewards.map((reward) => {
                const unlocked = currentLevel >= reward.level;
                const isClaimed = claimedRewards.has(reward.level);

                return (
                  <div
                    key={reward.level}
                    className={cn(
                      "rounded-xl border p-3 transition-all",
                      isClaimed
                        ? "border-green-500 bg-green-100/50 dark:bg-green-900/30"
                        : unlocked
                        ? "border-primary/30 bg-primary/5"
                        : "border-muted bg-muted/30 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">Уровень {reward.level}</p>
                          {isClaimed && (
                            <Badge variant="default" className="text-xs bg-green-500">
                              Получено
                            </Badge>
                          )}
                          {!unlocked && (
                            <Badge variant="secondary" className="text-xs">
                              Заблокировано
                            </Badge>
                          )}
                        </div>

                        {/* Free reward */}
                        {reward.free_reward && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Бесплатно:</span>
                            {reward.free_reward.type === "coins" ? (
                              <span className="flex items-center gap-1 font-medium">
                                <Coins className="w-3 h-3 text-yellow-500" />
                                {reward.free_reward.amount || 0} монет
                              </span>
                            ) : (
                              <span className="font-medium">{reward.free_reward.type}</span>
                            )}
                          </div>
                        )}

                        {/* Premium reward */}
                        {isPremium && reward.premium_reward && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                              <Crown className="w-3 h-3" />
                              Premium:
                            </span>
                            {reward.premium_reward.type === "coins" ? (
                              <span className="flex items-center gap-1 font-medium text-yellow-600 dark:text-yellow-500">
                                <Coins className="w-3 h-3" />
                                {reward.premium_reward.amount || 0} монет
                              </span>
                            ) : (
                              <span className="font-medium text-yellow-600 dark:text-yellow-500">
                                {reward.premium_reward.type}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Claim button */}
                      {unlocked && !isClaimed && (
                        <Button
                          size="sm"
                          onClick={() => claimReward(reward.level)}
                          className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                        >
                          Забрать
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Season Challenges */}
          <div className="border-t pt-4">
            <SeasonChallengesWidget />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

