import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import { RewardUnlockAnimation } from "../cosmetics/RewardUnlockAnimation";
import { PremiumPlanSelector } from "./PremiumPlanSelector";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [claimedFreeRewards, setClaimedFreeRewards] = useState<Set<number>>(new Set());
  const [claimedPremiumRewards, setClaimedPremiumRewards] = useState<Set<number>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [premiumRewardPreview, setPremiumRewardPreview] = useState<{level: number; premium_reward: any} | null>(null);
  const [unlockedReward, setUnlockedReward] = useState<any | null>(null);
  const [showPremiumSelector, setShowPremiumSelector] = useState(false);
  const [hasPremiumForever, setHasPremiumForever] = useState(false);
  const [hasPremiumPass, setHasPremiumPass] = useState(false);

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
        setHasPremiumPass(progressData[0].premium_pass_purchased || false);
      }

      // Проверяем Premium Forever статус
      const { data: profileData } = await supabase
        .from('profiles')
        .select('subscription_type, subscription_status')
        .eq('id', profileId)
        .single();
      
      const isLifetime = 
        (profileData?.subscription_type === 'lifetime' && profileData?.subscription_status === 'pro') ||
        profileData?.subscription_status === 'lifetime';
      
      setHasPremiumForever(isLifetime);

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
        const claimedFree = new Set<number>();
        const claimedPremium = new Set<number>();
        
        claimedData.forEach((item: { level: number; is_premium: boolean }) => {
          if (!item.is_premium) {
            // Бесплатная награда получена
            claimedFree.add(item.level);
            claimed.add(item.level);
          } else {
            // Premium награда получена
            claimedPremium.add(item.level);
            if (isPremium) {
              claimed.add(item.level);
            }
          }
        });
        
        setClaimedRewards(claimed);
        setClaimedFreeRewards(claimedFree);
        setClaimedPremiumRewards(claimedPremium);
      }
    } catch (error) {
      console.error("[DuelPassSeasonModal] Load error", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleRewardClick = async (reward: any) => {
    // Если пользователь премиум и есть обе награды - получаем обе последовательно
    if (isPremium && reward.premium_reward) {
      // Сначала получаем бесплатную награду (если есть и еще не получена)
      if (reward.free_reward) {
        await claimReward(reward.level, false);
      }
      // Затем получаем премиум награду
      await claimReward(reward.level, true);
    } else if (reward.free_reward) {
      // Если есть бесплатная награда - получаем её (независимо от премиум статуса)
      await claimReward(reward.level, false);
      
      // Если есть премиум награда и пользователь не премиум - показываем модалку после получения бесплатной
      if (reward.premium_reward && !isPremium) {
        // Небольшая задержка для показа анимации получения бесплатной награды
        setTimeout(() => {
          setPremiumRewardPreview({
            level: reward.level,
            premium_reward: reward.premium_reward,
          });
        }, 500);
      }
    } else if (reward.premium_reward && !isPremium) {
      // Если есть только премиум награда и пользователь не премиум - показываем модалку
      setPremiumRewardPreview({
        level: reward.level,
        premium_reward: reward.premium_reward,
      });
    }
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
        // Игнорируем ошибку 409 (уже получено) - это нормально при последовательном получении
        if (error.status === 409 || error.statusCode === 409) {
          console.log(`[DuelPassSeasonModal] Reward already claimed for level ${level}, is_premium: ${isPremiumReward}`);
          return;
        }
        toast.error("Ошибка при получении награды", {
          description: error.message || "Попробуйте позже",
        });
        return;
      }

      // Показываем детали полученной награды
      if (data?.reward) {
        const reward = data.reward;
        
        // Для косметики (скины, бейджи, стикеры) показываем анимацию
        if (["skin", "badge", "sticker"].includes(reward.type) && reward.id) {
          // Загружаем определение косметики из БД
          const tableName = reward.type === "skin" ? "skin_definitions" : 
                           reward.type === "badge" ? "badge_definitions" : 
                           "sticker_definitions";
          
          const { data: definition } = await supabase
            .from(tableName)
            .select("*")
            .eq("id", reward.id)
            .single();
          
          if (definition) {
            setUnlockedReward({
              type: reward.type,
              id: reward.id,
              name_ru: definition.name_ru,
              description_ru: definition.description_ru,
              rarity: definition.rarity,
              metadata: definition.metadata,
            });
          }
        } else {
          // Для монет и бустов показываем toast
          let rewardText = "";
          
          if (reward.type === "coins" && reward.amount) {
            rewardText = `+${reward.amount} монет`;
          } else if (reward.type === "boost" && reward.id) {
            rewardText = `Буст: ${reward.id}`;
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
        }
      } else {
        toast.success("Награда получена!");
      }

      // Обновляем локальное состояние
      if (isPremiumReward) {
        setClaimedPremiumRewards((prev) => new Set([...prev, level]));
        if (isPremium) {
          setClaimedRewards((prev) => new Set([...prev, level]));
        }
      } else {
        setClaimedFreeRewards((prev) => new Set([...prev, level]));
        setClaimedRewards((prev) => new Set([...prev, level]));
      }
      loadSeasonData(true); // Перезагружаем данные (тихое обновление)
    } catch (err: any) {
      console.error("[DuelPassSeasonModal] Claim error", err);
      toast.error("Ошибка при получении награды");
    }
  };

  // Skeleton контент для загрузки
  const SkeletonContent = () => (
    <>
      {/* Header Skeleton */}
      {isMobile ? (
        <SheetHeader className="px-4 pt-2 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </SheetHeader>
      ) : (
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </DialogHeader>
      )}

      <div className={cn("space-y-6", isMobile ? "px-4 py-4" : "px-6 py-6")}>
        {/* Progress Skeleton */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="h-6 w-16 ml-auto" />
              <Skeleton className="h-3 w-24 ml-auto" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* SP Cards Skeleton */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-lg" />
          ))}
        </div>

        {/* Premium Pass Banner Skeleton */}
        <Skeleton className="h-24 w-full rounded-xl" />

        {/* Rewards Table Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
          
          {/* Table Header Skeleton */}
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-muted/50 border-b">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            
            {/* Table Rows Skeleton */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-2 px-4 py-3 border-b last:border-b-0">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-6 w-12 rounded" />
                <Skeleton className="h-8 w-20 rounded-lg mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  if (!activeSeason || !seasonProgress) {
    // Показываем skeleton если еще загружается, иначе показываем ошибку
    if (loading) {
      return (
        <>
          {isMobile ? (
            <Sheet open={open} onOpenChange={onOpenChange}>
              <SheetContent 
                side="bottom" 
                className="h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0"
              >
                <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-background z-10 shrink-0">
                  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SkeletonContent />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={open} onOpenChange={onOpenChange}>
              <DialogContent className="max-w-4xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col p-0">
                <div className="flex-1 overflow-y-auto">
                  <SkeletonContent />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      );
    }
    
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
  const ModalContent = () => {
    // Показываем skeleton во время загрузки
    if (loading) {
      return <SkeletonContent />;
    }
    
    return (
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

        {/* Кнопка покупки Premium Pass (если не куплен) */}
        {!hasPremiumPass && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border-2 border-yellow-500/30 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-orange-500/5 animate-pulse" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <h4 className="font-bold text-lg">Premium Duel Pass</h4>
                  {hasPremiumForever && (
                    <Badge className="bg-green-500 text-white text-xs">
                      Бесплатно
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasPremiumForever 
                    ? 'У тебя Premium Forever - Duel Pass уже открыт!'
                    : 'Разблокируй все Premium награды и ускорь прогрессию'}
                </p>
              </div>
              {!hasPremiumForever && (
                <Button
                  onClick={() => setShowPremiumSelector(true)}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Купить за 7.99€
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Индикатор Premium Forever */}
        {hasPremiumForever && hasPremiumPass && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-600">Premium Forever активен</p>
              <p className="text-xs text-muted-foreground">Duel Pass автоматически открыт для всех сезонов</p>
            </div>
          </div>
        )}

        {/* Современная таблица наград */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">
              Награды по уровням
            </h4>
            {/* Фильтры */}
            <div className="flex gap-2">
              <button
                onClick={() => setRewardFilter('all')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  rewardFilter === 'all'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Все
              </button>
              <button
                onClick={() => setRewardFilter('available')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  rewardFilter === 'available'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Доступные
              </button>
            </div>
          </div>
          
          {/* Улучшенная таблица */}
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Уровень</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span>Бесплатно</span>
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <span>Premium</span>
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">SP</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRewards.map((reward) => {
                    const unlocked = currentLevel >= reward.level;
                    const isCurrent = currentLevel === reward.level;
                    
                    // Проверяем наличие наград
                    const hasFreeCoins = reward.free_reward?.type === 'coins' && reward.free_reward?.amount;
                    const hasPremiumCoins = reward.premium_reward?.type === 'coins' && reward.premium_reward?.amount;
                    const hasPremiumOther = reward.premium_reward && reward.premium_reward.type !== 'coins';
                    
                    // Проверяем, какие награды получены
                    const freeClaimed = claimedFreeRewards.has(reward.level);
                    const premiumClaimed = claimedPremiumRewards.has(reward.level);
                    
                    // Правильная логика: allClaimed только если уровень разблокирован И все доступные награды получены
                    let allClaimed = false;
                    if (unlocked) {
                      // Проверяем бесплатную награду
                      const freeRewardClaimed = hasFreeCoins ? freeClaimed : true; // Если нет бесплатной - считаем "полученной"
                      
                      // Проверяем Premium награду
                      let premiumRewardClaimed = true;
                      if (reward.premium_reward) {
                        if (isPremium) {
                          // Если пользователь Premium - Premium награда должна быть получена
                          premiumRewardClaimed = premiumClaimed;
                        } else {
                          // Если пользователь НЕ Premium - Premium награда не считается (она недоступна)
                          premiumRewardClaimed = true; // Не учитываем Premium награду для не-Premium пользователей
                        }
                      }
                      
                      allClaimed = freeRewardClaimed && premiumRewardClaimed;
                    } else {
                      // Уровень не разблокирован - не может быть "получен"
                      allClaimed = false;
                    }
                    
                    return (
                      <tr
                        key={reward.level}
                        className={cn(
                          "border-b border-border/50 transition-all cursor-pointer group",
                          isCurrent && "bg-primary/5 border-l-4 border-l-primary",
                          allClaimed 
                            ? "bg-green-500/5 hover:bg-green-500/10" 
                            : unlocked 
                            ? "hover:bg-muted/50" 
                            : "opacity-50"
                        )}
                        onClick={() => {
                          if (unlocked && !allClaimed) {
                            handleRewardClick(reward);
                          }
                        }}
                      >
                        {/* Уровень */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-all",
                              isCurrent 
                                ? "bg-primary text-primary-foreground shadow-sm" 
                                : allClaimed 
                                ? "bg-green-500/20 text-green-600" 
                                : unlocked 
                                ? "bg-muted text-foreground" 
                                : "bg-muted/50 text-muted-foreground"
                            )}>
                              {reward.level}
                            </div>
                            {isCurrent && (
                              <Badge variant="secondary" className="text-xs">
                                Текущий
                              </Badge>
                            )}
                          </div>
                        </td>
                        
                        {/* Монетки (Free) */}
                        <td className="px-4 py-3">
                          {hasFreeCoins ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 w-fit">
                              <Coins className="w-4 h-4 text-yellow-500 shrink-0" />
                              <span className="text-sm font-semibold">{reward.free_reward.amount}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        
                        {/* Корона (Premium) */}
                        <td className="px-4 py-3">
                          {reward.premium_reward ? (
                            <div className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg border w-fit transition-all",
                              isPremium 
                                ? "bg-yellow-500/10 border-yellow-500/20" 
                                : "bg-muted/50 border-muted group-hover:border-yellow-500/30"
                            )}>
                              <Crown className={cn(
                                "w-4 h-4 shrink-0",
                                isPremium ? "text-yellow-600" : "text-muted-foreground"
                              )} />
                              {hasPremiumCoins ? (
                                <span className={cn(
                                  "text-sm font-semibold",
                                  isPremium ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {reward.premium_reward.amount}
                                </span>
                              ) : hasPremiumOther ? (
                                <span className={cn(
                                  "text-xs font-medium",
                                  isPremium ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {reward.premium_reward.type === 'skin' ? '🎨 Скин' :
                                   reward.premium_reward.type === 'badge' ? '🏆 Бейдж' :
                                   reward.premium_reward.type === 'boost' ? '⚡ Буст' :
                                   reward.premium_reward.type === 'sticker' ? '😊 Стикер' : ''}
                                </span>
                              ) : null}
                              {!isPremium && (
                                <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        
                        {/* SP */}
                        <td className="px-4 py-3">
                          {!unlocked ? (
                            <Badge variant="outline" className="text-xs">
                              +{reward.sp_required - currentSP} SP
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        
                        {/* Действие */}
                        <td className="px-4 py-3 text-center">
                          {allClaimed ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              <span className="text-xs font-medium text-green-600">Получено</span>
                            </div>
                          ) : unlocked ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRewardClick(reward);
                              }}
                              className={cn(
                                "h-8 px-4 text-xs font-medium",
                                // Если есть бесплатная награда и она не получена - обычная кнопка
                                // Если бесплатная получена, но есть премиум - желтая кнопка
                                // Если только премиум - желтая кнопка
                                ((hasFreeCoins && freeClaimed) || !hasFreeCoins) && reward.premium_reward && !isPremium && !premiumClaimed && "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-sm"
                              )}
                            >
                              {hasFreeCoins && !freeClaimed ? (
                                "Получить"
                              ) : reward.premium_reward && !isPremium && !premiumClaimed ? (
                                <>
                                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                                  Получить Premium
                                </>
                              ) : (
                                "Забрать"
                              )}
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Заблокировано
                            </Badge>
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
  };

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
            className="h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0"
          >
            {/* Handle для свайпа */}
            <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-background z-10 shrink-0">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <ModalContent />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col p-0">
            <div className="flex-1 overflow-y-auto">
              <ModalContent />
            </div>
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
    
    {/* Reward Unlock Animation */}
    {unlockedReward && (
      <RewardUnlockAnimation
        open={!!unlockedReward}
        onOpenChange={(open) => {
          if (!open) setUnlockedReward(null);
        }}
        reward={unlockedReward}
      />
    )}

    {/* Premium Plan Selector */}
    <PremiumPlanSelector
      open={showPremiumSelector}
      onOpenChange={(open) => {
        setShowPremiumSelector(open);
        if (!open) {
          // Перезагружаем данные после закрытия селектора
          loadSeasonData(true);
        }
      }}
      triggerSource="duel_pass"
    />
    </>
  );
}

