import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../../_shared/duel-helpers.ts';
import { createNotification, getOpponentName } from '../lib/notifications.ts';
import { settleBetPayout } from '../lib/payout.ts';

export async function handleHeartbeat(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;
  const userProfileId = params.profile_id || profileId;

  if (!duel_id || !userProfileId) {
    return new Response(JSON.stringify({ error: 'duel_id and profile_id are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Обновляем heartbeat для текущего игрока
  const { data: player, error: playerError } = await supabase
    .from('duel_players')
    .select('id')
    .eq('duel_id', duel_id)
    .eq('user_id', userProfileId)
    .single();

  if (playerError || !player) {
    console.error('[heartbeat] Player not found:', playerError);
    return new Response(JSON.stringify({ error: 'Player not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Обновляем heartbeat и статус онлайн
  await supabase
    .from('duel_players')
    .update({
      last_heartbeat_at: new Date().toISOString(),
      is_connected: true,
      activity_status: 'online'
    })
    .eq('id', player.id);

  // Проверяем активность соперника
  const { data: opponent, error: opponentError } = await supabase
    .from('duel_players')
    .select('id, last_heartbeat_at, is_connected, activity_status, user_id')
    .eq('duel_id', duel_id)
    .neq('user_id', userProfileId)
    .single();

  let opponentStatus = null;
  if (opponent && !opponentError) {
    const lastHeartbeat = opponent.last_heartbeat_at
      ? new Date(opponent.last_heartbeat_at).getTime()
      : 0;
    const now = Date.now();
    const timeSinceHeartbeat = now - lastHeartbeat;

    // Если соперник не отправлял heartbeat > 10 секунд - помечаем как офлайн
    if (timeSinceHeartbeat > 10000 && opponent.is_connected) {
      await supabase
        .from('duel_players')
        .update({
          is_connected: false,
          activity_status: 'offline'
        })
        .eq('id', opponent.id);

      opponentStatus = 'offline';
    } else {
      opponentStatus = opponent.activity_status || 'online';
    }
  }

  return new Response(JSON.stringify({
    success: true,
    opponent_status: opponentStatus
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleUpdateActivityStatus(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id, status } = params;
  const userProfileId = params.profile_id || profileId;

  if (!duel_id || !userProfileId || !status) {
    return new Response(JSON.stringify({ error: 'duel_id, profile_id and status are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const validStatuses = ['thinking', 'answering', 'online', 'reconnecting'];
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: player, error: playerError } = await supabase
    .from('duel_players')
    .select('id')
    .eq('duel_id', duel_id)
    .eq('user_id', userProfileId)
    .single();

  if (playerError || !player) {
    return new Response(JSON.stringify({ error: 'Player not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  await supabase
    .from('duel_players')
    .update({
      activity_status: status,
      last_heartbeat_at: new Date().toISOString(),
      is_connected: status !== 'offline'
    })
    .eq('id', player.id);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleDisconnect(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;
  const userProfileId = params.profile_id || profileId;

  if (!duel_id || !userProfileId) {
    return new Response(JSON.stringify({ error: 'duel_id and profile_id are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: player, error: playerError } = await supabase
    .from('duel_players')
    .select('id, disconnect_count')
    .eq('duel_id', duel_id)
    .eq('user_id', userProfileId)
    .single();

  if (playerError || !player) {
    return new Response(JSON.stringify({ error: 'Player not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Обновляем статус отключения
  await supabase
    .from('duel_players')
    .update({
      is_connected: false,
      activity_status: 'offline',
      disconnect_count: (player.disconnect_count || 0) + 1,
      last_disconnect_at: new Date().toISOString()
    })
    .eq('id', player.id);

  // Логируем инцидент
  await supabase
    .from('duel_incidents')
    .insert({
      duel_id,
      player_id: player.id,
      incident_type: 'disconnect',
      metadata: {
        disconnect_count: (player.disconnect_count || 0) + 1,
        timestamp: new Date().toISOString()
      }
    });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleAutoFinishOnDisconnect(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;
  const userProfileId = params.profile_id || profileId;

  if (!duel_id || !userProfileId) {
    return new Response(JSON.stringify({ error: 'duel_id and profile_id are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Получаем информацию о дуэли
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('status, bet_amount, host_user, num_questions')
    .eq('id', duel_id)
    .single();

  if (duelError || !duel || duel.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Duel not found or not active' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Получаем игроков
  const { data: players, error: playersError } = await supabase
    .from('duel_players')
    .select('id, user_id, is_connected, activity_status, last_heartbeat_at, score')
    .eq('duel_id', duel_id);

  if (playersError || !players || players.length < 2) {
    return new Response(JSON.stringify({ error: 'Not enough players' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const myPlayer = players.find((p: { user_id: string }) => p.user_id === userProfileId);
  const opponent = players.find((p: { user_id: string }) => p.user_id !== userProfileId);

  if (!myPlayer || !opponent) {
    return new Response(JSON.stringify({ error: 'Player not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Проверяем статус соперника
  const lastHeartbeat = opponent.last_heartbeat_at
    ? new Date(opponent.last_heartbeat_at).getTime()
    : 0;
  const now = Date.now();
  const timeSinceHeartbeat = now - lastHeartbeat;
  const isOpponentOffline = !opponent.is_connected || opponent.activity_status === 'offline' || timeSinceHeartbeat > 15000;

  // Проверяем есть ли у соперника ответы
  const { count: opponentAnswersCount } = await supabase
    .from('duel_answers')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', opponent.id)
    .eq('duel_id', duel_id);

  const hasOpponentAnswered = (opponentAnswersCount || 0) > 0;

  // Если соперник офлайн > 15 секунд и дуэль началась (есть ответы), завершаем дуэль
  if (isOpponentOffline && hasOpponentAnswered) {
    console.log('[auto_finish_on_opponent_disconnect] Opponent disconnected, finishing duel automatically');

    // Завершаем дуэль - вызываем finish_duel action
    // Используем внутренний вызов через обработку того же action
    // Но сначала нужно убедиться что текущий игрок закончил все вопросы
    const { count: myAnswersCount } = await supabase
      .from('duel_answers')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', myPlayer.id)
      .eq('duel_id', duel_id);

    // Если текущий игрок не закончил все вопросы, завершаем дуэль принудительно
    // с текущими результатами
    if ((myAnswersCount || 0) < duel.num_questions) {
      // Помечаем что текущий игрок закончил (для корректного завершения)
      // Но на самом деле мы просто завершаем дуэль с текущими результатами
      console.log('[auto_finish_on_opponent_disconnect] Current player has not finished all questions, finishing with current results');
    }

    // Вызываем finish_duel через рекурсивный вызов action
    // Но проще всего - просто завершить дуэль напрямую через логику finish_duel
    // Для этого создадим упрощенную версию завершения

    // Обновляем статус дуэли на finished
    await supabase
      .from('duels')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString()
      })
      .eq('id', duel_id);

    // Вызываем settleBetPayout если есть ставки
    if (duel.bet_amount > 0) {
      try {
        // Получаем финальные счета игроков
        const { data: finalPlayers } = await supabase
          .from('duel_players')
          .select('id, user_id, score, correct_count')
          .eq('duel_id', duel_id);

        if (finalPlayers && finalPlayers.length >= 2) {
          const myFinalPlayer = finalPlayers.find((p: { user_id: string }) => p.user_id === userProfileId);
          const opponentFinalPlayer = finalPlayers.find((p: { user_id: string }) => p.user_id !== userProfileId);

          if (myFinalPlayer && opponentFinalPlayer) {
            const myFinalScore = myFinalPlayer.score || 0;
            const opponentFinalScore = opponentFinalPlayer.score || 0;

            // Определяем победителя (текущий игрок выиграл, т.к. соперник отключился)
            const winnerUserId = userProfileId;
            const isDraw = myFinalScore === opponentFinalScore;

            // Вызываем settleBetPayout
            await settleBetPayout({
              supabaseClient: supabase,
              duelId: duel_id,
              betAmount: duel.bet_amount,
              hostUserId: duel.host_user,
              players: finalPlayers.map((p: { id: string; user_id: string; score: number; is_bot: boolean }) => ({
                id: p.id,
                user_id: p.user_id,
                score: p.score || 0,
                correct_count: p.correct_count || 0
              })),
              winnerUserId: isDraw ? null : winnerUserId,
              isDraw,
            });

            console.log('[auto_finish_on_opponent_disconnect] Bet settled, winner:', winnerUserId);
          }
        }
      } catch (betError) {
        console.error('[auto_finish_on_opponent_disconnect] Error settling bets:', betError);
      }
    }

    // Обновляем статистику игроков
    try {
      const { data: finalPlayers } = await supabase
        .from('duel_players')
        .select('id, user_id, score')
        .eq('duel_id', duel_id);

      if (finalPlayers && finalPlayers.length >= 2) {
        const myFinalPlayer = finalPlayers.find((p: { user_id: string }) => p.user_id === userProfileId);
        const opponentFinalPlayer = finalPlayers.find((p: { user_id: string }) => p.user_id !== userProfileId);

        if (myFinalPlayer && opponentFinalPlayer) {
          const myFinalScore = myFinalPlayer.score || 0;
          const opponentFinalScore = opponentFinalPlayer.score || 0;
          const isWin = myFinalScore > opponentFinalScore;
          const isDraw = myFinalScore === opponentFinalScore;

          // Обновляем статистику для текущего игрока (победа)
          await supabase.rpc('upsert_duel_stats', {
            p_user_id: userProfileId,
            p_is_win: isWin && !isDraw,
            p_is_draw: isDraw,
            p_score: myFinalScore
          });

          // Обновляем статистику для соперника (поражение)
          await supabase.rpc('upsert_duel_stats', {
            p_user_id: opponent.user_id,
            p_is_win: false,
            p_is_draw: isDraw,
            p_score: opponentFinalScore
          });
        }
      }
    } catch (statsError) {
      console.error('[auto_finish_on_opponent_disconnect] Error updating stats:', statsError);
    }

    return new Response(JSON.stringify({
      success: true,
      finished: true,
      reason: 'opponent_disconnected'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Если соперник офлайн но дуэль не началась (нет ответов), возвращаем ставки
  if (isOpponentOffline && !hasOpponentAnswered) {
    console.log('[auto_finish_on_opponent_disconnect] Opponent disconnected before duel started, cancelling');

    // Обновляем статус дуэли на cancelled
    await supabase
      .from('duels')
      .update({
        status: 'cancelled',
        finished_at: new Date().toISOString()
      })
      .eq('id', duel_id);

    // Возвращаем ставки если были
    if (duel.bet_amount > 0) {
      const { data: betRow } = await supabase
        .from('duel_bets')
        .select('host_insurance_premium, opponent_insurance_premium')
        .eq('duel_id', duel_id)
        .maybeSingle();

      // Возврат ставки текущему игроку
      await supabase.rpc('increment_profile_value', {
        p_profile_id: userProfileId,
        p_column: 'coins',
        p_amount: duel.bet_amount
      });

      await supabase.from('duel_transactions').insert({
        duel_id,
        user_id: userProfileId,
        amount: duel.bet_amount,
        transaction_type: 'refund'
      });

      // Возврат страховки если была
      const isHost = userProfileId === duel.host_user;
      const insurancePremium = isHost
        ? betRow?.host_insurance_premium
        : betRow?.opponent_insurance_premium;

      if (insurancePremium && insurancePremium > 0) {
        await supabase.rpc('increment_profile_value', {
          p_profile_id: userProfileId,
          p_column: 'coins',
          p_amount: insurancePremium
        });

        await supabase.from('duel_transactions').insert({
          duel_id,
          user_id: userProfileId,
          amount: insurancePremium,
          transaction_type: 'insurance_refund'
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      cancelled: true,
      reason: 'opponent_disconnected_before_start',
      bets_refunded: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Соперник онлайн или не прошло достаточно времени
  return new Response(JSON.stringify({
    success: true,
    opponent_online: true,
    time_since_heartbeat: timeSinceHeartbeat
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleSurrender(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;
  // profile_id уже извлечен из body в начале функции, используем его напрямую
  const userProfileId = profileId;

  console.log('[surrender] Starting surrender action:', {
    duel_id,
    userProfileId,
    profileId,
    paramsKeys: Object.keys(params)
  });

  if (!duel_id || !userProfileId) {
    console.error('[surrender] Missing required parameters:', {
      hasDuelId: !!duel_id,
      hasUserProfileId: !!userProfileId,
      duel_id,
      userProfileId
    });
    return new Response(JSON.stringify({
      error: 'duel_id and profile_id are required',
      details: `duel_id: ${duel_id ? 'provided' : 'missing'}, profile_id: ${userProfileId ? 'provided' : 'missing'}`
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Получаем информацию о дуэли
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('status, bet_amount, host_user, num_questions')
    .eq('id', duel_id)
    .single();

  if (duelError || !duel) {
    console.error('[surrender] Duel not found:', {
      duel_id,
      error: duelError?.message,
      code: duelError?.code
    });
    return new Response(JSON.stringify({
      error: 'Duel not found',
      details: duelError?.message || 'Duel does not exist'
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[surrender] Duel found:', {
    duel_id,
    status: duel.status,
    bet_amount: duel.bet_amount
  });

  if (duel.status !== 'active' && duel.status !== 'waiting' && duel.status !== 'waiting_opponent') {
    console.warn('[surrender] Duel status not eligible for surrender:', {
      duel_id,
      current_status: duel.status
    });
    return new Response(JSON.stringify({
      error: 'Duel is not ready for surrender',
      details: `Current status: ${duel.status}. Surrender is only allowed for active or waiting duels.`
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Получаем игроков
  const { data: players, error: playersError } = await supabase
    .from('duel_players')
    .select('id, user_id, score, correct_count')
    .eq('duel_id', duel_id);

  if (playersError) {
    console.error('[surrender] Error fetching players:', {
      duel_id,
      error: playersError.message,
      code: playersError.code
    });
    return new Response(JSON.stringify({
      error: 'Failed to fetch players',
      details: playersError.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!players || players.length < 2) {
    console.warn('[surrender] ⚠️ Not enough players (force cancelling):', {
      duel_id,
      playersCount: players?.length || 0,
      players: players?.map((p: { id: string; user_id: string }) => ({ id: p.id, user_id: p.user_id }))
    });

    // Если игроков меньше 2, но пользователь хочет сдаться - просто отменяем/удаляем дуэль
    // или помечаем как cancelled, чтобы не блокировать интерфейс
    const { error: cancelError } = await supabase
      .from('duels')
      .update({ status: 'cancelled', finished_at: new Date().toISOString() })
      .eq('id', duel_id);

    if (cancelError) {
      console.error('[surrender] Failed to auto-cancel stuck duel:', cancelError);
      // Fallback to error if update fails
      return new Response(JSON.stringify({
        error: 'Not enough players and failed to cancel',
        details: `Found ${players?.length || 0} players, expected at least 2`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Duel cancelled due to insufficient players',
      surrendered: true // Client expects this flag
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[surrender] Players found:', {
    playersCount: players.length,
    playerUserIds: players.map((p: { user_id: string }) => p.user_id),
    surrenderingUserId: userProfileId
  });

  const surrenderingPlayer = players.find((p: { user_id: string }) => p.user_id === userProfileId);
  const opponentPlayer = players.find((p: { user_id: string }) => p.user_id !== userProfileId);

  if (!surrenderingPlayer) {
    console.error('[surrender] Surrendering player not found:', {
      duel_id,
      userProfileId,
      availableUserIds: players.map((p: { user_id: string }) => p.user_id)
    });
    return new Response(JSON.stringify({
      error: 'Player not found',
      details: `User ${userProfileId} is not a participant in this duel`
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!opponentPlayer) {
    console.error('[surrender] Opponent player not found:', {
      duel_id,
      surrenderingPlayerId: surrenderingPlayer.id,
      availableUserIds: players.map((p: { user_id: string }) => p.user_id)
    });
    return new Response(JSON.stringify({
      error: 'Opponent not found',
      details: 'Could not find opponent player'
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[surrender] Players identified:', {
    surrenderingPlayerId: surrenderingPlayer.id,
    opponentPlayerId: opponentPlayer.id
  });

  // Помечаем игрока как сдавшегося
  console.log('[surrender] Updating player status:', {
    playerId: surrenderingPlayer.id,
    userId: userProfileId
  });

  const { error: updateError } = await supabase
    .from('duel_players')
    .update({
      is_connected: false,
      activity_status: 'offline',
      surrendered: true
    })
    .eq('id', surrenderingPlayer.id);

  if (updateError) {
    console.error('[surrender] Error updating player (with surrendered):', {
      error: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint
    });

    // Пробуем обновить без поля surrendered (на случай если миграция не применена)
    console.log('[surrender] Attempting fallback update without surrendered field');
    const { error: fallbackError } = await supabase
      .from('duel_players')
      .update({
        is_connected: false,
        activity_status: 'offline'
      })
      .eq('id', surrenderingPlayer.id);

    if (fallbackError) {
      console.error('[surrender] Fallback update also failed:', {
        error: fallbackError.message,
        code: fallbackError.code,
        details: fallbackError.details
      });
      return new Response(JSON.stringify({
        error: 'Failed to update player status',
        details: updateError.message || 'Could not update player status. Please check if migration is applied.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('[surrender] ✅ Fallback update succeeded (surrendered field may not exist)');
    }
  } else {
    console.log('[surrender] ✅ Player status updated successfully');
  }

  // Завершаем дуэль - оппонент побеждает
  const opponentScore = opponentPlayer.score || 0;
  const surrenderingScore = surrenderingPlayer.score || 0;
  // При сдаче это всегда победа оппонента, даже если очки равны (например 0-0)
  // Это предотвращает возврат ставки (draw refund)
  const isDraw = false;
  const winnerUserId = opponentPlayer ? opponentPlayer.user_id : null;

  console.log('[surrender] Calculating results:', {
    opponentScore,
    surrenderingScore,
    isDraw,
    winnerUserId
  });

  // Обновляем статус дуэли
  const { error: duelUpdateError } = await supabase
    .from('duels')
    .update({
      status: 'finished',
      finished_at: new Date().toISOString(),
      winner_id: winnerUserId,
      is_draw: isDraw
    })
    .eq('id', duel_id);

  if (duelUpdateError) {
    console.error('[surrender] Error updating duel status:', {
      error: duelUpdateError.message,
      code: duelUpdateError.code
    });
    // Не прерываем выполнение, так как игрок уже помечен как сдавшийся
  } else {
    console.log('[surrender] ✅ Duel status updated to finished');
  }

  // Обновляем статистику
  const { error: opponentStatsError } = await supabase.rpc('upsert_duel_stats', {
    p_user_id: opponentPlayer.user_id,
    p_is_win: !isDraw,
    p_is_draw: isDraw,
    p_score: opponentScore
  });

  if (opponentStatsError) {
    console.error('[surrender] Error updating opponent stats:', opponentStatsError);
  }

  const { error: surrenderingStatsError } = await supabase.rpc('upsert_duel_stats', {
    p_user_id: surrenderingPlayer.user_id,
    p_is_win: false,
    p_is_draw: isDraw,
    p_score: surrenderingScore
  });

  if (surrenderingStatsError) {
    console.error('[surrender] Error updating surrendering player stats:', surrenderingStatsError);
  }

  // Обрабатываем ставки
  if (duel.bet_amount > 0) {
    await settleBetPayout({
      supabaseClient: supabase,
      duelId: duel_id,
      betAmount: duel.bet_amount,
      hostUserId: duel.host_user,
      players: players.map((p: { id: string; user_id: string; score: number; is_bot: boolean }) => ({
        id: p.id,
        user_id: p.user_id,
        score: p.score || 0,
        correct_count: p.correct_count || 0
      })),
      winnerUserId,
      isDraw,
    });
  }

  // Создаем уведомление для оппонента
  let surrenderingPlayerName = 'Игрок';
  try {
    surrenderingPlayerName = await getOpponentName(userProfileId, supabase);
  } catch {
    // Ignore error, keep default
  }
  try {
    await createNotification({
      duel_id,
      type: 'opponent_left',
      metadata: {
        opponent_name: surrenderingPlayerName,
        reason: 'surrender'
      }
    }, opponentPlayer.user_id, supabase);
  } catch (err) {
    console.error('[surrender] Error creating notification:', err);
  }

  // Логируем инцидент
  const { error: incidentError } = await supabase
    .from('duel_incidents')
    .insert({
      duel_id,
      player_id: surrenderingPlayer.id,
      incident_type: 'surrender',
      metadata: {
        timestamp: new Date().toISOString(),
        surrendering_score: surrenderingScore,
        opponent_score: opponentScore
      }
    });

  if (incidentError) {
    console.error('[surrender] Error logging incident:', incidentError);
    // Не прерываем выполнение, так как это только логирование
  }

  console.log('[surrender] ✅ Duel surrendered successfully:', {
    duel_id,
    surrenderingPlayer: userProfileId,
    opponentPlayer: opponentPlayer.user_id,
    winner: winnerUserId
  });

  return new Response(JSON.stringify({
    success: true,
    surrendered: true,
    message: 'Duel surrendered, opponent wins'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleMarkTechnicalDraw(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;

  if (!duel_id) {
    return new Response(JSON.stringify({ error: 'duel_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Проверяем что дуэль активна
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('status, bet_amount, host_user')
    .eq('id', duel_id)
    .single();

  if (duelError || !duel) {
    return new Response(JSON.stringify({ error: 'Duel not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (duel.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Duel is not active' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Получаем игроков
  const { data: players, error: playersError } = await supabase
    .from('duel_players')
    .select('user_id')
    .eq('duel_id', duel_id);

  if (playersError || !players || players.length < 2) {
    return new Response(JSON.stringify({ error: 'Not enough players' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Возвращаем ставки всем игрокам
  if (duel.bet_amount > 0) {
    const { data: betRow } = await supabase
      .from('duel_bets')
      .select('host_insurance_premium, opponent_insurance_premium')
      .eq('duel_id', duel_id)
      .maybeSingle();

    for (const player of players) {
      // Возврат ставки
      await supabase.rpc('increment_profile_value', {
        p_profile_id: player.user_id,
        p_column: 'coins',
        p_amount: duel.bet_amount
      });

      await supabase.from('duel_transactions').insert({
        duel_id,
        user_id: player.user_id,
        amount: duel.bet_amount,
        transaction_type: 'refund'
      });

      // Возврат страховки если была
      const isHost = player.user_id === duel.host_user;
      const insurancePremium = isHost
        ? betRow?.host_insurance_premium
        : betRow?.opponent_insurance_premium;

      if (insurancePremium && insurancePremium > 0) {
        await supabase.rpc('increment_profile_value', {
          p_profile_id: player.user_id,
          p_column: 'coins',
          p_amount: insurancePremium
        });

        await supabase.from('duel_transactions').insert({
          duel_id,
          user_id: player.user_id,
          amount: insurancePremium,
          transaction_type: 'insurance_refund'
        });
      }
    }
  }

  // Обновляем статус дуэли
  await supabase
    .from('duels')
    .update({
      status: 'technical_draw',
      finished_at: new Date().toISOString()
    })
    .eq('id', duel_id);

  // Логируем инцидент
  await supabase
    .from('duel_incidents')
    .insert({
      duel_id,
      incident_type: 'technical_error',
      metadata: {
        reason: 'server_error',
        timestamp: new Date().toISOString()
      }
    });

  return new Response(JSON.stringify({
    success: true,
    message: 'Technical draw marked, bets refunded'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
