import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, Trophy, Coins, Crown, Sparkles, X, Clock, BookOpen, Calendar, Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SeasonChallengesWidget } from "./SeasonChallengesWidget";
import { PaywallModal } from "./PaywallModal";
import { PremiumRewardUpsell } from "./PremiumRewardUpsell";

export function DuelPassSeasonModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [rewardFilter, setRewardFilter] = useState<'all' | 'available'>('all');
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [seasonProgress, setSeasonProgress] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<Set<number>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [premiumRewardPreview, setPremiumRewardPreview] = useState<{level: number; premium_reward: any} | null>(null);

  useEffect(() => {
    if (open && profileId) {
      loadSeasonData();
      
      // Проверяем, видел ли пользователь онбординг
      const hasSeenOnboarding = localStorage.getItem('duel-pass-onboarding-seen');
      if (!hasSeenOnboarding) {
        // Показываем онбординг после загрузки данных
        setTimeout(() => {
          setShowOnboarding(true);
        }, 500);
      }
    }
  }, [open, profileId]);

  // Автообновление данных каждые 30 секунд когда модалка открыта (тихое обновление без показа loading)
  useEffect(() => {
    if (open && profileId && activeSeason) {
      const interval = setInterval(() => {
        loadSeasonData(true); // true = тихое обновление
      }, 30000); // Увеличено до 30 секунд
      return () => clearInterval(interval);
    }
  }, [open, profileId, activeSeason]);

  const loadSeasonData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      // Получаем активный сезон
      const { data: seasonData, error: seasonError } = await supabase
        .rpc("get_active_season");

      if (seasonError) {
        console.error("[DuelPassSeasonModal] Error loading season", seasonError);
        // Если функция не найдена (404), значит миграция не применена
        if (seasonError.code === 'PGRST116' || seasonError.message?.includes('404')) {
          console.error("[DuelPassSeasonModal] ⚠️ Миграция не применена! Примените файл APPLY_SEASON_MIGRATION_NOW.sql в Supabase SQL Editor");
        }
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      if (!seasonData || seasonData.length === 0) {
        console.warn("[DuelPassSeasonModal] No active season found");
        if (!silent) {
          setLoading(false);
        }
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
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleRewardClick = (reward: any) => {
    // Если есть премиум награда и пользователь не премиум - показываем модалку
    if (reward.premium_reward && !isPremium) {
      setPremiumRewardPreview({
        level: reward.level,
        premium_reward: reward.premium_reward,
      });
      return;
    }
    // Иначе получаем бесплатную награду
    claimReward(reward.level, false);
  };

  const claimReward = async (level: number, isPremiumReward: boolean = false) => {
    if (!profileId || !activeSeason) return;

    try {
      const { data, error } = await supabase.functions.invoke("duel-pass-claim", {
        body: {
          user_id: profileId,
          level,
          is_premium: isPremiumReward ? isPremium : false,
          season: activeSeason.season_number,
        },
      });

      if (error) {
        toast.error("Ошибка при получении награды", {
          description: error.message || "Попробуйте позже",
        });
        return;
      }

      // Показываем детали полученной награды
      if (data?.reward) {
        const reward = data.reward;
        let rewardText = "";
        
        if (reward.type === "coins" && reward.amount) {
          rewardText = `+${reward.amount} монет`;
        } else if (reward.type === "boost" && reward.id) {
          rewardText = `Буст: ${reward.id}`;
        } else if (reward.type === "skin" && reward.id) {
          rewardText = `Скин: ${reward.id}`;
        } else if (reward.type === "badge" && reward.id) {
          rewardText = `Бейдж: ${reward.id}`;
        } else if (reward.type === "sticker" && reward.id) {
          rewardText = `Стикер: ${reward.id}`;
        } else {
          rewardText = "Награда получена!";
        }

        toast.success(
          isPremium ? "🎉 Премиум награда получена!" : "🎉 Награда получена!",
          {
            description: `Уровень ${level}: ${rewardText}`,
            duration: 4000,
          }
        );
      } else {
        toast.success("Награда получена!");
      }

      setClaimedRewards((prev) => new Set([...prev, level]));
      loadSeasonData(true); // Перезагружаем данные (тихое обновление)
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
            <DialogDescription>Система сезонов Duel Pass</DialogDescription>
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

  // Находим следующий уровень для расчета SP
  const nextLevelReward = rewards.find((r) => r.level === currentLevel + 1);
  const nextLevelSP = nextLevelReward?.sp_required || totalSPNeeded;
  const spToNextLevel = Math.max(0, nextLevelSP - currentSP);

  // Фильтрация наград
  const filteredRewards = rewards.filter((reward) => {
    const unlocked = currentLevel >= reward.level;
    const isClaimed = claimedRewards.has(reward.level);
    
    if (rewardFilter === 'available') {
      return unlocked && !isClaimed;
    }
    return true;
  });

  // Общий контент модалки
  const ModalContent = () => (
    <>
      {/* Упрощенный Header */}
      {isMobile ? (
        <SheetHeader className="px-4 pt-2 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold">Duel Pass</SheetTitle>
              <SheetDescription className="text-xs mt-0.5 flex items-center gap-2">
                <span>{activeSeason.name_ru}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activeSeason.days_remaining} дней
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
      ) : (
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold">Duel Pass</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 flex items-center gap-2">
                <span>{activeSeason.name_ru}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activeSeason.days_remaining} дней
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
      )}

      <div className={cn("space-y-6", isMobile ? "px-4 py-4" : "px-6 py-6")}>
        {/* Упрощенный Progress - минималистичный */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{currentLevel}</span>
                <span className="text-sm text-muted-foreground">/ {maxLevel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentLevel < maxLevel && spToNextLevel > 0 
                  ? `${spToNextLevel} SP до уровня ${currentLevel + 1}` 
                  : currentLevel >= maxLevel 
                  ? 'Максимальный уровень достигнут' 
                  : 'Загрузка...'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{currentSP}</p>
              <p className="text-xs text-muted-foreground">Season Points</p>
            </div>
          </div>
          
          {/* Единый прогресс-бар */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Тонкие маркеры уровней */}
            {rewards.slice(0, 10).map((r) => {
              const position = (r.sp_required / totalSPNeeded) * 100;
              const isReached = currentSP >= r.sp_required;
              return (
                <div
                  key={r.level}
                  className={cn(
                    "absolute top-0 w-px h-2 transition-opacity",
                    isReached ? "bg-white/50" : "bg-muted-foreground/20"
                  )}
                  style={{ left: `${Math.min(position, 100)}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Компактные карточки SP - горизонтальный layout */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/50">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 border border-border/50 hover:border-blue-500/50 transition-colors">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold">+25</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 border border-border/50 hover:border-purple-500/50 transition-colors">
            <Trophy className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold">+30</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 border border-border/50 hover:border-green-500/50 transition-colors">
            <Calendar className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold">+15</span>
          </div>
          {isPremium ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-semibold">+20%</span>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenChange(false);
                setShowPaywall(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 border border-yellow-500/30 hover:bg-yellow-500/10 transition-colors"
            >
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-semibold">+20%</span>
            </button>
          )}
        </div>

        {/* Компактная таблица наград */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Награды по уровням
            </h4>
            {/* Компактные фильтры */}
            <div className="flex gap-1">
              <button
                onClick={() => setRewardFilter('all')}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] rounded-full transition-colors",
                  rewardFilter === 'all'
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Все
              </button>
              <button
                onClick={() => setRewardFilter('available')}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] rounded-full transition-colors",
                  rewardFilter === 'available'
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Доступные
              </button>
            </div>
          </div>
          
          {/* Компактная таблица */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="text-left px-2 py-1 text-[9px] font-semibold text-muted-foreground w-12">Lv</th>
                    <th className="text-left px-2 py-1 text-[9px] font-semibold text-muted-foreground w-16">
                      <Coins className="w-3 h-3 inline text-yellow-500" />
                    </th>
                    <th className="text-left px-2 py-1 text-[9px] font-semibold text-muted-foreground w-16">
                      <Crown className="w-3 h-3 inline" />
                    </th>
                    <th className="text-left px-2 py-1 text-[9px] font-semibold text-muted-foreground w-20">SP</th>
                    <th className="text-center px-2 py-1 text-[9px] font-semibold text-muted-foreground w-16">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRewards.map((reward) => {
                    const unlocked = currentLevel >= reward.level;
                    const isClaimed = claimedRewards.has(reward.level);
                    const isCurrent = currentLevel === reward.level;
                    
                    // Проверяем наличие наград
                    const hasFreeCoins = reward.free_reward?.type === 'coins' && reward.free_reward?.amount;
                    const hasPremiumCoins = reward.premium_reward?.type === 'coins' && reward.premium_reward?.amount;
                    const hasPremiumOther = reward.premium_reward && reward.premium_reward.type !== 'coins';
                    
                    return (
                      <tr
                        key={reward.level}
                        className={cn(
                          "border-b transition-colors cursor-pointer group",
                          isCurrent && "bg-primary/10",
                          isClaimed 
                            ? "bg-green-500/5 hover:bg-green-500/10" 
                            : unlocked 
                            ? "hover:bg-muted/30" 
                            : "bg-muted/10 opacity-60"
                        )}
                        onClick={() => {
                          if (unlocked && !isClaimed) {
                            handleRewardClick(reward);
                          }
                        }}
                      >
                        {/* Уровень */}
                        <td className="px-2 py-1">
                          <div className={cn(
                            "inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold",
                            isCurrent 
                              ? "bg-primary text-white" 
                              : isClaimed 
                              ? "bg-green-500/20 text-green-600" 
                              : unlocked 
                              ? "bg-muted text-muted-foreground" 
                              : "bg-muted/30 text-muted-foreground"
                          )}>
                            {reward.level}
                          </div>
                        </td>
                        
                        {/* Монетки (Free) */}
                        <td className="px-2 py-1">
                          {hasFreeCoins ? (
                            <div className="flex items-center gap-0.5">
                              <Coins className="w-2.5 h-2.5 text-yellow-500 shrink-0" />
                              <span className="text-[10px] font-semibold">{reward.free_reward.amount}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-muted-foreground/40">—</span>
                          )}
                        </td>
                        
                        {/* Корона (Premium) */}
                        <td className="px-2 py-1">
                          {reward.premium_reward ? (
                            <div className={cn(
                              "flex items-center gap-0.5 transition-colors",
                              isPremium 
                                ? "text-yellow-600" 
                                : "text-muted-foreground/50 group-hover:text-yellow-500/70"
                            )}>
                              <Crown className={cn(
                                "w-2.5 h-2.5 shrink-0",
                                !isPremium && "opacity-50 group-hover:opacity-100"
                              )} />
                              {hasPremiumCoins ? (
                                <span className={cn(
                                  "text-[10px] font-semibold",
                                  !isPremium && "line-through opacity-60"
                                )}>
                                  {reward.premium_reward.amount}
                                </span>
                              ) : hasPremiumOther ? (
                                <span className={cn(
                                  "text-[9px]",
                                  !isPremium && "line-through opacity-60"
                                )}>
                                  {reward.premium_reward.type === 'skin' ? 'Скин' :
                                   reward.premium_reward.type === 'badge' ? 'Бейдж' :
                                   reward.premium_reward.type === 'boost' ? 'Буст' :
                                   reward.premium_reward.type === 'sticker' ? 'Стикер' : ''}
                                </span>
                              ) : null}
                              {!isPremium && (
                                <span className="text-[8px] text-yellow-500 ml-0.5 animate-pulse">💎</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] text-muted-foreground/40">—</span>
                          )}
                        </td>
                        
                        {/* SP */}
                        <td className="px-2 py-1">
                          {!unlocked ? (
                            <span className="text-[9px] text-muted-foreground">
                              +{reward.sp_required - currentSP}
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground/40">—</span>
                          )}
                        </td>
                        
                        {/* Действие */}
                        <td className="px-2 py-1 text-center">
                          {isClaimed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mx-auto" />
                          ) : unlocked ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRewardClick(reward);
                              }}
                              className={cn(
                                "h-5 px-1.5 text-[9px]",
                                reward.premium_reward && !isPremium && "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 hover:from-yellow-500/30 hover:to-orange-500/30"
                              )}
                            >
                              {reward.premium_reward && !isPremium ? (
                                <>
                                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                                  Premium
                                </>
                              ) : (
                                "Забрать"
                              )}
                            </Button>
                          ) : (
                            <span className="text-[9px] text-muted-foreground/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Season Challenges */}
        <div className="border-t pt-4">
          <SeasonChallengesWidget />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Онбординг модалка - минималистичный */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold">Добро пожаловать в Duel Pass!</DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              Система сезонов с наградами за вашу активность
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Trophy className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1 text-sm">Что такое Season Points (SP)?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  SP — это очки сезона, которые вы получаете за активность. 
                  Чем больше SP, тем выше ваш уровень и больше наград!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Sparkles className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1 text-sm">Как получить SP?</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span>Прохождение тестов: <strong className="text-foreground">25 SP</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span>Победа в дуэли: <strong className="text-foreground">30 SP</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span>Ежедневный вход: <strong className="text-foreground">15 SP</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span>Premium: <strong className="text-foreground">+20% к SP</strong></span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Crown className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold mb-1 text-sm">Premium награды</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  С Premium подпиской вы получаете дополнительные награды на каждом уровне и бонус +20% к SP!
                </p>
              </div>
            </div>
            <Button 
              onClick={() => {
                localStorage.setItem('duel-pass-onboarding-seen', 'true');
                setShowOnboarding(false);
              }}
              className="w-full"
            >
              Понятно, начать!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модалка для десктопа, Sheet для мобилки */}
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent 
            side="bottom" 
            className="h-[90vh] overflow-y-auto p-0"
          >
            {/* Handle для свайпа */}
            <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-background z-10">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            <ModalContent />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <ModalContent />
          </DialogContent>
        </Dialog>
      )}

    <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    
    {/* Premium Reward Upsell Modal */}
    {premiumRewardPreview && (
      <PremiumRewardUpsell
        open={!!premiumRewardPreview}
        onOpenChange={(open) => {
          if (!open) setPremiumRewardPreview(null);
        }}
        reward={premiumRewardPreview}
        onGetPremium={() => {
          setShowPaywall(true);
          setPremiumRewardPreview(null);
        }}
      />
    )}
    </>
  );
}

