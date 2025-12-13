import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Coins, Crown, Zap, Check, X, Plus, Cpu } from 'lucide-react';
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
    <Card className="p-6 bg-zinc-900/80 border border-white/10 backdrop-blur-xl rounded-xl relative overflow-visible">
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
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 pb-4">
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
        className={cn(
          "relative p-4 rounded-xl border transition-all duration-200",
          "backdrop-blur-[12px]",
          slotStyles.container,
          slotStyles.glow
        )}
        whileHover={isUnlocked ? { scale: 1.02, y: -2 } : {}}
        whileTap={isUnlocked ? { scale: 0.98 } : {}}
      >
        {/* Заголовок слота - Моноширинный шрифт */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              SLOT {slotNumber}
            </span>
            {isPremium && (
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_4px_rgba(255,215,0,0.5)]" />
              </motion.div>
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
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative group"
              >
                {/* Эффект "вставленного чипа" - картридж с тенью */}
                <motion.div
                  className={cn(
                    "p-3 rounded-lg border backdrop-blur-sm transition-all relative",
                    "shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]",
                    selectedBoost.category === 'exploit' && "bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/40 shadow-red-500/20",
                    selectedBoost.category === 'defense' && "bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/40 shadow-blue-500/20",
                    selectedBoost.category === 'utility' && "bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/40 shadow-green-500/20"
                  )}
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Градиентная обводка при hover */}
                  <motion.div
                    className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: selectedBoost.category === 'exploit' 
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.1))'
                        : selectedBoost.category === 'defense'
                        ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.1))'
                        : 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.1))'
                    }}
                  />
                  
                  {/* Крупная иконка буста */}
                  <div className="flex items-center justify-center mb-2 relative z-10">
                    <motion.span 
                      className="text-3xl"
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
                  
                  {/* Название и категория */}
                  <div className="text-center relative z-10">
                    <div className="text-xs font-semibold text-zinc-200 mb-1 truncate">
                      {selectedBoost.name_ru}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        selectedBoost.category === 'exploit' && "border-red-500/60 text-red-400 bg-red-500/15",
                        selectedBoost.category === 'defense' && "border-blue-500/60 text-blue-400 bg-blue-500/15",
                        selectedBoost.category === 'utility' && "border-green-500/60 text-green-400 bg-green-500/15"
                      )}
                    >
                      {selectedBoost.category === 'exploit' && 'Атака'}
                      {selectedBoost.category === 'defense' && 'Защита'}
                      {selectedBoost.category === 'utility' && 'Утилита'}
                    </Badge>
                  </div>
                </motion.div>

                {/* Кнопка закрытия - Увеличена touch area */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-zinc-800/90 hover:bg-zinc-700 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-3.5 h-3.5 text-zinc-300" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => setIsOpen(!isOpen)}
                  variant="outline"
                  size="sm"
                  className="w-full h-10 border-white/10 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-indigo-500/30 text-zinc-300 hover:text-zinc-100 text-xs font-medium relative overflow-hidden"
                >
                  {/* Watermark иконка микросхемы */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <Cpu className="w-8 h-8 text-zinc-400" />
                  </div>
                  
                  <div className="relative z-10 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Выбрать</span>
                  </div>
                </Button>
              </motion.div>
            )}
          </div>
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

        {/* Выпадающий список бустов - КРИТИЧНО: Высокий z-index и отступ снизу */}
        <AnimatePresence>
          {isOpen && isUnlocked && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 z-[200] bg-zinc-950/98 backdrop-blur-xl border border-white/20 rounded-xl p-2 max-h-64 overflow-y-auto space-y-1 shadow-2xl shadow-black/80 mb-20"
              style={{ marginBottom: '80px' }} // ✅ КРИТИЧНО: Отступ снизу чтобы не перекрывалось кнопкой
            >
              <button
                onClick={() => {
                  onSelectBoost(null);
                  setIsOpen(false);
                }}
                className="w-full p-2.5 text-left text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 rounded-lg transition-colors border border-transparent hover:border-white/10"
              >
                Очистить слот
              </button>
              {availableBoosts.map((boost) => (
                <motion.button
                  key={boost.type}
                  onClick={() => {
                    onSelectBoost(boost.type);
                    setIsOpen(false);
                  }}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full p-2.5 text-left rounded-lg transition-all flex items-center gap-2.5 border",
                    selectedBoost?.type === boost.type
                      ? "bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                      : "border-transparent hover:bg-zinc-800/70 hover:border-white/10"
                  )}
                >
                  <span className="text-lg">{boost.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-200 truncate">
                      {boost.name_ru}
                    </div>
                    <div className="text-xs font-medium text-zinc-500 mt-0.5">
                      {boost.category === 'exploit' && 'Атака'}
                      {boost.category === 'defense' && 'Защита'}
                      {boost.category === 'utility' && 'Утилита'}
                    </div>
                  </div>
                  {selectedBoost?.type === boost.type && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    >
                      <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
