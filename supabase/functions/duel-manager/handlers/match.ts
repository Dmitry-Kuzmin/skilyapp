import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import {
  corsHeaders,
  createDuelSchema,
  joinDuelSchema,
  findMatchSchema,
  generateDuelCode,
  getDeterministicBotName,
  generateBotProfile,
  getInsuranceConfig
} from '../../_shared/duel-helpers.ts';
import { createNotification, getOpponentName } from '../lib/notifications.ts';
import { settleBetPayout } from '../lib/payout.ts';
import { fetchRandomQuestions, getPlayersByDuel } from '../lib/db-helpers.ts';
import {
  BASE_WIN_COINS_NO_BET,
  BASE_DRAW_COINS_NO_BET,
  calculateSeasonReward,
  duelRiskMultiplier
} from '../lib/scoring.ts';

export async function handleCreateDuel(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const validated = createDuelSchema.parse(params);
  const {
    num_questions,
    categories,
    difficulty,
    bet_amount = 0,
    bet_type = 'none',
    insurance_enabled,
    insurance_rate,
    insurance_coverage_rate,
    security_context,
    license_category // New param
  } = validated;

  const hostInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
    enabled: insurance_enabled,
    rate: insurance_rate,
    coverageRate: insurance_coverage_rate
  }) : { enabled: false, rate: 0, coverageRate: 0, premium: 0 };

  // Map Category to special Country Code for C/D
  let duelCountry = 'spain';
  // Retrieve profile first to check preferred_country
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('coins, preferred_country')
    .eq('id', profileId)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  duelCountry = profile.preferred_country || 'spain';
  if ((duelCountry === 'russia' || duelCountry === 'ru') && license_category === 'C_D') {
    duelCountry = 'ru_cd';
  }

  if (bet_amount > 0) {
    const requiredCoins = bet_amount + (hostInsurance.premium || 0);

    if ((profile.coins || 0) < requiredCoins) {
      return new Response(JSON.stringify({ error: `Insufficient coins. You need ${requiredCoins} coins but only have ${profile.coins || 0}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct bet and insurance premium from host
    await supabase.rpc('increment_profile_value', {
      p_profile_id: profileId,
      p_column: 'coins',
      p_amount: -requiredCoins
    });
  }

  // Generate unique code
  let code = generateDuelCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from('duels')
      .select('id')
      .eq('code', code)
      .single();

    if (!existing) break;
    code = generateDuelCode();
    attempts++;
  }

  // Generate more random seed using timestamp + random
  const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);

  // 🆕 TTL для асинхронных дуэлей: 24 часа
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .insert({
      code,
      host_user: profileId,
      num_questions,
      categories,
      difficulty,
      question_seed: questionSeed,
      bet_amount,
      bet_type,
      expires_at: expiresAt, // 24 часа до истечения
      country: duelCountry,
    })
    .select()
    .single();

  if (duelError) throw duelError;

  // Record bet transaction if bet_amount > 0
  if (bet_amount > 0) {
    await supabase
      .from('duel_transactions')
      .insert({
        duel_id: duel.id,
        user_id: profileId,
        amount: -bet_amount,
        transaction_type: 'bet'
      });

    if (hostInsurance.premium > 0) {
      await supabase
        .from('duel_transactions')
        .insert({
          duel_id: duel.id,
          user_id: profileId,
          amount: -hostInsurance.premium,
          transaction_type: 'insurance_premium'
        });
    }

    await supabase
      .from('duel_bets')
      .upsert({
        duel_id: duel.id,
        host_user: profileId,
        bet_amount,
        currency: 'coins',
        host_confirmed: true,
        opponent_confirmed: false,
        status: 'pending',
        host_insurance_enabled: hostInsurance.enabled,
        host_insurance_rate: hostInsurance.rate,
        host_insurance_premium: hostInsurance.premium,
        host_coverage_rate: hostInsurance.coverageRate,
        ip_hash_host: security_context?.ip_hash || null
      }, { onConflict: 'duel_id' });
  }

  // ✅ Хост уже добавлен через триггер auto_add_host_to_duel_players
  // (см. миграцию 20260207_auto_add_host_to_duel_players.sql)
  console.log('[create_duel] ✅ Host automatically added by trigger');

  return new Response(JSON.stringify({ duel, code }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleFindMatch(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  // Логируем входящие параметры для диагностики
  console.log('[find_match] 📥 Received params:', JSON.stringify(params, null, 2));
  console.log('[find_match] 📥 Params types:', {
    num_questions: typeof params.num_questions,
    bet_amount: typeof params.bet_amount,
    difficulty: typeof params.difficulty,
    bet_type: typeof params.bet_type,
    insurance_enabled: typeof params.insurance_enabled,
    has_categories: 'categories' in params,
  });

  // Валидация с детальной обработкой ошибок
  let validated;
  try {
    validated = findMatchSchema.parse(params);
    console.log('[find_match] ✅ Validation passed:', {
      num_questions: validated.num_questions,
      bet_amount: validated.bet_amount,
      difficulty: validated.difficulty,
      bet_type: validated.bet_type,
      license_category: validated.license_category
    });

    // Map Category to special Country Code for C/D (Same logic)
    // We need profile's preferred country. Is it available?
    // Not yet fetched. We fetch it below.

  } catch (validationError: unknown) {
    console.error('[find_match] ❌ Validation error:', {
      error: validationError.message,
      issues: validationError.issues,
      receivedParams: params,
      receivedParamsTypes: {
        num_questions: typeof params.num_questions,
        bet_amount: typeof params.bet_amount,
        difficulty: typeof params.difficulty,
        bet_type: typeof params.bet_type,
      }
    });
    return new Response(JSON.stringify({
      error: 'Validation failed',
      message: validationError.message,
      details: validationError.issues,
      received: params
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const {
    num_questions,
    categories,
    difficulty,
    bet_amount = 0,
    bet_type = 'none',
    insurance_enabled,
    insurance_rate,
    insurance_coverage_rate,
    security_context
  } = validated;

  console.log('[find_match] Starting matchmaking for profile:', profileId);

  // Получаем уровень игрока для определения сложности бота
  const { data: playerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('duel_pass_level, coins, preferred_country')
    .eq('id', profileId)
    .single();

  if (profileError || !playerProfile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const playerLevel = playerProfile.duel_pass_level || 1;
  let playerCountry = playerProfile.preferred_country || 'spain';
  if ((playerCountry === 'russia' || playerCountry === 'ru') && validated.license_category === 'C_D') {
    playerCountry = 'ru_cd';
  }

  // Проверяем монеты для ставки
  if (bet_amount > 0) {
    const hostInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
      enabled: insurance_enabled,
      rate: insurance_rate,
      coverageRate: insurance_coverage_rate
    }) : { enabled: false, rate: 0, coverage_rate: 0, premium: 0 };

    const requiredCoins = bet_amount + (hostInsurance.premium || 0);

    if ((playerProfile.coins || 0) < requiredCoins) {
      return new Response(JSON.stringify({ error: `Insufficient coins. You need ${requiredCoins} coins but only have ${playerProfile.coins || 0}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Шаг 1: Добавляем игрока в очередь поиска
  // Подготавливаем данные для вставки (categories может быть null)
  const queueData: Record<string, any> = {
    profile_id: profileId,
    num_questions,
    difficulty: difficulty || 'mix',
    bet_amount: bet_amount || 0,
    bet_type: bet_type || 'none',
    expires_at: new Date(Date.now() + 30000).toISOString(), // 30 секунд
    matched: false,
    preferred_country: playerCountry
  };

  // Добавляем categories только если они есть
  if (categories && Array.isArray(categories) && categories.length > 0) {
    queueData.categories = categories;
  }

  console.log('[find_match] 📝 Inserting into queue:', {
    ...queueData,
    profile_id: `${queueData.profile_id.substring(0, 8)}...`
  });

  const { data: queueEntry, error: queueInsertError } = await supabase
    .from('duel_matchmaking_queue')
    .insert(queueData)
    .select()
    .single();

  if (queueInsertError) {
    console.error('[find_match] ❌ Error adding to queue:', {
      error: queueInsertError,
      message: queueInsertError.message,
      code: queueInsertError.code,
      details: queueInsertError.details,
      hint: queueInsertError.hint,
      data: {
        profile_id: profileId,
        num_questions,
        difficulty,
        categories,
        bet_amount,
        bet_type,
      }
    });
    return new Response(JSON.stringify({
      error: 'Failed to join matchmaking queue',
      details: queueInsertError.message,
      code: queueInsertError.code
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[find_match] ✅ Added to queue:', queueEntry.id);

  // Шаг 2: Ищем реального соперника в очереди (5-10 секунд)
  const searchStartTime = Date.now();
  const searchTimeout = 8000; // 8 секунд поиска
  let matchedOpponent = null;

  while (Date.now() - searchStartTime < searchTimeout) {
    // Ищем подходящего соперника в очереди с FOR UPDATE SKIP LOCKED для защиты от race condition
    // Используем RPC для выполнения SQL с FOR UPDATE SKIP LOCKED
    const { data: queueEntries, error: queueError } = await supabase.rpc('find_matchmaking_opponent', {
      p_profile_id: profileId,
      p_bet_amount: bet_amount,
      p_difficulty: difficulty || 'mix',
      p_country: playerCountry
    });

    if (!queueError && queueEntries && queueEntries.length > 0) {
      matchedOpponent = queueEntries[0];
      console.log('[find_match] ✅ Found real opponent:', matchedOpponent.profile_id);
      break;
    }

    // Ждем 1 секунду перед следующей попыткой
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Шаг 2: Если нашли реального соперника - создаем дуэль
  if (matchedOpponent) {
    // Соперник уже помечен как matched в RPC функции find_matchmaking_opponent
    // Удаляем обе записи из очереди
    await supabase
      .from('duel_matchmaking_queue')
      .delete()
      .in('id', [queueEntry.id, matchedOpponent.id]);

    // Проверяем баланс соперника прямо сейчас (на случай если он все потратил пока ждал)
    const { data: opponentProfile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', matchedOpponent.profile_id)
      .single();

    if (bet_amount > 0 && (opponentProfile?.coins || 0) < bet_amount) {
      console.warn(`[find_match] ⚠️ Opponent ${matchedOpponent.profile_id} no longer has enough coins. Match cancelled.`);
      // Не создаем дуэль, возвращаем ошибку - игрок попробует еще раз
      return new Response(JSON.stringify({ error: 'Opponent no longer has enough coins' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Создаем дуэль (используем логику из create_duel)
    const joinerInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
      enabled: insurance_enabled,
      rate: insurance_rate,
      coverageRate: insurance_coverage_rate
    }) : { enabled: false, rate: 0, coverage_rate: 0, premium: 0 };

    if (bet_amount > 0) {
      // Deduct from JOINER (current user)
      await supabase.rpc('increment_profile_value', {
        p_profile_id: profileId,
        p_column: 'coins',
        p_amount: -(bet_amount + (joinerInsurance.premium || 0))
      });

      // Deduct from HOST (matched opponent)
      // Note: Host has no insurance here as it's not and option in matchmaking queue yet
      await supabase.rpc('increment_profile_value', {
        p_profile_id: matchedOpponent.profile_id,
        p_column: 'coins',
        p_amount: -bet_amount
      });
    }

    let code = generateDuelCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('duels')
        .select('id')
        .eq('code', code)
        .single();

      if (!existing) break;
      code = generateDuelCode();
      attempts++;
    }

    const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);

    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .insert({
        code,
        host_user: matchedOpponent.profile_id, // Person who was waiting is the host
        num_questions,
        categories,
        difficulty,
        question_seed: questionSeed,
        bet_amount,
        bet_type,
        country: playerCountry,
      })
      .select()
      .single();

    if (duelError) throw duelError;

    // Record transactions for both players
    if (bet_amount > 0) {
      // Transaction for Joiner
      await supabase.from('duel_transactions').insert({
        duel_id: duel.id,
        user_id: profileId,
        amount: -bet_amount,
        transaction_type: 'bet'
      });

      if (joinerInsurance.premium > 0) {
        await supabase.from('duel_transactions').insert({
          duel_id: duel.id,
          user_id: profileId,
          amount: -joinerInsurance.premium,
          transaction_type: 'insurance_premium'
        });
      }

      // Transaction for Host
      await supabase.from('duel_transactions').insert({
        duel_id: duel.id,
        user_id: matchedOpponent.profile_id,
        amount: -bet_amount,
        transaction_type: 'bet'
      });
    }

    // ✅ Хост (matchedOpponent) уже добавлен через триггер auto_add_host_to_duel_players
    // Нам нужно добавить только присоединившегося игрока (profileId)
    await supabase
      .from('duel_players')
      .insert({
        duel_id: duel.id,
        user_id: profileId,
        is_host: false,
      });

    // Удаляем обе записи из очереди (соперник уже помечен как matched в RPC функции)
    await supabase
      .from('duel_matchmaking_queue')
      .delete()
      .in('id', [queueEntry.id, matchedOpponent.id]);

    // Автозапуск дуэли (логика из join_duel)
    try {
      console.log('[find_match] 🚀 AUTO-START: 2 players detected, starting duel...');

      // Auto-start: Load questions using efficient fetch
      console.log('[find_match] Loading questions for 2 real players...');
      // Need to fetch slightly more to allow for better shuffle? No, fetchRandomQuestions handles shuffle
      const selectedQuestions = await fetchRandomQuestions(
        supabase,
        num_questions,
        playerCountry,
        questionSeed,
        categories,
        difficulty,
      );

      if (!selectedQuestions || selectedQuestions.length === 0) {
        console.error('[find_match] ❌ No questions found with filters');
        throw new Error('No questions found with filters');
      }

      console.log(`[find_match] ✅ Selected ${selectedQuestions.length} questions using seed ${questionSeed}`);

      // Insert duel questions
      const duelQuestions = selectedQuestions.map((q: { id: string; question_ru: string; question_es: string; question_en: string; image_url: string | null; difficulty?: string; answer_options: Array<{ id: string; text_ru: string; text_es: string; text_en: string; is_correct: boolean; position: number }> }, idx: number) => ({
        duel_id: duel.id,
        question_id: q.id,
        position: idx + 1,
        question_snapshot: {
          question_ru: q.question_ru,
          question_es: q.question_es,
          question_en: q.question_en,
          image_url: q.image_url,
          difficulty: q.difficulty,
          answer_options: q.answer_options.map((opt: { id: string; text_ru: string; text_es: string; text_en: string; is_correct: boolean; position: number }) => ({
            id: opt.id,
            text_ru: opt.text_ru,
            text_es: opt.text_es,
            text_en: opt.text_en,
            is_correct: opt.is_correct,
            position: opt.position,
          })),
        },
        correct_option_ids: q.answer_options
          .filter((opt: { is_correct: boolean }) => opt.is_correct)
          .map((opt: { id: string }) => opt.id),
      }));

      const { error: insertError } = await supabase
        .from('duel_questions')
        .insert(duelQuestions);

      if (insertError) {
        console.error('[find_match] ❌ Error inserting questions:', insertError);
        throw insertError;
      }

      // Update duel status to active
      await supabase
        .from('duels')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', duel.id);

      console.log('[find_match] ✅ Duel auto-started successfully');
    } catch (autoStartError) {
      console.error('[find_match] ❌ Error during auto-start:', autoStartError);
      // Не прерываем выполнение, дуэль создана, но не запущена
    }

    return new Response(JSON.stringify({
      duel,
      code,
      opponent_type: 'real',
      auto_started: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Шаг 3: Если не нашли реального соперника - создаем бота
  console.log('[find_match] ⚠️ No real opponent found, creating bot...');

  // 🛡️ Получаем win_streak игрока для адаптивной сложности бота (Anti-Farming Protection)
  const { data: playerProfileForBot, error: profileErrorForBot } = await supabase
    .from('profiles')
    .select('win_streak')
    .eq('id', profileId)
    .single();

  const winStreak = playerProfileForBot?.win_streak || 0;
  console.log(`[find_match] 🛡️ Player win streak: ${winStreak} (anti-farming protection)`);

  // СНАЧАЛА генерируем ID для бота, чтобы имя было детерминированным
  const botPlayerId = crypto.randomUUID();

  // Генерируем профиль бота
  const botProfile = generateBotProfile(playerLevel, winStreak, botPlayerId);
  console.log('[find_match] Generated bot profile:', botProfile);

  // Создаем дуэль с ботом
  const hostInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
    enabled: insurance_enabled,
    rate: insurance_rate,
    coverageRate: insurance_coverage_rate
  }) : { enabled: false, rate: 0, coverageRate: 0, premium: 0 };

  if (bet_amount > 0) {
    await supabase.rpc('increment_profile_value', {
      p_profile_id: profileId,
      p_column: 'coins',
      p_amount: -(bet_amount + (hostInsurance.premium || 0))
    });
  }

  let code = generateDuelCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from('duels')
      .select('id')
      .eq('code', code)
      .single();

    if (!existing) break;
    code = generateDuelCode();
    attempts++;
  }

  const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);

  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .insert({
      code,
      host_user: profileId,
      num_questions,
      categories,
      difficulty,
      question_seed: questionSeed,
      bet_amount,
      bet_type,
      country: playerCountry,
    })
    .select()
    .single();

  if (duelError) throw duelError;

  // Record bet transaction for human player in BOT duel
  if (bet_amount > 0) {
    await supabase.from('duel_transactions').insert({
      duel_id: duel.id,
      user_id: profileId,
      amount: -bet_amount,
      transaction_type: 'bet'
    });

    if (hostInsurance.premium > 0) {
      await supabase.from('duel_transactions').insert({
        duel_id: duel.id,
        user_id: profileId,
        amount: -hostInsurance.premium,
        transaction_type: 'insurance_premium'
      });
    }
  }

  // ✅ Хост уже добавлен через триггер auto_add_host_to_duel_players
  // (см. миграцию 20260207_auto_add_host_to_duel_players.sql)
  console.log('[find_match] Host already added by trigger, proceeding to add bot...');


  const { data: botPlayer, error: botError } = await supabase
    .from('duel_players')
    .insert({
      id: botPlayerId, // Используем заранее сгенерированный ID
      duel_id: duel.id,
      user_id: null, // Бот не имеет user_id
      is_host: false,
      is_bot: true,
      bot_difficulty: botProfile.difficulty,
      bot_name: botProfile.name, // Сохраняем имя бота в БД
      name: botProfile.name, // Также сохраняем в поле name для совместимости
    })
    .select()
    .single();

  if (botError) {
    console.error('[find_match] ❌ Error creating bot player:', botError);
    throw botError;
  }

  console.log('[find_match] ✅ Bot player created:', botPlayer.id);

  // Удаляем свою заявку из очереди (бот создан, реального соперника не нашли)
  await supabase
    .from('duel_matchmaking_queue')
    .delete()
    .eq('id', queueEntry.id);

  // Автозапуск дуэли с ботом (аналогично реальному сопернику)
  let autoStarted = false;
  try {
    console.log('[find_match] 🚀 AUTO-START with bot: starting duel...');

    // Auto-start with bot: Load questions
    console.log('[find_match] Loading questions for bot duel...');
    const tBotStart = Date.now();
    const selectedQuestions = await fetchRandomQuestions(
      supabase,
      num_questions,
      playerCountry,
      questionSeed,
      categories,
      difficulty,
    );
    console.log(`[find_match] ⏱️ Bot questions loaded in ${Date.now() - tBotStart}ms`);

    if (!selectedQuestions || selectedQuestions.length === 0) {
      console.error('[find_match] ❌ No questions found via fetch');
      throw new Error('No questions found');
    }

    console.log(`[find_match] ✅ Bot duel: Selected ${selectedQuestions.length} random questions using seed ${questionSeed}`);

    // Insert duel questions
    const duelQuestions = selectedQuestions.map((q: any, idx: number) => ({
      duel_id: duel.id,
      question_id: q.id,
      position: idx + 1,
      question_snapshot: {
        question_ru: q.question_ru,
        question_es: q.question_es,
        question_en: q.question_en,
        image_url: q.image_url,
        difficulty: q.difficulty,
        answer_options: (q.answer_options || []).map((opt: any) => ({
          id: opt.id,
          text_ru: opt.text_ru,
          text_es: opt.text_es,
          text_en: opt.text_en,
          is_correct: opt.is_correct,
          position: opt.position,
        })),
      },
      correct_option_ids: (q.answer_options || [])
        .filter((opt: any) => opt.is_correct)
        .map((opt: any) => opt.id),
    }));

    const { error: insertError } = await supabase
      .from('duel_questions')
      .insert(duelQuestions);

    if (insertError) {
      console.error('[find_match] ❌ Error inserting questions:', insertError);
      throw insertError;
    }

    // Update duel status to active
    await supabase
      .from('duels')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', duel.id);

    // Create start notification for BOT duel
    try {
      await createNotification({
        duel_id: duel.id,
        recipient_profile_id: profileId, // Уведомляем человека
        type: 'start',
        metadata: {
          opponent_name: botProfile.name
        }
      }, profileId, supabase);
    } catch (notifErr) {
      console.error('[find_match] Error creating bot start notification:', notifErr);
    }

    console.log('[find_match] ✅ Duel with bot auto-started successfully');
    autoStarted = true;
  } catch (autoStartError) {
    console.error('[find_match] ❌ Error during auto-start with bot:', autoStartError);
    // Не прерываем выполнение, дуэль создана, но не запущена
  }

  return new Response(JSON.stringify({
    duel: { ...duel, status: autoStarted ? 'active' : 'waiting' },
    code,
    opponent_type: 'bot',
    bot_name: botProfile.name,
    bot_avatar: botProfile.avatar,
    auto_started: autoStarted
  }), ...{
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleCancelDuel(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;

  if (!duel_id) {
    return new Response(JSON.stringify({ error: 'duel_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get duel details
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duel_id)
    .single();

  if (duelError || !duel) {
    return new Response(JSON.stringify({ error: 'Duel not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if user is the host
  if (duel.host_user !== profileId) {
    return new Response(JSON.stringify({ error: 'Only the host can cancel the duel' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if duel is still waiting (not started)
  if (duel.status !== 'waiting') {
    return new Response(JSON.stringify({ error: 'Cannot cancel duel that has already started or finished' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if opponent already joined
  const { data: players, error: playersError } = await supabase
    .from('duel_players')
    .select('id, user_id')
    .eq('duel_id', duel_id);

  if (playersError) {
    return new Response(JSON.stringify({ error: 'Failed to check players' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (players && players.length > 1) {
    return new Response(JSON.stringify({ error: 'Cannot cancel duel after opponent joined' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Refund bet to host
  if (duel.bet_amount > 0) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', profileId)
      .single();

    if (!profileError && profile) {
      await supabase.rpc('increment_profile_value', {
        p_profile_id: profileId,
        p_column: 'coins',
        p_amount: duel.bet_amount
      });

      // Record refund transaction
      await supabase
        .from('duel_transactions')
        .insert({
          duel_id: duel_id,
          user_id: profileId,
          amount: duel.bet_amount,
          transaction_type: 'refund'
        });

      const { data: betRow } = await supabase
        .from('duel_bets')
        .select('host_insurance_premium')
        .eq('duel_id', duel_id)
        .maybeSingle();

      if (betRow?.host_insurance_premium) {
        await supabase.rpc('increment_profile_value', {
          p_profile_id: profileId,
          p_column: 'coins',
          p_amount: betRow.host_insurance_premium
        });
        await supabase
          .from('duel_transactions')
          .insert({
            duel_id: duel_id,
            user_id: profileId,
            amount: betRow.host_insurance_premium,
            transaction_type: 'insurance_refund'
          });
      }

      await supabase
        .from('duel_bets')
        .update({ status: 'cancelled' })
        .eq('duel_id', duel_id);
    }
  }

  // Update duel status to cancelled
  await supabase
    .from('duels')
    .update({ status: 'cancelled' })
    .eq('id', duel_id);

  return new Response(JSON.stringify({
    success: true,
    refunded: duel.bet_amount
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleStartDuelNow(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;
  if (!duel_id) {
    console.warn('[start_duel_now] ⚠️ Missing duel_id');
    return new Response(JSON.stringify({ error: 'Missing duel_id' }), { status: 400, headers: corsHeaders });
  }

  console.log('[start_duel_now] 🚀 Manual start for duel:', duel_id, 'by:', profileId);

  // 1. Get duel info
  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duel_id)
    .single();

  if (duelError || !duel) {
    console.warn('[start_duel_now] ⚠️ Duel not found');
    return new Response(JSON.stringify({ error: 'Duel not found' }), { status: 404, headers: corsHeaders });
  }

  if (duel.status !== 'waiting') {
    console.warn('[start_duel_now] ⚠️ Duel not in waiting status:', duel.status);
    return new Response(JSON.stringify({ error: 'Duel already started' }), { status: 400, headers: corsHeaders });
  }

  // 2. Generate questions
  console.log('[start_duel_now] Loading questions via efficient fetch...');

  const selectedQuestions = await fetchRandomQuestions(
    supabase,
    duel.num_questions || 10,
    duel.country || 'spain',
    duel.question_seed,
    duel.categories,
    duel.difficulty,
  );

  if (!selectedQuestions || selectedQuestions.length === 0) {
    console.error('[start_duel_now] ❌ No questions found');
    return new Response(JSON.stringify({ error: 'Failed to find questions' }), { status: 500, headers: corsHeaders });
  }

  const duelQuestions = selectedQuestions.map((q, idx) => ({
    duel_id: duel.id,
    question_id: q.id,
    position: idx + 1,
    question_snapshot: {
      question_ru: q.question_ru,
      question_es: q.question_es,
      question_en: q.question_en,
      image_url: q.image_url,
      answer_options: q.answer_options || [],
      difficulty: q.difficulty,
    },
    correct_option_ids: (q.answer_options || [])
      .filter((opt: { is_correct: boolean }) => opt.is_correct)
      .map((opt: { id: string }) => opt.id),
  }));

  // 🔍 DEBUG: Log correct_option_ids
  console.log('[start_duel_now] 🔍 DEBUG: Sample duelQuestion:', {
    question_id: duelQuestions[0]?.question_id,
    answer_options_count: duelQuestions[0]?.question_snapshot?.answer_options?.length,
    correct_option_ids: duelQuestions[0]?.correct_option_ids
  });

  const { error: insertError } = await supabase.from('duel_questions').insert(duelQuestions);
  if (insertError) {
    console.error('[start_duel_now] ❌ Error inserting questions:', insertError);
    return new Response(JSON.stringify({ error: 'Failed to save questions' }), { status: 500, headers: corsHeaders });
  }

  // 3. Update status & RESET SCORES (Critical for starting with 0)
  console.log('[start_duel_now] Resetting player scores to 0...');
  await supabase.from('duel_players').update({ score: 0, correct_count: 0, is_finished: false }).eq('duel_id', duel.id);
  await supabase.from('duels').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', duel.id);

  console.log('[start_duel_now] ✅ Duel started manually!');
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleJoinDuel(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const validated = joinDuelSchema.parse(params);
  let { code, insurance_enabled, insurance_rate, insurance_coverage_rate, security_context } = validated;

  // Normalize code to uppercase and ensure it's exactly 4 characters
  code = code.toUpperCase().trim().slice(0, 4);

  // Validate length after normalization
  if (code.length !== 4) {
    return new Response(JSON.stringify({ error: 'Code must be exactly 4 characters' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (duelError) {
    console.error('[join_duel] ❌ Error finding duel:', duelError);
    throw duelError;
  }

  // 🛡️ AUTO-CREATE FALLBACK: If duel not found, create it on the fly!
  // This handles cases where the bot generates a code but doesn't store it yet.
  if (!duel) {
    console.log('[join_duel] ⚠️ Duel not found, auto-creating with code:', code);
    const { data: newDuel, error: createError } = await supabase
      .from('duels')
      .insert({
        code,
        host_user: profileId,
        status: 'waiting',
        num_questions: 10,
        difficulty: 'mix',
        question_seed: Math.floor(Math.random() * 1000000),
        bet_amount: 0,
        bet_type: 'none'
      })
      .select()
      .single();

    if (createError) {
      console.error('[join_duel] ❌ Error auto-creating duel:', createError);
      throw createError;
    }

    duel = newDuel;

    // КРИТИЧНО: Добавляем хоста в duel_players, иначе дуэль будет пустой
    const { error: hostPlayerError } = await supabase
      .from('duel_players')
      .insert({
        duel_id: duel.id,
        user_id: profileId,
        is_host: true
      });

    if (hostPlayerError) {
      console.error('[join_duel] ❌ Error adding host player during auto-create:', hostPlayerError);
    }

    console.log('[join_duel] ✅ Auto-created duel and added host:', duel.id);

    // Возвращаем успех сразу, так как мы уже добавили игрока
    return new Response(JSON.stringify({
      duel,
      player: { user_id: profileId, is_host: true },
      auto_started: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if duel is still waiting
  if (duel.status !== 'waiting') {
    return new Response(JSON.stringify({ error: 'Duel already started or finished' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 🛡️ FIX: If user is trying to join their own duel or is already in it
  if (duel.host_user === profileId) {
    console.log('[join_duel] 🔄 User is host, redirecting to lobby');
    const { data: hostPlayer } = await supabase
      .from('duel_players')
      .select('*')
      .eq('duel_id', duel.id)
      .eq('user_id', profileId)
      .maybeSingle();

    return new Response(JSON.stringify({
      duel,
      player: hostPlayer || { user_id: profileId, is_host: true },
      auto_started: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if user is already in this duel
  const { data: existingPlayer } = await supabase
    .from('duel_players')
    .select('*')
    .eq('duel_id', duel.id)
    .eq('user_id', profileId)
    .single();

  if (existingPlayer) {
    return new Response(JSON.stringify({ error: 'You are already in this duel' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if joining player has enough coins for bet
  const betAmount = duel.bet_amount || 0;
  if (betAmount > 0) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const opponentInsurance = getInsuranceConfig(betAmount, {
      enabled: insurance_enabled,
      rate: insurance_rate,
      coverageRate: insurance_coverage_rate
    });
    const requiredCoins = betAmount + (opponentInsurance.premium || 0);

    if ((profile.coins || 0) < requiredCoins) {
      return new Response(JSON.stringify({ error: `Insufficient coins for bet. You need ${requiredCoins} coins but only have ${profile.coins || 0}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct bet and premium
    await supabase.rpc('increment_profile_value', {
      p_profile_id: profileId,
      p_column: 'coins',
      p_amount: -requiredCoins
    });

    await supabase
      .from('duel_transactions')
      .insert({
        duel_id: duel.id,
        user_id: profileId,
        amount: -betAmount,
        transaction_type: 'bet'
      });

    if (opponentInsurance.premium > 0) {
      await supabase
        .from('duel_transactions')
        .insert({
          duel_id: duel.id,
          user_id: profileId,
          amount: -opponentInsurance.premium,
          transaction_type: 'insurance_premium'
        });
    }

    const { data: existingBet } = await supabase
      .from('duel_bets')
      .select('*')
      .eq('duel_id', duel.id)
      .maybeSingle();

    if (existingBet) {
      await supabase
        .from('duel_bets')
        .update({
          opponent_user: profileId,
          opponent_confirmed: true,
          status: 'confirmed',
          opponent_insurance_enabled: opponentInsurance.enabled,
          opponent_insurance_rate: opponentInsurance.rate,
          opponent_insurance_premium: opponentInsurance.premium,
          opponent_coverage_rate: opponentInsurance.coverageRate,
          ip_hash_opponent: security_context?.ip_hash || null
        })
        .eq('duel_id', duel.id);
    } else {
      await supabase
        .from('duel_bets')
        .insert({
          duel_id: duel.id,
          host_user: duel.host_user,
          opponent_user: profileId,
          bet_amount: betAmount,
          currency: 'coins',
          host_confirmed: true,
          opponent_confirmed: true,
          status: 'confirmed',
          opponent_insurance_enabled: opponentInsurance.enabled,
          opponent_insurance_rate: opponentInsurance.rate,
          opponent_insurance_premium: opponentInsurance.premium,
          opponent_coverage_rate: opponentInsurance.coverageRate,
          ip_hash_opponent: security_context?.ip_hash || null
        });
    }
  }

  console.log('[Duel Manager] Adding player to duel. DuelId:', duel.id, 'ProfileId:', profileId);

  // Add player to duel using correct user_id (which is profile.id)
  const { data: player, error: playerError } = await supabase
    .from('duel_players')
    .insert({
      duel_id: duel.id,
      user_id: profileId,  // This is profile.id
      is_host: false,
    })
    .select()
    .single();

  if (playerError) {
    console.error('[Duel Manager] ❌ Error adding player:', playerError);
    console.error('[Duel Manager] Error details:', JSON.stringify(playerError, null, 2));
    throw playerError;
  }

  console.log('[Duel Manager] ✅ Player created:', player?.id);

  // Check if we now have 2 players - auto-start duel
  const { data: allPlayers, error: playersCheckError } = await supabase
    .from('duel_players')
    .select('id, user_id, is_bot')
    .eq('duel_id', duel.id);

  if (playersCheckError) {
    console.error('[join_duel] ❌ Error checking players:', playersCheckError);
  }

  console.log('[join_duel] ✅ Player count check:', {
    count: allPlayers?.length,
    players: allPlayers?.map(p => ({ id: p.id, user_id: p.user_id, is_bot: p.is_bot })),
    duel_id: duel.id
  });

  // КРИТИЧНО: Проверяем, что есть ровно 2 игрока (не ботов) для автозапуска
  const realPlayers = allPlayers?.filter(p => !p.is_bot) || [];
  const totalPlayers = allPlayers?.length || 0;

  if (realPlayers.length === 2 && totalPlayers >= 2) {
    console.log('[join_duel] 🚀 AUTO-START: 2 real players detected, starting duel...');

    try {
      // Auto-start: Load questions
      console.log('[join_duel] Loading questions via efficient fetch...');
      const selectedQuestions = await fetchRandomQuestions(
        supabase,
        duel.num_questions,
        duel.country || 'spain',
        duel.question_seed,
        duel.categories,
        duel.difficulty,
      );

      if (!selectedQuestions || selectedQuestions.length === 0) {
        console.error('[join_duel] ❌ No questions found via fetch');
        throw new Error('No questions found');
      }

      console.log(`[join_duel] ✅ Selected ${selectedQuestions.length} random questions using seed ${duel.question_seed}`);

      // Insert duel questions with randomly selected set
      const duelQuestions = selectedQuestions.map((q, idx) => {
        const snapshot = {
          question_ru: q.question_ru,
          question_es: q.question_es,
          question_en: q.question_en,
          image_url: q.image_url,
          answer_options: q.answer_options || [],
          difficulty: q.difficulty,
        };

        return {
          duel_id: duel.id,
          question_id: q.id,
          position: idx + 1,
          question_snapshot: snapshot,
          correct_option_ids: (q.answer_options || [])
            .filter((opt: { is_correct: boolean }) => opt.is_correct)
            .map((opt: { id: string }) => opt.id),
        };
      });

      console.log('[join_duel] Inserting duel questions...', duelQuestions.length);
      const { error: insertError } = await supabase.from('duel_questions').insert(duelQuestions);

      if (insertError) {
        console.error('[join_duel] ❌ Error inserting duel questions:', insertError);
        throw insertError;
      }

      console.log('[join_duel] ✅ Duel questions inserted successfully');

      // Update duel status
      console.log('[join_duel] Updating duel status to active...');
      const { error: updateError } = await supabase
        .from('duels')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', duel.id);

      if (updateError) {
        console.error('[join_duel] ❌ Error updating duel status:', updateError);
        throw updateError;
      }

      console.log('[join_duel] ✅✅✅ Duel status updated to ACTIVE successfully!');

      // Create start notification
      // ВАЖНО: Передаем имя соперника в metadata для консистентности уведомления
      try {
        // Для поиска соперника (реального игрока)
        const realOpponent = realPlayers.find(p => p.user_id !== profileId);
        let opponentDisplayName = 'Игрок';

        if (realOpponent) {
          const { data: oppProfile } = await supabase
            .from('profiles')
            .select('first_name, username')
            .eq('id', realOpponent.user_id)
            .single();
          opponentDisplayName = oppProfile?.first_name || oppProfile?.username || 'Игрок';
        }

        await createNotification({
          duel_id: duel.id,
          type: 'start',
          metadata: {
            opponent_name: opponentDisplayName
          }
        }, profileId, supabase);

        console.log('[join_duel] ✅ Start notification created successfully');
      } catch (notifErr: unknown) {
        console.error('[join_duel] Error creating start notification:', notifErr);
      }

      console.log('[join_duel] ✅ Returning response with auto_started: true');
      return new Response(
        JSON.stringify({ duel: { ...duel, status: 'active' }, player, auto_started: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (autoStartError: unknown) {
      console.error('[join_duel] ❌❌❌ CRITICAL ERROR in auto-start:', autoStartError);

      console.warn('[join_duel] ⚠️ Auto-start failed, but player was added. Duel remains in "waiting" status.');
      return new Response(JSON.stringify({
        duel,
        player,
        auto_started: false,
        warning: 'Failed to auto-start duel: ' + (autoStartError instanceof Error ? autoStartError.message : 'Unknown error')
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }


  console.log('[join_duel] ⏳ Only 1 real player, waiting for opponent', {
    realPlayersCount: realPlayers.length,
    totalPlayersCount: totalPlayers,
    players: allPlayers?.map(p => ({ id: p.id, user_id: p.user_id, is_bot: p.is_bot }))
  });
  return new Response(JSON.stringify({ duel, player, auto_started: false }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleStartDuel(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;

  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('*, duel_players(*)')
    .eq('id', duel_id)
    .single();

  if (duelError || !duel) throw new Error('Duel not found');

  if (duel.host_user !== profileId) {
    return new Response(JSON.stringify({ error: 'Only host can start' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get questions using seed and efficient fetch
  const selectedQuestions = await fetchRandomQuestions(
    supabase,
    duel.num_questions,
    duel.country || 'spain',
    duel.question_seed,
    duel.categories,
    duel.difficulty,
  );

  if (!selectedQuestions || selectedQuestions.length === 0) {
    throw new Error('No questions available');
  }

  // Create question snapshots
  const duelQuestions = selectedQuestions.map((q: any, idx: number) => ({
    duel_id: duel.id,
    question_id: q.id,
    position: idx + 1,
    question_snapshot: {
      question_ru: q.question_ru,
      question_es: q.question_es,
      question_en: q.question_en,
      image_url: q.image_url,
      answer_options: q.answer_options || [],
      difficulty: q.difficulty,
    },
    correct_option_ids: (q.answer_options || [])
      .filter((opt: any) => opt.is_correct)
      .map((opt: any) => opt.id),
  }));

  await supabase.from('duel_questions').insert(duelQuestions);

  // Update duel status & RESET SCORES
  console.log('[start_duel] Resetting player scores matching duel_id:', duel.id);
  await supabase.from('duel_players').update({ score: 0, correct_count: 0, is_finished: false }).eq('duel_id', duel.id);

  await supabase
    .from('duels')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', duel.id);

  // Create start notification for opponent (second player)
  // Wrap in try-catch to prevent notification errors from breaking duel start
  try {
    const notifResult = await createNotification({
      duel_id: duel.id,
      type: 'start',
      metadata: {}
    }, profileId, supabase);

    if (!notifResult) {
      console.warn('[start_duel] Failed to create start notification - continuing anyway');
    } else {
      console.log('[start_duel] ✅ Start notification created successfully');
    }
  } catch (notifErr: unknown) {
    console.error('[start_duel] Error creating start notification:', notifErr);
    console.error('[start_duel] Notification error details:', JSON.stringify(notifErr, null, 2));
    // Continue anyway - notification failure shouldn't block duel start
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
