import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import {
  corsHeaders,
  getDeterministicBotName,
  getResultsSchema,
} from '../../_shared/duel-helpers.ts';

export async function handleCheckStatus(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;

  console.log('[Duel Manager] Checking status for duel:', duel_id, 'Profile:', profileId);

  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('id, status, started_at, host_user')
    .eq('id', duel_id)
    .maybeSingle();

  if (duelError) {
    console.error('[Duel Manager] Error checking duel:', duelError);
    throw duelError;
  }

  if (!duel) {
    console.warn('[Duel Manager] Duel not found');
    return new Response(JSON.stringify({ error: 'Duel not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[Duel Manager] Duel status:', duel.status);

  return new Response(JSON.stringify({
    status: duel.status,
    started_at: duel.started_at,
    host_user: duel.host_user,
    num_questions: duel.num_questions
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleGetPlayers(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;

  console.log('[Duel Manager] Getting players for duel:', duel_id, 'Profile:', profileId);

  // Загружаем игроков без join (чтобы избежать проблем с RLS)
  // Включаем информацию о ботах (is_bot, bot_difficulty, bot_name, name)
  const { data: players, error: playersError } = await supabase
    .from('duel_players')
    .select('id, user_id, score, correct_count, is_bot, bot_difficulty, bot_name, name')
    .eq('duel_id', duel_id);

  if (playersError) {
    console.error('[Duel Manager] Error getting players:', playersError);
    return new Response(JSON.stringify({ error: playersError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!players || players.length === 0) {
    console.warn('[Duel Manager] No players found for duel:', duel_id);
    return new Response(JSON.stringify({ players: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 🆕 НОВОЕ: Загружаем количество ответов для каждого игрока
  const { data: answersData, error: answersError } = await supabase
    .from('duel_answers')
    .select('player_id')
    .eq('duel_id', duel_id);

  const answersCountMap = new Map();
  if (!answersError && answersData) {
    answersData.forEach((ans: { player_id: string }) => {
      const count = answersCountMap.get(ans.player_id) || 0;
      answersCountMap.set(ans.player_id, count + 1);
    });
  }

  // Загружаем инфо о дуэли для num_questions
  const { data: duelInfo } = await supabase
    .from('duels')
    .select('num_questions')
    .eq('id', duel_id)
    .single();

  const totalQuestions = duelInfo?.num_questions || 10;

  // ОПТИМИЗАЦИЯ: Загружаем профили одним batch запросом вместо множества отдельных
  const userIds = players.map((p: { user_id: string }) => p.user_id).filter(Boolean);
  const profilesMap = new Map();

  if (userIds.length > 0) {
    console.log('[get_players] Loading profiles in batch for userIds:', userIds);

    // Используем .in() для batch загрузки - в 10 раз быстрее
    // Если RLS блокирует .in(), fallback на отдельные запросы
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, username, photo_url, telegram_id')
        .in('id', userIds);

      if (error) {
        // Если batch запрос не работает (RLS), fallback на отдельные запросы
        console.warn('[get_players] Batch query failed, falling back to individual queries:', error.message);

        const profilePromises = userIds.map(async (userId: string) => {
          const { data: profile, error: singleError } = await supabase
            .from('profiles')
            .select('id, first_name, username, photo_url, telegram_id')
            .eq('id', userId)
            .single();

          if (singleError) {
            console.error(`[get_players] ❌ Error loading profile for ${userId}:`, {
              error: singleError.message,
              code: singleError.code,
            });
            return null;
          }

          return { userId, profile };
        });

        const profileResults = await Promise.all(profilePromises);
        profileResults.forEach((result: any) => {
          if (result && result.profile) {
            profilesMap.set(result.userId, result.profile);
          }
        });
      } else {
        // Batch запрос успешен - создаем Map
        (profiles || []).forEach((profile: { id: string; first_name?: string | null; username?: string | null; photo_url?: string | null; telegram_id?: number | null }) => {
          profilesMap.set(profile.id, profile);
        });
      }
    } catch (err) {
      console.error('[get_players] Unexpected error loading profiles:', err);
    }

    console.log('[get_players] Profiles query result:', {
      userIds,
      profilesCount: profilesMap.size,
      profiles: Array.from(profilesMap.entries()).map(([id, p]: [string, any]) => ({
        id,
        first_name: p.first_name,
        username: p.username,
        has_telegram_id: !!p.telegram_id
      }))
    });
  }

  // Format players with names
  const formattedPlayers = players.map((p: { id: string; user_id: string; is_bot: boolean; bot_name?: string | null; name?: string | null; score: number; is_active: boolean; correct_count: number; bot_difficulty?: string | null }) => {
    // Если это бот - используем имя из БД или генерируем
    if (p.is_bot) {
      // ВАЖНО: Используем bot_name из БД, если он есть (это имя, которое было сохранено при создании бота)
      // Если bot_name нет, используем name из БД
      // Только если оба отсутствуют, генерируем имя на основе ID
      let botName = p.bot_name || p.name;

      if (!botName) {
        // Fallback: детерминированное имя на основе ID бота
        botName = getDeterministicBotName(p.id);
        console.log('[get_players] ⚠️ Bot name not found in DB, generating from ID:', botName);
      } else {
        console.log('[get_players] ✅ Using bot name from DB:', botName);
      }

      console.log('[get_players] Processing bot player:', {
        playerId: p.id,
        botName,
        bot_name_from_db: p.bot_name,
        name_from_db: p.name,
        bot_difficulty: p.bot_difficulty
      });

      const answeredCount = answersCountMap.get(p.id) || 0;
      return {
        id: p.id,
        user_id: p.user_id,
        score: p.score || 0,
        correct_count: p.correct_count || 0,
        answered_count: answeredCount,
        is_finished: answeredCount >= totalQuestions,
        name: botName,
        bot_name: botName, // Дублируем для совместимости
        is_bot: true,
        bot_difficulty: p.bot_difficulty,
      };
    }

    const profile = profilesMap.get(p.user_id);

    console.log('[get_players] Processing player:', {
      playerId: p.id,
      userId: p.user_id,
      hasProfile: !!profile,
      profile: profile ? {
        first_name: profile.first_name,
        username: profile.username
      } : null
    });

    let name: string | null = null;

    if (profile) {
      // Приоритет: first_name > username
      // Проверяем все поля отдельно, чтобы не пропустить имя
      if (profile.first_name && profile.first_name.trim() && profile.first_name !== 'Игрок') {
        name = profile.first_name.trim();
      } else if (profile.username && profile.username.trim() && profile.username !== 'Игрок') {
        name = profile.username.trim();
      }

      // Если имя не найдено или пустое, используем fallback
      if (!name || name.trim() === '') {
        console.warn('[get_players] No valid name found in profile, using fallback "Игрок"', {
          profile: {
            id: profile.id,
            first_name: profile.first_name,
            username: profile.username
          }
        });
        name = 'Игрок';
      } else {
        // Проверяем, что имя не является ID (8 символов hex или UUID)
        if (name.length <= 8 && /^[a-f0-9]{8}$/i.test(name)) {
          console.warn('[get_players] Name looks like an ID, using fallback:', name);
          name = 'Игрок';
        } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)) {
          console.warn('[get_players] Name looks like a UUID, using fallback:', name);
          name = 'Игрок';
        }
      }
    } else {
      console.warn('[get_players] No profile found for user_id:', p.user_id, 'Available profiles:', Array.from(profilesMap.keys()));
      name = 'Игрок';
    }

    // Убеждаемся, что name всегда установлен
    if (!name) {
      name = 'Игрок';
    }

    console.log('[get_players] Final name for player:', {
      playerId: p.id,
      userId: p.user_id,
      name
    });

    const answeredCount = answersCountMap.get(p.id) || 0;
    return {
      id: p.id,
      user_id: p.user_id,
      score: p.score || 0,
      correct_count: p.correct_count || 0,
      answered_count: answeredCount,
      is_finished: answeredCount >= totalQuestions,
      name: name,
      photo_url: profile?.photo_url || null,
      is_bot: false
    };
  });

  console.log('[Duel Manager] ✅ Found players:', formattedPlayers.length);
  console.log('[Duel Manager] Players with names:', formattedPlayers.map((p: { user_id: string; name: string; id: string; score: number }) => ({
    id: p.id,
    user_id: p.user_id,
    name: p.name,
    score: p.score
  })));

  // КРИТИЧНО: Проверяем что все игроки имеют имена
  const playersWithoutNames = formattedPlayers.filter((p: { name: string }) => !p.name || p.name === 'Игрок');
  if (playersWithoutNames.length > 0) {
    console.warn('[Duel Manager] ⚠️ Some players have no valid name:', playersWithoutNames.map((p: { user_id: string; name: string; id: string }) => ({
      id: p.id,
      user_id: p.user_id
    })));
  }

  return new Response(JSON.stringify({ players: formattedPlayers }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleGetQuestions(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;

  console.log('[Duel Manager] Getting questions for duel:', duel_id);

  const { data: questions, error: questionsError } = await supabase
    .from('duel_questions')
    .select('*')
    .eq('duel_id', duel_id)
    .order('position');

  if (questionsError) {
    console.error('[Duel Manager] Error getting questions:', questionsError);
    throw questionsError;
  }

  console.log('[Duel Manager] Found', questions?.length || 0, 'questions');

  return new Response(JSON.stringify({ questions }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleGetResults(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const validated = getResultsSchema.parse(params);
  const { duel_id } = validated;
  // 🆕 FIX: Используем profile_id из params или fallback на profileId из JWT
  const profile_id = validated.profile_id || profileId;

  if (!profile_id) {
    console.error('[get_results] No profile_id provided and no JWT profile');
    return new Response(JSON.stringify({ error: 'profile_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[get_results] Fetching results for duel:', duel_id, 'profile_id:', profile_id);

  // Fetch duel, players, and answers in a single batch-like query if possible, or parallelize
  const [duelResult, playersResult, answersResult] = await Promise.all([
    supabase.from('duels').select('*').eq('id', duel_id).single(),
    supabase.from('duel_players').select('*, profiles(id, username, first_name, photo_url)').eq('duel_id', duel_id),
    supabase.from('duel_answers').select('*, duel_questions(*)').eq('duel_id', duel_id)
  ]);

  if (duelResult.error || !duelResult.data) {
    console.error('[get_results] Duel not found:', duelResult.error);
    return new Response(JSON.stringify({ error: 'Duel not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const duel = duelResult.data;
  const players = playersResult.data || [];
  const allAnswers = answersResult.data || [];

  if (players.length < 2) {
    console.warn('[get_results] Not enough players yet:', players.length);
    return new Response(JSON.stringify({ error: 'DUEL_NOT_READY', message: 'Not enough players' }), {
      status: 202, // Accepted but not finished
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const myPlayer = players.find((p: { user_id: string }) => p.user_id === profile_id);
  const opponentPlayer = players.find((p: { user_id: string }) => p.user_id !== profile_id);

  if (!myPlayer || !opponentPlayer) {
    console.error('[get_results] Player not found in duel participants');
    return new Response(JSON.stringify({ error: 'Player not authorized' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const myAnswers = allAnswers.filter((a: { player_id: string }) => a.player_id === myPlayer.id);
  const opponentAnswers = allAnswers.filter((a: { player_id: string }) => a.player_id === opponentPlayer.id);

  // Ensure both players have finished (if status is not finished yet)
  if (duel.status !== 'finished' && duel.status !== 'technical_draw' && duel.status !== 'cancelled') {
    // КРИТИЧНО: Используем Set для подсчета уникальных ответов, чтобы избежать ложных срабатываний при дубликатах
    const myUniqueAnswers = new Set(myAnswers.map((a: { duel_question_id: string }) => a.duel_question_id));
    const opponentUniqueAnswers = new Set(opponentAnswers.map((a: { duel_question_id: string }) => a.duel_question_id));

    const myFinished = myUniqueAnswers.size >= duel.num_questions;
    const opponentFinished = opponentUniqueAnswers.size >= duel.num_questions || opponentPlayer.is_bot;

    // If current player finished but duel is still active, maybe wait or return partial
    if (!myFinished || !opponentFinished) {
      console.log('[get_results] Duel still active, players not finished:', { myFinished, opponentFinished });

      // If it's a bot match and I'm finished, why is it NOT finished?
      // This might happen if finish_duel was not called yet.
      return new Response(JSON.stringify({
        error: 'DUEL_NOT_READY',
        message: 'Players still answering',
        duel,
        players,
        myAnswers,
        opponentAnswers
      }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({
    duel,
    players,
    myAnswers,
    opponentAnswers
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleGetDuelStatus(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id } = params;

  if (!duel_id) {
    return new Response(JSON.stringify({ error: 'duel_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: duel, error: duelError } = await supabase
    .from('duels')
    .select('id, status')
    .eq('id', duel_id)
    .single();

  if (duelError || !duel) {
    return new Response(JSON.stringify({ error: 'Duel not found', details: duelError?.message }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    status: duel.status,
    duel_id: duel.id
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
