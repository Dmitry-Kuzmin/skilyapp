import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { saveDuelResultSnapshot, loadDuelResultSnapshot, clearDuelResultSnapshot } from "@/utils/duelResultSnapshot";
import type { DuelResultSnapshot } from "@/features/duel/shared";
import { ACTIVE_DUEL_STORAGE_KEY } from "@/features/duel/shared";
import type { ActiveDuelState } from "@/features/duel/shared";

interface DuelResultData {
  duel: any;
  players: any[];
  myPlayer: any | null;
  opponentPlayer: any | null;
  myAnswers: any[];
  opponentAnswers: any[];
  results: {
    isWinner: boolean;
    isDraw: boolean;
    myScore: number;
    opponentScore: number;
    myCorrect: number;
    opponentCorrect: number;
    opponentName: string;
    opponentAvatar: string | null;
    betAmount: number;
    winnings: number;
    insuranceRefund: number;
    insuranceUsed: boolean;
  };
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки результатов дуэли
 * Объединяет все запросы в batch для минимизации количества запросов
 * Автоматически находит myPlayerId по profileId
 * 
 * 🎯 ГИБРИДНАЯ ЛОГИКА ВОССТАНОВЛЕНИЯ (каскад приоритетов):
 * Приоритет 1 (Props): Если есть initialSnapshot в пропсах - используем его (мгновенно)
 * Приоритет 2 (LocalStorage): Если пропсов нет - пытаемся прочитать snapshot из localStorage (Delayed Cleanup)
 * Приоритет 3 (Server): Если и там пусто - идем в Supabase за данными дуэли по ID
 * 
 * @param duelId - ID дуэли
 * @param profileId - ID профиля пользователя
 * @param initialSnapshot - Начальные данные snapshot (передаются напрямую из памяти, минуя localStorage)
 */
export function useDuelResults(
  duelId: string | null, 
  profileId: string | null,
  initialSnapshot?: DuelResultSnapshot | null
) {
  return useQuery<DuelResultData | null>({
    queryKey: ["duel-results", duelId, profileId],
    queryFn: async () => {
      if (!duelId || !profileId) return null;

      // 🎯 ПРИОРИТЕТ 1: Props (мгновенно, если мы только что пришли с дуэли)
      // Используем initialSnapshot если передан (данные из памяти, минуя localStorage)
      // Это решает race condition на мобильных устройствах где localStorage медленный
      if (initialSnapshot && initialSnapshot.duelId === duelId) {
        console.log('[useDuelResults] ✅ ПРИОРИТЕТ 1: Using initialSnapshot data (direct props, bypassing localStorage)');
        return {
          duel: initialSnapshot.duel,
          players: initialSnapshot.players,
          myPlayer: initialSnapshot.myPlayer,
          opponentPlayer: initialSnapshot.opponentPlayer,
          myAnswers: initialSnapshot.myAnswers,
          opponentAnswers: initialSnapshot.opponentAnswers,
          results: initialSnapshot.results,
        };
      }

      // 🎯 ПРИОРИТЕТ 2: LocalStorage/Snapshot (если пользователь перезагрузил страницу)
      // Проверяем snapshot ПЕРЕД запросом к БД (fallback для reload scenario)
      // Благодаря стратегии "Delayed Cleanup" snapshot остается в localStorage
      const snapshot = loadDuelResultSnapshot(duelId);
      if (snapshot && snapshot.duelId === duelId) {
        console.log('[useDuelResults] ✅ ПРИОРИТЕТ 2: Using snapshot data from localStorage (reload recovery)');
        // Конвертируем snapshot в формат DuelResultData
        return {
          duel: snapshot.duel,
          players: snapshot.players,
          myPlayer: snapshot.myPlayer,
          opponentPlayer: snapshot.opponentPlayer,
          myAnswers: snapshot.myAnswers,
          opponentAnswers: snapshot.opponentAnswers,
          results: snapshot.results,
        };
      }

      // 🎯 ПРИОРИТЕТ 3: Server Fetch (если сменил устройство или snapshot устарел)
      // Идем в Supabase за данными дуэли по ID
      console.log('[useDuelResults] ⚠️ ПРИОРИТЕТ 3: No snapshot found, fetching from server...');
      
      // 🆕 CRITICAL FIX: Используем Edge Function для получения данных дуэли
      // Это более надежно, чем прямой запрос к БД, так как Edge Function может обработать race condition
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'get_results',
            duel_id: duelId,
            profile_id: profileId,
          },
        });

        // Если Edge Function вернул ошибку или не поддерживает get_results - используем прямой запрос к БД
        if (edgeError) {
          console.log("[useDuelResults] Edge Function error or not supported, using direct DB query:", edgeError.message);
          // Не выбрасываем ошибку, просто переходим к прямому запросу к БД
        } else if (edgeData && edgeData.duel && edgeData.players && edgeData.players.length >= 2) {
          // Если Edge Function вернул данные - используем их
          const players = edgeData.players;
          const myPlayer = players.find((p: any) => p.user_id === profileId);
          const opponentPlayer = players.find((p: any) => p.user_id !== profileId);

          if (myPlayer && opponentPlayer) {
            const myPlayerId = myPlayer.id;
            const opponentPlayerId = opponentPlayer.id;

            // Загружаем ответы
            const [myAnswersResult, opponentAnswersResult] = await Promise.all([
              supabase
                .from("duel_answers")
                .select("*, duel_questions(*)")
                .eq("duel_id", duelId)
                .eq("player_id", myPlayerId)
                .order("created_at"),
              supabase
                .from("duel_answers")
                .select("*, duel_questions(*)")
                .eq("duel_id", duelId)
                .eq("player_id", opponentPlayerId)
                .order("created_at"),
            ]);

            const myAnswers = myAnswersResult.data || [];
            const opponentAnswers = opponentAnswersResult.data || [];

            // Вычисляем результаты
            const myScore = myPlayer.score || 0;
            const opponentScore = opponentPlayer.score || 0;
            const myCorrect = myPlayer.correct_count || 0;
            const opponentCorrect = opponentPlayer.correct_count || 0;
            const opponent = opponentPlayer.profiles || {};
            const duelData = edgeData.duel;

            const isWinner = myScore > opponentScore;
            const isDraw = myScore === opponentScore;

            let winnings = 0;
            let insuranceRefund = 0;
            if (duelData.bet_amount > 0) {
              if (isWinner) {
                winnings = duelData.bet_amount * 2;
              } else if (isDraw) {
                winnings = duelData.bet_amount;
              }
              if (!isWinner && !isDraw && duelData.insurance_used) {
                insuranceRefund = Math.floor(duelData.bet_amount * 0.5);
              }
            }

            const resultData = {
              duel: duelData,
              players,
              myPlayer,
              opponentPlayer,
              myAnswers,
              opponentAnswers,
              results: {
                isWinner,
                isDraw,
                myScore,
                opponentScore,
                myCorrect,
                opponentCorrect,
                opponentName: opponent?.username || opponent?.first_name || "Соперник",
                opponentAvatar: opponent?.photo_url || null,
                betAmount: duelData.bet_amount || 0,
                winnings,
                insuranceRefund,
                insuranceUsed: duelData.insurance_used || false,
              },
            };

            // Сохраняем snapshot для будущего использования
            const resultSnapshot: DuelResultSnapshot = {
              ...resultData,
              timestamp: Date.now(),
            };
            saveDuelResultSnapshot(resultSnapshot);
            console.log('[useDuelResults] ✅ Snapshot saved for future use');

            return resultData;
          }
        }
      } catch (edgeError: any) {
        // Если Edge Function выбросил исключение, логируем и продолжаем с прямым запросом
        console.log('[useDuelResults] Edge Function exception, trying direct DB query...', edgeError?.message);
      }

