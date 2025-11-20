import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Trophy } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCoins } from '@/hooks/useCoins';
import { supabase } from '@/integrations/supabase/client';
const supabaseClient = supabase as any;
import { BoostShopModal } from '@/components/shop/BoostShopModal';
import { DuelPassSeasonModal } from '@/components/monetization/DuelPassSeasonModal';
import { cn } from '@/lib/utils';

interface WalletWidgetProps {
  className?: string;
}

// Глобальный кэш для данных сезона (не очищается при навигации)
const duelPassCache: Record<string, { 
  data: { level: number; xp: number; progress: number; spToNextLevel: number } | null;
  seasonData: { name_ru?: string; days_remaining?: number; end_date?: string } | null;
  timestamp: number;
}> = {};
const DUEL_PASS_CACHE_DURATION = 30000; // 30 секунд

export function WalletWidget({ className }: WalletWidgetProps) {
  const { profileId } = useUserContext();
  const { balance, loading: coinsLoading } = useCoins();
  const { t } = useLanguage();
  const [shopOpen, setShopOpen] = useState(false);
  const [duelPassModalOpen, setDuelPassModalOpen] = useState(false);
  const [duelPassData, setDuelPassData] = useState<{ level: number; xp: number; progress: number; spToNextLevel: number } | null>(null);
  const [seasonData, setSeasonData] = useState<{ name_ru?: string; days_remaining?: number; end_date?: string } | null>(null);
  const [duelPassLoading, setDuelPassLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!profileId) {
      setShowSkeleton(false);
      return;
    }

    // Проверяем кэш перед загрузкой
    const cached = duelPassCache[profileId];
    const now = Date.now();
    let skeletonTimeout: NodeJS.Timeout | null = null;
    
    if (cached && (now - cached.timestamp) < DUEL_PASS_CACHE_DURATION) {
      setDuelPassData(cached.data);
      setSeasonData(cached.seasonData);
      setDuelPassLoading(false);
      setShowSkeleton(false);
      hasInitializedRef.current = true;
      // Не загружаем заново, если кэш свежий
      return;
    }

    // Задержка перед показом skeleton для предотвращения мигания
    if (!hasInitializedRef.current) {
    setShowSkeleton(true);
      skeletonTimeout = setTimeout(() => {
      setShowSkeleton(true);
    }, 100);
    }

    const loadDuelPass = async () => {
      try {
        setDuelPassLoading(true);
        
        // Оптимизация: параллельные запросы через Promise.all
        const [seasonResult, rewardsResult] = await Promise.allSettled([
          supabaseClient.rpc("get_active_season"),
          // Получаем все награды сразу (они кэшируются на клиенте)
          supabaseClient
            .from("duel_pass_season_rewards")
            .select("season_id, level, sp_required")
            .order("level", { ascending: true })
        ]);

        if (seasonResult.status === 'rejected' || !seasonResult.value.data || seasonResult.value.data.length === 0) {
          console.warn('[WalletWidget] No active season found');
          setDuelPassLoading(false);
          return;
        }

        const activeSeason = seasonResult.value.data[0];
        
        // Сохраняем данные сезона для onboarding
        setSeasonData({
          name_ru: activeSeason.name_ru,
          days_remaining: activeSeason.days_remaining,
          end_date: activeSeason.end_date,
        });
        
        // Получаем прогресс после получения сезона
        const { data: progressData, error: progressError } = await supabaseClient
          .rpc("get_or_create_season_progress", {
            p_user_id: profileId,
            p_season_id: activeSeason.id,
          });

        if (progressError || !progressData || progressData.length === 0) {
          console.warn('[WalletWidget] Error loading season progress:', progressError);
          setDuelPassLoading(false);
          return;
        }

        const progress = progressData[0];
        const currentSP = progress.season_points || 0;
        const currentLevel = progress.level || 1;
        
        // Используем уже загруженные награды или фильтруем по season_id
        const rewardsData = rewardsResult.status === 'fulfilled' && rewardsResult.value.data
          ? rewardsResult.value.data.filter((r: any) => r.season_id === activeSeason.id)
          : [];

        if (rewardsData && rewardsData.length > 0) {
          // Находим следующий уровень
          const nextLevelReward = rewardsData.find((r: any) => r.level === currentLevel + 1);
          const totalSPNeeded = rewardsData[rewardsData.length - 1]?.sp_required || 3000;
          
          // Рассчитываем прогресс до следующего уровня
          const nextLevelSP = nextLevelReward?.sp_required || totalSPNeeded;
          const spToNextLevel = Math.max(0, nextLevelSP - currentSP);
          const spForCurrentLevel = currentLevel > 1 
            ? (rewardsData.find((r: any) => r.level === currentLevel)?.sp_required || 0) - 
              (rewardsData.find((r: any) => r.level === currentLevel - 1)?.sp_required || 0)
            : nextLevelSP;
          
          const progressPercent = spForCurrentLevel > 0 
            ? Math.min(((spForCurrentLevel - spToNextLevel) / spForCurrentLevel) * 100, 100)
            : 0;

          const duelPassDataValue = {
            level: currentLevel,
            xp: currentSP,
            progress: Math.max(0, progressPercent),
            spToNextLevel: spToNextLevel
          };
          setDuelPassData(duelPassDataValue);
          // Сохраняем в кэш
          duelPassCache[profileId] = {
            data: duelPassDataValue,
            seasonData: {
              name_ru: activeSeason.name_ru,
              days_remaining: activeSeason.days_remaining,
              end_date: activeSeason.end_date,
            },
            timestamp: Date.now()
          };
        } else {
          // Fallback если нет наград
          const duelPassDataValue = {
            level: currentLevel,
            xp: currentSP,
            progress: 0,
            spToNextLevel: 0
          };
          setDuelPassData(duelPassDataValue);
          // Сохраняем в кэш
          duelPassCache[profileId] = {
            data: duelPassDataValue,
            seasonData: {
              name_ru: activeSeason.name_ru,
              days_remaining: activeSeason.days_remaining,
              end_date: activeSeason.end_date,
            },
            timestamp: Date.now()
          };
        }
      } catch (error) {
        console.error('[WalletWidget] Error loading Duel Pass data:', error);
      } finally {
        setDuelPassLoading(false);
        hasInitializedRef.current = true;
      }
    };

    loadDuelPass();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(loadDuelPass, 30000);
    
    return () => {
      if (skeletonTimeout) clearTimeout(skeletonTimeout);
      clearInterval(interval);
    };
  }, [profileId, coinsLoading]);

  // Скрываем skeleton когда все загружено
  useEffect(() => {
    if (!coinsLoading && !duelPassLoading) {
      const hideTimeout = setTimeout(() => setShowSkeleton(false), 50);
      return () => clearTimeout(hideTimeout);
    }
  }, [coinsLoading, duelPassLoading]);

  const isLoading = showSkeleton && (coinsLoading || duelPassLoading);

  return (
    <>
      <div className={cn("flex items-center gap-1.5 md:gap-2", className)}>
        {/* Coins Skeleton/Content */}
        {isLoading ? (
          <Skeleton className="h-8 w-20 rounded-lg" />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShopOpen(true)}
            className="h-8 px-1.5 md:px-2 gap-1 md:gap-1.5 hover:bg-muted/50"
          >
            <Coins className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500" />
            <span className="text-xs md:text-sm font-semibold">{balance}</span>
          </Button>
        )}

        {/* Duel Pass Skeleton/Content - улучшенная версия для мобильных с прогресс-баром и SP */}
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24 rounded-lg sm:hidden" />
            <Skeleton className="h-8 w-32 rounded-lg hidden sm:block" />
          </>
        ) : duelPassData ? (
          <button
            onClick={() => {
              console.log('[WalletWidget] Mobile Duel Pass button clicked, opening modal');
                setDuelPassModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer sm:hidden"
            title={t('wallet.duelPassTooltipMobile', { level: duelPassData.level, xp: duelPassData.xp })}
          >
            {/* Season Points */}
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-blue-400">S</span>
              </div>
              <span className="text-xs font-semibold text-foreground">{duelPassData.xp}</span>
            </div>
            
            {/* Разделитель */}
            <div className="w-px h-4 bg-border" />
            
            {/* Уровень с прогресс-баром */}
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                  style={{ width: `${Math.max(5, duelPassData.progress)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground min-w-[18px]">{duelPassData.level}</span>
            </div>
          </button>
        ) : null}
        {!isLoading && duelPassData && (
          <button
            onClick={() => {
              console.log('[WalletWidget] Duel Pass button clicked, opening modal');
                setDuelPassModalOpen(true);
            }}
            className="hidden sm:flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
            title={t('wallet.duelPassTooltipDesktop', { level: duelPassData.level })}
          >
            <Trophy className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-500" />
            <div className="w-10 md:w-12 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                style={{ width: `${duelPassData.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{duelPassData.level}</span>
          </button>
        )}


      </div>

      <BoostShopModal open={shopOpen} onOpenChange={setShopOpen} />
      <DuelPassSeasonModal open={duelPassModalOpen} onOpenChange={setDuelPassModalOpen} />
    </>
  );
}

