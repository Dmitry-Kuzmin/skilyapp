import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useUserContext } from '@/contexts/UserContext';
import type { DuelRealtimeState } from '@/features/duel/shared';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useExploitsManager } from '@/hooks/useExploitsManager';

// Re-export для обратной совместимости
export type { ActiveExploit, DuelRealtimeState } from '@/features/duel/shared';

// ОПТИМИЗАЦИЯ: Условное логирование только в development
const isDev = import.meta.env.DEV;
const log = (...args: any[]) => {
  if (isDev) console.log(...args);
};
const logError = (...args: any[]) => { if (import.meta.env.DEV) console.error(...args); };
const logWarn = (...args: any[]) => { if (import.meta.env.DEV) console.warn(...args); };

// Helper to validate UUID
const isValidUUID = (id: any): id is string => {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// 🆕 Helper для debug fetch (только в dev режиме)
// УДАЛЕНО: debug fetch вызовы убраны для стабильности - они вызывали ERR_CONNECTION_REFUSED
const debugFetch = (data: any) => {
  // Отключено для стабильности
};

export function useDuelRealtime(duelId: string | null, myPlayerId?: string | null) {
  const { profileId } = useUserContext();
  const { enabled: realtimeEnabled } = useFeatureFlag('duel_realtime', true);

  // ОПТИМИЗАЦИЯ: Логируем только при изменении ключевых параметров (не при каждом рендере)
  const prevParamsRef = useRef<{ duelId: string | null; myPlayerId?: string | null }>({ duelId, myPlayerId });
  useEffect(() => {
    if (prevParamsRef.current.duelId !== duelId || prevParamsRef.current.myPlayerId !== myPlayerId) {
      log('[useDuelRealtime] 🏁 Hook params changed:', {
        duelId,
        myPlayerId,
        profileId,
        isTelegram: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
        platform: typeof window !== 'undefined' ? window.Telegram?.WebApp?.platform : 'unknown',
      });
      prevParamsRef.current = { duelId, myPlayerId };
    }
  }, [duelId, myPlayerId, profileId]);

  const [state, setState] = useState<DuelRealtimeState>({
    opponentJoined: false,
    opponentScore: 0,
    opponentAnswered: false,
    opponentAnswerData: null,
    duelStarted: false,
    duelFinished: false,
    currentQuestion: 0,
    opponentCorrectCount: 0,
    myScore: 0,
    opponentActivityStatus: 'online',
    opponentLastSeen: null,
    activeExploits: [],
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const myPlayerIdRef = useRef<string | null | undefined>(myPlayerId);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastEventAt, setLastEventAt] = useState(() => Date.now());
  const markEvent = () => setLastEventAt(Date.now());

  // Update ref when myPlayerId changes and reload scores
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;

    // Reload scores when myPlayerId becomes available
    if (myPlayerId && duelId) {
      log('[useDuelRealtime] MyPlayerId set, reloading scores:', myPlayerId);
      supabase
        .from('duel_players')
        .select('id, score, correct_count')
        .eq('duel_id', duelId)
        .then(({ data, error }) => {
          if (error) {
            logError('[useDuelRealtime] Error reloading scores after myPlayerId set:', error);
            return;
          }

          if (data && data.length >= 2) {
            const myPlayer = data.find((p: any) => p.id === myPlayerId);
            const opponent = data.find((p: any) => p.id !== myPlayerId);

            if (myPlayer) {
              // Используем только если score не null/undefined, иначе сохраняем текущее значение
              const newScore = typeof myPlayer.score === 'number' ? myPlayer.score : undefined;
              if (newScore !== undefined) {
                log('[useDuelRealtime] ✅ Reloaded myScore:', newScore);
                setState(prev => ({ ...prev, myScore: newScore }));
              }
            }

            if (opponent) {
              const newScore = typeof opponent.score === 'number' ? opponent.score : undefined;
              const newCorrectCount = typeof opponent.correct_count === 'number' ? opponent.correct_count : undefined;
              if (newScore !== undefined || newCorrectCount !== undefined) {
                log('[useDuelRealtime] ✅ Reloaded opponentScore:', newScore);
                setState(prev => ({
                  ...prev,
                  opponentScore: newScore !== undefined ? newScore : prev.opponentScore,
                  opponentCorrectCount: newCorrectCount !== undefined ? newCorrectCount : prev.opponentCorrectCount
                }));
              }
            }
          }
        });
    }
  }, [myPlayerId, duelId]);

  // ─── Exploit management (delegated to useExploitsManager) ─────────────────
  const exploitsManager = useExploitsManager({
    duelId,
    profileId,
    myPlayerId,
    myPlayerIdRef,
    channel,
  });

  useEffect(() => {
    if (!duelId) return;

    // 🚦 FEATURE FLAG: Проверка включения real-time для дуэлей
    if (!realtimeEnabled) {
      log('[useDuelRealtime] ⚠️ Real-time disabled by feature flag');
      setConnectionStatus('error');
      return;
    }

    log('[useDuelRealtime] Initializing channel for duel:', duelId);
    debugFetch({ location: 'useDuelRealtime.ts:98', message: 'Initializing realtime channel', data: { duelId, myPlayerId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' });

    // КРИТИЧНО: Логируем создание канала
    log('[useDuelRealtime] 🚀 Initializing Realtime channel:', {
      duelId,
      channelName: `duel_${duelId}`,
      myPlayerId,
      profileId,
      timestamp: new Date().toISOString()
    });
    // 🛡️ SECURITY: Only subscribe if duelId is a valid UUID
    if (!isValidUUID(duelId)) {
      logWarn('[useDuelRealtime] ⚠️ Subscription skipped: duelId is not a valid UUID', { duelId });
      return;
    }

    const duelChannel = supabase.channel(`duel_${duelId}`);

    // КРИТИЧНО: Логируем создание канала
    log('[useDuelRealtime] 📡 Channel created:', {
      channelName: duelChannel.topic,
      duelId
    });

    // Subscribe to duel changes
    duelChannel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duels',
          filter: `id=eq.${duelId}`,
        },
        (payload) => {
          markEvent();
          const duel = payload.new;
          debugFetch({ location: 'useDuelRealtime.ts:118', message: 'Duel status update received', data: { duelId, status: duel.status, previousDuelStarted: state.duelStarted }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' });

          if (duel.status === 'active') {
            log('[useDuelRealtime] ✅ Duel started!');
            setState(prev => prev.duelStarted ? prev : { ...prev, duelStarted: true });
          } else if (duel.status === 'finished') {
            log('[useDuelRealtime] ✅✅✅ Duel finished!');
            setState(prev => prev.duelFinished ? prev : { ...prev, duelFinished: true });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_players',
          filter: `duel_id=eq.${duelId}`,
        },
        () => {
          markEvent();
          log('[useDuelRealtime] Opponent joined!');
          setState(prev => prev.opponentJoined ? prev : { ...prev, opponentJoined: true });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duel_players',
          filter: `duel_id=eq.${duelId}`,
        },
        async (payload) => {
          markEvent();
          const updatedPlayer = payload.new as any;
          const currentMyPlayerId = myPlayerIdRef.current;

          // Логируем обновление для отладки (особенно для ботов)
          const isBot = updatedPlayer.is_bot === true;
          log(`[useDuelRealtime] 📊 Player update received:`, {
            playerId: updatedPlayer.id,
            isBot,
            bot_name: updatedPlayer.bot_name,
            myPlayerId: currentMyPlayerId,
            isMyPlayer: updatedPlayer.id === currentMyPlayerId,
            score: updatedPlayer.score,
            correct_count: updatedPlayer.correct_count,
            currentOpponentScore: state.opponentScore
          });

          debugFetch({ location: 'useDuelRealtime.ts:149', message: 'Player score update received', data: { updatedPlayerId: updatedPlayer.id, isBot, myPlayerId: currentMyPlayerId, updatedScore: updatedPlayer.score, isMyPlayer: updatedPlayer.id === currentMyPlayerId, currentMyScore: state.myScore, currentOpponentScore: state.opponentScore }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' });

          // ОПТИМИЗАЦИЯ: Батчим обновления состояния для предотвращения лишних ре-рендеров
          const isMe = currentMyPlayerId
            ? updatedPlayer.id === currentMyPlayerId
            : (updatedPlayer.user_id === profileId && !updatedPlayer.is_bot);

          if (isMe) {
            // Это обновление моего счета
            if (typeof updatedPlayer.score === 'number') {
              debugFetch({ location: 'useDuelRealtime.ts:156', message: 'Updating my score', data: { newScore: updatedPlayer.score, oldScore: state.myScore }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' });
              setState(prev => prev.myScore === updatedPlayer.score ? prev : {
                ...prev,
                myScore: updatedPlayer.score
              });
            }
          } else {
            // Это обновление счета соперника (может быть бот) - батчим все обновления в одно
            const newOpponentScore = typeof updatedPlayer.score === 'number' ? updatedPlayer.score : undefined;
            const newCorrectCount = typeof updatedPlayer.correct_count === 'number' ? updatedPlayer.correct_count : undefined;
            const newActivityStatus = updatedPlayer.activity_status;
            const newLastSeen = updatedPlayer.last_heartbeat_at ? new Date(updatedPlayer.last_heartbeat_at) : undefined;

            log(`[useDuelRealtime] 🤖 Opponent/Bot state update:`, {
              isBot,
              newOpponentScore,
              oldOpponentScore: state.opponentScore,
              newCorrectCount,
              oldCorrectCount: state.opponentCorrectCount
            });

            setState(prev => {
              // Проверяем, нужно ли обновление
              const needsUpdate =
                (newOpponentScore !== undefined && prev.opponentScore !== newOpponentScore) ||
                (newCorrectCount !== undefined && prev.opponentCorrectCount !== newCorrectCount) ||
                (newActivityStatus && prev.opponentActivityStatus !== newActivityStatus) ||
                (newLastSeen && (!prev.opponentLastSeen || prev.opponentLastSeen.getTime() !== newLastSeen.getTime()));

              if (!needsUpdate) return prev;

              return {
                ...prev,
                opponentScore: newOpponentScore !== undefined ? newOpponentScore : prev.opponentScore,
                opponentCorrectCount: newCorrectCount !== undefined ? newCorrectCount : prev.opponentCorrectCount,
                opponentActivityStatus: newActivityStatus || prev.opponentActivityStatus,
                opponentLastSeen: newLastSeen || prev.opponentLastSeen
              };
            });
          }
        }
      )
      // 🔔 КРИТИЧНО: Слушаем уведомления (для прогресса бота)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_notifications',
          filter: `duel_id=eq.${duelId}`,
        },
        (payload) => {
          markEvent();
          const notification = payload.new as any;

          log('[useDuelRealtime] 🔔 Notification received:', notification);

          // Notifications only flip the "opponentAnswered" flash flag here.
          // The authoritative source for toast generation is the duel_answers
          // INSERT handler below — having both write opponentAnswerData caused
          // duplicate toasts (different id per channel defeated dedup).
          if (notification.type === 'answer' || notification.type === 'progress') {
            log('[useDuelRealtime] 🤖 Bot/Opponent progress notification:', notification.metadata);
            setState(prev => ({ ...prev, opponentAnswered: true }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_answers',
          filter: `duel_id=eq.${duelId}`,
        },
        (payload) => {
          markEvent();

          // Only fire for opponent answers, never our own
          const newRow = payload.new as any;
          const answerPlayerId = newRow?.player_id;
          const currentMyPlayerId = myPlayerIdRef.current;
          if (!answerPlayerId || !currentMyPlayerId || answerPlayerId === currentMyPlayerId) return;

          // Sole source of truth for opponent answer toasts. The row's id is
          // stable per-answer so downstream dedup works correctly.
          setState(prev => ({
            ...prev,
            opponentAnswered: true,
            opponentAnswerData: newRow,
          }));

          // Reset the flash flag only — leave opponentAnswerData in place until
          // the next answer overwrites it, so late consumers can still read it.
          setTimeout(() => {
            setState(prev => ({ ...prev, opponentAnswered: false }));
          }, 1000);
        }
      )
      // 🆕 Подписка на новые exploits через postgres_changes
      // ВАЖНО: Убираем фильтр по target_player_id из SQL, фильтруем в JS
      // Это гарантирует, что мы получим все события, даже если myPlayerId еще не установлен
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_active_exploits',
          filter: `duel_id=eq.${duelId}`,
        },
        async (payload) => {
          // КРИТИЧНО: Логируем ВСЕ события, даже если они не для нас (ВСЕГДА, не только в dev)
          const newExploit = payload.new as any;
          let currentMyPlayerId = myPlayerIdRef.current; // let, т.к. может быть изменен ниже
          const isForMe = currentMyPlayerId && newExploit?.target_player_id === currentMyPlayerId;

          log('[useDuelRealtime] 🔔🔔🔔🔔🔔 POSTGRES_CHANGES EVENT RECEIVED FOR duel_active_exploits 🔔🔔🔔🔔🔔:', {
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old,
            duelId,
            myPlayerId: currentMyPlayerId,
            profileId,
            timestamp: new Date().toISOString(),
            exploitType: newExploit?.exploit_type,
            targetPlayerId: newExploit?.target_player_id,
            attackerPlayerId: newExploit?.attacker_player_id,
            isForMe,
            isActive: newExploit?.is_active,
            expiresAt: newExploit?.expires_at,
            activatedAt: newExploit?.activated_at,
            currentTime: new Date().toISOString(),
            isExpired: newExploit?.expires_at ? new Date(newExploit.expires_at) < new Date() : null
          });

          markEvent();

          // КРИТИЧНО: Если myPlayerId еще не установлен, пытаемся получить его из БД
          if (!currentMyPlayerId && profileId && duelId) {
            log('[useDuelRealtime] ⚠️ myPlayerId not set, fetching from DB...');
            try {
              const { data: playerData } = await supabase
                .from('duel_players')
                .select('id')
                .eq('duel_id', duelId)
                .eq('user_id', profileId)
                .maybeSingle();

              if (playerData?.id) {
                currentMyPlayerId = playerData.id;
                myPlayerIdRef.current = playerData.id;
                log('[useDuelRealtime] ✅ myPlayerId loaded from DB:', currentMyPlayerId);

                // После загрузки myPlayerId вызываем восстановление атак
                // Это нужно для случаев, когда атака пришла до установки myPlayerId
                if (newExploit.target_player_id === currentMyPlayerId && newExploit.is_active) {
                  log('[useDuelRealtime] 🔄 Triggering exploit recovery after myPlayerId load');
                  setTimeout(() => {
                    exploitsManager.recoverActiveExploits();
                  }, 100);
                }
              }
            } catch (error) {
              logError('[useDuelRealtime] Error loading myPlayerId:', error);
            }
          }

          // Детальное логирование для отладки (всегда логируем, не только в dev)
          log('[useDuelRealtime] 📦 Exploit INSERT received:', {
            exploit_type: newExploit.exploit_type,
            target_player_id: newExploit.target_player_id,
            myPlayerId: currentMyPlayerId,
            is_active: newExploit.is_active,
            duel_id: newExploit.duel_id,
            matches: currentMyPlayerId === newExploit.target_player_id,
            profileId: profileId,
            activated_at: newExploit.activated_at,
            expires_at: newExploit.expires_at,
            effect_data: newExploit.effect_data
          });
          log('[useDuelRealtime] 📦 Exploit INSERT received:', {
            exploit_type: newExploit.exploit_type,
            target_player_id: newExploit.target_player_id,
            myPlayerId: currentMyPlayerId,
            is_active: newExploit.is_active,
            duel_id: newExploit.duel_id,
            matches: currentMyPlayerId === newExploit.target_player_id,
            profileId: profileId
          });

          // КРИТИЧНО: Упрощенная логика для дуэли 1 на 1
          // В дуэли 1 на 1 нам не нужно сверять target_player_id
          // Если атаку создал НЕ Я (attacker_player_id !== myPlayerId), значит она В МЕНЯ
          // Это решает проблему с несовпадением ID без необходимости сложных проверок

          let isForCurrentPlayer = false;

          // КРИТИЧНО: Логируем ВСЕ параметры перед проверкой
          log('[useDuelRealtime] 🔍🔍🔍 BEFORE CHECK - All parameters:', {
            attacker_player_id: newExploit.attacker_player_id,
            target_player_id: newExploit.target_player_id,
            currentMyPlayerId: currentMyPlayerId,
            myPlayerIdRef: myPlayerIdRef.current,
            profileId: profileId,
            duelId: duelId,
            is_active: newExploit.is_active,
            exploit_type: newExploit.exploit_type,
            willMatch: currentMyPlayerId && newExploit.attacker_player_id !== currentMyPlayerId
          });

          // УПРОЩЕННАЯ ЛОГИКА: Если атаку создал НЕ Я, значит она для меня (в дуэли 1 на 1)
          if (currentMyPlayerId && newExploit.attacker_player_id && newExploit.attacker_player_id !== currentMyPlayerId) {
            isForCurrentPlayer = true;
          } else if (!currentMyPlayerId && profileId && duelId) {
            // Fallback: если myPlayerId еще не установлен, загружаем его из БД
            logWarn('[useDuelRealtime] ⚠️ myPlayerId not set, loading from DB...', {
              profileId,
              duelId,
              attacker_player_id: newExploit.attacker_player_id
            });

            try {
              const { data: playerData } = await supabase
                .from('duel_players')
                .select('id, user_id')
                .eq('duel_id', duelId)
                .eq('user_id', profileId)
                .maybeSingle();

              if (playerData?.id) {
                const loadedMyPlayerId = playerData.id;
                myPlayerIdRef.current = loadedMyPlayerId;
                log('[useDuelRealtime] ✅✅✅ Loaded myPlayerId from DB:', {
                  loadedMyPlayerId,
                  attacker_player_id: newExploit.attacker_player_id,
                  matches: loadedMyPlayerId !== newExploit.attacker_player_id
                });

                // Проверяем еще раз после загрузки myPlayerId
                if (loadedMyPlayerId !== newExploit.attacker_player_id) {
                  isForCurrentPlayer = true;
                  log('[useDuelRealtime] ✅✅✅✅ Exploit is from opponent after loading myPlayerId!');
                }
              }
            } catch (loadError) {
              logError('[useDuelRealtime] ❌ Error loading myPlayerId:', loadError);
            }
          }

          // КРИТИЧНО: Логируем результат проверки ПЕРЕД обработкой
          log('[useDuelRealtime] 🔍🔍🔍 AFTER CHECK - Final decision:', {
            isForCurrentPlayer,
            is_active: newExploit.is_active,
            willProcess: isForCurrentPlayer && newExploit.is_active,
            attacker_player_id: newExploit.attacker_player_id,
            currentMyPlayerId: currentMyPlayerId,
            myPlayerIdRef: myPlayerIdRef.current,
            profileId: profileId,
            exploit_type: newExploit.exploit_type,
            logic: '1v1: if attacker != me, then exploit is for me'
          });

          if (isForCurrentPlayer && newExploit.is_active) {
            // КРИТИЧНО: Всегда логируем в консоль для отладки в Telegram
            log('[useDuelRealtime] 🎯🎯🎯 АТАКА ПОЛУЧЕНА! Processing exploit:', newExploit.exploit_type, {
              exploit_type: newExploit.exploit_type,
              target_player_id: newExploit.target_player_id,
              myPlayerId: currentMyPlayerId,
              expires_at: newExploit.expires_at,
              activated_at: newExploit.activated_at,
              isForCurrentPlayer: true,
              is_active: true
            });

            // КРИТИЧНО: Проверяем, не был ли этот exploit уже resolved
            if (newExploit.id && exploitsManager.resolvedExploitIdsRef.current.has(newExploit.id)) {
              log('[useDuelRealtime] ⚠️ Ignoring already resolved exploit from realtime:', newExploit.id);
              return;
            }

            log('[useDuelRealtime] 🎯 АТАКА ПОЛУЧЕНА! Exploit type:', newExploit.exploit_type);

            // Добавляем в состояние
            setState(prev => {
              // КРИТИЧНО: Логируем предыдущее состояние перед обновлением
              log('[useDuelRealtime] 📊 BEFORE setState - Previous state:', {
                prevActiveExploitsCount: prev.activeExploits?.length || 0,
                prevActiveExploitsTypes: prev.activeExploits?.map(e => e.type) || [],
                newExploitType: newExploit.exploit_type
              });
              const exploit: ActiveExploit = {
                id: newExploit.id, // КРИТИЧНО: Сохраняем ID для resolve_exploit
                type: newExploit.exploit_type,
                data: newExploit.effect_data || {},
                receivedAt: Date.now(), // Используем локальное время для receivedAt
                expiresAt: new Date(newExploit.expires_at).getTime(),
              };

              // Проверяем на дубликаты - улучшенная логика
              // КРИТИЧНО: Расширяем окно дедупликации
              const exists = (prev.activeExploits || []).some(
                e => e.id === exploit.id || (
                  e.type === exploit.type &&
                  Math.abs(e.receivedAt - exploit.receivedAt) < 10000 && // 10 секунд
                  Math.abs(e.expiresAt - exploit.expiresAt) < 5000 // 5 секунд
                )
              );

              if (exists) {
                logWarn('[useDuelRealtime] ⚠️ Duplicate exploit ignored:', {
                  id: exploit.id,
                  type: exploit.type
                });
                log('[useDuelRealtime] ⚠️ Duplicate exploit ignored:', newExploit.exploit_type);
                return prev;
              }

              log('[useDuelRealtime] 🚀🚀🚀 Adding NEW exploit to state:', exploit);
              const newState = {
                ...prev,
                activeExploits: [...(prev.activeExploits || []), exploit]
              };

              log('[useDuelRealtime] ✅ New exploit added to state:', newExploit.exploit_type, {
                type: exploit.type,
                expiresAt: new Date(exploit.expiresAt).toISOString(),
                receivedAt: new Date(exploit.receivedAt).toISOString(),
                totalExploits: newState.activeExploits.length,
                allExploitTypes: newState.activeExploits.map(e => e.type)
              });

              // КРИТИЧНО: Логируем полное состояние после обновления
              log('[useDuelRealtime] 📊📊📊 State after exploit addition:', {
                activeExploitsCount: newState.activeExploits.length,
                activeExploits: newState.activeExploits.map(e => ({
                  type: e.type,
                  expiresAt: new Date(e.expiresAt).toISOString(),
                  receivedAt: new Date(e.receivedAt).toISOString()
                })),
                newExploitType: newExploit.exploit_type,
                stateReference: 'NEW_OBJECT' // Гарантируем новую ссылку
              });

              log('[useDuelRealtime] ✅ New exploit added to state:', newExploit.exploit_type);

              // КРИТИЧНО: Возвращаем НОВЫЙ объект состояния (гарантируем новую ссылку)
              return newState;
            });

            // КРИТИЧНО: Логируем после setState (хотя это не гарантирует, что состояние обновилось)
            log('[useDuelRealtime] ✅✅✅ setState called for exploit:', newExploit.exploit_type);
          } else {
            const reason = !isForCurrentPlayer ? 'not for us (ID mismatch)' :
              !newExploit.is_active ? 'not active' : 'unknown';
            log('[useDuelRealtime] ⏭️ Exploit ignored:', {
              exploit_type: newExploit.exploit_type,
              target_player_id: newExploit.target_player_id,
              myPlayerId: currentMyPlayerId,
              profileId: profileId,
              is_active: newExploit.is_active,
              reason,
              note: 'Check if target_player_id matches your user_id in duel_players table'
            });
            log('[useDuelRealtime] ⏭️ Exploit ignored:', {
              exploit_type: newExploit.exploit_type,
              target_player_id: newExploit.target_player_id,
              myPlayerId: currentMyPlayerId,
              is_active: newExploit.is_active,
              reason
            });
          }
        }
      );

    // КРИТИЧНО: Логируем регистрацию всех подписок ПЕРЕД subscribe
    log('[useDuelRealtime] 📋 All postgres_changes subscriptions registered:', {
      subscriptions: [
        { table: 'duels', event: 'UPDATE' },
        { table: 'duel_players', event: 'INSERT' },
        { table: 'duel_players', event: 'UPDATE' },
        { table: 'duel_answers', event: '*' },
        { table: 'duel_active_exploits', event: 'INSERT', filter: `duel_id=eq.${duelId}` }
      ],
      duelId,
      channelTopic: duelChannel.topic,
      channelState: duelChannel.state,
      isJoined: duelChannel.joinedOnce
    });

    duelChannel.subscribe((status) => {
      // КРИТИЧНО: Логируем статус подписки для отладки (ВСЕГДА, не только в dev)
      const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
      log('[useDuelRealtime] 📡 Channel subscription status:', {
        status,
        duelId,
        channelName: `duel_${duelId}`,
        timestamp: new Date().toISOString(),
        myPlayerId,
        profileId,
        isTelegram,
        platform: isTelegram ? window.Telegram.WebApp.platform : 'browser',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });

      // КРИТИЧНО: Логируем ВСЕ статусы для отладки
      if (status === 'SUBSCRIBED') {
        log('[useDuelRealtime] ✅✅✅ SUCCESSFULLY SUBSCRIBED TO REALTIME CHANNEL! ✅✅✅');
        log('[useDuelRealtime] 📡 Listening for postgres_changes events on:', {
          tables: ['duel_players', 'duel_answers', 'duel_active_exploits'],
          duelId,
          isTelegram,
          platform: isTelegram ? window.Telegram.WebApp.platform : 'browser'
        });
        setConnectionStatus('connected');

        // Проверяем активные exploits сразу после подписки
        if (myPlayerId && profileId) {
          exploitsManager.recoverActiveExploits();
        }

        // КРИТИЧНО: В Telegram Mini App добавляем polling fallback для exploits
        // Это нужно, потому что Realtime может не работать стабильно в TMA
        // Polling будет настроен в отдельном useEffect ниже

        // Check current duel status immediately after subscription
        const checkStatus = async () => {
          const { data, error } = await supabase
            .from('duels')
            .select('status')
            .eq('id', duelId)
            .maybeSingle();

          if (error) {
            logError('[useDuelRealtime] ❌ Error checking duel status:', error);
          } else if (data) {
            if (data.status === 'active') {
              setState(prev => prev.duelStarted ? prev : { ...prev, duelStarted: true });
            } else if (data.status === 'finished') {
              setState(prev => prev.duelFinished ? prev : { ...prev, duelFinished: true });
            }
          }
        };

        checkStatus();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logError('[useDuelRealtime] ❌❌❌ CHANNEL ERROR/TIMED OUT - Realtime subscription failed! ❌❌❌');
        setConnectionStatus('error');
      } else if (status === 'CLOSED') {
        log('[useDuelRealtime] 📡 Channel closed, reconnecting...');
        setConnectionStatus('connecting');
      } else {
        log('[useDuelRealtime] 📡 Channel status:', status);
      }
    });

    setChannel(duelChannel);

    return () => {
      log('[useDuelRealtime] Cleaning up channel');
      supabase.removeChannel(duelChannel);
    };
  }, [duelId, profileId]);

  // Recover exploits when connection is established
  useEffect(() => {
    if (connectionStatus === 'connected' && myPlayerId && profileId && isValidUUID(duelId)) {
      exploitsManager.recoverActiveExploits();
    }
  }, [connectionStatus, myPlayerId, profileId, duelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── [exploit broadcast, polling, expiry handled by useExploitsManager] ──


  // Broadcast function — memoized for stability
  const broadcast = useCallback((event: string, data: any) => {
    if (channel) {
      channel.send({ type: 'broadcast', event, payload: data });
    }
  }, [channel]);

  // Merge exploit state into the realtime state shape consumers expect
  const stateWithExploits: DuelRealtimeState = {
    ...state,
    activeExploits: exploitsManager.activeExploits,
  };

  return {
    state: stateWithExploits,
    broadcast,
    connectionStatus,
    lastEventAt,
    refreshExploits: exploitsManager.refreshExploits,
    removeExploit: exploitsManager.removeExploit,
  };
}
