import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DuelDataCacheEntry {
  questions?: any[];
  players?: LoadPlayersResult | null;
  boosts?: BoostInventoryItem[] | null;
  betInfo?: BetInfo | null;
}

type DuelDataCache = Record<string, DuelDataCacheEntry>;

export interface LoadPlayersResult {
  myPlayerId: string | null;
  myScore: number;
  opponentScore: number;
  myName: string;
  opponentName: string;
  players: any[];
}

export interface BoostInventoryItem {
  boost_type: string;
  quantity: number;
  icon?: string | null;
  name_ru?: string;
}

export interface BetInfo {
  betAmount: number;
  totalBank: number;
  isHost: boolean;
  hostInsurance: boolean;
  opponentInsurance: boolean;
  coverageHost: number;
  coverageOpponent: number;
}

export const useDuelData = (duelId: string | null, profileId?: string | null) => {
  const cacheRef = useRef<DuelDataCache>({});

  const getCacheEntry = () => {
    const key = duelId || "__no_duel__";
    if (!cacheRef.current[key]) {
      cacheRef.current[key] = {};
    }
    return cacheRef.current[key]!;
  };

  const fetchQuestions = useCallback(async (): Promise<any[]> => {
    if (!duelId || !profileId) {
      return [];
    }

    const cache = getCacheEntry();
    if (cache.questions) {
      return cache.questions;
    }

    // КРИТИЧНО: Функция для проверки статуса дуэли
    const checkDuelStatus = async (): Promise<'waiting' | 'active' | 'finished' | null> => {
      const { data: duelData } = await supabase
        .from('duels')
        .select('status')
        .eq('id', duelId)
        .single();
      
      return duelData?.status as any || null;
    };

    const loadViaEdge = async () => {
      const maxRetries = 5; // Увеличено с 3 до 5
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout: Edge Function не ответил за 30 секунд")), 30000);
          });

          const invokePromise = supabase.functions.invoke("duel-manager", {
            body: {
              action: "get_questions",
              duel_id: duelId,
              profile_id: profileId,
            },
          });

          const { data, error } = (await Promise.race([invokePromise, timeoutPromise])) as any;

          if (error) {
            if (attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
              console.log(`[useDuelData] ⏳ Retrying Edge Function (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw error;
          }

          if (data?.questions?.length) {
            return data.questions;
          }
          
          // Если вопросов нет, проверяем статус и ждем если дуэль еще "waiting"
          const status = await checkDuelStatus();
          if (status === 'waiting' && attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            console.log(`[useDuelData] ⏳ Duel is still "waiting", retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          
          break;
        } catch (err) {
          if (attempt === maxRetries - 1) {
            throw err;
          }
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    };

    const loadDirect = async (retries = 5): Promise<any[]> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        console.log(`[useDuelData] 🔍 Loading questions directly from DB for duel: ${duelId} (attempt ${attempt + 1}/${retries})`);
        
        const { data, error } = await supabase
          .from("duel_questions")
          .select("*")
          .eq("duel_id", duelId)
          .order("position");

        if (error) {
          console.error('[useDuelData] ❌ Direct DB query error:', {
            error,
            duelId,
            profileId,
            message: error.message,
            details: error.details,
            hint: error.hint,
            attempt: attempt + 1
          });
          
          if (attempt < retries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }

        console.log('[useDuelData] 📊 Direct DB query result:', {
          duelId,
          questionsFound: data?.length || 0,
          hasData: !!data,
          attempt: attempt + 1
        });

        if (data?.length) {
          return data;
        }

        // КРИТИЧНО: Если вопросов нет, проверяем статус дуэли
        const status = await checkDuelStatus();
        console.log(`[useDuelData] 📊 Duel status: ${status}`);
        
        // Если дуэль еще "waiting" и есть попытки - ждем и повторяем
        if (status === 'waiting' && attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`[useDuelData] ⏳ Duel is still "waiting", questions may not be generated yet. Retrying after ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        
        // Если дуэль уже "active" или "finished", но вопросов нет - это ошибка
        if (status === 'active' || status === 'finished') {
          console.error('[useDuelData] ❌ Duel is active/finished but no questions found!', {
            duelId,
            status,
            profileId
          });
          throw new Error(`Вопросы не найдены для дуэли ${duelId}. Статус дуэли: ${status}`);
        }
        
        // Если статус "waiting" и это последняя попытка - ошибка
        if (status === 'waiting' && attempt === retries - 1) {
          throw new Error(`Вопросы еще не сгенерированы. Статус дуэли: ${status}. Попробуйте обновить страницу через несколько секунд.`);
        }
      }
      
      throw new Error(`Не удалось загрузить вопросы после ${retries} попыток`);
    };

    let questions = null;
    let edgeError = null;
    
    try {
      console.log('[useDuelData] 🚀 Attempting to load questions via Edge Function...');
      questions = await loadViaEdge();
      if (questions) {
        console.log('[useDuelData] ✅ Questions loaded via Edge Function:', questions.length);
      }
    } catch (error: any) {
      edgeError = error;
      console.error("[useDuelData] ❌ Edge function questions error:", {
        error,
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        duelId,
        profileId
      });
    }

    if (!questions) {
      console.log('[useDuelData] 🔄 Falling back to direct DB query with retries...');
      try {
        questions = await loadDirect(5); // 5 попыток с экспоненциальной задержкой
        console.log('[useDuelData] ✅ Questions loaded via direct DB query:', questions.length);
      } catch (directError: any) {
        // КРИТИЧНО: Проверяем статус дуэли перед финальной ошибкой
        const { data: duelData } = await supabase
          .from('duels')
          .select('status, started_at')
          .eq('id', duelId)
          .single();
        
        console.error('[useDuelData] ❌ Both methods failed:', {
          edgeError: edgeError?.message || edgeError,
          directError: directError?.message || directError,
          duelId,
          duelStatus: duelData?.status,
          startedAt: duelData?.started_at,
          profileId
        });
        
        // Если дуэль еще "waiting", даем более понятное сообщение
        if (duelData?.status === 'waiting') {
          throw new Error(`Вопросы еще не сгенерированы. Статус дуэли: ${duelData.status}. Подождите несколько секунд и обновите страницу.`);
        }
        
        throw new Error(`Не удалось загрузить вопросы. Edge Function: ${edgeError?.message || 'ошибка'}. Прямой запрос: ${directError?.message || 'ошибка'}. Статус дуэли: ${duelData?.status || 'unknown'}`);
      }
    }

    cache.questions = questions;
    return questions;
  }, [duelId, profileId]);

  const enrichPlayersWithProfiles = async (players: any[]) => {
    const enriched = await Promise.all(
      players.map(async (player) => {
        if (player?.profiles?.first_name || player?.profiles?.username || player?.profiles?.photo_url) {
          return player;
        }
        if (!player?.user_id) {
          return player;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, username, photo_url")
          .eq("id", player.user_id)
          .maybeSingle();

        if (!error && data) {
          return { ...player, profiles: data };
        }
        return player;
      })
    );

    return enriched;
  };

  const fetchPlayers = useCallback(async (): Promise<LoadPlayersResult | null> => {
    if (!duelId) return null;

    const cache = getCacheEntry();
    if (cache.players) {
      return cache.players;
    }

    const buildResult = (players: any[]) => {
      const myPlayer = players.find((p) => p.user_id === profileId);
      const opponent = players.find((p) => p.user_id !== profileId);

      const myName = myPlayer?.name || myPlayer?.profiles?.first_name || myPlayer?.profiles?.username || "Ты";
      
      // Проверяем, является ли соперник ботом
      let opponentName = "Соперник";
      if (opponent?.is_bot) {
        // Для бота используем bot_name из данных или генерируем случайное имя
        opponentName = opponent?.bot_name || opponent?.name || "CyberNinja";
      } else {
        opponentName = opponent?.name || opponent?.profiles?.first_name || opponent?.profiles?.username || "Соперник";
      }

      return {
        myPlayerId: myPlayer?.id ?? null,
        myScore: myPlayer?.score ?? 0,
        opponentScore: opponent?.score ?? 0,
        myName,
        opponentName,
        players,
      };
    };

    try {
      const { data, error } = await supabase.functions.invoke("duel-manager", {
        body: {
          action: "get_players",
          duel_id: duelId,
          profile_id: profileId,
        },
      });

      if (!error && data?.players?.length) {
        const playersWithProfiles = await enrichPlayersWithProfiles(data.players);
        const result = buildResult(playersWithProfiles);
        cache.players = result;
        return result;
      }
    } catch (error) {
      console.error("[useDuelData] Edge function players error:", error);
    }

    const { data } = await supabase
      .from("duel_players")
      .select("*, profiles(first_name, username, photo_url)")
      .eq("duel_id", duelId);
    
    // Убеждаемся, что bot_name загружен для ботов
    console.log('[useDuelData] Loaded players:', data?.map((p: any) => ({ 
      user_id: p.user_id, 
      is_bot: p.is_bot, 
      bot_name: p.bot_name, 
      name: p.name 
    })));

    if (!data?.length) {
      return null;
    }

    // Обогащаем только реальных игроков (не ботов)
    const realPlayers = data.filter((p: any) => !p.is_bot);
    const playersWithProfiles = await enrichPlayersWithProfiles(realPlayers);
    
    // Добавляем ботов обратно с их именами
    const bots = data.filter((p: any) => p.is_bot);
    const allPlayers = [...playersWithProfiles, ...bots];
    
    const result = buildResult(allPlayers);
    cache.players = result;
    return result;
  }, [duelId, profileId]);

  const fetchBoostInventory = useCallback(async (): Promise<BoostInventoryItem[]> => {
    if (!profileId) return [];

    const cache = getCacheEntry();
    if (cache.boosts) {
      return cache.boosts;
    }

    // Загружаем loadout пользователя
    const { data: loadout, error: loadoutError } = await supabase
      .from("user_loadouts")
      .select("slot_1_boost_type, slot_2_boost_type, slot_3_boost_type")
      .eq("user_id", profileId)
      .maybeSingle();

    if (loadoutError) {
      console.error('[useDuelData] ❌ Error loading loadout:', {
        error: loadoutError,
        code: loadoutError.code,
        message: loadoutError.message,
        profileId,
        hint: 'This might be an RLS policy issue. Check if migrations are applied.'
      });
      // Продолжаем без loadout - покажем все бусты из инвентаря
    } else {
      console.log('[useDuelData] ✅ Loadout loaded successfully:', loadout);
    }

    // Формируем список выбранных бустов из loadout (фильтруем null)
    const loadoutBoosts: string[] = [];
    if (loadout) {
      if (loadout.slot_1_boost_type) loadoutBoosts.push(loadout.slot_1_boost_type);
      if (loadout.slot_2_boost_type) loadoutBoosts.push(loadout.slot_2_boost_type);
      if (loadout.slot_3_boost_type) loadoutBoosts.push(loadout.slot_3_boost_type);
    }

    console.log('[useDuelData] Loadout:', loadout, 'Selected boosts:', loadoutBoosts);

    // Загружаем все бусты из инвентаря
    const { data, error } = await supabase
      .from("boost_inventory")
      .select("boost_type, quantity")
      .eq("user_id", profileId);

    if (error) {
      console.error('[useDuelData] ❌ Error loading boost inventory:', {
        error,
        code: error.code,
        message: error.message,
        profileId,
        hint: 'This might be an RLS policy issue. Check if migrations 20251215000005 and 20251215000006 are applied.'
      });
      // НЕ выбрасываем ошибку - возвращаем пустой массив, чтобы игра продолжалась
      // Бусты просто не будут отображаться
      return [];
    }

    let boosts = data || [];
    console.log('[useDuelData] ✅ All boosts from inventory:', boosts.map(b => ({ type: b.boost_type, quantity: b.quantity })));
    
    if (boosts.length === 0) {
      console.warn('[useDuelData] ⚠️ Boost inventory is empty. This might mean:');
      console.warn('  1. User has no boosts purchased');
      console.warn('  2. RLS policy is blocking access (check migrations)');
      console.warn('  3. Boosts are stored under different user_id');
    }

    // Если есть выбранные бусты в loadout, показываем их (даже если количество 0)
    // Если loadout пустой (все null) или не существует, показываем все бусты
    if (loadoutBoosts.length > 0) {
      console.log('[useDuelData] Filtering by loadout. Looking for:', loadoutBoosts);
      console.log('[useDuelData] Available boost types in inventory:', boosts.map(b => b.boost_type));
      
      // Загружаем определения бустов для получения иконок и названий
      const { data: boostDefinitions } = await supabase
        .from("boost_definitions")
        .select("type, icon, name_ru")
        .in("type", loadoutBoosts);
      
      const definitionsMap = new Map(
        (boostDefinitions || []).map(b => [b.type, { icon: b.icon, name_ru: b.name_ru }])
      );
      
      // Создаем мапу для быстрого поиска количества бустов
      const boostsMap = new Map(boosts.map(b => [b.boost_type, b.quantity]));
      
      // Формируем список бустов из loadout (даже если их нет в инвентаре - показываем с количеством 0)
      const filteredBoosts = loadoutBoosts.map(boostType => {
        const definition = definitionsMap.get(boostType);
        return {
        boost_type: boostType,
          quantity: boostsMap.get(boostType) || 0,
          icon: definition?.icon || null,
          name_ru: definition?.name_ru || boostType
        };
      });
      
      boosts = filteredBoosts;
      console.log('[useDuelData] Filtered boosts by loadout:', boosts.map(b => ({ type: b.boost_type, quantity: b.quantity, icon: b.icon })));
    } else {
      // Если loadout пустой, загружаем определения для всех бустов из инвентаря
      if (boosts.length > 0) {
        const { data: boostDefinitions } = await supabase
          .from("boost_definitions")
          .select("type, icon, name_ru")
          .in("type", boosts.map(b => b.boost_type));
        
        const definitionsMap = new Map(
          (boostDefinitions || []).map(b => [b.type, { icon: b.icon, name_ru: b.name_ru }])
        );
        
        boosts = boosts.map(b => {
          const definition = definitionsMap.get(b.boost_type);
          return {
            ...b,
            icon: definition?.icon || null,
            name_ru: definition?.name_ru || b.boost_type
          };
        });
      }
      console.log('[useDuelData] No loadout selected, showing all boosts');
    }

    cache.boosts = boosts;
    return boosts;
  }, [profileId]);

  const fetchBetInfo = useCallback(async (): Promise<BetInfo | null> => {
    if (!duelId) return null;

    const cache = getCacheEntry();
    if (cache.betInfo) {
      return cache.betInfo;
    }

    const { data: duelData, error: duelError } = await supabase
      .from("duels")
      .select("bet_amount, host_user")
      .eq("id", duelId)
      .single();

    if (duelError || !(duelData?.bet_amount > 0)) {
      return null;
    }

    const { data: betRow } = await supabase
      .from("duel_bets")
      .select("host_insurance_enabled, host_coverage_rate, opponent_insurance_enabled, opponent_coverage_rate")
      .eq("duel_id", duelId)
      .maybeSingle();

    const betInfo: BetInfo = {
      betAmount: duelData.bet_amount,
      totalBank: duelData.bet_amount * 2,
      isHost: duelData.host_user === profileId,
      hostInsurance: Boolean(betRow?.host_insurance_enabled),
      opponentInsurance: Boolean(betRow?.opponent_insurance_enabled),
      coverageHost: betRow?.host_coverage_rate || 0,
      coverageOpponent: betRow?.opponent_coverage_rate || 0,
    };

    cache.betInfo = betInfo;
    return betInfo;
  }, [duelId, profileId]);

  const invalidate = useCallback(() => {
    if (!duelId) return;
    delete cacheRef.current[duelId];
  }, [duelId]);

  return {
    fetchQuestions,
    fetchPlayers,
    fetchBoostInventory,
    fetchBetInfo,
    invalidate,
  };
};

