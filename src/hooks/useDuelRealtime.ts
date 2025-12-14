import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useUserContext } from '@/contexts/UserContext';

// ОПТИМИЗАЦИЯ: Условное логирование только в development
const isDev = import.meta.env.DEV;
const log = (...args: any[]) => {
  if (isDev) console.log(...args);
};
const logError = (...args: any[]) => {
  if (isDev) console.error(...args);
};
const logWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};

// 🆕 Helper для debug fetch (только в dev режиме)
// УДАЛЕНО: debug fetch вызовы убраны для стабильности - они вызывали ERR_CONNECTION_REFUSED
const debugFetch = (data: any) => {
  // Отключено для стабильности
};

// 🆕 Интерфейс для активных exploits
export interface ActiveExploit {
  type: string;
  data: {
    duration_ms?: number;
    popup_count?: number;
    delay_ms?: number;
    shuffle_duration_ms?: number;
    [key: string]: any;
  };
  receivedAt: number;
  expiresAt: number;
}

export interface DuelRealtimeState {
  opponentJoined: boolean;
  opponentScore: number;
  opponentAnswered: boolean;
  opponentAnswerData: any | null;
  duelStarted: boolean;
  duelFinished: boolean;
  currentQuestion: number;
  opponentCorrectCount: number;
  myScore: number;
  opponentActivityStatus: 'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline';
  opponentLastSeen: Date | null;
  // 🆕 Активные exploits (для State Recovery)
  activeExploits?: ActiveExploit[];
}