      // Fallback: прямой запрос к БД (если Edge Function не сработал или не вернул данные)
      const [duelResult, playersResult] = await Promise.all([
        supabase
          .from("duels")
          .select("*")
          .eq("id", duelId)
          .maybeSingle(),

        supabase
          .from("duel_players")
          .select("*, profiles(id, username, first_name, photo_url)")
          .eq("duel_id", duelId),
      ]);

      // Если дуэль еще не готова (race condition), выбрасываем специальную ошибку для retry
      if (duelResult.error) {
        if (duelResult.error.code === 'PGRST116') {
          console.warn("[useDuelResults] Duel not ready yet (race condition), will retry...");
          throw new Error('DUEL_NOT_READY');
        }
        console.error("[useDuelResults] Error loading duel:", duelResult.error);
        throw duelResult.error;
      }

      // Если данных нет (null), значит Edge Function еще обрабатывает
      if (!duelResult.data) {
        console.warn("[useDuelResults] Duel data is null (race condition), will retry...", {
          duelId,
          profileId,
          attempt: 'checking snapshot and activeDuel...'
        });
        
        // 🎯 FALLBACK: Проверяем snapshot еще раз (может быть создан асинхронно или восстановлен)
        const snapshotRetry = loadDuelResultSnapshot(duelId);
        if (snapshotRetry && snapshotRetry.duelId === duelId) {
          console.log('[useDuelResults] ✅ Found snapshot on retry (reload recovery)!');
          return {
            duel: snapshotRetry.duel,
            players: snapshotRetry.players,
            myPlayer: snapshotRetry.myPlayer,
            opponentPlayer: snapshotRetry.opponentPlayer,
            myAnswers: snapshotRetry.myAnswers,
            opponentAnswers: snapshotRetry.opponentAnswers,
            results: snapshotRetry.results,
          };
        }
        
        throw new Error('DUEL_NOT_READY');
      }

