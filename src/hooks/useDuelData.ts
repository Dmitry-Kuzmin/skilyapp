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

    // КРИТИЧНО: Функция для проверки статуса дуэли (с обработкой ошибок)
    const checkDuelStatus = async (): Promise<'waiting' | 'active' | 'finished' | null> => {
      try {
        const { data: duelData, error } = await supabase
          .from('duels')
          .select('status')
          .eq('id', duelId)
          .single();

        if (error) {
          // Игнорируем PGRST116 (No rows found) - это нормально, если дуэль не загрузилась
          if (error.code !== 'PGRST116') {
            console.warn(`[useDuelData] ⚠️ checkDuelStatus error:`, error.message);
          }
          return null;
        }
        return duelData?.status as any || null;
      } catch (e) {
        console.warn(`[useDuelData] ⚠️ checkDuelStatus exception:`, e);
        return null;
      }
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

          // SP-3: Обработка 406 Not Acceptable (типичная проблема с RLS/Headers)
          if (error.code === '406' || error.message?.includes('Not Acceptable') || error.code === 'PGRST116') {
            console.log(`[useDuelData] 🚨 406/RLS Error detected. Attempting RPC immediately...`);
            try {
              const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_duel_questions_raw', { p_duel_id: duelId });

              if (!rpcError && rpcData?.length) {
                console.log(`[useDuelData] ✅ Questions loaded via RPC (rescue from 406):`, rpcData.length);
                return rpcData;
              }
            } catch (e) {
              console.warn(`[useDuelData] ⚠️ RPC rescue failed:`, e);
            }
          }

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

        // КРИТИЧНО: RPC Фоллбэк - если прямой запрос вернул пусто но без ошибки (или RLS скрыл)
        // Или если мы хотим попробовать RPC
        try {
          console.log(`[useDuelData] 🔄 Attempting RPC get_duel_questions_raw (fallback)...`);
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_duel_questions_raw', { p_duel_id: duelId });

          if (!rpcError && rpcData?.length) {
            console.log(`[useDuelData] ✅ Questions loaded via RPC get_duel_questions_raw:`, rpcData.length);
            return rpcData;
          } else if (rpcError) {
            console.warn(`[useDuelData] ⚠️ RPC get_duel_questions_raw failed:`, rpcError.message);
          }
        } catch (e) {
          console.warn(`[useDuelData] ⚠️ RPC get_duel_questions_raw exception:`, e);
        }

        // КРИТИЧНО: Если вопросов нет, проверяем статус дуэли и количество игроков
        const status = await checkDuelStatus();
        console.log(`[useDuelData] 📊 Duel status: ${status}`);

        // КРИТИЧНО: Если дуэль "waiting" и есть 2 игрока - пытаемся запустить вручную
        if (status === 'waiting' && attempt >= 2) {
          // Проверяем количество игроков
          const { data: playersData } = await supabase
            .from('duel_players')
            .select('id, user_id, is_bot')
            .eq('duel_id', duelId);

          const realPlayers = playersData?.filter(p => !p.is_bot) || [];
          console.log('[useDuelData] 🔍 Checking players for manual start:', {
            totalPlayers: playersData?.length || 0,
            realPlayers: realPlayers.length,
            players: playersData?.map(p => ({ id: p.id, user_id: p.user_id, is_bot: p.is_bot }))
          });

          // Если есть 2 игрока (включая бота) - пытаемся запустить дуэль вручную
          if (playersData?.length === 2) {
            console.log('[useDuelData] 🚀 2 players detected in waiting duel, attempting manual start...');
            try {
              const { data: startData, error: startError } = await supabase.functions.invoke('duel-manager', {
                body: {
                  action: 'start_duel',
                  duel_id: duelId,
                  profile_id: profileId
                }
              });

              if (startError) {
                console.error('[useDuelData] ❌ Error starting duel manually:', startError);
              } else {
                console.log('[useDuelData] ✅ Duel started manually, waiting for questions...');
                // Ждем немного и проверяем снова
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue; // Повторяем попытку загрузки вопросов
              }
            } catch (startErr: any) {
              console.error('[useDuelData] ❌ Exception starting duel manually:', startErr);
            }
          }
        }

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
      const myPlayer = players.find((p) => String(p.user_id) === String(profileId));
      const opponent = players.find((p) => String(p.user_id) !== String(profileId));

      // КРИТИЧНО: Используем name из Edge Function (если доступен), так как он уже вычислен на основе профиля
      // Fallback: берем из profiles, потом из поля name таблицы duel_players
      const myName = myPlayer?.name || myPlayer?.profiles?.first_name || myPlayer?.profiles?.username || "Ты";

      // Проверяем, является ли соперник ботом
      let opponentName = "Соперник";
      if (opponent?.is_bot) {
        // Для бота используем bot_name из данных или поле name (которое было установлено Edge Function или из БД)
        opponentName = opponent?.bot_name || opponent?.name || "CyberNinja";
      } else {
        // КРИТИЧНО: Для реального игрока используем name из Edge Function (если есть), иначе берем из профиля
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
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout: Edge Function не ответил за 15 секунд")), 15000);
      });

      const invokePromise = supabase.functions.invoke("duel-manager", {
        body: {
          action: "get_players",
          duel_id: duelId,
          profile_id: profileId,
        },
      });

      // @ts-ignore
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

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

    // Убеждаемся, что bot_name загружен для ботов и profiles загружены для игроков
    console.log('[useDuelData] Loaded players (raw):', data?.map((p: any) => ({
      user_id: p.user_id,
      is_bot: p.is_bot,
      bot_name: p.bot_name,
      name: p.name,
      profiles: p.profiles ? {
        first_name: p.profiles.first_name,
        username: p.profiles.username,
        photo_url: p.profiles.photo_url
      } : null
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

    console.log('[useDuelData] 🚀 Loading combined boost data via RPC [get_duel_boost_data]');

    try {
      const { data, error } = await supabase.rpc('get_duel_boost_data', { p_user_id: profileId });

      if (error) {
        console.warn('[useDuelData] ⚠️ Optimized RPC failed:', error);
        // Minimal fallback: if RPC fails, we return empty list to not block the game
        return [];
      }

      const { loadout, inventory, definitions } = data as {
        loadout: { slot_1: string; slot_2: string; slot_3: string } | null;
        inventory: { boost_type: string; quantity: number }[];
        definitions: { type: string; icon: string | null; name_ru: string | null }[];
      };

      // Map definitions for quick lookup
      const definitionsMap = new Map(
        (definitions || []).map(b => [b.type, { icon: b.icon, name_ru: b.name_ru }])
      );

      // Create inventory map
      const inventoryMap = new Map((inventory || []).map(b => [b.boost_type, b.quantity]));

      // Extract loadout types
      const loadoutBoosts = [loadout?.slot_1, loadout?.slot_2, loadout?.slot_3].filter(Boolean) as string[];

      if (loadoutBoosts.length > 0) {
        // Show ONLY loadout boosts (trusting the selection)
        return loadoutBoosts.map(type => {
          const def = definitionsMap.get(type);
          return {
            boost_type: type,
            quantity: inventoryMap.get(type) || 0,
            icon: def?.icon || null,
            name_ru: def?.name_ru || type
          };
        });
      } else {
        // No loadout? Then show all inventory items (fallback or new user)
        return (inventory || []).map(b => {
          const def = definitionsMap.get(b.boost_type);
          return {
            ...b,
            icon: def?.icon || null,
            name_ru: def?.name_ru || b.boost_type
          };
        });
      }
    } catch (e) {
      console.error('[useDuelData] ❌ Error in optimized boost fetch:', e);
      return [];
    }
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

