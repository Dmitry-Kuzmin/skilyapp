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
 */
export function useDuelResults(duelId: string | null, profileId: string | null) {
  return useQuery<DuelResultData | null>({
    queryKey: ["duel-results", duelId, profileId],
    queryFn: async () => {
      if (!duelId || !profileId) return null;

      // 🆕 FIX: Проверяем snapshot ПЕРЕД запросом к БД (fallback для race condition)
      const snapshot = loadDuelResultSnapshot(duelId);
      if (snapshot) {
        console.log('[useDuelResults] ✅ Using snapshot data (race condition fix)');
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

      // 🆕 CRITICAL FIX: Fallback на activeDuel если snapshot не найден (Delayed Cleanup strategy)
      // activeDuel должен содержать данные, так как мы не очищаем его при завершении дуэли
      try {
        const savedActiveDuel = localStorage.getItem(ACTIVE_DUEL_STORAGE_KEY);
        if (savedActiveDuel) {
          const activeDuel: ActiveDuelState = JSON.parse(savedActiveDuel);
          if (activeDuel.duelId === duelId) {
            console.log('[useDuelResults] ⚠️ Snapshot not found, but activeDuel exists - will try to load from DB with retry');
            // Не возвращаем данные из activeDuel напрямую, так как там нет полных данных
            // Но это означает что данные должны быть в БД, просто нужно подождать
          }
        }
      } catch (error) {
        // Игнорируем ошибки парсинга activeDuel
      }

      // ОПТИМИЗАЦИЯ: Объединяем все запросы в Promise.all для параллельной загрузки
      // ИСПРАВЛЕНИЕ: Используем maybeSingle() вместо single() для обработки race condition
      // Если данные еще не готовы (Edge Function еще обрабатывает), вернется null
      const [duelResult, playersResult] = await Promise.all([
        // Загружаем данные дуэли
        supabase
          .from("duels")
          .select("*")
          .eq("id", duelId)
          .maybeSingle(), // ✅ Исправлено: maybeSingle() не вызовет ошибку если данных нет

        // Загружаем игроков с профилями (batch запрос)
        supabase
          .from("duel_players")
          .select("*, profiles(id, username, first_name, photo_url)")
          .eq("duel_id", duelId),
      ]);

      // Если дуэль еще не готова (race condition), выбрасываем специальную ошибку для retry
      if (duelResult.error) {
        // PGRST116 = no rows returned - это нормально, если Edge Function еще обрабатывает
        if (duelResult.error.code === 'PGRST116') {
          console.warn("[useDuelResults] Duel not ready yet (race condition), will retry...");
          throw new Error('DUEL_NOT_READY'); // Специальная ошибка для retry
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
        
        // 🆕 CRITICAL FIX: Проверяем snapshot еще раз (может быть создан асинхронно)
        const snapshotRetry = loadDuelResultSnapshot(duelId);
        if (snapshotRetry) {
          console.log('[useDuelResults] ✅ Found snapshot on retry!');
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
        
        throw new Error('DUEL_NOT_READY'); // Специальная ошибка для retry
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
    // ✅ ИСПРАВЛЕНИЕ: Увеличиваем retry и добавляем задержку для race condition
    // 🆕 CRITICAL FIX: Увеличено количество попыток и задержка для мобильных устройств
    retry: (failureCount, error: any) => {
      // Если это race condition (дуэль еще не готова), делаем больше попыток
      if (error?.message === 'DUEL_NOT_READY') {
        return failureCount < 10; // Увеличено с 5 до 10 попыток для мобильных устройств
      }
      // Для других ошибок - только 1 попытка
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // 🆕 CRITICAL FIX: Увеличена задержка для мобильных устройств
      // Экспоненциальная задержка: 1000ms, 2000ms, 4000ms, 8000ms, 10000ms, ...
      // Максимальная задержка увеличена до 10 секунд
      return Math.min(1000 * Math.pow(2, attemptIndex), 10000);
    },
  });
}

