import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Lock, Coins, Crown, Zap, Check, X, Plus, Cpu, Search } from 'lucide-react';
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
  const [userCoins, setUserCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unlockingSlot, setUnlockingSlot] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
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
    // Проверяем, что слот доступен
    if (slotNumber === 2 && ramSlotsUnlocked < 2) {
      toast.error('Слот 2 заблокирован. Разблокируйте за 500 монет');
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
    <Card className="p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl rounded-xl relative overflow-visible pb-32">
      <div className="space-y-5">
        {/* Заголовок - Премиум типографика */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
              <Zap className="w-5 h-5 text-indigo-400" />
              <span className="font-mono">RAM LOADOUT</span>
            </h3>
            <p className="text-xs font-medium text-zinc-400 tracking-normal">
              Select up to 3 boosts
            </p>
          </div>
        </div>

        {/* Слоты - Премиум дизайн */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          {/* Слот 1 - Базовый */}
          <SlotCard
            slotNumber={1}
            isUnlocked={true}
            selectedBoost={getBoostByType(loadout.slot_1_boost_type)}
            onSlotClick={() => setSelectedSlotIndex(0)}
            onClear={() => handleSelectBoost(1, null)}
          />

          {/* Слот 2 - Платный */}
          <SlotCard
            slotNumber={2}
            isUnlocked={ramSlotsUnlocked >= 2}
            isPremium={false}
            unlockCost={SLOT_UNLOCK_COST}
            userCoins={userCoins}
            isUnlocking={unlockingSlot}
            onUnlock={() => handleUnlockSlot(2)}
            selectedBoost={getBoostByType(loadout.slot_2_boost_type)}
            onSlotClick={() => {
              if (ramSlotsUnlocked >= 2) {
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
          className="bg-zinc-950 border-t border-white/10 rounded-t-3xl max-h-[70vh] flex flex-col p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-white/10">
            <SheetTitle className="font-mono text-sm font-bold text-indigo-400">
              SELECT MODULE [SLOT {selectedSlotIndex !== null ? selectedSlotIndex + 1 : ''}]
            </SheetTitle>
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
    </Card>
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
  selectedBoost,
  onSlotClick,
  onClear,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const canUnlock = isPremium
    ? userHasPremium
    : (unlockCost && userCoins >= unlockCost);

  // Определяем стили для слота
  const getSlotStyles = () => {
    if (!isUnlocked) {
      if (isPremium) {
        // Premium заблокированный - золотой градиент
        return {
          container: "bg-zinc-950/40 border-amber-500/20 shadow-[inset_0_4px_20px_rgba(0,0,0,0.6),0_0_20px_rgba(255,215,0,0.1)]",
          glow: "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-500/5 before:via-yellow-500/5 before:to-amber-500/5 before:rounded-xl before:blur-sm"
        };
      } else {
        // Обычный заблокированный - темный с внутренней тенью
        return {
          container: "bg-zinc-950/40 border-white/5 shadow-[inset_0_4px_20px_rgba(0,0,0,0.7)] opacity-70",
          glow: ""
        };
      }
    } else {
      if (isPremium) {
        // Premium разблокированный - золотая обводка
        return {
          container: "bg-zinc-900/60 border-amber-500/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3),0_0_15px_rgba(255,215,0,0.15)] hover:border-amber-400/50 hover:shadow-[inset_0_2px_10px_rgba(0,0,0,0.3),0_0_20px_rgba(255,215,0,0.25)]",
          glow: "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-500/10 before:via-yellow-500/5 before:to-amber-500/10 before:rounded-xl before:blur-sm before:opacity-50"
        };
      } else {
        // Обычный разблокированный - стандартный
        return {
          container: "bg-zinc-900/60 border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] hover:border-indigo-500/30 hover:bg-zinc-900/80",
          glow: ""
        };
      }
    }
  };

  const slotStyles = getSlotStyles();

  return (
    <div className="relative" ref={cardRef}>
      <motion.div
        onClick={isUnlocked ? onSlotClick : undefined}
        className={cn(
          "relative aspect-[3/4] rounded-xl border transition-all duration-200 cursor-pointer",
          "backdrop-blur-[12px] flex flex-col items-center justify-center",
          selectedBoost
            ? "bg-white/5 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            : isUnlocked
            ? "bg-black/20 border-white/10 border-dashed hover:bg-white/5 hover:border-white/30"
            : slotStyles.container,
          isPremium && !selectedBoost ? "border-amber-500/30 bg-amber-500/5" : "",
          slotStyles.glow
        )}
        whileHover={isUnlocked ? { scale: 1.02, y: -2 } : {}}
        whileTap={isUnlocked ? { scale: 0.98 } : {}}
      >
        {/* Заголовок слота - Моноширинный шрифт */}
        <div className="absolute top-2 left-0 right-0 text-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
            SLOT {slotNumber}
          </span>
        </div>

        {isPremium && (
          <motion.div
            className="absolute top-2 right-2"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_4px_rgba(255,215,0,0.5)]" />
          </motion.div>
        )}

        {/* Контент слота */}
        {isUnlocked ? (
          selectedBoost ? (
            <div className="relative group flex flex-col items-center justify-center flex-1 w-full px-2">
              {/* Крупная иконка буста */}
              <div className="flex items-center justify-center mb-2">
                <motion.span 
                  className="text-2xl"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    repeatDelay: 2 
                  }}
                >
                  {selectedBoost.icon}
                </motion.span>
              </div>
              
              {/* Название */}
              <span className="text-xs font-bold text-white text-center px-1 truncate w-full mb-1">
                {selectedBoost.name_ru}
              </span>

              {/* Категория badge */}
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                  selectedBoost.category === 'exploit' && "border-red-500/60 text-red-400 bg-red-500/15",
                  selectedBoost.category === 'defense' && "border-blue-500/60 text-blue-400 bg-blue-500/15",
                  selectedBoost.category === 'utility' && "border-green-500/60 text-green-400 bg-green-500/15"
                )}
              >
                {selectedBoost.category === 'exploit' && 'Атака'}
                {selectedBoost.category === 'defense' && 'Защита'}
                {selectedBoost.category === 'utility' && 'Утилита'}
              </Badge>

              {/* Кнопка очистки */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/90 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3 h-3" />
              </motion.button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-indigo-400/60">
              <span className="text-2xl font-light">+</span>
              <span className="text-[10px] font-mono">INSTALL</span>
            </div>
          )
        ) : (
          <motion.div
            whileHover={canUnlock && !isUnlocking ? { scale: 1.02 } : {}}
            whileTap={canUnlock && !isUnlocking ? { scale: 0.98 } : {}}
          >
            <Button
              onClick={onUnlock}
              disabled={!canUnlock || isUnlocking}
              variant="outline"
              size="sm"
              className={cn(
                "w-full h-10 text-xs font-semibold transition-all relative overflow-hidden",
                canUnlock && !isUnlocking
                  ? isPremium
                    ? "border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-yellow-950/30 hover:from-amber-950/60 hover:to-yellow-950/50 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                    : "border-white/20 bg-zinc-900/60 hover:bg-zinc-800/60 hover:border-yellow-500/40 text-zinc-200 hover:text-yellow-300"
                  : "border-white/5 bg-zinc-950/40 text-zinc-500"
              )}
            >
              {isUnlocking ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Разблокировка...
                </span>
              ) : isPremium ? (
                <>
                  <Crown className="w-3.5 h-3.5 mr-1.5 text-amber-400 drop-shadow-[0_0_4px_rgba(255,215,0,0.5)]" />
                  <span>Premium</span>
                </>
              ) : (
                <>
                  <Coins className="w-3.5 h-3.5 mr-1.5 text-yellow-400" />
                  <span>
                    <span className="text-yellow-400 font-bold">{unlockCost}</span>
                    <span className="text-zinc-400"> монет</span>
                  </span>
                </>
              )}
            </Button>
          </motion.div>
        )}

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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBoosts = useMemo(() => {
    if (!searchQuery.trim()) return availableBoosts;
    const query = searchQuery.toLowerCase();
    return availableBoosts.filter(boost => 
      boost.name_ru.toLowerCase().includes(query) ||
      boost.type.toLowerCase().includes(query)
    );
  }, [availableBoosts, searchQuery]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'exploit':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/40',
          text: 'text-red-400',
          hover: 'hover:bg-red-500/20 hover:border-red-500/60'
        };
      case 'defense':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/40',
          text: 'text-blue-400',
          hover: 'hover:bg-blue-500/20 hover:border-blue-500/60'
        };
      case 'utility':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/40',
          text: 'text-green-400',
          hover: 'hover:bg-green-500/20 hover:border-green-500/60'
        };
      default:
        return {
          bg: 'bg-zinc-800/50',
          border: 'border-white/10',
          text: 'text-zinc-300',
          hover: 'hover:bg-zinc-800/70 hover:border-white/20'
        };
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Поиск */}
      <div className="px-4 pt-3 pb-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск буста..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full h-10 pl-10 pr-4",
              "bg-zinc-900/50 border border-white/10 rounded-lg",
              "text-sm text-zinc-200 placeholder:text-zinc-600",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50",
              "hover:border-zinc-700 transition-all"
            )}
          />
        </div>
      </div>

      {/* Scrollable Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Кнопка очистки */}
        <button
          onClick={() => onSelectBoost(null)}
          className={cn(
            "w-full mb-3 p-3 text-left text-xs font-medium",
            "text-zinc-400 hover:text-zinc-200",
            "hover:bg-zinc-800/70 rounded-lg transition-colors",
            "border border-white/10 hover:border-white/20"
          )}
        >
          Очистить слот
        </button>

        {/* Grid бустов */}
        {filteredBoosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 mb-3">
              <Search className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-500">Бусты не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredBoosts.map((boost) => {
              const colors = getCategoryColor(boost.category);
              const isSelected = selectedBoost?.type === boost.type;
              
              return (
                <motion.button
                  key={boost.type}
                  onClick={() => onSelectBoost(boost.type)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "relative p-4 rounded-xl border transition-all",
                    "flex flex-col items-center gap-2",
                    isSelected
                      ? `${colors.bg} ${colors.border} shadow-[0_0_15px_rgba(99,102,241,0.3)] ring-2 ring-indigo-500/50`
                      : `bg-zinc-900/50 border-white/10 ${colors.hover}`
                  )}
                >
                  {/* Иконка */}
                  <div className={cn(
                    "text-3xl mb-1",
                    isSelected ? colors.text : "text-zinc-300"
                  )}>
                    {boost.icon}
                  </div>

                  {/* Название */}
                  <div className="text-center w-full">
                    <div className={cn(
                      "text-sm font-semibold mb-1 truncate",
                      isSelected ? "text-white" : "text-zinc-200"
                    )}>
                      {boost.name_ru}
                    </div>
                    <div className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full border inline-block",
                      colors.bg,
                      colors.border,
                      colors.text
                    )}>
                      {boost.category === 'exploit' && 'Атака'}
                      {boost.category === 'defense' && 'Защита'}
                      {boost.category === 'utility' && 'Утилита'}
                    </div>
                  </div>

                  {/* Индикатор выбора */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                      className="absolute top-2 right-2"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