export function useDuelRealtime(duelId: string | null, myPlayerId?: string | null) {
  const { profileId } = useUserContext();
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

  // 🆕 Функция восстановления состояния атак (State Recovery)
  // КРИТИЧНО: Объявлена ДО использования в useEffect
  const recoverActiveExploits = useCallback(async () => {
    // КРИТИЧНО: Логируем ВСЕГДА, даже если параметры отсутствуют
    console.log('[useDuelRealtime] 🔄 recoverActiveExploits CALLED:', {
      duelId,
      myPlayerId,
      profileId,
      hasAllParams: !!(duelId && myPlayerId && profileId),
      timestamp: new Date().toISOString()
    });
    
    if (!duelId || !myPlayerId || !profileId) {
      console.warn('[useDuelRealtime] ⚠️ Cannot recover exploits: missing parameters', {
        duelId: !!duelId,
        myPlayerId: !!myPlayerId,
        profileId: !!profileId
      });
      log('[useDuelRealtime] Cannot recover exploits: missing duelId, myPlayerId or profileId');
      return;
    }

    try {
      console.log('[useDuelRealtime] 🔄 Starting exploit recovery...', {
        duelId,
        myPlayerId,
        profileId,
        targetPlayerId: myPlayerId
      });
      log('[useDuelRealtime] 🔄 Starting exploit recovery...');

      // myPlayerId - это уже ID из duel_players, используем его напрямую
      const targetPlayerId = myPlayerId;

      // Запрашиваем активные атаки, срок которых еще не истек
      const { data: exploits, error: exploitsError } = await supabase
        .from('duel_active_exploits')
        .select('*')
        .eq('duel_id', duelId)
        .eq('target_player_id', targetPlayerId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('activated_at', { ascending: false });

      if (exploitsError) {
        logError('[useDuelRealtime] Error recovering exploits:', exploitsError);
        return;
      }

      console.log('[useDuelRealtime] 📊 Exploit recovery query result:', {
        exploitsCount: exploits?.length || 0,
        exploits: exploits?.map(e => ({
          type: e.exploit_type,
          target_player_id: e.target_player_id,
          is_active: e.is_active,
          expires_at: e.expires_at,
          activated_at: e.activated_at
        })) || []
      });
      
      if (exploits && exploits.length > 0) {
        console.log('[useDuelRealtime] ✅✅✅ Recovered active exploits:', exploits.length, exploits);
        log('[useDuelRealtime] 🔄 Recovered active exploits:', exploits.length);
        
        // Обновляем стейт (добавляем восстановленные атаки)
        setState(prev => {
          // Избегаем дубликатов - проверяем по типу и времени активации
          const existingTypes = new Set((prev.activeExploits || []).map(e => `${e.type}-${e.receivedAt}`));
          
          const newExploits = exploits
            .map(e => ({
              type: e.exploit_type,
              data: e.effect_data || {},
              receivedAt: new Date(e.activated_at).getTime(),
              expiresAt: new Date(e.expires_at).getTime()
            }))
            .filter(e => !existingTypes.has(`${e.type}-${e.receivedAt}`));

          console.log('[useDuelRealtime] 📦 Adding new exploits to state:', {
            newExploitsCount: newExploits.length,
            newExploits,
            existingCount: (prev.activeExploits || []).length
          });

          if (newExploits.length === 0) {
            console.log('[useDuelRealtime] ⚠️ No new exploits to add (all duplicates)');
            return prev; // Нет новых exploits
          }

          const updatedState = {
            ...prev,
            activeExploits: [...(prev.activeExploits || []), ...newExploits]
          };
          
          console.log('[useDuelRealtime] ✅ State updated with exploits:', {
            totalExploits: updatedState.activeExploits.length,
            exploitTypes: updatedState.activeExploits.map(e => e.type)
          });
          
          return updatedState;
        });
      } else {
        console.log('[useDuelRealtime] ℹ️ No active exploits to recover');
        log('[useDuelRealtime] No active exploits to recover');
      }
    } catch (error) {
      logError('[useDuelRealtime] Exception in recoverActiveExploits:', error);
    }
  }, [duelId, myPlayerId, profileId]);

  useEffect(() => {
    if (!duelId) return;

    // КРИТИЧНО: Логируем duelId в консоль для удобной отладки SQL запросов
    console.log('[useDuelRealtime] 🔍 DUEL_ID для SQL запросов:', duelId);
    console.log('[useDuelRealtime] 📋 SQL запрос для проверки exploits:');
    console.log(`SELECT * FROM duel_active_exploits WHERE duel_id = '${duelId}' ORDER BY activated_at DESC LIMIT 5;`);

    log('[useDuelRealtime] Initializing channel for duel:', duelId);
    debugFetch({location:'useDuelRealtime.ts:98',message:'Initializing realtime channel',data:{duelId,myPlayerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
    
    // КРИТИЧНО: Логируем создание канала
    console.log('[useDuelRealtime] 🚀 Initializing Realtime channel:', {
      duelId,
      channelName: `duel_${duelId}`,
      myPlayerId,
      profileId,
      timestamp: new Date().toISOString()
    });
    
    const duelChannel = supabase.channel(`duel_${duelId}`);
    
    // КРИТИЧНО: Логируем создание канала
    console.log('[useDuelRealtime] 📡 Channel created:', {
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
          debugFetch({location:'useDuelRealtime.ts:118',message:'Duel status update received',data:{duelId,status:duel.status,previousDuelStarted:state.duelStarted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
          
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
          
          debugFetch({location:'useDuelRealtime.ts:149',message:'Player score update received',data:{updatedPlayerId:updatedPlayer.id,isBot,myPlayerId:currentMyPlayerId,updatedScore:updatedPlayer.score,isMyPlayer:updatedPlayer.id===currentMyPlayerId,currentMyScore:state.myScore,currentOpponentScore:state.opponentScore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
          
          // ОПТИМИЗАЦИЯ: Батчим обновления состояния для предотвращения лишних ре-рендеров
          if (currentMyPlayerId) {
            if (updatedPlayer.id === currentMyPlayerId) {
              // Это обновление моего счета
              if (typeof updatedPlayer.score === 'number') {
                debugFetch({location:'useDuelRealtime.ts:156',message:'Updating my score',data:{newScore:updatedPlayer.score,oldScore:state.myScore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
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
              
              log(`[useDuelRealtime] 🤖 Bot score update:`, {
                isBot,
                newOpponentScore,
                oldOpponentScore: state.opponentScore,
                newCorrectCount,
                oldCorrectCount: state.opponentCorrectCount
              });
              
              debugFetch({location:'useDuelRealtime.ts:165',message:'Updating opponent score',data:{isBot,newOpponentScore,oldOpponentScore:state.opponentScore,newCorrectCount,oldCorrectCount:state.opponentCorrectCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
              
              setState(prev => {
                // Проверяем, нужно ли обновление
                const needsUpdate = 
                  (newOpponentScore !== undefined && prev.opponentScore !== newOpponentScore) ||
                  (newCorrectCount !== undefined && prev.opponentCorrectCount !== newCorrectCount) ||
                  (newActivityStatus && prev.opponentActivityStatus !== newActivityStatus) ||
                  (newLastSeen && (!prev.opponentLastSeen || prev.opponentLastSeen.getTime() !== newLastSeen.getTime()));
                
                if (!needsUpdate) {
                  log(`[useDuelRealtime] ⏭️ Skipping update (no changes)`);
                  return prev;
                }
                
                log(`[useDuelRealtime] ✅ Updating opponent state:`, {
                  opponentScore: newOpponentScore !== undefined ? newOpponentScore : prev.opponentScore,
                  opponentCorrectCount: newCorrectCount !== undefined ? newCorrectCount : prev.opponentCorrectCount
                });
                
                return {
                  ...prev,
                  opponentScore: newOpponentScore !== undefined ? newOpponentScore : prev.opponentScore,
                  opponentCorrectCount: newCorrectCount !== undefined ? newCorrectCount : prev.opponentCorrectCount,
                  opponentActivityStatus: newActivityStatus || prev.opponentActivityStatus,
                  opponentLastSeen: newLastSeen || prev.opponentLastSeen
                };
              });
            }
          } else {
            // myPlayerId не установлен - обновляем opponentScore как fallback
            debugFetch({location:'useDuelRealtime.ts:190',message:'myPlayerId not set - fallback update',data:{updatedScore:updatedPlayer.score,currentOpponentScore:state.opponentScore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
            if (typeof updatedPlayer.score === 'number') {
              log(`[useDuelRealtime] 🔄 Fallback: Updating opponent score:`, updatedPlayer.score);
              setState(prev => prev.opponentScore === updatedPlayer.score ? prev : ({ 
                ...prev, 
                opponentScore: updatedPlayer.score,
                opponentCorrectCount: typeof updatedPlayer.correct_count === 'number' 
                  ? updatedPlayer.correct_count 
                  : prev.opponentCorrectCount
              }));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duel_answers',
          filter: `duel_id=eq.${duelId}`,
        },
        (payload) => {
          markEvent();
          
          // Проверяем, что это ответ соперника, а не мой
          const answerPlayerId = (payload.new as any)?.player_id;
          const currentMyPlayerId = myPlayerIdRef.current;
          
          if (answerPlayerId && currentMyPlayerId && answerPlayerId !== currentMyPlayerId) {
            setState(prev => ({ ...prev, opponentAnswered: true, opponentAnswerData: payload.new }));
            
            // Reset after 1 second
            setTimeout(() => {
              setState(prev => ({ ...prev, opponentAnswered: false, opponentAnswerData: null }));
            }, 1000);
          }
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
          // КРИТИЧНО: Логируем регистрацию подписки (это должно произойти ДО subscribe)
          console.log('[useDuelRealtime] 📡📡📡 postgres_changes subscription REGISTERED for duel_active_exploits 📡📡📡');
          // КРИТИЧНО: Логируем ВСЕ события, даже если они не для нас (ВСЕГДА, не только в dev)
          console.log('[useDuelRealtime] 🔔🔔🔔 postgres_changes event received for duel_active_exploits 🔔🔔🔔:', {
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old,
            duelId,
            myPlayerId: myPlayerIdRef.current,
            profileId,
            timestamp: new Date().toISOString()
          });
          
          markEvent();
          const newExploit = payload.new as any;
          let currentMyPlayerId = myPlayerIdRef.current;
          
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
                  // Небольшая задержка для гарантии, что состояние обновилось
                  setTimeout(() => {
                    recoverActiveExploits();
                  }, 100);
                }
              }
            } catch (error) {
              logError('[useDuelRealtime] Error loading myPlayerId:', error);
            }
          }
          
          // Детальное логирование для отладки (всегда логируем, не только в dev)
          console.log('[useDuelRealtime] 📦 Exploit INSERT received:', {
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
          
          // Проверяем, что exploit направлен на нас
          if (currentMyPlayerId && newExploit.target_player_id === currentMyPlayerId && newExploit.is_active) {
            // КРИТИЧНО: Всегда логируем в консоль для отладки в Telegram
            console.log('[useDuelRealtime] 🎯 АТАКА ПОЛУЧЕНА! Exploit type:', newExploit.exploit_type, {
              exploit_type: newExploit.exploit_type,
              target_player_id: newExploit.target_player_id,
              myPlayerId: currentMyPlayerId,
              expires_at: newExploit.expires_at,
              activated_at: newExploit.activated_at
            });
            log('[useDuelRealtime] 🎯 АТАКА ПОЛУЧЕНА! Exploit type:', newExploit.exploit_type);
            
            // Добавляем в состояние
            setState(prev => {
              const exploit: ActiveExploit = {
                type: newExploit.exploit_type,
                data: newExploit.effect_data || {},
                receivedAt: new Date(newExploit.activated_at || new Date()).getTime(),
                expiresAt: new Date(newExploit.expires_at).getTime(),
              };

              // Проверяем на дубликаты
              const exists = (prev.activeExploits || []).some(
                e => e.type === exploit.type && 
                     Math.abs(e.receivedAt - exploit.receivedAt) < 1000
              );

              if (exists) {
                console.warn('[useDuelRealtime] ⚠️ Duplicate exploit ignored:', newExploit.exploit_type);
                log('[useDuelRealtime] ⚠️ Duplicate exploit ignored:', newExploit.exploit_type);
                return prev;
              }

              const newState = {
                ...prev,
                activeExploits: [...(prev.activeExploits || []), exploit]
              };
              
              console.log('[useDuelRealtime] ✅ New exploit added to state:', newExploit.exploit_type, {
                type: exploit.type,
                expiresAt: new Date(exploit.expiresAt).toISOString(),
                receivedAt: new Date(exploit.receivedAt).toISOString(),
                totalExploits: newState.activeExploits.length,
                allExploitTypes: newState.activeExploits.map(e => e.type)
              });
              
              // КРИТИЧНО: Логируем полное состояние после обновления
              console.log('[useDuelRealtime] 📊 State after exploit addition:', {
                activeExploitsCount: newState.activeExploits.length,
                activeExploits: newState.activeExploits.map(e => ({
                  type: e.type,
                  expiresAt: new Date(e.expiresAt).toISOString()
                }))
              });
              
              log('[useDuelRealtime] ✅ New exploit added to state:', newExploit.exploit_type);
              return newState;
            });
          } else {
            const reason = !currentMyPlayerId ? 'myPlayerId not set' : 
                          newExploit.target_player_id !== currentMyPlayerId ? 'not for us' :
                          !newExploit.is_active ? 'not active' : 'unknown';
            console.log('[useDuelRealtime] ⏭️ Exploit ignored:', {
              exploit_type: newExploit.exploit_type,
              target_player_id: newExploit.target_player_id,
              myPlayerId: currentMyPlayerId,
              is_active: newExploit.is_active,
              reason
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
      console.log('[useDuelRealtime] 📋 All postgres_changes subscriptions registered:', {
        subscriptions: [
          { table: 'duels', event: 'UPDATE' },
          { table: 'duel_players', event: 'INSERT' },
          { table: 'duel_players', event: 'UPDATE' },
          { table: 'duel_answers', event: '*' },
          { table: 'duel_active_exploits', event: 'INSERT' }
        ],
        duelId,
        channelTopic: duelChannel.topic
      });
      
      duelChannel.subscribe((status) => {
        // КРИТИЧНО: Логируем статус подписки для отладки (ВСЕГДА, не только в dev)
        console.log('[useDuelRealtime] 📡 Channel subscription status:', {
          status,
          duelId,
          channelName: `duel_${duelId}`,
          timestamp: new Date().toISOString(),
          myPlayerId,
          profileId
        });
        
        // КРИТИЧНО: Логируем ВСЕ статусы для отладки
        if (status === 'SUBSCRIBED') {
          console.log('[useDuelRealtime] ✅✅✅ SUCCESSFULLY SUBSCRIBED TO REALTIME CHANNEL! ✅✅✅');
          console.log('[useDuelRealtime] 📡 Listening for postgres_changes events on:', {
            tables: ['duel_players', 'duel_answers', 'duel_active_exploits'],
            duelId
          });
          setConnectionStatus('connected');
          
          // КРИТИЧНО: Проверяем активные exploits сразу после подписки
          console.log('[useDuelRealtime] 🔄 Calling recoverActiveExploits after subscription...');
          if (myPlayerId && profileId) {
            recoverActiveExploits();
          } else {
            console.warn('[useDuelRealtime] ⚠️ Cannot recover exploits: myPlayerId or profileId missing', {
              myPlayerId,
              profileId
            });
          }
          
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
          console.error('[useDuelRealtime] ❌❌❌ CHANNEL ERROR/TIMED OUT - Realtime subscription failed! ❌❌❌');
          setConnectionStatus('error');
        } else if (status === 'CLOSED') {
          console.log('[useDuelRealtime] 📡 Channel closed, reconnecting...');
          setConnectionStatus('connecting');
        } else {
          console.log('[useDuelRealtime] 📡 Channel status:', status);
        }
      });

    setChannel(duelChannel);

    return () => {
      log('[useDuelRealtime] Cleaning up channel');
      supabase.removeChannel(duelChannel);
    };
  }, [duelId, profileId, recoverActiveExploits]);

  // 🆕 Вызов восстановления при подключении
  useEffect(() => {
    if (connectionStatus === 'connected' && state.duelStarted && myPlayerId && profileId) {
      log('[useDuelRealtime] Connection established, recovering exploits...');
      recoverActiveExploits();
    }
  }, [connectionStatus, state.duelStarted, myPlayerId, profileId, recoverActiveExploits]);

  // 🆕 Обработка broadcast событий для exploits
  useEffect(() => {
    if (!duelId || !channel || !profileId) return;

    const handleBroadcast = (payload: any) => {
      if (payload.event === 'exploit_triggered') {
        markEvent();
        const { boost_type, attacker_id, target_id, effect_data } = payload.payload;
        
        // Проверяем, что атака направлена на нас
        if (target_id === profileId) {
          log('[useDuelRealtime] 🎯 Exploit received:', boost_type);
          
          // Сохраняем в состояние
          setState(prev => {
            const newExploit: ActiveExploit = {
              type: boost_type,
              data: effect_data || {},
              receivedAt: Date.now(),
              expiresAt: Date.now() + (effect_data?.duration_ms || 10000),
            };

            // Проверяем на дубликаты
            const exists = (prev.activeExploits || []).some(
              e => e.type === newExploit.type && 
                   Math.abs(e.receivedAt - newExploit.receivedAt) < 1000
            );

            if (exists) {
              log('[useDuelRealtime] ⚠️ Duplicate exploit ignored:', boost_type);
              return prev;
            }

            log('[useDuelRealtime] ✅ New exploit added to state:', boost_type);
            return {
              ...prev,
              activeExploits: [...(prev.activeExploits || []), newExploit]
            };
          });
        }
      }
    };

    // Подписываемся на broadcast события
    // В Supabase Realtime v2 channel.on() возвращает сам channel для цепочки
    channel.on('broadcast', { event: 'exploit_triggered' }, handleBroadcast);

    return () => {
      // В Supabase Realtime v2 нет метода channel.off()
      // Подписка автоматически удалится при удалении канала через removeChannel
      // Здесь просто проверяем, что channel существует (для безопасности)
      if (!channel) {
        logWarn('[useDuelRealtime] Channel is null during cleanup');
      }
    };
  }, [duelId, channel, profileId]);

  // ОПТИМИЗАЦИЯ: Мемоизируем broadcast функцию
  const broadcast = useCallback((event: string, data: any) => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event,
        payload: data,
      });
    }
  }, [channel]);

  return { state, broadcast, connectionStatus, lastEventAt };
}
