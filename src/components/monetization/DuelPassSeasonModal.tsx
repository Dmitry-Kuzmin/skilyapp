import { useEffect, useState, useRef, useMemo } from "react";
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
import { Loader2, Trophy, Coins, Crown, Sparkles, X, Clock, BookOpen, Calendar, Target, CheckCircle2, Zap, Gift, Star, ArrowRight, ChevronRight, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SeasonChallengesWidget } from "./SeasonChallengesWidget";
import { PaywallModal } from "./PaywallModal";
import { PremiumRewardUpsell } from "./PremiumRewardUpsell";
import { RewardUnlockAnimation } from "../cosmetics/RewardUnlockAnimation";
import { PremiumPlanSelector } from "./PremiumPlanSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { RewardPreview } from "./RewardPreview";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function DuelPassSeasonModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profileId } = useUserContext();
  const { isPremium: isPremiumFromHook } = usePremium();
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
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  
  // Итоговый Premium статус: либо из хука, либо Premium Forever, либо Premium Pass для сезона
  // ВАЖНО: Premium Forever дает доступ ко всем Premium наградам автоматически
  const isPremium = isPremiumFromHook || hasPremiumForever || hasPremiumPass;
  
  // Логирование для отладки Premium статуса (только при изменении)
  const prevPremiumStatus = useRef<{isPremium: boolean; hasPremiumForever: boolean; hasPremiumPass: boolean} | null>(null);
  useEffect(() => {
    if (open && profileId) {
      const currentStatus = { isPremium, hasPremiumForever, hasPremiumPass };
      if (JSON.stringify(prevPremiumStatus.current) !== JSON.stringify(currentStatus)) {
        console.log('[DuelPassSeasonModal] Premium статус изменился:', currentStatus);
        prevPremiumStatus.current = currentStatus;
      }
    }
  }, [open, profileId, isPremiumFromHook, hasPremiumForever, hasPremiumPass, isPremium]);

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

      // Проверяем Premium Forever статус через функцию БД (более надежно)
      const { data: hasPremiumForeverData, error: premiumForeverError } = await supabase
        .rpc('has_premium_forever', { p_user_id: profileId });
      
      console.log('[DuelPassSeasonModal] Premium Forever check:', {
        hasPremiumForeverData,
        premiumForeverError,
        profileId
      });
      
      // Fallback: проверяем напрямую через поля профиля
      if (premiumForeverError || hasPremiumForeverData === null || hasPremiumForeverData === undefined) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('subscription_type, subscription_status, premium_forever_purchased_at')
          .eq('id', profileId)
          .single();
        
        console.log('[DuelPassSeasonModal] Profile data for Premium Forever check:', {
          subscription_type: profileData?.subscription_type,
          subscription_status: profileData?.subscription_status,
          premium_forever_purchased_at: profileData?.premium_forever_purchased_at,
          profileId
        });
        
        // Premium Forever активен ТОЛЬКО если:
        // 1. premium_forever_purchased_at установлен (покупка была совершена)
        // 2. И subscription_type = 'lifetime' И subscription_status = 'pro'
        const isLifetime = 
          !!profileData?.premium_forever_purchased_at &&
          profileData?.subscription_type === 'lifetime' &&
          profileData?.subscription_status === 'pro';
        
        console.log('[DuelPassSeasonModal] Premium Forever result (fallback):', isLifetime);
        setHasPremiumForever(isLifetime);
      } else {
        console.log('[DuelPassSeasonModal] Premium Forever result (RPC):', hasPremiumForeverData === true);
        setHasPremiumForever(hasPremiumForeverData === true);
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
        console.log("[DuelPassSeasonModal] Загружено наград из БД:", rewardsData.length, rewardsData);
        setRewards(rewardsData);
      } else {
        console.warn("[DuelPassSeasonModal] Награды не найдены для сезона:", season.id);
      }

      // Получаем полученные награды из новой системы
      const { data: claimedData, error: claimedError } = await supabase
        .from("user_claimed_rewards")
        .select("level, is_premium")
        .eq("user_id", profileId)
        .eq("season", season.season_number);

      if (claimedError) {
        console.error("[DuelPassSeasonModal] Ошибка загрузки полученных наград:", claimedError);
      }

      if (claimedData) {
        console.log("[DuelPassSeasonModal] Загружено полученных наград из БД:", claimedData);
        const claimed = new Set<number>();
        const claimedFree = new Set<number>();
        const claimedPremium = new Set<number>();
        
        claimedData.forEach((item: { level: number; is_premium: boolean }) => {
          if (!item.is_premium) {
            // Бесплатная награда получена
            claimedFree.add(item.level);
            claimed.add(item.level);
            console.log(`[DuelPassSeasonModal] Бесплатная награда уровня ${item.level} помечена как полученная`);
          } else {
            // Premium награда получена
            claimedPremium.add(item.level);
            if (isPremium) {
              claimed.add(item.level);
            }
            console.log(`[DuelPassSeasonModal] Premium награда уровня ${item.level} помечена как полученная`);
          }
        });
        
        console.log("[DuelPassSeasonModal] Итоговые множества:", {
          claimedFree: Array.from(claimedFree),
          claimedPremium: Array.from(claimedPremium),
          claimed: Array.from(claimed)
        });
        
        setClaimedRewards(claimed);
        setClaimedFreeRewards(claimedFree);
        setClaimedPremiumRewards(claimedPremium);
      } else {
        console.log("[DuelPassSeasonModal] Нет полученных наград в БД");
      }
    } catch (error) {
      console.error("[DuelPassSeasonModal] Load error", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

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
  // Используем useRef для стабильной ссылки на функцию
  const loadSeasonDataRef = useRef(loadSeasonData);
  useEffect(() => {
    loadSeasonDataRef.current = loadSeasonData;
  });
  
  useEffect(() => {
    if (open && profileId && activeSeason?.id) {
      const interval = setInterval(() => {
        loadSeasonDataRef.current(true); // true = тихое обновление
      }, 30000); // Увеличено до 30 секунд
      return () => clearInterval(interval);
    }
  }, [open, profileId, activeSeason?.id]); // Используем только id сезона вместо всего объекта

  // Даты сезона (вычисляем всегда, даже если сезон еще не загружен)
  const seasonStartDate = activeSeason?.start_date ? new Date(activeSeason.start_date) : null;
  const seasonEndDate = activeSeason?.end_date ? new Date(activeSeason.end_date) : null;

  // Таймер обратного отсчета (ВСЕГДА вызывается, даже если seasonEndDate null)
  useEffect(() => {
    if (!seasonEndDate) {
      setTimeLeft(null);
      return;
    }
    
    const updateTimer = () => {
      const now = new Date();
      const diff = seasonEndDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft({ days, hours, minutes });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Обновляем каждую минуту
    
    return () => clearInterval(interval);
  }, [seasonEndDate]);

  // Вычисляем значения для отображения (ВСЕГДА, даже если данных нет)
  const currentSP = seasonProgress?.season_points || 0;
  const currentLevel = seasonProgress?.level || 1;
  const maxLevel = rewards.length || 30;
  const totalSPNeeded = rewards.length > 0 ? (rewards[rewards.length - 1]?.sp_required || 3000) : 3000;
  const progressPercent = totalSPNeeded > 0 ? Math.min((currentSP / totalSPNeeded) * 100, 100) : 0;

  // Находим следующий уровень для расчета SP
  const nextLevelReward = rewards.find((r) => r.level === currentLevel + 1);
  const nextLevelSP = nextLevelReward?.sp_required || totalSPNeeded;
  const spToNextLevel = Math.max(0, nextLevelSP - currentSP);

  // Фильтрация наград (ВСЕГДА вызывается, даже если rewards пустой)
  const filteredRewards = useMemo(() => {
    if (!rewards || rewards.length === 0) {
      console.log('[DuelPassSeasonModal] Нет наград для фильтрации');
      return [];
    }
    
    const filtered = rewards.filter((reward) => {
      const unlocked = currentLevel >= reward.level;
      const isClaimed = claimedRewards.has(reward.level);
      
      if (rewardFilter === 'available') {
        return unlocked && !isClaimed;
      }
      return true;
    });
    
    console.log('[DuelPassSeasonModal] Фильтрация наград:', {
      totalRewards: rewards.length,
      currentLevel,
      rewardFilter,
      filteredCount: filtered.length,
      claimedRewards: Array.from(claimedRewards)
    });
    
    return filtered;
  }, [rewards, currentLevel, rewardFilter, claimedRewards]);

  // Компонент информационной кнопки (вынесен на верхний уровень)
  const InfoButton = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("shrink-0", isMobile ? "h-8 w-8" : "h-9 w-9")}
            onClick={() => setShowInfoDialog(true)}
          >
            <Info className={cn("text-muted-foreground hover:text-foreground transition-colors", isMobile ? "h-4 w-4" : "h-4 w-4")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Как работает Duel Pass?</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Информационный диалог (вынесен на верхний уровень, всегда рендерится)
  const InfoDialog = () => (
    <AlertDialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Как работает Duel Pass?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-foreground">Как получать SP (Season Points)?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Получайте SP за прохождение тестов (+25), победы в дуэлях (+30), ежедневный вход (+15) и выполнение заданий. Premium пользователи получают +20% бонус к SP.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-foreground">Что такое уровни?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Каждый уровень требует определенное количество SP. При достижении уровня вы получаете доступ к наградам этого уровня. Уровни открываются последовательно.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Crown className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-foreground">Разница Free и Premium?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Бесплатные награды</strong> доступны всем. <strong>Premium награды</strong> доступны только пользователям с Premium подпиской или Premium Pass. Premium награды обычно более ценные и уникальные.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Gift className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-foreground">Что такое награды путешествия?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Это уникальные награды сезона: скины, бейджи, стикеры, бусты и монеты. Каждый сезон предлагает эксклюзивные награды, которые больше не будут доступны после окончания сезона.
                  </p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );

  const handleRewardClick = async (reward: any) => {
    console.log('[DuelPassSeasonModal] handleRewardClick:', {
      level: reward.level,
      hasFreeReward: !!reward.free_reward,
      hasPremiumReward: !!reward.premium_reward,
      isPremium,
      freeClaimed: claimedFreeRewards.has(reward.level),
      premiumClaimed: claimedPremiumRewards.has(reward.level)
    });
    
    // Если пользователь Premium и есть Premium награда - получаем Premium награду
    if (isPremium && reward.premium_reward && !claimedPremiumRewards.has(reward.level)) {
      // Сначала получаем бесплатную награду (если есть и еще не получена)
      if (reward.free_reward && !claimedFreeRewards.has(reward.level)) {
        await claimReward(reward.level, false);
      }
      // Затем получаем Premium награду
      await claimReward(reward.level, true);
    } else if (reward.free_reward && !claimedFreeRewards.has(reward.level)) {
      // Если есть бесплатная награда и она не получена - получаем её
      await claimReward(reward.level, false);
      
      // Если есть Premium награда и пользователь Premium, но Premium еще не получена - получаем Premium
      if (reward.premium_reward && isPremium && !claimedPremiumRewards.has(reward.level)) {
        // Небольшая задержка для показа анимации получения бесплатной награды
        setTimeout(async () => {
          await claimReward(reward.level, true);
        }, 500);
      } else if (reward.premium_reward && !isPremium) {
        // Если пользователь НЕ Premium - показываем модалку после получения бесплатной
        setTimeout(() => {
          setPremiumRewardPreview({
            level: reward.level,
            premium_reward: reward.premium_reward,
          });
        }, 500);
      }
    } else if (reward.premium_reward && !isPremium && !claimedPremiumRewards.has(reward.level)) {
      // Если есть только Premium награда и пользователь НЕ Premium - показываем модалку
      setPremiumRewardPreview({
        level: reward.level,
        premium_reward: reward.premium_reward,
      });
    } else if (isPremium && reward.premium_reward && !claimedPremiumRewards.has(reward.level)) {
      // Если пользователь Premium и Premium награда не получена - получаем её
      await claimReward(reward.level, true);
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

  // Общий контент модалки
  const ModalContent = () => {
    // Показываем skeleton во время загрузки
    if (loading) {
      return <SkeletonContent />;
    }
    
    return (
    <>
      {/* Улучшенный Header с тематикой сезона */}
      {isMobile ? (
        <SheetHeader className="px-4 pt-2 pb-4 border-b bg-gradient-to-br from-orange-500/5 via-red-500/5 to-yellow-500/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-red-500 rounded-full blur-xl" />
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <motion.div 
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0 ring-2 ring-orange-500/30"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Trophy className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Duel Pass
              </SheetTitle>
              <SheetDescription asChild>
                <div className="text-xs mt-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{activeSeason.name_ru}</span>
                    {seasonStartDate && seasonEndDate && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {seasonStartDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - {seasonEndDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      </>
                    )}
                  </div>
                  {timeLeft && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 w-fit">
                      <Clock className="w-3 h-3 text-red-500" />
                      <span className="text-xs font-bold text-red-600">
                        {timeLeft.days}д {String(timeLeft.hours).padStart(2, '0')}ч {String(timeLeft.minutes).padStart(2, '0')}м
                      </span>
                    </div>
                  )}
                </div>
              </SheetDescription>
            </div>
            <InfoButton />
          </div>
        </SheetHeader>
      ) : (
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-orange-500/5 via-red-500/5 to-yellow-500/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500 rounded-full blur-2xl" />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shrink-0 ring-2 ring-orange-500/30"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Trophy className="w-6 h-6 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 bg-clip-text text-transparent">
                  Duel Pass
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="text-sm mt-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{activeSeason.name_ru}</span>
                      {seasonStartDate && seasonEndDate && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {seasonStartDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - {seasonEndDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                        </>
                      )}
                    </div>
                    {timeLeft && (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 w-fit">
                        <Clock className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                        <span className="text-xs font-bold text-red-600">
                          {timeLeft.days}д {String(timeLeft.hours).padStart(2, '0')}ч {String(timeLeft.minutes).padStart(2, '0')}м
                        </span>
                      </div>
                    )}
                  </div>
                </DialogDescription>
              </div>
            </div>
            <InfoButton />
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
          
          {/* Единый прогресс-бар с анимацией */}
          <div className="relative h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full shadow-sm"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
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

        {/* Улучшенный баннер Premium Duel Pass */}
        {!hasPremiumPass && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => !hasPremiumForever && setShowPremiumSelector(true)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 transition-all duration-300",
              "bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-500/20",
              "border-purple-500/30 hover:border-purple-500/50",
              !hasPremiumForever && "cursor-pointer hover:shadow-2xl hover:shadow-purple-500/20",
              "backdrop-blur-sm"
            )}
          >
            {/* Анимированный фон */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.3),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(236,72,153,0.3),transparent_50%)]" />
            
            {/* Декоративные элементы */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full blur-2xl" />
            
            <div className="relative p-4 md:p-6">
              {/* Заголовок и цена */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative">
                      <Crown className="w-6 h-6 md:w-7 md:h-7 text-yellow-400 drop-shadow-lg" />
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="absolute inset-0"
                      >
                        <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-yellow-300 absolute -top-1 -right-1" />
                      </motion.div>
                    </div>
                    <h4 className="font-bold text-lg md:text-xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                      Premium Duel Pass
                    </h4>
                    {hasPremiumForever && (
                      <Badge className="bg-green-500/90 text-white text-xs px-2 py-0.5 shadow-lg">
                        Бесплатно
                      </Badge>
                    )}
                  </div>
                  
                  {/* Описание */}
                  <p className="text-sm md:text-base text-foreground/90 mb-3 font-medium">
                    {hasPremiumForever 
                      ? 'У тебя Premium Forever - Duel Pass уже открыт!'
                      : 'Что такое Duel Pass?'}
                  </p>
                  
                  {!hasPremiumForever && (
                    <p className="text-xs md:text-sm text-muted-foreground mb-4 leading-relaxed">
                      Сезонная система наград, которая открывает эксклюзивные призы за прохождение дуэлей и выполнение заданий. Premium версия удваивает все награды!
                    </p>
                  )}
                </div>
                
                {/* Кнопка покупки */}
                {!hasPremiumForever && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0"
                  >
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPremiumSelector(true);
                      }}
                      size="lg"
                      className="w-full md:w-auto bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white font-bold shadow-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 px-6 py-6 md:py-3"
                    >
                      <Sparkles className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                      <span className="text-base md:text-sm">Купить за 7.99€</span>
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                )}
              </div>
              
              {/* Выгоды Premium Duel Pass */}
              {!hasPremiumForever && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-purple-500/20">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">2x награды</p>
                      <p className="text-[10px] text-muted-foreground">Удвоенные монеты и XP</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
                      <Star className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Эксклюзивы</p>
                      <p className="text-[10px] text-muted-foreground">Уникальные косметики</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Быстрый старт</p>
                      <p className="text-[10px] text-muted-foreground">+5 уровней сразу</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Все сезоны</p>
                      <p className="text-[10px] text-muted-foreground">Доступ ко всем наградам</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Индикатор Premium Forever */}
        {/* Показываем ТОЛЬКО если действительно есть Premium Forever (без проверки hasPremiumPass) */}
        {hasPremiumForever && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-600">Premium Forever активен</p>
              <p className="text-xs text-muted-foreground">Duel Pass автоматически открыт для всех сезонов</p>
            </div>
          </div>
        )}

        {/* Баннер сезонности - показываем всегда для ощущения ограниченности */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center justify-between p-3 rounded-xl border transition-all",
            timeLeft && timeLeft.days <= 7
              ? "bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 border-red-500/20"
              : "bg-gradient-to-r from-orange-500/5 via-red-500/5 to-yellow-500/5 border-orange-500/10"
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className={cn(
              "w-4 h-4",
              timeLeft && timeLeft.days <= 7 ? "text-red-500 animate-pulse" : "text-orange-500"
            )} />
            <div>
              <p className="text-xs font-semibold text-foreground">
                {timeLeft && timeLeft.days <= 7 ? "Сезон заканчивается!" : "Сезонный Duel Pass"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {timeLeft && timeLeft.days <= 7 ? "Успей получить все награды" : "Ограниченное время • Уникальные награды"}
              </p>
            </div>
          </div>
          {timeLeft && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                timeLeft.days <= 7
                  ? "bg-red-500/10 border-red-500/30 text-red-600"
                  : "bg-orange-500/10 border-orange-500/30 text-orange-600"
              )}
            >
              <Clock className="w-3 h-3 mr-1" />
              {timeLeft.days}д {String(timeLeft.hours).padStart(2, '0')}ч
            </Badge>
          )}
        </motion.div>

        {/* Современная таблица наград */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Награды по уровням
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ограниченное время • Уникальные награды
              </p>
            </div>
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
                  {filteredRewards.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Gift className="w-8 h-8 text-muted-foreground/50" />
                          <p className="text-sm font-medium">Нет наград для отображения</p>
                          <p className="text-xs">
                            {rewards.length === 0 
                              ? 'Награды еще не загружены' 
                              : rewardFilter === 'available' 
                                ? 'Все доступные награды уже получены' 
                                : 'Проверьте фильтры'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRewards.map((reward) => {
                    const unlocked = currentLevel >= reward.level;
                    const isCurrent = currentLevel === reward.level;
                    
                    // Проверяем наличие наград
                    const hasFreeReward = !!reward.free_reward; // Есть ли бесплатная награда вообще
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
                      // Если есть бесплатная награда - она должна быть получена
                      // Если нет бесплатной награды - не учитываем её (считаем "полученной" условно)
                      const freeRewardClaimed = hasFreeReward ? freeClaimed : true;
                      
                      // Проверяем Premium награду
                      let premiumRewardClaimed = true; // По умолчанию true (если нет Premium награды)
                      if (reward.premium_reward) {
                        if (isPremium) {
                          // Если пользователь Premium - Premium награда должна быть получена
                          premiumRewardClaimed = premiumClaimed;
                        } else {
                          // Если пользователь НЕ Premium - Premium награда недоступна
                          // НО! Если у уровня ТОЛЬКО Premium награда (нет бесплатной), то уровень НЕ может быть "получен"
                          // для не-Premium пользователя, пока он не станет Premium
                          // Если есть бесплатная награда - Premium не учитываем (она недоступна)
                          premiumRewardClaimed = hasFreeReward ? true : false; // Если нет бесплатной - Premium обязательна
                        }
                      }
                      
                      // КРИТИЧНО: Если у уровня ТОЛЬКО Premium награда (нет бесплатной) и пользователь НЕ Premium,
                      // то награда НЕ может быть получена (она недоступна)
                      if (!hasFreeReward && reward.premium_reward && !isPremium) {
                        allClaimed = false; // Premium награда недоступна для не-Premium пользователей
                      } else {
                        allClaimed = freeRewardClaimed && premiumRewardClaimed;
                      }
                      
                      // Логирование отключено для предотвращения спама и мерцания
                      // Раскомментируйте для отладки:
                      // if (reward.level % 2 === 1 && process.env.NODE_ENV === 'development') {
                      //   console.log(`[DuelPassSeasonModal] Уровень ${reward.level}:`, {
                      //     unlocked,
                      //     hasFreeReward,
                      //     freeClaimed,
                      //     freeRewardClaimed,
                      //     hasPremiumReward: !!reward.premium_reward,
                      //     isPremium,
                      //     premiumClaimed,
                      //     premiumRewardClaimed,
                      //     allClaimed
                      //   });
                      // }
                    } else {
                      // Уровень не разблокирован - не может быть "получен"
                      allClaimed = false;
                    }
                    
                    return (
                      <motion.tr
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: reward.level * 0.02 }}
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
                            <RewardPreview 
                              reward={{ type: 'coins', amount: reward.free_reward.amount }}
                              size="sm"
                            />
                          ) : reward.free_reward ? (
                            <RewardPreview 
                              reward={reward.free_reward}
                              size="sm"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        
                        {/* Корона (Premium) */}
                        <td className="px-4 py-3">
                          {reward.premium_reward ? (
                            <div className="flex items-center gap-2">
                              <RewardPreview 
                                reward={reward.premium_reward}
                                isPremium={true}
                                size="sm"
                              />
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
                              {hasFreeReward && !freeClaimed ? (
                                // Есть бесплатная награда и она не получена
                                "Получить"
                              ) : !hasFreeReward && reward.premium_reward && !isPremium ? (
                                // Только Premium награда, но пользователь НЕ Premium - показываем что нужен Premium
                                <>
                                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                                  Premium
                                </>
                              ) : (reward.premium_reward && isPremium && !premiumClaimed) || (hasFreeReward && freeClaimed && reward.premium_reward && isPremium && !premiumClaimed) ? (
                                // Есть Premium награда, пользователь Premium, но Premium награда не получена
                                // Для Premium пользователей используем более понятный текст
                                <>
                                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                                  Забрать награду
                                </>
                              ) : (
                                // Все награды получены или нет доступных наград
                                "Забрать"
                              )}
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Заблокировано
                            </Badge>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })
                  )}
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
      {/* Информационный диалог (всегда рендерится) */}
      <InfoDialog />
      
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

