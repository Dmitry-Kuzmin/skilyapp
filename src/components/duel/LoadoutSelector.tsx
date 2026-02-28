import { useRef } from 'react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Lock, Coins, Crown, Zap, Check, X, Plus, Cpu, Search, Shield, Hexagon, Play, Trash2, Video, ShoppingBag } from 'lucide-react';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { PaywallModal } from '@/components/monetization/PaywallModal';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { usePremium } from '@/hooks/usePremium';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useModal } from '@/hooks/useModal';
import { useLanguage } from '@/contexts/LanguageContext';

const LABELS = {
  ru: {
    title: "БОЕВЫЕ МОДУЛИ",
    subtitle: "Выберите до 3-х бустов",
    slot: "СЛОТ",
    overclock: "ОВЕРКЛОК",
    oneMatch: "1 МАТЧ",
    watchAd: "РЕКЛАМА",
    buy: "КУПИТЬ",
    or: "ИЛИ",
    premium: "PREMIUM",
    getPremium: "ПОЛУЧИТЬ",
    add: "ДОБАВИТЬ",
    locked: "ЗАКРЫТО",
    unequip: "СНЯТЬ",
    inventoryEmpty: "Инвентарь пуст",
    goShop: "Перейти в Магазин"
  },
  en: {
    title: "BATTLE MODULES",
    subtitle: "Select up to 3 boosts",
    slot: "SLOT",
    overclock: "OVERCLOCK",
    oneMatch: "1 MATCH",
    watchAd: "WATCH AD",
    buy: "BUY",
    or: "OR",
    premium: "PREMIUM",
    getPremium: "GET PREMIUM",
    add: "ADD",
    locked: "LOCKED",
    unequip: "UNEQUIP",
    inventoryEmpty: "Inventory is empty",
    goShop: "Go to Black Market"
  },
  es: {
    title: "MÓDULOS DE COMBATE",
    subtitle: "Elige hasta 3 mejoras",
    slot: "SLOT",
    overclock: "OVERCLOCK",
    oneMatch: "1 PARTIDA",
    watchAd: "VER ANUNCIO",
    buy: "COMPRAR",
    or: "O",
    premium: "PREMIUM",
    getPremium: "OBTENER",
    add: "AÑADIR",
    locked: "BLOQUEADO",
    unequip: "QUITAR",
    inventoryEmpty: "Inventario vacío",
    goShop: "Ir al Mercado Negro"
  }
};

interface Boost {
  type: string;
  name_ru: string;
  name_en: string;
  name_es: string;
  description_ru: string;
  description_en: string;
  description_es: string;
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
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
  const { language } = useLanguage();
  const l = LABELS[language] || LABELS.en;
  const isClosingRef = useRef(false);
  const { openModal: openBoostShop } = useModal('BOOST_SHOP');

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
          .select('type, name_ru, name_en, name_es, description_ru, description_en, description_es, icon, mode, category, target_type')
          .eq('mode', 'root')
          .order('cost_coins', { ascending: true });

        if (boosts) {
          setAvailableBoosts(boosts as Boost[]);
        }