      if (playersResult.error) {
        console.error("[useDuelResults] Error loading players:", playersResult.error);
        throw playersResult.error;
      }

      const players = playersResult.data || [];
      
      if (players.length < 2) {
        throw new Error("Не найдены оба игрока");
      }

      // Находим моего игрока и соперника по user_id (profileId)
      const myPlayer = players.find((p: any) => p.user_id === profileId);
      const opponentPlayer = players.find((p: any) => p.user_id !== profileId);

      if (!myPlayer || !opponentPlayer) {
        throw new Error("Не найден игрок или соперник");
      }

      const myPlayerId = myPlayer.id;
      const opponentPlayerId = opponentPlayer.id;

      // Загружаем ответы обоих игроков параллельно
      const [myAnswersResult, opponentAnswersResult] = await Promise.all([
        supabase
          .from("duel_answers")
          .select("*, duel_questions(*)")
          .eq("duel_id", duelId)
          .eq("player_id", myPlayerId)
          .order("created_at"),
        supabase
          .from("duel_answers")
          .select("*, duel_questions(*)")
          .eq("duel_id", duelId)
          .eq("player_id", opponentPlayerId)
          .order("created_at"),
      ]);

      if (myAnswersResult.error) {
        console.error("[useDuelResults] Error loading my answers:", myAnswersResult.error);
        throw myAnswersResult.error;
      }

      const myAnswers = myAnswersResult.data || [];
      const opponentAnswers = opponentAnswersResult.data || [];

      // Вычисляем результаты
      const myScore = myPlayer.score || 0;
      const opponentScore = opponentPlayer.score || 0;
      const myCorrect = myPlayer.correct_count || 0;
      const opponentCorrect = opponentPlayer.correct_count || 0;
      const opponent = opponentPlayer.profiles || {};
      const duelData = duelResult.data;

      const isWinner = myScore > opponentScore;
      const isDraw = myScore === opponentScore;

      let winnings = 0;
      let insuranceRefund = 0;
      if (duelData.bet_amount > 0) {
        if (isWinner) {
          winnings = duelData.bet_amount * 2;
        } else if (isDraw) {
          winnings = duelData.bet_amount;
        }
        if (!isWinner && !isDraw && duelData.insurance_used) {
          insuranceRefund = Math.floor(duelData.bet_amount * 0.5);
        }
      }

      const resultData = {
        duel: duelData,
        players,
        myPlayer,
        opponentPlayer,
        myAnswers,
        opponentAnswers,
        results: {
          isWinner,
          isDraw,
          myScore,
          opponentScore,
          myCorrect,
          opponentCorrect,
          opponentName: opponent?.username || opponent?.first_name || "Соперник",
          opponentAvatar: opponent?.photo_url || null,
          betAmount: duelData.bet_amount || 0,
          winnings,
          insuranceRefund,
          insuranceUsed: duelData.insurance_used || false,
        },
      };

      // 🆕 FIX: Сохраняем snapshot для предотвращения race condition при следующей загрузке
      const resultSnapshot: DuelResultSnapshot = {
        ...resultData,
        timestamp: Date.now(),
      };
      saveDuelResultSnapshot(resultSnapshot);
      console.log('[useDuelResults] ✅ Snapshot saved for future use');

      return resultData;
    },
    enabled: !!duelId && !!profileId,
    staleTime: 30 * 1000, // 30 секунд - результаты дуэли редко меняются
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // ✅ ИСПРАВЛЕНИЕ: Улучшенная логика retry с максимальным лимитом
    // 🆕 CRITICAL FIX: Ограничиваем количество попыток, чтобы не зацикливаться бесконечно
    retry: (failureCount, error: any) => {
      // Если это race condition (дуэль еще не готова), делаем ограниченное количество попыток
      if (error?.message === 'DUEL_NOT_READY') {
        // Максимум 5 попыток с экспоненциальной задержкой (всего ~30 секунд)
        // Это достаточно для обработки Edge Function, но не зацикливается бесконечно
        return failureCount < 5;
      }
      // Если Edge Function не поддерживает get_results, пробуем только 1 раз прямой запрос
      if (error?.message === 'EDGE_FUNCTION_ERROR' || error?.message === 'EDGE_FUNCTION_NO_DATA') {
        return failureCount < 1; // Пробуем прямой запрос только 1 раз
      }
      // Для других ошибок - только 1 попытка
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // 🆕 CRITICAL FIX: Экспоненциальная задержка с ограничением
      // 1000ms, 2000ms, 4000ms, 8000ms, 10000ms (максимум)
      // Всего ~25 секунд на 5 попыток
      return Math.min(1000 * Math.pow(2, attemptIndex), 10000);
    },
  });
}

