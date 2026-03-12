import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { Info, Trophy, Coins, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DailyQuestWidget } from "../duel/pass/DailyQuestWidget";

type Reward = {
  level: number;
  xp_required: number;
  free_reward: { type: string; amount?: number; id?: string };
  premium_reward: { type: string; amount?: number; id?: string };
};

export function DuelPassProgress() {
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [profile, setProfile] = useState<{ duel_pass_level: number; duel_pass_xp: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);
  const [claimedRewards, setClaimedRewards] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      if (!profileId) return;
      setLoading(true);
      const [
        { data: rewardData },
        { data: profileData },
        { data: claimedData }
      ] = await Promise.all([
        supabase.from("duel_pass_rewards").select("*").order("level", { ascending: true }),
        supabase.from("profiles").select("duel_pass_level, duel_pass_xp").eq("id", profileId).single(),
        supabase.from("user_claimed_rewards")
          .select("level, is_premium")
          .eq("user_id", profileId)
          .eq("season", 1),
      ]);
      if (rewardData) setRewards(rewardData as Reward[]);
      if (profileData) setProfile(profileData);
      if (claimedData) {
        // Создаем Set уровней, которые уже получены (учитываем is_premium)
        const claimed = new Set<number>();
        claimedData.forEach((item: { level: number; is_premium: boolean }) => {
          // Если это бесплатная награда или Premium награда, отмечаем уровень как полученный
          if (!item.is_premium || isPremium) {
            claimed.add(item.level);
          }
        });
        setClaimedRewards(claimed);
      }
      setLoading(false);
    };
    loadData();
  }, [profileId, isPremium]);

  const claimReward = async (level: number) => {
    if (!profileId) return;
    setClaimingLevel(level);
    try {
      const { error, data } = await supabase.functions.invoke("duel-pass-claim", {
        body: { user_id: profileId, level, is_premium: isPremium },
      });

      // Проверяем, есть ли ошибка в ответе
      if (error) {
        // Пытаемся извлечь сообщение из ошибки
        let errorMessage = "Попробуйте позже";
        let is409 = false;

        // Проверяем различные форматы ошибок от Supabase Functions
        if (error.message) {
          errorMessage = error.message;
        } else if (error.context?.message) {
          errorMessage = error.context.message;
        } else if (typeof error === 'string') {
          try {
            const errorData = JSON.parse(error);
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            errorMessage = error;
          }
        }

        // Проверяем статус ошибки
        if (error.status === 409 || error.statusCode === 409 || error.context?.status === 409) {
          is409 = true;
        }

        // Специальная обработка для ошибки 409 (уже получено)
        if (is409 || errorMessage.includes("already claimed") || errorMessage.includes("уже получена") || errorMessage.includes("409")) {
          errorMessage = "Эта награда уже была получена";
          setClaimedRewards(prev => new Set([...prev, level]));
        }

        toast.error("Ошибка при получении награды", {
          description: errorMessage,
        });
        return;
      }

      if (data) {
        // Обновляем данные профиля после получения награды
        const { data: profileData } = await supabase
          .from("profiles")
          .select("duel_pass_level, duel_pass_xp")
          .eq("id", profileId)
          .single();
        if (profileData) {
          setProfile(profileData);
        }

        // Отмечаем награду как полученную
        setClaimedRewards(prev => new Set([...prev, level]));

        // Показываем уведомление об успешном получении награды
        const reward = rewards.find(r => r.level === level);
        if (reward) {
          const rewardData = isPremium ? reward.premium_reward : reward.free_reward;
          const rewardText = rewardData.type === 'coins'
            ? `${rewardData.amount || 0} монет`
            : rewardData.type;
          toast.success(`Награда получена!`, {
            description: `Уровень ${level}: ${rewardText}`,
          });
        }

        // Перезагружаем данные для обновления списка наград
        const { data: claimedData } = await supabase
          .from("user_claimed_rewards")
          .select("level, is_premium")
          .eq("user_id", profileId)
          .eq("season", 1);
        if (claimedData) {
          const claimed = new Set<number>();
          claimedData.forEach((item: { level: number; is_premium: boolean }) => {
            if (!item.is_premium || isPremium) {
              claimed.add(item.level);
            }
          });
          setClaimedRewards(claimed);
        }
      }
    } catch (err: any) {
      console.error("[DuelPassProgress] claim error", err);

      let errorMessage = "Попробуйте позже";
      let is409 = false;

      // Проверяем различные форматы ошибок
      if (err.message) {
        errorMessage = err.message;
      } else if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.context?.message) {
        errorMessage = err.context.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      // Проверяем статус ошибки
      if (err.status === 409 || err.statusCode === 409 || err.context?.status === 409) {
        is409 = true;
      }

      // Специальная обработка для ошибки 409
      if (is409 || errorMessage.includes("already claimed") || errorMessage.includes("уже получена") || errorMessage.includes("409")) {
        errorMessage = "Эта награда уже была получена";
        setClaimedRewards(prev => new Set([...prev, level]));
      }

      toast.error("Ошибка при получении награды", {
        description: errorMessage,
      });
    } finally {
      setClaimingLevel(null);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center p-6">
        <svg className="w-5 h-5 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  const totalLevels = rewards.length || 10;

  // Находим текущий и следующий уровни
  const currentLevelReward = rewards.find(r => r.level === profile.duel_pass_level);
  const nextLevelReward = rewards.find(r => r.level === profile.duel_pass_level + 1);

  // XP для текущего уровня (накопительное значение из БД)
  const currentLevelXP = currentLevelReward?.xp_required || 0;
  // XP для следующего уровня (накопительное значение из БД)
  const nextLevelXP = nextLevelReward?.xp_required || (rewards[rewards.length - 1]?.xp_required || 3000);

  // XP до следующего уровня
  const xpToNextLevel = Math.max(0, nextLevelXP - profile.duel_pass_xp);

  // XP, накопленные в текущем уровне (от начала текущего уровня)
  const prevLevelXP = profile.duel_pass_level > 1
    ? (rewards.find(r => r.level === profile.duel_pass_level - 1)?.xp_required || 0)
    : 0;
  const xpInCurrentLevel = profile.duel_pass_xp - prevLevelXP;

  // XP, необходимые для перехода на следующий уровень
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;

  // Процент прогресса внутри текущего уровня
  const levelProgressPercent = xpNeededForNextLevel > 0 && profile.duel_pass_level < totalLevels
    ? Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100)
    : profile.duel_pass_level >= totalLevels ? 100 : 0;

  // Общий процент прогресса по всему Duel Pass
  const totalXPNeeded = rewards[rewards.length - 1]?.xp_required || 3000;
  const progressPercent = Math.min((profile.duel_pass_xp / totalXPNeeded) * 100, 100);

  return (
    <div className="rounded-2xl border p-4 space-y-6 bg-card">
      {/* Daily Quests Widget */}
      <DailyQuestWidget />

      {/* Header with explanation */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Duel Pass</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-semibold">Что такое Duel Pass?</p>
                    <p className="text-sm">
                      Это система наград за активность! Занимайтесь обучением, проходите тесты и получайте XP.
                      За каждый уровень вы получаете награды: монеты, скины и другие бонусы.
                    </p>
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      💡 XP начисляется за: тесты, ежедневный бонус, дуэли
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant="secondary" className="text-xs">
            {progressPercent.toFixed(0)}%
          </Badge>
        </div>

        {/* Current progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Уровень {profile.duel_pass_level} из {totalLevels}
            </span>
            <span className="font-medium">
              {profile.duel_pass_xp} XP
              {xpToNextLevel > 0 && profile.duel_pass_level < totalLevels && (
                <span className="text-muted-foreground text-xs ml-1">
                  · до {profile.duel_pass_level + 1} уровня: {xpToNextLevel} XP
                </span>
              )}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {profile.duel_pass_level < totalLevels && xpToNextLevel > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              Прогресс уровня: {levelProgressPercent.toFixed(0)}%
            </p>
          )}
        </div>

        {/* How to earn XP */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
          <Sparkles className="w-3 h-3" />
          <span>Получайте XP за тесты, ежедневный бонус и дуэли</span>
        </div>
      </div>

      {/* Rewards list */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Награды по уровням:</p>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {rewards.map((reward) => {
            const unlocked = profile.duel_pass_level >= reward.level;
            const isCurrentLevel = profile.duel_pass_level === reward.level;
            const isLocked = profile.duel_pass_level < reward.level;
            const isClaimed = claimedRewards.has(reward.level);

            return (
              <div
                key={reward.level}
                className={`rounded-xl border p-3 transition-all ${isClaimed
                    ? "border-green-500 bg-green-100/50 dark:bg-green-900/30"
                    : unlocked
                      ? "border-green-300 bg-green-50/50 dark:bg-green-950/20"
                      : isCurrentLevel
                        ? "border-primary/30 bg-primary/5"
                        : "border-muted bg-muted/30 opacity-60"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Уровень {reward.level}</p>
                      {isClaimed && (
                        <Badge variant="default" className="text-xs bg-green-500">Получено</Badge>
                      )}
                      {!isClaimed && isCurrentLevel && (
                        <Badge variant="outline" className="text-xs">Текущий</Badge>
                      )}
                      {isLocked && (
                        <Badge variant="secondary" className="text-xs">Заблокировано</Badge>
                      )}
                    </div>

                    {/* Free reward */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Бесплатно:</span>
                      {reward.free_reward.type === 'coins' ? (
                        <span className="flex items-center gap-1 font-medium">
                          <Coins className="w-3 h-3 text-yellow-500" />
                          {reward.free_reward.amount || 0} монет
                        </span>
                      ) : (
                        <span className="font-medium">{reward.free_reward.type}</span>
                      )}
                    </div>

                    {/* Premium reward */}
                    {isPremium && reward.premium_reward && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-yellow-600 dark:text-yellow-500">Premium:</span>
                        {reward.premium_reward.type === 'coins' ? (
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
                      disabled={claimingLevel === reward.level}
                      className="ml-3 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
                    >
                      {claimingLevel === reward.level ? (
                        <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        "Забрать"
                      )}
                    </Button>
                  )}
                  {isClaimed && (
                    <Badge variant="default" className="ml-3 bg-green-500">
                      ✓ Получено
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


