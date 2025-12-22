import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Flame, Gift, Sparkles, Zap, Trophy, Check, Lock, Clock, Info, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { isTelegramMiniApp } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { RewardedAdModal } from "@/components/monetization/RewardedAdModal";
import { usePremium } from "@/hooks/usePremium";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DailyBonus = () => {
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(true);
  const [dailyBonus, setDailyBonus] = useState<any>(null);
  const [weeklyRewards, setWeeklyRewards] = useState<any[]>([]);
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [userXP, setUserXP] = useState(0);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoringStreak, setRestoringStreak] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showRewardedAdModal, setShowRewardedAdModal] = useState(false);
  const { isPremium } = usePremium();

  useEffect(() => {
    if (profileId) {
      loadBonusData();
    }
  }, [profileId]);

  const loadBonusData = async () => {
    if (!profileId) return;

    try {
      setLoading(true);

      // Загружаем профиль
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins, xp')
        .eq('id', profileId)
        .single();

      if (profile) {
        setUserCoins(profile.coins || 0);
        setUserXP(profile.xp || 0);
      }

      // Загружаем награды (90 дней)
      const { data: rewards } = await (supabase as any)
        .from('daily_bonus_def')
        .select('*')
        .order('day_number', { ascending: true });

      if (rewards) {
        setWeeklyRewards(rewards);
      }

      // Загружаем данные ежедневного бонуса
      const { data: bonus } = await (supabase as any)
        .from('user_daily_bonus')
        .select('*')
        .eq('user_id', profileId)
        .maybeSingle();

      if (bonus) {
        setDailyBonus(bonus);
        setCanClaimBonus(checkCanClaim(bonus.last_claimed_date));
      } else {
        // Создаем запись
        const { data: newBonus } = await (supabase as any)
          .from('user_daily_bonus')
          .insert({
            user_id: profileId,
            current_streak: 0,
            total_claims: 0,
          })
          .select()
          .single();

        setDailyBonus(newBonus);
        setCanClaimBonus(true);
      }
    } catch (error) {
      console.error('Error loading bonus data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные бонусов",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCanClaim = (lastClaimedDate: string | null): boolean => {
    if (!lastClaimedDate) return true;
    const today = new Date().toISOString().split('T')[0];
    return lastClaimedDate !== today;
  };

  const handleClaimBonus = async () => {
    if (!dailyBonus || !profileId) return;

    try {
      setClaimingBonus(true);
      
      // КРИТИЧНО: Используем Edge Function для безопасной обработки на сервере
      // Все логика (UTC время, идемпотентность, начисление наград) теперь на сервере
      const { data, error } = await supabase.functions.invoke('claim-daily-bonus', {
        body: { user_id: profileId }
      });

      if (error) {
        console.error('[DailyBonus] Edge Function error:', error);
        throw error;
      }

      // Проверяем ответ
      if (!data) {
        throw new Error('No data received from server');
      }

      // Проверяем, не был ли уже получен бонус сегодня
      if (data.already_claimed) {
        toast({
          title: "Уже получено",
          description: "Сегодняшняя награда уже получена",
          variant: "default",
        });
        // Обновляем данные
        loadBonusData();
        setClaimingBonus(false);
        return;
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to claim daily bonus');
      }

      const { streak, reward, date } = data;
      
      if (typeof streak !== 'number' || !reward || typeof reward !== 'object') {
        console.error('[DailyBonus] Invalid response:', data);
        throw new Error('Invalid response from server: missing or invalid streak/reward');
      }
      
      const weekDay = (streak % 7) || 7;

      // Обновляем локальное состояние
      setDailyBonus({
        ...dailyBonus,
        current_streak: streak,
        last_claimed_date: date || new Date().toISOString().split('T')[0], // Fallback на текущую дату
        total_claims: dailyBonus.total_claims + 1,
      });

      // Обновляем XP и монеты из ответа (или перезагружаем данные)
      if (reward?.xp) setUserXP(prev => prev + reward.xp);
      if (reward?.coins) setUserCoins(prev => prev + reward.coins);
      setCanClaimBonus(false);

      // Показываем награду
      let rewardText = [];
      if (reward?.xp > 0) rewardText.push(`+${reward.xp} XP`);
      if (reward?.coins > 0) rewardText.push(`+${reward.coins} монет`);
      if (reward?.boost) rewardText.push('⚡ Boost получен!');

      toast({
        title: "🎉 Награда получена!",
        description: rewardText.join(', '),
        duration: 4000,
      });

      // Особые сообщения для milestone streak
      if ([7, 14, 21, 30, 60, 90].includes(streak)) {
        setTimeout(() => {
          const messages: Record<number, string> = {
            7: "🏆 Недельный герой! Первая неделя позади!",
            14: "🔥 Две недели подряд! Железная воля!",
            21: "⭐ Три недели! Ты невероятен!",
            30: "🎊 Месяц подряд! Настоящий чемпион!",
            60: "💎 Два месяца! Неостановимый!",
            90: "👑 ЖЕЛЕЗНАЯ ВОЛЯ! 90 дней подряд!"
          };
          const currentReward = weeklyRewards.find(r => r.day_number === weekDay);
          toast({
            title: messages[streak],
            description: currentReward?.description || '',
            duration: 5000,
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Error claiming bonus:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить награду",
        variant: "destructive",
      });
    } finally {
      setClaimingBonus(false);
    }
  };

  const handleRestoreStreak = async () => {
    if (!dailyBonus || !profileId || userCoins < 10) return;

    try {
      setRestoringStreak(true);

      const today = new Date().toISOString().split('T')[0];

      // КРИТИЧНО: Используем атомарную операцию для списания монет
      // OPTIMISTIC UPDATE: Обновляем UI сразу, до ответа сервера
      const previousCoins = userCoins;
      const expectedNewCoins = previousCoins - 10;

      // Оптимистично обновляем кэш (вычисляем локально)
      queryClient.setQueryData(
        ['profile-data', profileId],
        (old: any) => ({
          ...old,
          coins: expectedNewCoins,
        })
      );

      // Выполняем атомарную операцию на сервере
      const { error: coinsError } = await supabase.rpc('increment_profile_value', {
        p_profile_id: profileId,
        p_column: 'coins',
        p_amount: -10, // Отрицательное значение для списания
      });

      if (coinsError) {
        console.error('[DailyBonus] Error decrementing coins:', coinsError);
        // Откатываем optimistic update при ошибке
        queryClient.setQueryData(
          ['profile-data', profileId],
          (old: any) => ({
            ...old,
            coins: previousCoins,
          })
        );
        throw new Error(coinsError.message || 'Не удалось списать монеты');
      }

      // Получаем актуальный баланс с сервера для синхронизации
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', profileId)
        .single();

      const newCoins = updatedProfile?.coins ?? expectedNewCoins;
      
      // Синхронизируем кэш с реальным значением с сервера
      if (updatedProfile?.coins !== undefined) {
        queryClient.setQueryData(
          ['profile-data', profileId],
          (old: any) => ({
            ...old,
            coins: updatedProfile.coins,
          })
        );
      }

      await (supabase as any)
        .from('user_daily_bonus')
        .update({
          last_claimed_date: today,
        })
        .eq('id', dailyBonus.id);

      setUserCoins(newCoins);
      setDailyBonus({
        ...dailyBonus,
        last_claimed_date: today,
      });
      setCanClaimBonus(false);
      setShowRestoreDialog(false);

      toast({
        title: "✨ Серия восстановлена!",
        description: "Твоя серия продолжается! -10 монет",
      });
    } catch (error) {
      console.error('Error restoring streak:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось восстановить серию",
        variant: "destructive",
      });
    } finally {
      setRestoringStreak(false);
    }
  };

  // Восстановление streak через просмотр рекламы
  const handleRestoreStreakWithAd = async () => {
    if (!dailyBonus || !profileId) return;

    setShowRestoreDialog(false);
    setShowRewardedAdModal(true);
  };

  const handleAdRewardClaimed = async () => {
    if (!dailyBonus || !profileId) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Retry логика для мобильных устройств (где могут быть проблемы с сетью)
      const maxRetries = 3;
      let lastError: any = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke('ad-reward', {
            body: {
              user_id: profileId,
              reward_type: 'restore_streak',
            },
          });

          if (error) {
            console.error(`[DailyBonus] Error claiming ad reward (attempt ${attempt + 1}/${maxRetries}):`, error);
            lastError = error;
            
            if (attempt === maxRetries - 1) {
              throw error;
            }
            
            const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Успех - инвалидируем кэш профиля для обновления баланса во всех компонентах
          if (profileId) {
            queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });
          }
          break;
        } catch (err: any) {
          console.error(`[DailyBonus] Exception during ad reward claim (attempt ${attempt + 1}/${maxRetries}):`, err);
          lastError = err;
          
          if (attempt === maxRetries - 1) {
            // Проверяем, возможно награда уже была начислена через Reward URL от AdsGram
            const errorMessage = err.message || err.toString() || '';
            const isNetworkError = errorMessage.includes('Failed to send') || 
                                  errorMessage.includes('Сетевое соединение') ||
                                  errorMessage.includes('access control checks');
            
            if (isNetworkError) {
              // На мобильном могут быть проблемы с сетью, но AdsGram уже вызвал Reward URL
              // Продолжаем выполнение, как будто успешно
              console.log('[DailyBonus] Network error, but reward might be already processed by AdsGram');
            } else {
              throw err;
            }
          } else {
            const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // Обновляем streak
      await (supabase as any)
        .from('user_daily_bonus')
        .update({
          last_claimed_date: today,
        })
        .eq('id', dailyBonus.id);

      setDailyBonus({
        ...dailyBonus,
        last_claimed_date: today,
      });
      setCanClaimBonus(false);

      // Обновляем баланс монет (если начислены)
      queryClient.invalidateQueries({ queryKey: ['profile-data', profileId] });

      toast({
        title: "✨ Серия восстановлена!",
        description: "Посмотрел видео — серия продолжается!",
      });
    } catch (error) {
      console.error('[DailyBonus] Error claiming ad reward:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось восстановить серию",
        variant: "destructive",
      });
    }
  };

  const currentStreak = dailyBonus?.current_streak || 0;
  const nextReward = weeklyRewards.find(r => r.day_number === currentStreak + 1);
  const streakBroken = dailyBonus?.last_claimed_date && 
    new Date(dailyBonus.last_claimed_date).toISOString().split('T')[0] !== 
    new Date(Date.now() - 86400000).toISOString().split('T')[0] &&
    !canClaimBonus;

  const isTelegramApp = isTelegramMiniApp();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div 
        className={cn(
          "sticky z-10 bg-background/95 backdrop-blur-sm border-b",
          isTelegramApp 
            ? "tg-safe-top" 
            : "top-0"
        )}
        style={isTelegramApp ? {
          paddingTop: `calc(env(safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 80px))`,
          top: 0
        } : {
          paddingTop: '0px',
          top: 0
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <Gift className="w-6 h-6 text-primary animate-pulse" />
                <h1 className="text-xl font-bold">Ежедневный бонус</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Заходи каждый день и получай награды
              </p>
            </div>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowStreakInfo(true)}
            >
              <Info className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Streak Counter */}
        <Card className="p-6 gradient-card border-2 border-primary/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                currentStreak >= 30 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                currentStreak >= 7 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                'bg-gradient-to-br from-primary to-secondary'
              } shadow-lg ${currentStreak >= 7 ? 'animate-pulse' : ''}`}>
                <Flame className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {currentStreak} {currentStreak === 1 ? 'день' : currentStreak < 5 ? 'дня' : 'дней'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentStreak < 7 ? 'Продолжай серию!' :
                   currentStreak < 30 ? 'Невероятная серия!' :
                   currentStreak < 60 ? 'Ты неостановим!' :
                   'Железная воля!'}
                </p>
              </div>
            </div>

            {streakBroken && userCoins >= 10 && (
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(true)}
                className="border-gold text-gold hover:bg-gold/10"
              >
                Восстановить за 10 🪙
              </Button>
            )}
          </div>

          {/* Progress to next milestone */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                До следующей вехи: 
                {currentStreak < 7 ? ' 7 дней' :
                 currentStreak < 14 ? ' 14 дней' :
                 currentStreak < 21 ? ' 21 день' :
                 currentStreak < 30 ? ' 30 дней' :
                 currentStreak < 60 ? ' 60 дней' :
                 currentStreak < 90 ? ' 90 дней' :
                 ' Максимум достигнут!'}
              </span>
              <span className="font-bold text-primary">
                {currentStreak < 7 ? `${7 - currentStreak} дней` :
                 currentStreak < 14 ? `${14 - currentStreak} дней` :
                 currentStreak < 21 ? `${21 - currentStreak} день` :
                 currentStreak < 30 ? `${30 - currentStreak} дней` :
                 currentStreak < 60 ? `${60 - currentStreak} дней` :
                 currentStreak < 90 ? `${90 - currentStreak} дней` :
                 '🎉'}
              </span>
            </div>
            <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary via-secondary to-primary transition-all duration-500"
                style={{ 
                  width: `${
                    currentStreak < 7 ? (currentStreak / 7) * 100 :
                    currentStreak < 14 ? ((currentStreak - 7) / 7) * 100 :
                    currentStreak < 21 ? ((currentStreak - 14) / 7) * 100 :
                    currentStreak < 30 ? ((currentStreak - 21) / 9) * 100 :
                    currentStreak < 60 ? ((currentStreak - 30) / 30) * 100 :
                    currentStreak < 90 ? ((currentStreak - 60) / 30) * 100 :
                    100
                  }%` 
                }}
              />
            </div>
          </div>
        </Card>

        {/* Today's Reward */}
        {nextReward && canClaimBonus && (
          <Card className="p-6 gradient-card border-2 border-primary/30 relative overflow-hidden animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-primary/10 pointer-events-none" />
            
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center shadow-lg animate-bounce-slow">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Награда дня {currentStreak + 1}</h3>
                  <p className="text-sm text-muted-foreground">{nextReward.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {nextReward.reward.xp > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-xl border border-primary/30">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="font-bold">+{nextReward.reward.xp} XP</span>
                  </div>
                )}
                {nextReward.reward.coins > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gold/20 rounded-xl border border-gold/30">
                    <span className="text-xl">🪙</span>
                    <span className="font-bold">+{nextReward.reward.coins}</span>
                  </div>
                )}
                {nextReward.reward.boost && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20 rounded-xl border border-secondary/30">
                    <Zap className="w-5 h-5 text-secondary" />
                    <span className="font-bold">Boost x2</span>
                  </div>
                )}
                {nextReward.reward.badge && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gold/20 rounded-xl border border-gold/30">
                    <Trophy className="w-5 h-5 text-gold" />
                    <span className="font-bold">Бейдж</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleClaimBonus}
                disabled={claimingBonus}
                className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50"
                size="lg"
              >
                {claimingBonus ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    Получение награды...
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    Забрать награду
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {!canClaimBonus && !streakBroken && (
          <Card className="p-6 text-center border-2 border-border/50">
            <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-bold mb-1">Награда уже получена</h3>
            <p className="text-sm text-muted-foreground">
              Возвращайся завтра за новой наградой!
            </p>
          </Card>
        )}

        {/* Road Progress */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Путь к финалу (90 дней)</h2>
          
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {weeklyRewards.map((reward, idx) => {
                const dayNum = reward.day_number;
                const isCompleted = currentStreak >= dayNum;
                const isCurrent = currentStreak + 1 === dayNum;
                const isSpecial = [7, 14, 21, 30, 60, 90].includes(dayNum);
                const hasBoost = reward.reward.boost;
                const hasBadge = reward.reward.badge;
                
                return (
                  <div
                    key={dayNum}
                    className={`flex flex-col items-center gap-2 ${isSpecial ? 'w-24' : 'w-20'}`}
                  >
                    <div className={`
                      ${isSpecial ? 'w-20 h-20' : 'w-16 h-16'}
                      rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all duration-300
                      ${isCompleted ? 
                        'bg-gradient-to-br from-primary to-secondary border-primary shadow-lg shadow-primary/30' :
                        isCurrent && canClaimBonus ? 
                        'bg-gradient-to-br from-gold/30 to-primary/30 border-gold animate-pulse shadow-md' :
                        'bg-muted/30 border-border/50'
                      }
                    `}>
                      {isCompleted ? (
                        <Check className={`${isSpecial ? 'w-10 h-10' : 'w-8 h-8'} text-primary-foreground`} strokeWidth={3} />
                      ) : isCurrent && canClaimBonus ? (
                        <>
                          {hasBadge ? (
                            <Trophy className={`${isSpecial ? 'w-10 h-10' : 'w-8 h-8'} text-gold animate-bounce`} />
                          ) : hasBoost ? (
                            <Zap className={`${isSpecial ? 'w-10 h-10' : 'w-8 h-8'} text-primary animate-pulse`} />
                          ) : (
                            <Gift className={`${isSpecial ? 'w-10 h-10' : 'w-8 h-8'} text-primary animate-bounce`} />
                          )}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-muted-foreground mb-1" />
                          <div className="text-[10px] text-center leading-tight">
                            {reward.reward.xp > 0 && <div className="font-bold text-primary">+{reward.reward.xp}</div>}
                          </div>
                        </>
                      )}
                      
                      {isSpecial && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gold rounded-full flex items-center justify-center shadow-lg">
                          <Trophy className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className={`text-xs font-bold text-center ${
                      isCompleted || (isCurrent && canClaimBonus) ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      День {dayNum}
                    </div>

                    {isSpecial && (
                      <div className="text-[10px] text-gold font-bold text-center">
                        🏆 Веха
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Achievements */}
        <Card className="p-6 gradient-card">
          <h3 className="font-bold mb-4">Достижения серий</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { days: 7, title: '7 дней', icon: '🔥', unlocked: currentStreak >= 7 },
              { days: 14, title: '14 дней', icon: '⚡', unlocked: currentStreak >= 14 },
              { days: 30, title: '30 дней', icon: '🌟', unlocked: currentStreak >= 30 },
              { days: 60, title: '60 дней', icon: '💎', unlocked: currentStreak >= 60 },
              { days: 90, title: '90 дней', icon: '👑', unlocked: currentStreak >= 90 },
            ].map((achievement) => (
              <div
                key={achievement.days}
                className={`p-4 rounded-xl border-2 transition-all ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-primary/20 to-secondary/20 border-primary shadow-md'
                    : 'bg-muted/30 border-border/50 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <div className="font-bold">{achievement.title}</div>
                <div className="text-xs text-muted-foreground">
                  {achievement.unlocked ? 'Разблокировано' : 'Заблокировано'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Restore Streak Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Восстановить серию?</AlertDialogTitle>
            <AlertDialogDescription>
              Твоя серия прервана. Выбери способ восстановления:
              <br /><br />
              У тебя: {userCoins} 🪙
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            {/* Опция с монетами */}
            <Button
              onClick={handleRestoreStreak}
              disabled={restoringStreak || userCoins < 10}
              className="w-full justify-start"
              variant={userCoins >= 10 ? "default" : "outline"}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              За 10 монет {userCoins < 10 && '(недостаточно)'}
            </Button>
            
            {/* Опция с рекламой (только для non-Premium) */}
            {!isPremium && (
              <Button
                onClick={handleRestoreStreakWithAd}
                className="w-full justify-start bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
                variant="default"
              >
                <Video className="w-4 h-4 mr-2" />
                Бесплатно — посмотреть рекламу
              </Button>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rewarded Ad Modal */}
      <RewardedAdModal
        open={showRewardedAdModal}
        onOpenChange={setShowRewardedAdModal}
        rewardType="restore_streak"
        onRewardClaimed={handleAdRewardClaimed}
      />

      {/* Streak Info Dialog */}
      <AlertDialog open={showStreakInfo} onOpenChange={setShowStreakInfo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Как работает серия?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                🔥 Заходи каждый день и получай награды. Твоя серия растёт с каждым днём!
              </p>
              <p>
                ⚠️ Если пропустишь день — серия сбрасывается. Но ты можешь восстановить её за 10 монет.
              </p>
              <p>
                🏆 На 7, 14, 21, 30, 60 и 90 день тебя ждут особые награды и достижения!
              </p>
              <p>
                🎯 Цель — дойти до 90 дней и получить титул "Железная воля"!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Понятно</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DailyBonus;