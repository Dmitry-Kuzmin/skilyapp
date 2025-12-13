import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Coins, Crown, Zap, Check, X } from 'lucide-react';
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
        const { data, error } = await supabase.functions.invoke('coins-spend', {
          body: {
            user_id: profileId,
            spend_type: 'slot_unlock',
            metadata: { slot_number: 2 },
          },
        });

        if (error) throw error;

        // Обновляем профиль (разблокируем слот)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ ram_slots_unlocked: 2 })
          .eq('id', profileId);

        if (updateError) throw updateError;

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
        toast.error(error.message || 'Ошибка разблокировки слота');
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
    <Card className="p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl rounded-xl">
      <div className="space-y-4">
        {/* Заголовок */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-200 flex items-center gap-2 tracking-tight">
              <Zap className="w-4 h-4 text-indigo-400" />
              RAM Slots (Loadout)
            </h3>
            <p className="text-xs font-medium text-zinc-500 mt-1.5 uppercase tracking-wider">
              Выберите бусты для дуэли. Максимум 3 слота.
            </p>
          </div>
        </div>

        {/* Слоты */}
        <div className="grid grid-cols-3 gap-3">
          {/* Слот 1 - Базовый */}
          <SlotCard
            slotNumber={1}
            isUnlocked={true}
            selectedBoost={getBoostByType(loadout.slot_1_boost_type)}
            availableBoosts={availableBoosts}
            onSelectBoost={(boostType) => handleSelectBoost(1, boostType)}
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
            availableBoosts={availableBoosts}
            onSelectBoost={(boostType) => handleSelectBoost(2, boostType)}
          />

          {/* Слот 3 - Premium */}
          <SlotCard
            slotNumber={3}
            isUnlocked={ramSlotsUnlocked >= 3}
            isPremium={true}
            userHasPremium={isPremium}
            onUnlock={() => handleUnlockSlot(3)}
            selectedBoost={getBoostByType(loadout.slot_3_boost_type)}
            availableBoosts={availableBoosts}
            onSelectBoost={(boostType) => handleSelectBoost(3, boostType)}
          />
        </div>
      </div>
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
  availableBoosts: Boost[];
  onSelectBoost: (boostType: string | null) => void;
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
  availableBoosts,
  onSelectBoost,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне элемента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        cardRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const canUnlock = isPremium
    ? userHasPremium
    : (unlockCost && userCoins >= unlockCost);

  return (
    <div className="relative" ref={cardRef}>
      <motion.div
        className={cn(
          "relative p-4 rounded-xl border transition-all duration-200",
          "backdrop-blur-sm",
          isUnlocked
            ? "bg-zinc-900/60 border-white/10 hover:border-indigo-500/30 hover:bg-zinc-900/80"
            : "bg-zinc-950/40 border-white/5 opacity-70"
        )}
        whileHover={isUnlocked ? { scale: 1.01 } : {}}
        whileTap={isUnlocked ? { scale: 0.99 } : {}}
      >
        {/* Заголовок слота */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Slot {slotNumber}
            </span>
            {isPremium && (
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          {!isUnlocked && (
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </div>

        {/* Выбранный буст или кнопка выбора */}
        {isUnlocked ? (
          <div className="space-y-2">
            {selectedBoost ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative group"
              >
                <div className={cn(
                  "p-3 rounded-lg border backdrop-blur-sm transition-all",
                  selectedBoost.category === 'exploit' && "bg-red-500/10 border-red-500/30",
                  selectedBoost.category === 'defense' && "bg-blue-500/10 border-blue-500/30",
                  selectedBoost.category === 'utility' && "bg-green-500/10 border-green-500/30"
                )}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{selectedBoost.icon}</span>
                    <span className="text-sm font-medium text-zinc-200 flex-1 truncate">
                      {selectedBoost.name_ru}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      selectedBoost.category === 'exploit' && "border-red-500/50 text-red-400 bg-red-500/10",
                      selectedBoost.category === 'defense' && "border-blue-500/50 text-blue-400 bg-blue-500/10",
                      selectedBoost.category === 'utility' && "border-green-500/50 text-green-400 bg-green-500/10"
                    )}
                  >
                    {selectedBoost.category === 'exploit' && 'Атака'}
                    {selectedBoost.category === 'defense' && 'Защита'}
                    {selectedBoost.category === 'utility' && 'Утилита'}
                  </Badge>
                </div>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3 h-3 text-zinc-400" />
                </button>
              </motion.div>
            ) : (
              <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="outline"
                size="sm"
                className="w-full h-10 border-white/10 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-indigo-500/30 text-zinc-300 hover:text-zinc-100 text-xs font-medium"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Выбрать
              </Button>
            )}
          </div>
        ) : (
          <Button
            onClick={onUnlock}
            disabled={!canUnlock || isUnlocking}
            variant="outline"
            size="sm"
            className={cn(
              "w-full h-10 text-xs font-semibold transition-all",
              canUnlock && !isUnlocking
                ? "border-white/20 bg-zinc-900/60 hover:bg-zinc-800/60 hover:border-indigo-500/40 text-zinc-200 hover:text-zinc-100"
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
                <Crown className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Premium
              </>
            ) : (
              <>
                <Coins className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                {unlockCost} монет
              </>
            )}
          </Button>
        )}

        {/* Выпадающий список бустов */}
        <AnimatePresence>
          {isOpen && isUnlocked && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 max-h-64 overflow-y-auto space-y-1 shadow-2xl shadow-black/50"
            >
              <button
                onClick={() => {
                  onSelectBoost(null);
                  setIsOpen(false);
                }}
                className="w-full p-2 text-left text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                Очистить слот
              </button>
              {availableBoosts.map((boost) => (
                <button
                  key={boost.type}
                  onClick={() => {
                    onSelectBoost(boost.type);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full p-2.5 text-left rounded-lg transition-all flex items-center gap-2.5 border",
                    selectedBoost?.type === boost.type
                      ? "bg-indigo-500/20 border-indigo-500/40"
                      : "border-transparent hover:bg-zinc-800/50 hover:border-white/5"
                  )}
                >
                  <span className="text-lg">{boost.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">
                      {boost.name_ru}
                    </div>
                    <div className="text-xs font-medium text-zinc-500 mt-0.5">
                      {boost.category === 'exploit' && 'Атака'}
                      {boost.category === 'defense' && 'Защита'}
                      {boost.category === 'utility' && 'Утилита'}
                    </div>
                  </div>
                  {selectedBoost?.type === boost.type && (
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