        // Загружаем текущий loadout через RPC функцию (обходит RLS)
        try {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_user_loadout', { p_user_id: profileId });

          if (rpcError) {
            console.warn('[LoadoutSelector] RPC failed, trying direct query:', rpcError);
            // Fallback: прямой запрос
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
            }
          } else if (rpcData && rpcData.length > 0) {
            const currentLoadout = rpcData[0];
            setLoadout({
              slot_1_boost_type: currentLoadout.slot_1_boost_type,
              slot_2_boost_type: currentLoadout.slot_2_boost_type,
              slot_3_boost_type: currentLoadout.slot_3_boost_type,
            });
            console.log('[LoadoutSelector] ✅ Loadout loaded via RPC:', currentLoadout);
          } else {
            // Loadout не существует - это нормально, оставляем пустым
            console.log('[LoadoutSelector] No loadout found, starting with empty slots');
          }
        } catch (error) {
          console.error('[LoadoutSelector] Error loading loadout:', error);
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

    // Сохраняем в БД через RPC функцию (обходит RLS)
    try {
      const { error: rpcError } = await supabase.rpc('save_user_loadout', {
        p_user_id: profileId,
        p_slot_1_boost_type: newLoadout.slot_1_boost_type,
        p_slot_2_boost_type: newLoadout.slot_2_boost_type,
        p_slot_3_boost_type: newLoadout.slot_3_boost_type,
      });

      if (rpcError) {
        console.error('[LoadoutSelector] Error saving loadout via RPC:', rpcError);
        // Fallback: пробуем через прямой запрос
        const { error: directError } = await supabase
          .from('user_loadouts')
          .upsert({
            user_id: profileId,
            ...newLoadout,
          }, {
            onConflict: 'user_id',
          });

        if (directError) {
          console.error('[LoadoutSelector] Error saving loadout via direct query:', directError);
          toast.error('Ошибка сохранения снаряжения');
          return;
        }
      }

      console.log('[LoadoutSelector] ✅ Loadout saved successfully:', newLoadout);

      // Уведомляем родительский компонент об изменении loadout
      if (onLoadoutChange) {
        onLoadoutChange(newLoadout);
      }
    } catch (error) {
      console.error('[LoadoutSelector] Error saving loadout:', error);
      toast.error('Ошибка сохранения снаряжения');
    }
  };

  // Получаем буст по типу
  const getBoostByType = (boostType: string | null) => {
    if (!boostType) return null;
    return availableBoosts.find(b => b.type === boostType) || null;
  };

  if (loading) {
    return (
      <Card className="p-6 bg-zinc-900/80 dark:bg-zinc-900/80 bg-zinc-50/80 border border-white/10 dark:border-white/10 border-zinc-200/50 backdrop-blur-xl rounded-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-800/50 dark:bg-zinc-800/50 bg-zinc-200/50 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-24 bg-zinc-800/50 dark:bg-zinc-800/50 bg-zinc-200/50 rounded-xl" />
            <div className="h-24 bg-zinc-800/50 dark:bg-zinc-800/50 bg-zinc-200/50 rounded-xl" />
            <div className="h-24 bg-zinc-800/50 dark:bg-zinc-800/50 bg-zinc-200/50 rounded-xl" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 relative overflow-hidden pb-12 rounded-xl border border-zinc-200/50 dark:border-white/10 backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80"
        style={{
          background: isDark
            ? 'radial-gradient(120% 120% at 50% 0%, rgba(99, 102, 241, 0.05) 0%, rgba(0, 0, 0, 0.4) 100%)'
            : 'radial-gradient(120% 120% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, rgba(255, 255, 255, 0.7) 100%)',
          boxShadow: isDark
            ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 10px 40px -10px rgba(0, 0, 0, 0.5)'
            : 'inset 0 1px 0 0 rgba(0, 0, 0, 0.05), 0 10px 40px -10px rgba(0, 0, 0, 0.1)',
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
              <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Zap className="w-5 h-5 text-indigo-500 dark:text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <span className="font-mono tracking-wider uppercase">{l.title}</span>
              </h3>
              <p className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 tracking-wider uppercase">
                {l.subtitle}
              </p>
            </div>

            {/* Декоративный текст-призрак */}
            <div className="absolute top-0 right-0 text-[8px] font-mono text-zinc-300/30 dark:text-white/5 tracking-widest">
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
              l={l}
              onSlotClick={() => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[LoadoutSelector] Slot 1 clicked, setting selectedSlotIndex to 0');
                }
                setSelectedSlotIndex(0);
              }}
              onClear={() => handleSelectBoost(1, null)}
              onShopClick={() => openBoostShop({ initialTab: 'boosts' })}
            />

            {/* Слот 2 - Платный */}
            <SlotCard
              slotNumber={2}
              isUnlocked={ramSlotsUnlocked >= 2 || tempSlotUnlocked === 2}
              isPremium={false}
              unlockCost={SLOT_UNLOCK_COST}
              l={l}
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
              onShopClick={() => openBoostShop({ initialTab: 'boosts' })}
            />

            {/* Слот 3 - Premium */}
            <SlotCard
              slotNumber={3}
              isUnlocked={ramSlotsUnlocked >= 3}
              isPremium={true}
              userHasPremium={isPremium}
              l={l}
              onUnlock={() => handleUnlockSlot(3)}
              onPremiumClick={() => setShowPremiumModal(true)}
              selectedBoost={getBoostByType(loadout.slot_3_boost_type)}
              onSlotClick={() => {
                if (ramSlotsUnlocked >= 3) {
                  setSelectedSlotIndex(2);
                }
              }}
              onClear={() => handleSelectBoost(3, null)}
              onShopClick={() => openBoostShop({ initialTab: 'boosts' })}
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
            className="bg-white/95 dark:bg-black/95 border-t border-zinc-200/50 dark:border-white/20 rounded-t-3xl max-h-[70vh] flex flex-col p-0 backdrop-blur-xl"
            style={{
              boxShadow: isDark
                ? '0 -10px 40px -10px rgba(0, 0, 0, 0.8)'
                : '0 -10px 40px -10px rgba(0, 0, 0, 0.15)',
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

            <SheetHeader className="px-4 pt-4 pb-3 border-b border-zinc-200/50 dark:border-white/10 relative z-10 flex items-center justify-between">
              <SheetTitle className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
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
                  className="text-xs font-mono text-zinc-500/70 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{l.unequip}</span>
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
                isDark={isDark}
                language={language}
                l={l}
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
          rewardType="slot_unlock"
          inlineOverlay={true}
          secondaryAction={{
            text: `Открыть навсегда за ${SLOT_UNLOCK_COST}`,
            subtext: "Слот останется открытым для всех будущих игр",
            icon: <Coins className="w-4 h-4 text-amber-500" />,
            onClick: () => {
              setShowOverclockModal(false);
              handleUnlockSlot(2);
            }
          }}
          onRewardClaimed={async () => {
            if (!profileId) return;

            try {
              const { data, error } = await supabase.functions.invoke('ad-reward', {
                body: {
                  user_id: profileId,
                  reward_type: 'slot_unlock',
                  metadata: { slot_number: 2 },
                }
              });

              if (error) {
                console.error('[LoadoutSelector] Edge Function error:', error);
                throw error;
              }

              console.log('[LoadoutSelector] Edge Function response:', data);

              if (data?.success && data?.client_action === 'unlock_temp_slot') {
                setTempSlotUnlocked(2);
                setShowOverclockModal(false);
                toast.success('Слот 2 разблокирован на эту дуэль!');
              } else {
                console.error('[LoadoutSelector] Unexpected response:', data);
                toast.error('Неожиданный ответ от сервера');
              }
            } catch (err: any) {
              console.error('[LoadoutSelector] Error claiming reward:', err);
              const errorMessage = err.message || err.error || 'Не удалось разблокировать слот';
              toast.error(errorMessage);
            }
          }}
          title="OVERCLOCKING"
          description="Посмотри рекламу и разблокируй слот на эту дуэль. Временный root-доступ..."
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
  onShopClick?: () => void;
  l: any;
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
  onShopClick,
  l,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const { language } = useLanguage();

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
      if (process.env.NODE_ENV === 'development') {
        console.log('[SlotCard] Premium slot clicked, opening premium modal');
      }
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
          "relative aspect-[3/4.8] min-h-[160px] rounded-xl border transition-all duration-300",
          "backdrop-blur-[12px] flex flex-col overflow-hidden",
          "cursor-pointer p-1.5 sm:p-3",
          // Слот с бустом - эффект вставленного модуля
          selectedBoost
            ? cn(
              "bg-white/90 dark:bg-zinc-900/80 border-2",
              categoryColors?.border || "border-indigo-500/50 dark:border-indigo-500/50",
              "shadow-[inset_0_2px_8px_rgba(0,0,0,0.1),inset_0_-2px_8px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),inset_0_-2px_8px_rgba(0,0,0,0.4)]"
            )
            : // Пустой разблокированный слот - синяя рамка
            isUnlocked
              ? "bg-zinc-50/80 dark:bg-zinc-950/60 border border-blue-500/40 dark:border-blue-500/30 hover:border-blue-500/60 dark:hover:border-blue-500/50 hover:bg-zinc-100/90 dark:hover:bg-zinc-950/80"
              : // Заблокированный слот
              isPremium
                ? "bg-zinc-100/60 dark:bg-zinc-950/40 border border-amber-500/40 dark:border-amber-500/30 opacity-70 hover:opacity-90"
                : canOverclock
                  ? "bg-orange-50/50 dark:bg-orange-500/5 border border-orange-500/40 dark:border-orange-500/30 hover:border-orange-500/60 dark:hover:border-orange-500/50 hover:bg-orange-100/70 dark:hover:bg-orange-500/10"
                  : "bg-zinc-100/60 dark:bg-zinc-950/40 border border-zinc-300/50 dark:border-white/5 opacity-70"
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
          <span className="text-[8px] font-mono text-zinc-500/60 dark:text-white/20 uppercase tracking-wider">
            {l.slot} {slotNumber}
          </span>
          <div className="flex items-center gap-1.5">
            {onShopClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShopClick();
                }}
                className="hover:text-indigo-500 transition-colors"
                title="Black Market"
              >
                <ShoppingBag className="w-3 h-3 text-zinc-400 dark:text-white/40" />
              </button>
            )}
            {isPremium && (
              <Crown className="w-3 h-3 text-amber-500/70 dark:text-amber-400/60" />
            )}
          </div>
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
                  categoryColors?.text || "text-zinc-900 dark:text-white"
                )}>
                  {language === 'ru' ? selectedBoost.name_ru : language === 'es' ? selectedBoost.name_es : (selectedBoost.name_en || selectedBoost.name_ru)}
                </span>
                <span className="text-[8px] text-zinc-500 dark:text-zinc-400 text-center px-1 line-clamp-2 mt-0.5 leading-[1.1] opacity-60 group-hover:opacity-100 transition-opacity">
                  {language === 'ru' ? selectedBoost.description_ru : language === 'es' ? selectedBoost.description_es : (selectedBoost.description_en || selectedBoost.description_ru)}
                </span>

                {/* Кнопка удаления - стильная в правом верхнем углу */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-zinc-400/70 dark:text-white/30 hover:text-red-500 dark:hover:text-red-500 transition-colors z-20"
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
                  className="text-5xl sm:text-6xl font-light text-blue-500 dark:text-blue-400"
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
                <span className="text-[10px] font-mono tracking-wider text-blue-500/70 dark:text-blue-400/60 uppercase">
                  {l.add}
                </span>
              </div>
            )
          ) : canOverclock ? (
            // === OVERCLOCK: Компактный Layout - OVERCLOCK сверху, две кнопки внизу ===
            <div className="flex flex-col h-full w-full">
              {/* Верхняя часть - OVERCLOCK */}
              <div className="flex-1 flex flex-col items-center justify-center gap-1 relative">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <Play className="w-5 h-5 sm:w-7 sm:h-7 text-orange-500 dark:text-orange-400 fill-orange-500 dark:fill-orange-400" />
                  <Video className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 text-orange-600 dark:text-orange-500 bg-orange-400/30 dark:bg-orange-400/20 rounded-full p-0.5 border border-orange-500/50 dark:border-orange-500/40" />
                </motion.div>
                <span className="text-[7px] sm:text-[8px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider">
                  {l.overclock}
                </span>
                <span className="text-[6px] sm:text-[7px] text-orange-600/70 dark:text-orange-500/60 font-mono">
                  {l.oneMatch}
                </span>
              </div>

              {/* Нижняя часть - Две кнопки с разделителем "or" */}
              <div className="flex-shrink-0 flex flex-col gap-1 pt-1">
                {/* Кнопка рекламы - верхняя */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOverclockClick) onOverclockClick();
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-orange-500/40 to-orange-400/40 dark:from-orange-500/30 dark:to-orange-400/30 border-2 border-orange-500/70 dark:border-orange-500/60 shadow-[0_0_10px_rgba(251,146,60,0.2)] whitespace-nowrap min-h-[28px] touch-manipulation"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Video className="w-3 h-3 text-orange-600 dark:text-orange-300 flex-shrink-0" />
                  <span className="text-[8px] text-orange-700 dark:text-orange-200 font-bold uppercase tracking-tight leading-none">
                    {l.watchAd}
                  </span>
                </motion.button>

                {/* Разделитель "or" - более заметный */}
                <div className="flex items-center justify-center gap-2 py-0.5">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-300/50 dark:via-white/20 to-transparent" />
                  <span className="text-[8px] text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider px-1">
                    {l.or}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-300/50 dark:via-white/20 to-transparent" />
                </div>

                {/* Кнопка покупки - нижняя */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUnlock) onUnlock();
                  }}
                  disabled={!canUnlock || isUnlocking}
                  className={cn(
                    "flex items-center justify-center gap-1 px-2 py-1 rounded-lg border-2 transition-all whitespace-nowrap min-h-[28px] touch-manipulation",
                    canUnlock && !isUnlocking
                      ? "bg-gradient-to-r from-yellow-500/40 to-amber-500/40 dark:from-yellow-500/30 dark:to-amber-500/30 border-yellow-500/70 dark:border-yellow-500/60 text-yellow-800 dark:text-yellow-200 shadow-[0_0_10px_rgba(234,179,8,0.2)] hover:from-yellow-500/50 hover:to-amber-500/50 active:scale-95"
                      : "bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-300/50 dark:border-zinc-700/50 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                  )}
                >
                  {isUnlocking ? (
                    <>
                      <motion.div
                        className="w-3 h-3 border-2 border-yellow-400/50 border-t-yellow-400 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span className="text-[8px] font-mono text-yellow-400">...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-3 h-3 flex-shrink-0" />
                      <span className="text-[8px] font-bold uppercase tracking-tight leading-none">
                        {l.buy}: {unlockCost}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // === PREMIUM: Иконка Crown + "PREMIUM" ===
            <div className="flex flex-col items-center justify-center gap-2 h-full">
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
                <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 dark:text-amber-400" />
              </motion.div>
              <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
                {l.premium}
              </span>
              {!userHasPremium && (
                <motion.div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-yellow-500/30 dark:from-amber-500/20 dark:to-yellow-500/20 border border-amber-500/50 dark:border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.2)] dark:shadow-[0_0_8px_rgba(251,191,36,0.3)] whitespace-nowrap"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Crown className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-[8px] text-amber-700 dark:text-amber-300 font-bold uppercase tracking-tight leading-tight">
                    {l.getPremium}
                  </span>
                </motion.div>
              )}
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
  isDark: boolean;
  onSelectBoost: (boostType: string | null) => void;
  language: string;
  l: any;
}

const BoostSelectSheetContent: React.FC<BoostSelectSheetContentProps> = ({
  availableBoosts,
  selectedBoost,
  isDark,
  onSelectBoost,
  language,
  l,
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
            <div className="p-3 rounded-full bg-zinc-100/80 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-white/10 mb-3">
              <Shield className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-500 mb-2">{l.inventoryEmpty}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-600 font-mono">{l.goShop}</p>
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
                    "bg-zinc-50/80 dark:bg-white/5 border-zinc-200/50 dark:border-white/10",
                    "hover:bg-zinc-100/90 dark:hover:bg-white/10 hover:border-zinc-300/70 dark:hover:border-white/20",
                    isSelected && "border-indigo-500/60 dark:border-white/40 bg-indigo-50/50 dark:bg-white/10",
                    "backdrop-blur-sm"
                  )}
                  style={{
                    boxShadow: isDark
                      ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 2px 8px -2px rgba(0, 0, 0, 0.3)'
                      : 'inset 0 1px 0 0 rgba(0, 0, 0, 0.05), 0 2px 8px -2px rgba(0, 0, 0, 0.1)'
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
                    <div className="text-[9px] font-mono mb-0.5 tracking-widest text-zinc-500/70 dark:text-white/40 uppercase">
                      {categoryLabel}
                    </div>
                    <div className={cn(
                      "text-xs font-bold truncate leading-tight",
                      isSelected ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-200"
                    )}>
                      {language === 'ru' ? boost.name_ru : language === 'es' ? boost.name_es : (boost.name_en || boost.name_ru)}
                    </div>
                    {/* Описание буста */}
                    <div className="mt-1 text-[9px] leading-[1.1] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {language === 'ru' ? boost.description_ru : language === 'es' ? boost.description_es : (boost.description_en || boost.description_ru)}
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
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 dark:bg-white/20 border border-indigo-500/40 dark:border-white/40 flex items-center justify-center">
                        <Check className="w-3 h-3 text-indigo-600 dark:text-white" />
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
