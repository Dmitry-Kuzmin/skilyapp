import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Lock, Coins, Crown, Zap, Check, X, Plus, Cpu, Search, Shield, Hexagon, Play, Trash2 } from 'lucide-react';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { PaywallModal } from '@/components/monetization/PaywallModal';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { usePremium } from '@/hooks/usePremium';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Boost {
  type: string;
  name_ru: string;
  name_es: string;
  icon: string;
  mode: 'safe' | 'root';
  category: 'utility' | 'exploit' | 'defense';
  target_type: 'self' | 'opponent' | 'both';
}

interface Loadout {
  slot_1_boost_type: string | null;
  slot_2_boost_type: string | null;
  slot_3_boost_type: string | null;
}

interface LoadoutSelectorProps {
  onLoadoutChange?: (loadout: Loadout) => void;
}

const SLOT_UNLOCK_COST = 500;

export const LoadoutSelector: React.FC<LoadoutSelectorProps> = ({ onLoadoutChange }) => {
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const [availableBoosts, setAvailableBoosts] = useState<Boost[]>([]);
  const [loadout, setLoadout] = useState<Loadout>({
    slot_1_boost_type: null,
    slot_2_boost_type: null,
    slot_3_boost_type: null,
  });
  const [ramSlotsUnlocked, setRamSlotsUnlocked] = useState(1);
  const [tempSlotUnlocked, setTempSlotUnlocked] = useState<number | null>(null); // Временная разблокировка через рекламу
  const [userCoins, setUserCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unlockingSlot, setUnlockingSlot] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [showOverclockModal, setShowOverclockModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const isClosingRef = useRef(false);

  // Загрузка данных
  useEffect(() => {
    if (!profileId) return;

    const loadData = async () => {
      try {
        // Загружаем профиль (coins, ram_slots_unlocked)
        const { data: profile } = await supabase
          .from('profiles')
          .select('coins, ram_slots_unlocked')
          .eq('id', profileId)
          .single();

        if (profile) {
          setUserCoins(profile.coins || 0);
          setRamSlotsUnlocked(profile.ram_slots_unlocked || 1);
        }

        // Загружаем доступные бусты (только Root Mode для дуэлей)
        const { data: boosts } = await supabase
          .from('boost_definitions')
          .select('type, name_ru, name_es, icon, mode, category, target_type')
          .eq('mode', 'root')
          .order('cost_coins', { ascending: true });

        if (boosts) {
          setAvailableBoosts(boosts as Boost[]);
        }

        // Загружаем текущий loadout
        const { data: currentLoadout } = await supabase
          .from('user_loadouts')
          .select('slot_1_boost_type, slot_2_boost_type, slot_3_boost_type')
          .eq('user_id', profileId)
          .maybeSingle();

        if (currentLoadout) {
          setLoadout({
            slot_1_boost_type: currentLoadout.slot_1_boost_type,
            slot_2_boost_type: currentLoadout.slot_2_boost_type,
            slot_3_boost_type: currentLoadout.slot_3_boost_type,
          });
        } else {
          // Создаем пустой loadout если его нет
          await supabase
            .from('user_loadouts')
            .insert({ user_id: profileId });
        }
      } catch (error) {
        console.error('[LoadoutSelector] Error loading data:', error);
        toast.error('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profileId]);

  // Уведомляем родителя об изменении
  useEffect(() => {
    if (onLoadoutChange) {
      onLoadoutChange(loadout);
    }
  }, [loadout, onLoadoutChange]);

  // Логирование состояния Sheet (только в dev режиме)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[LoadoutSelector] selectedSlotIndex changed:', selectedSlotIndex);
    }
  }, [selectedSlotIndex]);

  // Разблокировка слота
  const handleUnlockSlot = async (slotNumber: 2 | 3) => {
    if (unlockingSlot) return;

    if (slotNumber === 2) {
      // Покупка 2-го слота за 500 монет
      if (userCoins < SLOT_UNLOCK_COST) {
        toast.error(`Недостаточно монет. Нужно ${SLOT_UNLOCK_COST} монет`);
        return;
      }

      setUnlockingSlot(true);
      try {
        console.log('[LoadoutSelector] Unlocking slot 2, profileId:', profileId, 'coins:', userCoins);
        
        const { data, error } = await supabase.functions.invoke('coins-spend', {
          body: {
            user_id: profileId,
            spend_type: 'slot_unlock',
            metadata: { slot_number: 2 },
          },
        });

        console.log('[LoadoutSelector] coins-spend response:', { data, error });

        if (error) {
          // Пытаемся извлечь сообщение об ошибке из ответа
          let errorMessage = error.message || 'Ошибка разблокировки слота';
          
          // Если есть context, пытаемся распарсить JSON ответ
          if (error.context) {
            try {
              const errorBody = await error.context.json?.();
              if (errorBody?.error) {
                errorMessage = errorBody.error;
              }
            } catch (e) {
              console.warn('[LoadoutSelector] Could not parse error context:', e);
            }
          }
          
          // Проверяем специфичные ошибки
          if (errorMessage.includes('Insufficient balance')) {
            toast.error(`Недостаточно монет. Нужно ${SLOT_UNLOCK_COST} монет`);
            return;
          }
          
          throw new Error(errorMessage);
        }

        // Проверяем, есть ли ошибка в data
        if (data?.error) {
          throw new Error(data.error);
        }

        // Обновляем профиль (разблокируем слот)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ ram_slots_unlocked: 2 })
          .eq('id', profileId);

        if (updateError) {
          console.error('[LoadoutSelector] Error updating profile:', updateError);
          throw updateError;
        }

        setRamSlotsUnlocked(2);
        // Обновляем баланс из ответа функции
        if (data?.new_balance !== undefined) {
          setUserCoins(data.new_balance);
        } else {
          setUserCoins(prev => prev - SLOT_UNLOCK_COST);
        }
        toast.success('Слот 2 разблокирован!');
      } catch (error: any) {
        console.error('[LoadoutSelector] Error unlocking slot:', error);
        const errorMessage = error?.message || error?.error || 'Ошибка разблокировки слота';
        toast.error(errorMessage);
      } finally {
        setUnlockingSlot(false);
      }
    } else if (slotNumber === 3) {
      // 3-й слот только для Premium
      if (!isPremium) {
        toast.error('Слот 3 доступен только для Premium подписчиков');
        return;
      }

      // Разблокируем бесплатно для Premium
      try {
        await supabase
          .from('profiles')
          .update({ ram_slots_unlocked: 3 })
          .eq('id', profileId);

        setRamSlotsUnlocked(3);
        toast.success('Слот 3 разблокирован!');
      } catch (error: any) {
        console.error('[LoadoutSelector] Error unlocking slot 3:', error);
        toast.error('Ошибка разблокировки слота');
      }
    }
  };

  // Выбор буста для слота
  const handleSelectBoost = async (slotNumber: 1 | 2 | 3, boostType: string | null) => {
    // Проверяем, что слот доступен (постоянно или временно через рекламу)
    if (slotNumber === 2 && ramSlotsUnlocked < 2 && tempSlotUnlocked !== 2) {
      toast.error('Слот 2 заблокирован. Разблокируйте за 500 монет или посмотрите рекламу');
      return;
    }
    if (slotNumber === 3 && ramSlotsUnlocked < 3) {
      toast.error('Слот 3 доступен только для Premium');
      return;
    }

    const newLoadout = { ...loadout };
    if (slotNumber === 1) {
      newLoadout.slot_1_boost_type = boostType;
    } else if (slotNumber === 2) {
      newLoadout.slot_2_boost_type = boostType;
    } else {
      newLoadout.slot_3_boost_type = boostType;
    }

    setLoadout(newLoadout);

    // Сохраняем в БД
    try {
      await supabase
        .from('user_loadouts')
        .upsert({
          user_id: profileId,
          ...newLoadout,
        }, {
          onConflict: 'user_id',
        });
    } catch (error) {
      console.error('[LoadoutSelector] Error saving loadout:', error);
    }
  };

  // Получаем буст по типу
  const getBoostByType = (boostType: string | null) => {
    if (!boostType) return null;
    return availableBoosts.find(b => b.type === boostType) || null;
  };

  if (loading) {
    return (
      <Card className="p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl rounded-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-800/50 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-24 bg-zinc-800/50 rounded-xl" />
            <div className="h-24 bg-zinc-800/50 rounded-xl" />
            <div className="h-24 bg-zinc-800/50 rounded-xl" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
    <Card className="p-6 relative overflow-visible pb-12 rounded-xl border border-white/10 backdrop-blur-xl"
      style={{
        background: 'radial-gradient(120% 120% at 50% 0%, rgba(99, 102, 241, 0.05) 0%, rgba(0, 0, 0, 0.4) 100%)',
        boxShadow: `
          inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
          0 10px 40px -10px rgba(0, 0, 0, 0.5)
        `,
      }}
    >
      {/* Noise Texture Overlay */}
      <div 
        className="absolute inset-0 rounded-xl opacity-[0.015] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />
      <div className="relative z-10 space-y-5">
        {/* Заголовок - Премиум типографика */}
        <div className="flex items-start justify-between relative">
          <div className="space-y-1 relative z-10">
            <h3 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
              <Zap className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <span className="font-mono tracking-wider">RAM LOADOUT</span>
            </h3>
            <p className="text-xs font-mono text-zinc-400 tracking-wider uppercase">
              Select up to 3 boosts
            </p>
          </div>
          
          {/* Декоративный текст-призрак */}
          <div className="absolute top-0 right-0 text-[8px] font-mono text-white/5 tracking-widest">
            V.2.0
          </div>
        </div>

        {/* Слоты - Премиум дизайн */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full">
          {/* Слот 1 - Базовый */}
          <SlotCard
            slotNumber={1}
            isUnlocked={true}
            selectedBoost={getBoostByType(loadout.slot_1_boost_type)}
            onSlotClick={() => {
              if (process.env.NODE_ENV === 'development') {
                console.log('[LoadoutSelector] Slot 1 clicked, setting selectedSlotIndex to 0');
              }
              setSelectedSlotIndex(0);
            }}
            onClear={() => handleSelectBoost(1, null)}
          />

          {/* Слот 2 - Платный */}
          <SlotCard
            slotNumber={2}
            isUnlocked={ramSlotsUnlocked >= 2 || tempSlotUnlocked === 2}
            isPremium={false}
            unlockCost={SLOT_UNLOCK_COST}
            userCoins={userCoins}
            isUnlocking={unlockingSlot}
            onUnlock={() => handleUnlockSlot(2)}
            onOverclockClick={() => {
              // Открываем модалку рекламы для OVERCLOCK
              setShowOverclockModal(true);
            }}
            onSlotUnlocked={() => {
              // Временная разблокировка через рекламу (только на эту сессию)
              setTempSlotUnlocked(2);
            }}
            selectedBoost={getBoostByType(loadout.slot_2_boost_type)}
            onSlotClick={() => {
              if (ramSlotsUnlocked >= 2 || tempSlotUnlocked === 2) {
                setSelectedSlotIndex(1);
              }
            }}
            onClear={() => handleSelectBoost(2, null)}
          />

          {/* Слот 3 - Premium */}
          <SlotCard
            slotNumber={3}
            isUnlocked={ramSlotsUnlocked >= 3}
            isPremium={true}
            userHasPremium={isPremium}
            onUnlock={() => handleUnlockSlot(3)}
            onPremiumClick={() => setShowPremiumModal(true)}
            selectedBoost={getBoostByType(loadout.slot_3_boost_type)}
            onSlotClick={() => {
              if (ramSlotsUnlocked >= 3) {
                setSelectedSlotIndex(2);
              }
            }}
            onClear={() => handleSelectBoost(3, null)}
          />
        </div>
      </div>

      {/* Bottom Sheet для выбора буста */}
      <Sheet 
        open={selectedSlotIndex !== null} 
        onOpenChange={(open) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[LoadoutSelector] Sheet onOpenChange:', open, 'selectedSlotIndex:', selectedSlotIndex, 'isClosingRef:', isClosingRef.current);
          }
          // Защита от множественных вызовов
          if (!open && !isClosingRef.current && selectedSlotIndex !== null) {
            isClosingRef.current = true;
            setSelectedSlotIndex(null);
            // Сбрасываем флаг через небольшую задержку
            setTimeout(() => {
              isClosingRef.current = false;
            }, 300);
          }
        }}
      >
        <SheetContent 
          side="bottom" 
          className="bg-black/95 border-t border-white/20 rounded-t-3xl max-h-[70vh] flex flex-col p-0 backdrop-blur-xl"
          style={{
            boxShadow: '0 -10px 40px -10px rgba(0, 0, 0, 0.8)',
          }}
        >
          {/* Noise Texture для Sheet */}
          <div 
            className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat'
            }}
          />
          
          {/* Декоративные линии сверху */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-white/10 relative z-10 flex items-center justify-between">
            <SheetTitle className="font-mono text-sm font-bold text-indigo-400 tracking-wider">
              SELECT MODULE [SLOT {selectedSlotIndex !== null ? selectedSlotIndex + 1 : ''}]
            </SheetTitle>
            {/* Кнопка очистки в заголовке */}
            {selectedSlotIndex !== null && (
              <button
                onClick={() => {
                  const slotNumber = (selectedSlotIndex + 1) as 1 | 2 | 3;
                  handleSelectBoost(slotNumber, null);
                  isClosingRef.current = true;
                  setSelectedSlotIndex(null);
                  setTimeout(() => {
                    isClosingRef.current = false;
                  }, 300);
                }}
                className="text-xs font-mono text-white/30 hover:text-red-400 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">UNEQUIP</span>
              </button>
            )}
          </SheetHeader>
          
          {selectedSlotIndex !== null && (
            <BoostSelectSheetContent
              availableBoosts={availableBoosts}
              selectedBoost={getBoostByType(
                selectedSlotIndex === 0 ? loadout.slot_1_boost_type :
                selectedSlotIndex === 1 ? loadout.slot_2_boost_type :
                loadout.slot_3_boost_type
              )}
              onSelectBoost={(boostType) => {
                // Закрываем Sheet перед обновлением
                isClosingRef.current = true;
                handleSelectBoost((selectedSlotIndex + 1) as 1 | 2 | 3, boostType);
                setSelectedSlotIndex(null);
                setTimeout(() => {
                  isClosingRef.current = false;
                }, 300);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Модалка Premium */}
      <PaywallModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
      />

      {/* Модалка рекламы для OVERCLOCK */}
      <RewardedAdModal
        open={showOverclockModal}
        onOpenChange={setShowOverclockModal}
        rewardType="coins"
        rewardAmount={0}
        onRewardClaimed={async () => {
          if (!profileId) return;
          
          try {
            const { data, error } = await supabase.functions.invoke('claim-ad-reward', {
              body: {
                user_id: profileId,
                reward_type: 'slot_unlock',
                reward_amount: 0,
                metadata: { slot_number: 2 },
              }
            });

            if (error) throw error;

            if (data.success && data.client_action === 'unlock_temp_slot') {
              setTempSlotUnlocked(2);
              setShowOverclockModal(false);
              toast.success('Слот 2 разблокирован на эту дуэль!');
            }
          } catch (err: any) {
            console.error('[LoadoutSelector] Error claiming reward:', err);
            toast.error(err.message || 'Не удалось разблокировать слот');
          }
        }}
        title="OVERCLOCKING"
        description="Посмотри видео и разблокируй слот на эту дуэль. Временный root-доступ..."
      />
    </Card>
    </>
  );
};

interface SlotCardProps {
  slotNumber: 1 | 2 | 3;
  isUnlocked: boolean;
  isPremium?: boolean;
  unlockCost?: number;
  userCoins?: number;
  userHasPremium?: boolean;
  isUnlocking?: boolean;
  onUnlock?: () => void;
  onOverclockClick?: () => void;
  onSlotUnlocked?: () => void;
  onPremiumClick?: () => void;
  selectedBoost: Boost | null;
  onSlotClick: () => void;
  onClear: () => void;
}

const SlotCard: React.FC<SlotCardProps> = ({
  slotNumber,
  isUnlocked,
  isPremium = false,
  unlockCost,
  userCoins = 0,
  userHasPremium = false,
  isUnlocking = false,
  onUnlock,
  onOverclockClick,
  onSlotUnlocked,
  onPremiumClick,
  selectedBoost,
  onSlotClick,
  onClear,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const canUnlock = isPremium
    ? userHasPremium
    : (unlockCost && userCoins >= unlockCost);

  // Определяем, доступен ли OVERCLOCK (только для слота 2, не Premium)
  const canOverclock = slotNumber === 2 && !isPremium && !isUnlocked;

  // Получаем цвет категории буста
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'exploit':
        return {
          glow: 'rgba(239, 68, 68, 0.4)',
          border: 'border-red-500/50',
          bg: 'bg-red-500/10',
          text: 'text-red-400',
        };
      case 'defense':
        return {
          glow: 'rgba(59, 130, 246, 0.4)',
          border: 'border-blue-500/50',
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
        };
      case 'utility':
        return {
          glow: 'rgba(34, 197, 94, 0.4)',
          border: 'border-green-500/50',
          bg: 'bg-green-500/10',
          text: 'text-green-400',
        };
      default:
        return {
          glow: 'rgba(99, 102, 241, 0.4)',
          border: 'border-indigo-500/50',
          bg: 'bg-indigo-500/10',
          text: 'text-indigo-400',
        };
    }
  };

  const categoryColors = selectedBoost ? getCategoryColor(selectedBoost.category) : null;

  // Обработчик клика для всего слота
  const handleSlotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isUnlocked) {
      // Разблокированный слот - открываем выбор буста
      if (process.env.NODE_ENV === 'development') {
        console.log('[SlotCard] Slot clicked, slotNumber:', slotNumber, 'isUnlocked:', isUnlocked);
      }
      onSlotClick();
    } else if (isPremium && !userHasPremium && onPremiumClick) {
      // Premium слот - открываем модалку Premium
      onPremiumClick();
    } else if (canOverclock && onOverclockClick) {
      // OVERCLOCK слот - открываем рекламу
      onOverclockClick();
    } else if (canUnlock && onUnlock) {
      // Заблокированный слот - разблокируем
      onUnlock();
    }
  };

  return (
    <div className="relative w-full" ref={cardRef}>
      <motion.div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleSlotClick}
        className={cn(
          "relative aspect-[3/4] min-h-[140px] rounded-xl border transition-all duration-300",
          "backdrop-blur-[12px] flex flex-col overflow-hidden",
          "cursor-pointer p-2 sm:p-3",
          // Слот с бустом - эффект вставленного модуля
          selectedBoost
            ? cn(
                "bg-zinc-900/80 border-2",
                categoryColors?.border || "border-indigo-500/50",
                "shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),inset_0_-2px_8px_rgba(0,0,0,0.4)]"
              )
            : // Пустой разблокированный слот - синяя рамка
            isUnlocked
            ? "bg-zinc-950/60 border border-blue-500/30 hover:border-blue-500/50 hover:bg-zinc-950/80"
            : // Заблокированный слот
            isPremium
            ? "bg-zinc-950/40 border border-amber-500/30 opacity-70 hover:opacity-90"
            : canOverclock
            ? "bg-orange-500/5 border border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/10"
            : "bg-zinc-950/40 border border-white/5 opacity-70"
        )}
        style={{
          boxShadow: selectedBoost
            ? `inset 0 2px 8px rgba(0, 0, 0, 0.6), inset 0 -2px 8px rgba(0, 0, 0, 0.4), 0 0 20px ${categoryColors?.glow || 'rgba(99, 102, 241, 0.3)'}`
            : undefined
        }}
        whileHover={isUnlocked || canOverclock || (isPremium && !userHasPremium) ? { scale: 1.02, y: -2 } : {}}
        whileTap={isUnlocked || canOverclock || (isPremium && !userHasPremium) ? { scale: 0.98 } : {}}
      >
        {/* Noise texture для слота */}
        <div 
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}
        />

        {/* Tech-corners для активного слота с бустом */}
        {selectedBoost && categoryColors && (
          <>
            <div className={cn("absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2", categoryColors.border)} />
            <div className={cn("absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2", categoryColors.border)} />
            <div className={cn("absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2", categoryColors.border)} />
            <div className={cn("absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2", categoryColors.border)} />
          </>
        )}

        {/* Top Label - Минималистичный заголовок */}
        <div className="flex items-center justify-between z-10 flex-shrink-0 mb-2">
          <span className="text-[8px] font-mono text-white/20 uppercase tracking-wider">
            SLOT {slotNumber}
          </span>
          {isPremium && (
            <Crown className="w-3 h-3 text-amber-400/60" />
          )}
        </div>

        {/* Main Content - Минималистичный центр */}
        <div className="flex flex-col items-center justify-center flex-1 relative z-10">
          {isUnlocked ? (
            selectedBoost ? (
              // === СЛОТ С БУСТОМ: Иконка + название ===
              <motion.div 
                className="relative group flex flex-col items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Иконка буста */}
                <motion.span 
                  className={cn(
                    "text-4xl sm:text-5xl mb-2",
                    categoryColors?.text || "text-white"
                  )}
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    repeatDelay: 2 
                  }}
                  style={{
                    filter: `drop-shadow(0 0 10px ${categoryColors?.glow || 'rgba(99, 102, 241, 0.8)'})`
                  }}
                >
                  {selectedBoost.icon}
                </motion.span>
                
                {/* Название буста */}
                <span className={cn(
                  "text-[10px] sm:text-xs font-bold text-center px-2 truncate w-full leading-tight",
                  categoryColors?.text || "text-white"
                )}>
                  {selectedBoost.name_ru}
                </span>

                {/* Кнопка удаления - стильная в правом верхнем углу */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-white/30 hover:text-red-500 transition-colors z-20"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            ) : (
              // === ПУСТОЙ СЛОТ: Просто "+" и "ADD" ===
              <div className="flex flex-col items-center gap-2">
                <motion.span 
                  className="text-5xl sm:text-6xl font-light text-blue-400"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  +
                </motion.span>
                <span className="text-[10px] font-mono tracking-wider text-blue-400/60 uppercase">
                  ADD
                </span>
              </div>
            )
          ) : canOverclock ? (
            // === OVERCLOCK: Split Layout - Реклама сверху, Покупка снизу ===
            <div className="flex flex-col h-full w-full">
              {/* Верхняя часть (70%) - OVERCLOCK / Реклама */}
              <div className="flex-1 flex flex-col items-center justify-center gap-2 relative">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400 fill-orange-400" />
                </motion.div>
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                  OVERCLOCK
                </span>
                <span className="text-[8px] text-orange-500/60 font-mono">
                  1 MATCH
                </span>
              </div>
              
              {/* Разделитель */}
              <div className="h-px bg-white/10 my-1" />
              
              {/* Нижняя часть (30%) - Покупка навсегда */}
              <div className="flex-shrink-0 flex items-center justify-center py-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUnlock) onUnlock();
                  }}
                  disabled={!canUnlock || isUnlocking}
                  className={cn(
                    "text-[9px] font-mono tracking-wider transition-all",
                    canUnlock && !isUnlocking
                      ? "text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                      : "text-zinc-500 cursor-not-allowed"
                  )}
                >
                  {isUnlocking ? (
                    <span className="flex items-center gap-1">
                      <motion.div
                        className="w-2 h-2 border border-yellow-400/30 border-t-yellow-400 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span>Unlocking...</span>
                    </span>
                  ) : (
                    <>
                      <span>UNLOCK</span>
                      <Coins className="w-3 h-3 inline-block" />
                      <span className="font-bold">{unlockCost}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // === PREMIUM: Иконка Crown + "PREMIUM" ===
            <div className="flex flex-col items-center gap-2">
              <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                PREMIUM
              </span>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
};

// Компонент для содержимого выбора буста в Bottom Sheet (Grid layout)
interface BoostSelectSheetContentProps {
  availableBoosts: Boost[];
  selectedBoost: Boost | null;
  onSelectBoost: (boostType: string | null) => void;
}

const BoostSelectSheetContent: React.FC<BoostSelectSheetContentProps> = ({
  availableBoosts,
  selectedBoost,
  onSelectBoost,
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'exploit':
        return {
          borderLeft: 'border-l-red-500/60',
          icon: 'text-red-400',
        };
      case 'defense':
        return {
          borderLeft: 'border-l-blue-500/60',
          icon: 'text-blue-400',
        };
      case 'utility':
        return {
          borderLeft: 'border-l-green-500/60',
          icon: 'text-green-400',
        };
      default:
        return {
          borderLeft: 'border-l-white/20',
          icon: 'text-zinc-300',
        };
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {/* Grid бустов */}
        {availableBoosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-zinc-900/50 border border-white/10 mb-3">
              <Shield className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-500 mb-2">Инвентарь пуст</p>
            <p className="text-xs text-zinc-600 font-mono">Go to Black Market</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {availableBoosts.map((boost) => {
              const colors = getCategoryColor(boost.category);
              const isSelected = selectedBoost?.type === boost.type;
              const categoryLabel = boost.category === 'exploit' ? 'ATK' : boost.category === 'defense' ? 'DEF' : 'UTL';
              
              return (
                <motion.button
                  key={boost.type}
                  onClick={() => onSelectBoost(boost.type)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "relative group overflow-hidden p-3 rounded-lg border transition-all",
                    "flex flex-col items-center gap-2",
                    "bg-white/5 border-white/10",
                    "hover:bg-white/10 hover:border-white/20",
                    isSelected && "border-white/40 bg-white/10",
                    "backdrop-blur-sm"
                  )}
                  style={{
                    boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 2px 8px -2px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {/* Цветная вертикальная полоска слева */}
                  <div 
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-0.5",
                      colors.borderLeft
                    )}
                  />

                  {/* Иконка */}
                  <div className="flex items-center justify-center relative z-10">
                    <span 
                      className={cn(
                        "text-3xl",
                        colors.icon
                      )}
                    >
                      {boost.icon}
                    </span>
                  </div>

                  {/* Название */}
                  <div className="text-center w-full relative z-10">
                    <div className="text-[9px] font-mono mb-0.5 tracking-widest text-white/40 uppercase">
                      {categoryLabel}
                    </div>
                    <div className={cn(
                      "text-xs font-bold truncate leading-tight",
                      isSelected ? "text-white" : "text-zinc-200"
                    )}>
                      {boost.name_ru}
                    </div>
                  </div>

                  {/* Индикатор выбора - галочка */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="absolute top-2 right-2 z-20"
                    >
                      <div className="w-5 h-5 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* ========== АЛЬТЕРНАТИВНАЯ ВЕРСИЯ: UltraBoostCard (Holo-Cartridge) - ЗАКОММЕНТИРОВАНО ========== */}
        {/* 
        {filteredBoosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 mb-3">
              <Search className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-500">Бусты не найдены</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBoosts.map((boost) => {
              const isAttack = boost.category === 'exploit';
              const isDefense = boost.category === 'defense';
              const isUtility = boost.category === 'utility';
              const isSelected = selectedBoost?.type === boost.type;
              
              // Цветовые схемы для разных категорий
              const colors = isAttack 
                ? {
                    border: 'group-hover:border-red-500/50',
                    glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]',
                    text: 'group-hover:text-red-400',
                    bg: 'from-red-500/0 via-red-500/5 to-red-500/0',
                    icon: 'text-red-500',
                    iconBg: 'shadow-[inset_0_0_15px_rgba(220,38,38,0.2)]',
                    borderColor: 'border-red-500',
                    powerBar: 'bg-red-500'
                  }
                : isDefense
                ? {
                    border: 'group-hover:border-cyan-500/50',
                    glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.4)]',
                    text: 'group-hover:text-cyan-400',
                    bg: 'from-cyan-500/0 via-cyan-500/5 to-cyan-500/0',
                    icon: 'text-cyan-400',
                    iconBg: 'shadow-[inset_0_0_15px_rgba(8,145,178,0.2)]',
                    borderColor: 'border-cyan-500',
                    powerBar: 'bg-cyan-500'
                  }
                : {
                    border: 'group-hover:border-green-500/50',
                    glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)]',
                    text: 'group-hover:text-green-400',
                    bg: 'from-green-500/0 via-green-500/5 to-green-500/0',
                    icon: 'text-green-400',
                    iconBg: 'shadow-[inset_0_0_15px_rgba(22,163,74,0.2)]',
                    borderColor: 'border-green-500',
                    powerBar: 'bg-green-500'
                  };
              
              return (
                <motion.button
                  key={boost.type}
                  onClick={() => onSelectBoost(boost.type)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "group relative w-full flex items-center gap-4 p-4",
                    "bg-[#0f1014] border border-white/5 rounded-xl overflow-hidden",
                    "transition-all duration-300 ease-out",
                    isSelected && "ring-2 ring-indigo-500/50",
                    colors.border,
                    colors.glow,
                    "hover:bg-[#15161a]"
                  )}
                >
                  <motion.div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-r", colors.bg,
                      "translate-x-[-100%] group-hover:translate-x-[100%]",
                      "transition-transform duration-700 ease-in-out z-0"
                    )}
                  />
                  <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    <div className={cn("w-2 h-2 border-t-2 border-r-2", colors.borderColor)} />
                  </div>
                  <div className="absolute bottom-0 left-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    <div className={cn("w-2 h-2 border-b-2 border-l-2", colors.borderColor)} />
                  </div>
                  <div className="relative z-10">
                    <div className={cn(
                      "w-14 h-14 rounded-lg bg-black/60 border border-white/10",
                      "flex items-center justify-center",
                      colors.iconBg,
                      "group-hover:border-white/20 transition-colors"
                    )}>
                      <span 
                        className={cn("text-2xl", colors.icon)}
                        style={{
                          filter: `drop-shadow(0 0 8px ${isAttack ? 'rgba(239, 68, 68, 0.6)' : isDefense ? 'rgba(6, 182, 212, 0.6)' : 'rgba(34, 197, 94, 0.6)'})`
                        }}
                      >
                        {boost.icon}
                      </span>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0f1014] px-1.5 border border-white/10 rounded text-[9px] font-mono text-white/40">
                      LVL.1
                    </div>
                  </div>
                  <div className="relative z-10 flex-1 text-left">
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn(
                        "text-[10px] font-mono tracking-widest uppercase opacity-60",
                        colors.text
                      )}>
                        {boost.category === 'exploit' ? 'ATK' : boost.category === 'defense' ? 'DEF' : 'UTL'}_MOD
                      </span>
                      <span className="text-[10px] font-mono text-white/20">#{String(boost.type).slice(0, 3).toUpperCase()}</span>
                    </div>
                    <h3 className="text-white font-bold text-lg tracking-wide group-hover:text-white transition-colors">
                      {boost.name_ru}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1 w-12 rounded-full bg-white/10 overflow-hidden">
                        <div className={cn(
                          "h-full w-2/3", colors.powerBar,
                          "shadow-[0_0_10px_currentColor]"
                        )}></div>
                      </div>
                      <span className="text-xs text-white/40 font-mono">POWER</span>
                    </div>
                  </div>
                  {isSelected ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative z-10"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.8)]">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="relative z-10 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                      <Hexagon className={cn("w-4 h-4", colors.icon, "fill-current")} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
        */}
      </div>
    </div>
  );
};
