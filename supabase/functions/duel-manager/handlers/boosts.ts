import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import {
  corsHeaders,
  useBoostSchema,
  getDeterministicBotName
} from '../../_shared/duel-helpers.ts';
import { createNotification } from '../lib/notifications.ts';
import { calculateScore } from '../lib/scoring.ts';

export async function handleUseBoost(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const validated = useBoostSchema.parse(params);
  const { duel_id, duel_question_id, boost_type } = validated;

  // Get player
  const { data: player } = await supabase
    .from('duel_players')
    .select('*')
    .eq('duel_id', duel_id)
    .eq('user_id', profileId)
    .single();

  if (!player) throw new Error('Player not found');

  // Check if user has the boost
  const { data: hasBoost } = await supabase.rpc('has_boost', {
    p_user_id: profileId,
    p_boost_type: boost_type
  });

  if (!hasBoost) {
    return new Response(JSON.stringify({ error: 'Boost not available' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Deduct boost from inventory
  await supabase.rpc('modify_boost_inventory', {
    p_user_id: profileId,
    p_boost_type: boost_type,
    p_change: -1
  });

  // Record boost usage
  await supabase.from('duel_boosts_used').insert({
    duel_id,
    player_id: player.id,
    boost_type,
    duel_question_id: duel_question_id || null,
  });

  // ============================================================================
  // CRITICAL: SERVER-SIDE BOOST LOGIC
  // ============================================================================
  // All boost effects MUST be calculated on server and returned to client
  // Client only displays the effects, never calculates them locally
  // ============================================================================

  let boostEffect: { success: boolean; eliminated_options?: string[]; time_added_ms?: number; message?: string } = { success: true };

  if (boost_type === 'fifty_fifty' && duel_question_id) {
    // Get question to find incorrect options
    const { data: question } = await supabase
      .from('duel_questions')
      .select('correct_option_ids, question_snapshot')
      .eq('id', duel_question_id)
      .single();

    if (question) {
      const snapshot = question.question_snapshot as any;
      const allOptions = snapshot.answer_options || [];
      const correctIds = question.correct_option_ids as string[];

      // Find incorrect options
      const incorrectOptions = allOptions
        .filter((opt: { id: string; is_correct: boolean }) => !correctIds.includes(opt.id))
        .map((opt: { id: string }) => opt.id);

      // Hide exactly 2 incorrect options (or all if less than 2)
      const toHide = incorrectOptions.slice(0, Math.min(2, incorrectOptions.length));

      boostEffect.hidden_options = toHide;
      console.log('[use_boost] 50/50 hiding options:', toHide);
    }
  } else if (boost_type === 'time_extend') {
    // Server confirms time extension of +30 seconds
    boostEffect.time_added_ms = 30000;
    console.log('[use_boost] Time extended by 30s');
  } else if (boost_type === 'hint' && duel_question_id) {
    // Get question explanation
    const { data: question } = await supabase
      .from('duel_questions')
      .select('question_snapshot')
      .eq('id', duel_question_id)
      .single();

    if (question) {
      const snapshot = question.question_snapshot as any;
      // Return explanation in Russian (can be localized based on user preference)
      const hint = snapshot.explanation_ru || snapshot.explanation_es || snapshot.explanation_en || 'Подсказка недоступна';
      boostEffect.hint = hint;
      console.log('[use_boost] Hint provided');
    }
  } else if (boost_type === 'skip') {
    // Skip is handled client-side, just confirm
    boostEffect.skip_confirmed = true;
    console.log('[use_boost] Skip confirmed');
  } else if (boost_type === 'translate') {
    // Translate boost: translations are already in question_snapshot
    // Client handles the display based on selected language
    // Server just confirms the boost was used
    const { language } = validated;
    boostEffect.translate_applied = true;
    boostEffect.language = language; // Return selected language for confirmation
    console.log('[use_boost] Translate applied for language:', language);
  } else if (boost_type === 'rewind') {
    // ADAS: Rewind - отмена ошибки в тестах
    boostEffect.rewind_confirmed = true;
    console.log('[use_boost] Rewind confirmed');
  }
  // 🆕 Обработка Root Mode exploits
  else if (boost_type === 'screen_injector') {
    boostEffect = {
      success: true,
      popup_count: 3,
      duration_ms: 45000, // Увеличено до 45 секунд для надежной доставки в Telegram Mini App
    };
    console.log('[use_boost] Data Leak activated');
  } else if (boost_type === 'input_lag') {
    boostEffect = {
      success: true,
      delay_ms: 1500,
      duration_ms: 5000,
    };
    console.log('[use_boost] Input Lag activated');
  } else if (boost_type === 'gps_spoofing') {
    boostEffect = {
      success: true,
      shuffle_duration_ms: 1000,
    };
    console.log('[use_boost] GPS Spoofing activated');
  } else if (boost_type === 'police_backdoor') {
    boostEffect = {
      success: true,
      block_duration_ms: 8000,
      captcha_required: true,
    };
    console.log('[use_boost] Police Backdoor activated');
  } else if (boost_type === 'firewall') {
    boostEffect = {
      success: true,
      active: true,
      duration_ms: 30000, // Firewall активен до конца вопроса или 30 секунд
    };
    console.log('[use_boost] Firewall activated');
  } else if (boost_type === 'cryptolocker') {
    boostEffect = {
      success: true,
      encrypted: true,
      duration_ms: 30000, // 30 секунд шифрования
    };
    console.log('[use_boost] Cryptolocker activated');
  } else if (boost_type === 'fog_screen') {
    boostEffect = { success: true, duration_ms: 600000 }; // 10min DB TTL — player must complete all 16
    console.log('[use_boost] Fog Screen activated');
  } else if (boost_type === 'ice_screen') {
    boostEffect = { success: true, duration_ms: 20000 };
    console.log('[use_boost] Ice Screen activated');
  } else if (boost_type === 'sun_glare') {
    boostEffect = { success: true, duration_ms: 18000 };
    console.log('[use_boost] Sun Glare activated');
  } else if (boost_type === 'rain_storm') {
    boostEffect = { success: true, duration_ms: 20000 };
    console.log('[use_boost] Rain Storm activated');
  } else if (boost_type === 'bug_splat') {
    boostEffect = { success: true, duration_ms: 20000 };
    console.log('[use_boost] Bug Splat activated');
  } else if (boost_type === 'oil_spill') {
    boostEffect = { success: true, duration_ms: 18000 };
    console.log('[use_boost] Oil Spill activated');
  }

  // 🆕 Получаем информацию о бусте из БД для определения target_type
  const { data: boostDef, error: boostDefError } = await supabase
    .from('boost_definitions')
    .select('target_type, category, mode')
    .eq('type', boost_type)
    .single();

  // КРИТИЧНО: Логируем результат запроса boost_definitions
  console.log('[use_boost] 🔍🔍🔍 Checking boost_definitions:', {
    boost_type,
    boostDefFound: !!boostDef,
    boostDefError: boostDefError ? {
      message: boostDefError.message,
      code: boostDefError.code,
      details: boostDefError.details
    } : null,
    boostDef: boostDef ? {
      target_type: boostDef.target_type,
      category: boostDef.category,
      mode: boostDef.mode
    } : null,
    willCreateExploit: boostDef && (boostDef.target_type === 'opponent' || boostDef.target_type === 'both')
  });

  // 🆕 Если буст влияет на противника - сохраняем в БД и отправляем broadcast
  if (boostDef && (boostDef.target_type === 'opponent' || boostDef.target_type === 'both')) {
    // КРИТИЧНО: Логируем перед запросом игроков
    console.log('[use_boost] 🔍🔍🔍 About to query players for exploit:', {
      duel_id,
      boost_type,
      boostDefTargetType: boostDef.target_type,
      currentPlayerId: player.id,
      currentPlayerUserId: profileId
    });

    // Получаем всех игроков дуэли (КРИТИЧНО: включаем is_bot для правильной фильтрации)
    const { data: players, error: playersError } = await supabase
      .from('duel_players')
      .select('id, user_id, is_bot')
      .eq('duel_id', duel_id);

    // КРИТИЧНО: Логируем результат запроса игроков
    console.log('[use_boost] 🔍🔍🔍 Players query result:', {
      playersCount: players?.length || 0,
      players: players?.map(p => ({
        id: p.id,
        user_id: p.user_id,
        is_bot: p.is_bot
      })) || [],
      playersError: playersError ? {
        message: playersError.message,
        code: playersError.code,
        details: playersError.details
      } : null,
      duel_id,
      currentPlayerId: player.id,
      currentPlayerUserId: profileId
    });

    // КРИТИЧНО: Проверяем количество игроков ПЕРЕД поиском opponent
    if (!players || players.length === 0) {
      console.error('[use_boost] ❌❌❌ NO PLAYERS FOUND IN DUEL ❌❌❌:', {
        duel_id,
        playersQueryResult: players,
        playersError: playersError ? {
          message: playersError.message,
          code: playersError.code
        } : null,
        currentPlayerId: player.id,
        currentPlayerUserId: profileId
      });
      // Не создаем exploit, если игроков нет
      return new Response(JSON.stringify({
        error: 'No players found in duel',
        details: 'Cannot create exploit - no players in duel',
        boostEffect: boostEffect // Возвращаем эффект для клиента
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (players.length >= 2) {
      // КРИТИЧНО: Находим соперника правильно - это игрок, который НЕ является текущим и НЕ является ботом
      // ВАЖНО: Если есть бот, выбираем реального игрока; если ботов нет, выбираем любого другого игрока
      const opponent = players.find(p => p.id !== player.id && !p.is_bot);

      // КРИТИЧНО: Детальное логирование для диагностики проблемы с ID
      console.log('[use_boost] 🔍🔍🔍 Finding opponent for exploit (DETAILED):', {
        totalPlayers: players.length,
        currentPlayerId: player.id,
        currentPlayerUserId: profileId,
        allPlayers: players.map(p => ({
          id: p.id,
          user_id: p.user_id,
          is_bot: p.is_bot,
          isCurrentPlayer: p.id === player.id,
          willBeOpponent: p.id !== player.id && !p.is_bot
        })),
        opponentFound: !!opponent,
        opponentId: opponent?.id,
        opponentUserId: opponent?.user_id,
        opponentIsBot: opponent?.is_bot,
        // КРИТИЧНО: Проверяем, что opponent действительно отличается от player
        opponentEqualsPlayer: opponent?.id === player.id,
        // КРИТИЧНО: Проверяем, что opponent не является текущим игроком по user_id
        opponentUserIdEqualsCurrentUserId: opponent?.user_id === profileId,
        note: 'Opponent must be different from current player and not a bot'
      });

      // КРИТИЧНО: Дополнительная проверка - убеждаемся, что opponent не является текущим игроком
      if (opponent && opponent.id === player.id) {
        console.error('[use_boost] ❌❌❌ CRITICAL ERROR: Opponent equals current player!', {
          opponentId: opponent.id,
          playerId: player.id,
          players: players.map(p => ({ id: p.id, user_id: p.user_id, is_bot: p.is_bot }))
        });
        return new Response(JSON.stringify({
          error: 'Invalid opponent - opponent equals current player',
          details: 'Opponent ID matches current player ID'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // КРИТИЧНО: Проверяем, что opponent не является текущим игроком по user_id
      if (opponent && opponent.user_id === profileId) {
        console.error('[use_boost] ❌❌❌ CRITICAL ERROR: Opponent user_id equals current user_id!', {
          opponentUserId: opponent.user_id,
          currentUserId: profileId,
          opponentId: opponent.id,
          playerId: player.id,
          players: players.map(p => ({ id: p.id, user_id: p.user_id, is_bot: p.is_bot }))
        });
        return new Response(JSON.stringify({
          error: 'Invalid opponent - opponent user_id matches current user_id',
          details: 'Opponent user_id matches current user_id'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (opponent) {
        // Вычисляем время истечения эффекта
        const durationMs = boostEffect.duration_ms || 10000;
        const now = Date.now();
        const expiresAt = new Date(now + durationMs).toISOString();
        const activatedAt = new Date(now).toISOString();

        // КРИТИЧНО: Вычисляем время в секундах для удобства
        const durationSeconds = Math.round(durationMs / 1000);
        const expiresAtTimestamp = now + durationMs;

        // КРИТИЧНО: Логируем время создания для диагностики
        console.log('[use_boost] ⏰⏰⏰ Creating exploit with timing:', {
          boost_type,
          durationMs,
          durationSeconds: `${durationSeconds}s`,
          serverTime: new Date(now).toISOString(),
          serverTimestamp: now,
          activatedAt,
          expiresAt,
          expiresAtTimestamp,
          timeUntilExpiry: `${durationMs}ms (${durationSeconds}s)`,
          attackerPlayerId: player.id,
          targetPlayerId: opponent.id,
          note: 'Exploit will expire in ' + durationSeconds + ' seconds from now'
        });

        // Сохраняем exploit в БД для State Recovery
        // КРИТИЧНО: Проверяем, что attacker и target разные перед созданием exploitData
        if (player.id === opponent.id) {
          console.error('[use_boost] ❌❌❌ CRITICAL ERROR: Cannot create exploit - attacker equals target!', {
            attackerPlayerId: player.id,
            targetPlayerId: opponent.id,
            playerUserId: profileId,
            opponentUserId: opponent.user_id
          });
          return new Response(JSON.stringify({
            error: 'Cannot create exploit - attacker equals target',
            details: 'Attacker player ID matches target player ID'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const exploitData = {
          duel_id,
          target_player_id: opponent.id,
          exploit_type: boost_type,
          attacker_player_id: player.id,
          effect_data: boostEffect,
          expires_at: expiresAt,
          activated_at: activatedAt,
          is_active: true,
        };

        // КРИТИЧНО: Детальное логирование перед вставкой с проверкой всех ID
        console.log('[use_boost] 💾💾💾 Inserting exploit to DB (VERIFIED):', {
          exploitData,
          targetPlayerId: opponent.id,
          attackerPlayerId: player.id,
          exploitType: boost_type,
          // КРИТИЧНО: Проверяем, что attacker и target разные
          attackerEqualsTarget: player.id === opponent.id,
          attackerUserId: profileId,
          targetUserId: opponent.user_id,
          attackerUserIdEqualsTargetUserId: profileId === opponent.user_id,
          timing: {
            activatedAt,
            expiresAt,
            durationMs
          },
          note: 'This exploit will be received by the target player via postgres_changes'
        });

        // КРИТИЧНО: Детальное логирование перед вставкой exploit
        console.log('[use_boost] 🔍🔍🔍 About to insert exploit:', {
          exploitData,
          exploitDataStringified: JSON.stringify(exploitData),
          targetPlayerId: opponent.id,
          attackerPlayerId: player.id,
          boostType: boost_type,
          duel_id,
          timestamp: new Date().toISOString(),
        });

        const { data: insertedExploit, error: exploitError } = await supabase
          .from('duel_active_exploits')
          .insert(exploitData)
          .select()
          .single();

        if (exploitError) {
          console.error('[use_boost] ❌❌❌ CRITICAL ERROR saving exploit to DB:', {
            error: exploitError,
            errorMessage: exploitError.message,
            errorCode: exploitError.code,
            errorDetails: exploitError.details,
            errorHint: exploitError.hint,
            exploitData,
            exploitDataStringified: JSON.stringify(exploitData),
            targetPlayerId: opponent.id,
            attackerPlayerId: player.id,
            boostType: boost_type,
            duel_id,
            timestamp: new Date().toISOString(),
          });

          // Пробрасываем ошибку, чтобы клиент мог её обработать
          return new Response(JSON.stringify({
            error: 'Failed to save exploit',
            details: exploitError.message,
            code: exploitError.code
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // КРИТИЧНО: Проверяем, что exploit действительно сохранен и доступен для запроса
          console.log('[use_boost] ✅✅✅ Exploit saved to DB for State Recovery:', {
            exploitId: insertedExploit?.id,
            targetPlayerId: opponent.id,
            attackerPlayerId: player.id,
            exploitType: boost_type,
            expiresAt,
            activatedAt,
            duel_id,
            timestamp: new Date().toISOString(),
            insertedExploit: insertedExploit,
          });

          // КРИТИЧНО: Проверяем, что exploit можно найти через запрос (как это делает клиент)
          // ВАЖНО: Клиент использует запрос `attacker_player_id != myPlayerId`, где myPlayerId - это ID принимающего игрока
          // Поэтому мы проверяем, что exploit можно найти с фильтром `attacker_player_id != opponent.id`
          const { data: verifyExploit, error: verifyError } = await supabase
            .from('duel_active_exploits')
            .select('*')
            .eq('duel_id', duel_id)
            .neq('attacker_player_id', opponent.id) // Запрос как у клиента: attacker != target (target = myPlayerId)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .order('activated_at', { ascending: false })
            .limit(1);

          // КРИТИЧНО: Также проверяем прямой запрос по target_player_id (fallback для клиента)
          const { data: verifyExploitByTarget, error: verifyErrorByTarget } = await supabase
            .from('duel_active_exploits')
            .select('*')
            .eq('duel_id', duel_id)
            .eq('target_player_id', opponent.id) // Прямой запрос по target_player_id
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .order('activated_at', { ascending: false })
            .limit(1);

          console.log('[use_boost] 🔍🔍🔍 Verification query result (should find the exploit):', {
            found: !!verifyExploit && verifyExploit.length > 0,
            verifyExploitCount: verifyExploit?.length || 0,
            verifyExploit: verifyExploit?.[0] ? {
              id: verifyExploit[0].id,
              target_player_id: verifyExploit[0].target_player_id,
              attacker_player_id: verifyExploit[0].attacker_player_id,
              exploit_type: verifyExploit[0].exploit_type,
              is_active: verifyExploit[0].is_active,
              expires_at: verifyExploit[0].expires_at,
              activated_at: verifyExploit[0].activated_at,
              // КРИТИЧНО: Проверяем, что ID правильные
              targetPlayerIdMatches: verifyExploit[0].target_player_id === opponent.id,
              attackerPlayerIdMatches: verifyExploit[0].attacker_player_id === player.id,
              attackerNotEqualsTarget: verifyExploit[0].attacker_player_id !== verifyExploit[0].target_player_id,
            } : null,
            verifyError: verifyError ? {
              message: verifyError.message,
              code: verifyError.code,
              details: verifyError.details,
            } : null,
            // КРИТИЧНО: Проверяем прямой запрос по target_player_id
            foundByTarget: !!verifyExploitByTarget && verifyExploitByTarget.length > 0,
            verifyExploitByTarget: verifyExploitByTarget?.[0] ? {
              id: verifyExploitByTarget[0].id,
              target_player_id: verifyExploitByTarget[0].target_player_id,
              attacker_player_id: verifyExploitByTarget[0].attacker_player_id,
            } : null,
            verifyErrorByTarget: verifyErrorByTarget ? {
              message: verifyErrorByTarget.message,
              code: verifyErrorByTarget.code,
            } : null,
            queryParams: {
              duel_id,
              attackerPlayerIdFilter: `attacker_player_id != '${opponent.id}'`,
              targetPlayerIdFilter: `target_player_id = '${opponent.id}'`,
              expectedTargetPlayerId: opponent.id,
              expectedAttackerPlayerId: player.id,
              // КРИТИЧНО: Проверяем, что attacker не равен target
              attackerNotEqualsTarget: player.id !== opponent.id,
            },
            note: 'This query simulates what the receiving client will do to find exploits targeting them'
          });

          // КРИТИЧНО: Если exploit не найден через основной запрос, но найден через прямой запрос по target_player_id
          // это означает, что логика фильтрации на клиенте может быть неправильной
          if ((!verifyExploit || verifyExploit.length === 0) && verifyExploitByTarget && verifyExploitByTarget.length > 0) {
            console.warn('[use_boost] ⚠️⚠️⚠️ WARNING: Exploit found by target_player_id but not by attacker filter!', {
              exploitFoundByTarget: verifyExploitByTarget[0],
              note: 'This may indicate that the client-side filter logic needs adjustment'
            });
          }
        }

        // 🆕 Broadcast через postgres_changes
        // Клиент подписан на изменения duel_active_exploits через useDuelRealtime
        // При вставке новой записи клиент получит событие через postgres_changes
        // Это надежнее чем broadcast, так как работает даже при разрыве соединения
        console.log('[use_boost] ✅ Exploit saved, client will receive via postgres_changes');
      } else {
        // КРИТИЧНО: Детальное логирование, если opponent не найден
        console.error('[use_boost] ❌❌❌ OPPONENT NOT FOUND FOR EXPLOIT ❌❌❌:', {
          players: players.map(p => ({
            id: p.id,
            user_id: p.user_id,
            is_bot: p.is_bot,
            isCurrentPlayer: p.id === player.id,
            willBeOpponent: p.id !== player.id && !p.is_bot
          })),
          currentPlayerId: player.id,
          currentPlayerUserId: profileId,
          duel_id,
          boost_type,
          note: 'Exploit will NOT be created because opponent is not found. This may indicate that the duel has only one player or the second player has not joined yet.'
        });

        // КРИТИЧНО: Exploit НЕ создается, если opponent не найден
        // Это правильное поведение - нельзя создать атаку без цели
        return new Response(JSON.stringify({
          error: 'Opponent not found',
          details: 'Cannot create exploit - opponent player not found in duel',
          boostEffect: boostEffect // Возвращаем эффект для клиента, но не сохраняем в БД
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // КРИТИЧНО: Детальное логирование, если игроков недостаточно
      console.warn('[use_boost] ⚠️⚠️⚠️ NOT ENOUGH PLAYERS FOR EXPLOIT ⚠️⚠️⚠️:', {
        playersCount: players?.length || 0,
        players: players?.map(p => ({
          id: p.id,
          user_id: p.user_id,
          is_bot: p.is_bot
        })) || [],
        currentPlayerId: player.id,
        currentPlayerUserId: profileId,
        duel_id,
        note: 'Exploit requires at least 2 players in the duel'
      });

      // КРИТИЧНО: Если игроков меньше 2, это может быть проблема с запросом или дуэль еще не началась
      // Проверяем, может быть второй игрок еще не присоединился
      const { data: allPlayersCheck } = await supabase
        .from('duel_players')
        .select('id, user_id, is_bot, created_at')
        .eq('duel_id', duel_id)
        .order('created_at', { ascending: true });

      console.warn('[use_boost] 🔍🔍🔍 Double-checking players in DB:', {
        allPlayersCount: allPlayersCheck?.length || 0,
        allPlayers: allPlayersCheck?.map(p => ({
          id: p.id,
          user_id: p.user_id,
          is_bot: p.is_bot,
          created_at: p.created_at
        })) || [],
        note: 'This is a direct query to verify player count'
      });
    }
  } else {
    // КРИТИЧНО: Логируем, почему exploit НЕ создается
    console.warn('[use_boost] ⚠️⚠️⚠️ EXPLOIT NOT CREATED - boostDef check failed ⚠️⚠️⚠️:', {
      boost_type,
      boostDefFound: !!boostDef,
      boostDefTargetType: boostDef?.target_type,
      boostDefError: boostDefError ? {
        message: boostDefError.message,
        code: boostDefError.code,
        details: boostDefError.details
      } : null,
      reason: !boostDef
        ? 'boostDef not found in DB'
        : boostDef.target_type !== 'opponent' && boostDef.target_type !== 'both'
          ? `target_type is "${boostDef.target_type}", expected "opponent" or "both"`
          : 'unknown reason'
    });
  }

  // Create boost notification for opponent
  try {
    await createNotification({
      duel_id,
      type: 'boost',
      metadata: {
        boost_type,
      }
    }, profileId, supabase);
  } catch (err) {
    console.error('[use_boost] Error creating boost notification:', err);
  }

  return new Response(JSON.stringify(boostEffect), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleBotUseBoost(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  // Логика использования бустов ботом
  const { duel_id, duel_question_id } = params;

  // Находим бота в дуэли
  const { data: botPlayer } = await supabase
    .from('duel_players')
    .select('id, bot_difficulty, bot_name, name')
    .eq('duel_id', duel_id)
    .eq('is_bot', true)
    .single();

  if (!botPlayer) {
    return new Response(JSON.stringify({ error: 'Bot not found in this duel' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const botDifficulty = botPlayer.bot_difficulty || 'medium';

  // Определяем доступные бусты для бота в зависимости от сложности
  const availableBoosts: { type: string; weight: number }[] = [];

  if (botDifficulty === 'easy') {
    // Easy: в основном утилиты, редкие атаки
    availableBoosts.push(
      { type: 'fifty_fifty', weight: 50 },
      { type: 'hint', weight: 40 },
      { type: 'screen_injector', weight: 10 }
    );
  } else if (botDifficulty === 'medium') {
    // Medium: сбалансировано
    availableBoosts.push(
      { type: 'fifty_fifty', weight: 30 },
      { type: 'hint', weight: 20 },
      { type: 'screen_injector', weight: 20 },
      { type: 'input_lag', weight: 20 },
      { type: 'gps_spoofing', weight: 10 }
    );
  } else {
    // Hard/Insane: агрессивные атаки
    availableBoosts.push(
      { type: 'screen_injector', weight: 30 },
      { type: 'input_lag', weight: 25 },
      { type: 'gps_spoofing', weight: 20 },
      { type: 'police_backdoor', weight: 15 },
      { type: 'fifty_fifty', weight: 5 },
      { type: 'hint', weight: 5 }
    );
  }

  // Выбираем случайный буст на основе весов
  // Пытаемся избежать повторения последнего использованного буста для разнообразия
  const { data: lastBoostNotif } = await supabase
    .from('duel_notifications')
    .select('metadata')
    .eq('duel_id', duel_id)
    .eq('type', 'boost')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastBoostType = (lastBoostNotif?.metadata as any)?.boost_type;

  // Если буст уже использовался недавно, уменьшаем его вес или убираем
  const filteredBoosts = lastBoostType
    ? availableBoosts.filter(b => b.type !== lastBoostType || availableBoosts.length === 1)
    : availableBoosts;

  const totalWeight = filteredBoosts.reduce((sum, boost) => sum + boost.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedBoost = filteredBoosts[0];

  for (const boost of filteredBoosts) {
    random -= boost.weight;
    if (random <= 0) {
      selectedBoost = boost;
      break;
    }
  }

  const boostType = selectedBoost.type;

  // Обработка эффектов бустов
  let boostEffect: { success: boolean; boost_type: string; eliminated_options?: string[]; time_added_ms?: number; message?: string } = { success: true, boost_type: boostType };

  if (boostType === 'fifty_fifty' && duel_question_id) {
    const { data: question } = await supabase
      .from('duel_questions')
      .select('correct_option_ids, question_snapshot')
      .eq('id', duel_question_id)
      .single();

    if (question) {
      const snapshot = question.question_snapshot as any;
      const allOptions = snapshot.answer_options || [];
      const correctIds = question.correct_option_ids as string[];
      const incorrectOptions = allOptions
        .filter((opt: { id: string; is_correct: boolean }) => !correctIds.includes(opt.id))
        .map((opt: { id: string }) => opt.id);
      const toHide = incorrectOptions.slice(0, Math.min(2, incorrectOptions.length));
      boostEffect.hidden_options = toHide;
    }
  } else if (boostType === 'hint' && duel_question_id) {
    const { data: question } = await supabase
      .from('duel_questions')
      .select('question_snapshot')
      .eq('id', duel_question_id)
      .single();

    if (question) {
      const snapshot = question.question_snapshot as any;
      const hint = snapshot.explanation_ru || snapshot.explanation_es || snapshot.explanation_en || 'Подсказка недоступна';
      boostEffect.hint = hint;
    }
  } else if (boostType === 'screen_injector') {
    boostEffect = {
      success: true,
      boost_type: 'screen_injector',
      popup_count: 3,
      duration_ms: 10000,
    };
  } else if (boostType === 'input_lag') {
    boostEffect = {
      success: true,
      boost_type: 'input_lag',
      delay_ms: 1500,
      duration_ms: 5000,
    };
  } else if (boostType === 'gps_spoofing') {
    boostEffect = {
      success: true,
      boost_type: 'gps_spoofing',
      shuffle_duration_ms: 1000,
    };
  } else if (boostType === 'police_backdoor') {
    boostEffect = {
      success: true,
      boost_type: 'police_backdoor',
      block_duration_ms: 8000,
      captcha_required: true,
    };
  } else if (boostType === 'cryptolocker') {
    boostEffect = {
      success: true,
      boost_type: 'cryptolocker',
      encrypted: true,
      duration_ms: 30000,
    };
  } else if (boostType === 'fog_screen') {
    boostEffect = { success: true, boost_type: 'fog_screen', duration_ms: 600000 }; // 10min DB TTL — player must complete all 16
  } else if (boostType === 'ice_screen') {
    boostEffect = { success: true, boost_type: 'ice_screen', duration_ms: 20000 };
  } else if (boostType === 'sun_glare') {
    boostEffect = { success: true, boost_type: 'sun_glare', duration_ms: 18000 };
  } else if (boostType === 'rain_storm') {
    boostEffect = { success: true, boost_type: 'rain_storm', duration_ms: 20000 };
  } else if (boostType === 'bug_splat') {
    boostEffect = { success: true, boost_type: 'bug_splat', duration_ms: 20000 };
  } else if (boostType === 'oil_spill') {
    boostEffect = { success: true, boost_type: 'oil_spill', duration_ms: 18000 };
  }

  // Получаем информацию о бусте из БД
  const { data: boostDef } = await supabase
    .from('boost_definitions')
    .select('target_type, category, mode')
    .eq('type', boostType)
    .single();

  // Если буст влияет на противника - сохраняем в БД для broadcast через postgres_changes
  if (boostDef && (boostDef.target_type === 'opponent' || boostDef.target_type === 'both')) {
    const { data: players } = await supabase
      .from('duel_players')
      .select('id, user_id')
      .eq('duel_id', duel_id);

    if (players && players.length >= 2) {
      const opponent = players.find(p => p.user_id !== null && !p.is_bot);

      if (opponent) {
        const durationMs = boostEffect.duration_ms || 10000;
        const expiresAt = new Date(Date.now() + durationMs).toISOString();

        const { error: exploitError } = await supabase
          .from('duel_active_exploits')
          .insert({
            duel_id,
            target_player_id: opponent.id,
            exploit_type: boostType,
            attacker_player_id: botPlayer.id,
            effect_data: boostEffect,
            expires_at: expiresAt,
            is_active: true,
          });

        if (exploitError) {
          console.error('[bot_use_boost] Error saving exploit to DB:', exploitError);
        } else {
          console.log('[bot_use_boost] ✅ Bot exploit saved to DB, client will receive via postgres_changes');
        }
      }
    }
  }

  // Создаем уведомление для игрока о том, что бот использовал буст
  const { data: humanPlayer } = await supabase
    .from('duel_players')
    .select('user_id')
    .eq('duel_id', duel_id)
    .not('user_id', 'is', null)
    .eq('is_bot', false)
    .single();

  if (humanPlayer?.user_id) {
    const botName = botPlayer.bot_name || botPlayer.name || 'Бот';

    try {
      await createNotification({
        duel_id,
        type: 'boost',
        title: `⚠️ ${botName} использовал буст!`,
        message: boostType === 'screen_injector' ? 'Data Leak активирован! 🛢️' :
          boostType === 'input_lag' ? 'Input Lag активирован!' :
            boostType === 'gps_spoofing' ? 'GPS Spoofing активирован!' :
              boostType === 'police_backdoor' ? 'Police Backdoor активирован!' :
                boostType === 'cryptolocker' ? 'Cryptolocker активирован! 🔒' :
                  'Бот использовал буст!',
        icon: '⚡',
        metadata: {
          boost_type: boostType,
          opponent_name: botName,
          is_bot: true,
        }
      }, humanPlayer.user_id, supabase);
    } catch (err) {
      console.error('[bot_use_boost] Error creating boost notification:', err);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    boost_type: boostType,
    effect: boostEffect,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
