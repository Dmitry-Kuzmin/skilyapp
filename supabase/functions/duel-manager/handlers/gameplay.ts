import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import {
  corsHeaders,
  submitAnswerSchema,
} from '../../_shared/duel-helpers.ts';
import { createNotification, sendDuelCompletionNotification, getOpponentName } from '../lib/notifications.ts';
import { calculateScore, simulateBotAnswer } from '../lib/scoring.ts';
import { settleBetPayout } from '../lib/payout.ts';

export async function handleSubmitAnswer(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const validated = submitAnswerSchema.parse(params);
  const { duel_id, duel_question_id, selected_option_id, time_taken_ms, latency_ms, boost_used, is_timeout } = validated;

  // ОПТИМИЗАЦИЯ: Загружаем игрока и вопрос параллельно
  const [playerRes, questionRes] = await Promise.all([
    supabase
      .from('duel_players')
      .select('*')
      .eq('duel_id', duel_id)
      .eq('user_id', profileId)
      .single(),
    supabase
      .from('duel_questions')
      .select('*')
      .eq('id', duel_question_id)
      .single()
  ]);

  const player = playerRes.data;
  const question = questionRes.data;

  if (!player) throw new Error('Player not found');
  if (!question) throw new Error('Question not found');

  // ОПТИМИЗАЦИЯ: Проверяем существующий ответ и получаем историю ДЛЯ ОБОИХ (combo и streak) ОДНИМ ЗАПРОСОМ
  // fetch answers for combo AND check idempotency
  const { data: allAnswers, error: answersError } = await supabase
    .from('duel_answers')
    .select('id, is_correct, is_skipped, duel_question_id, points_awarded, selected_option_id')
    .eq('player_id', player.id)
    .eq('duel_id', duel_id)
    .order('created_at', { ascending: false });

  if (answersError) throw answersError;

  // Проверка на идемпотентность (уже отвечено)
  // КРИТИЧНО: mark_question_started создаёт placeholder-строку с selected_option_id=NULL, is_skipped=false.
  // Такие строки НЕ считаются реальным ответом — игнорируем их в idempotency-проверке.
  // Реальный ответ: selected_option_id != NULL (выбрал вариант) ИЛИ is_skipped = true (таймаут/пропуск).
  const existingAnswer = allAnswers?.find(a =>
    a.duel_question_id === duel_question_id &&
    (a.selected_option_id !== null || a.is_skipped === true)
  );

  if (existingAnswer) {
    console.log('[submit_answer] 🔄 Question already answered, returning current state (idempotency)');

    // Рассчитываем комбо на момент ТОГО ответа (или текущее)
    let currentCombo = 0;
    for (const ans of allAnswers) {
      if (ans.is_correct && !ans.is_skipped) {
        currentCombo++;
      } else {
        break;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      is_correct: existingAnswer.is_correct, // 🔥 CRITICAL: Return actual answer result
      new_score: player.score,
      combo: currentCombo,
      points_awarded: existingAnswer.points_awarded,
      is_already_answered: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 🔥 FIX v2: Используем correct_option_ids из duel_questions, а НЕ из answer_options!
  // Причина: selected_option_id клиент берёт из question_snapshot (снимок на момент создания дуэли).
  // Если вопросы были переимпортированы, ID в answer_options уже другие и НИКОГДА не совпадут.
  // correct_option_ids записывается из ТОГО ЖЕ снимка → гарантированное совпадение.
  // correct_option_ids — JSONB column, Supabase возвращает как parsed JSON (массив строк)
  const rawCorrectIds = question.correct_option_ids;
  // Гарантируем что это массив строк (JSONB может вернуть разные типы)
  const correctOptionIds: string[] = Array.isArray(rawCorrectIds)
    ? rawCorrectIds.map(String)
    : typeof rawCorrectIds === 'string'
      ? [rawCorrectIds]
      : [];

  const isSkipped = !selected_option_id || is_timeout;
  const selectedStr = selected_option_id ? String(selected_option_id) : '';
  const isCorrect = !isSkipped && selectedStr
    ? correctOptionIds.includes(selectedStr)
    : false;

  console.log('[submit_answer] 🔍 Answer check:', {
    selected: selected_option_id,
    selectedType: typeof selected_option_id,
    rawCorrectIds: rawCorrectIds,
    rawType: typeof rawCorrectIds,
    isArray: Array.isArray(rawCorrectIds),
    correctOptionIds,
    isCorrect,
    question_id: question.question_id,
    duel_question_id,
  });

  // Calculate combo BEFORE this answer (consecutive correct answers from history)
  let combo = 0;
  if (allAnswers && allAnswers.length > 0) {
    for (const answer of allAnswers) {
      if (answer.is_correct === true && answer.is_skipped === false) {
        combo++;
      } else {
        break;
      }
    }
  }

  // Calculate error streak BEFORE this answer
  let previousErrorStreak = 0;
  if (allAnswers && allAnswers.length > 0) {
    for (const answer of allAnswers) {
      if (answer.is_correct === false) {
        previousErrorStreak++;
      } else {
        break;
      }
    }
  }

  console.log('[submit_answer] Stats:', {
    comboBefore: combo,
    previousErrorStreak,
    isCorrect,
    isSkipped
  });

  const adjustedTime = Math.max(0, time_taken_ms - (latency_ms || 0));
  const timeLimit = 60000;
  const timeRemain = Math.max(0, timeLimit - adjustedTime);

  const difficulty = (question.question_snapshot as any).difficulty || 'medium';
  const points = isCorrect ? calculateScore(difficulty, timeRemain, timeLimit, combo) : 0;

  // ОПТИМИЗАЦИЯ: Выполняем запись ответа и обновление игрока параллельно
  const newScore = player.score + points;
  const newCorrectCount = player.correct_count + (isCorrect ? 1 : 0);

  const [insertRes, updateRes] = await Promise.all([
    // UPSERT: mark_question_started создаёт placeholder-строку заранее.
    // Если строка уже есть (placeholder) — обновляем её с реальным ответом.
    // Если строки нет (mark_question_started не вызывался) — вставляем новую.
    supabase.from('duel_answers').upsert({
      duel_id,
      player_id: player.id,
      duel_question_id,
      selected_option_id: selected_option_id || null,
      is_correct: isCorrect,
      is_skipped: isSkipped,
      time_taken_ms: adjustedTime,
      points_awarded: points,
      combo_at_time: combo,
      boost_used: boost_used || null,
    }, { onConflict: 'player_id,duel_question_id' }),
    supabase
      .from('duel_players')
      .update({
        score: newScore,
        correct_count: newCorrectCount,
      })
      .eq('id', player.id)
  ]);

  if (insertRes.error) throw insertRes.error;
  if (updateRes.error) throw updateRes.error;

  const finalCombo = isCorrect && !isSkipped ? combo + 1 : 0;
  const currentErrorStreak = isCorrect ? 0 : previousErrorStreak + 1;

  // Create notification without blocking result if possible, but for stability we await
  // However, we can optimize createNotification internal logic later
  if (!isSkipped) {
    // Fetch num_questions only if needed for notification
    const { data: duel } = await supabase
      .from('duels')
      .select('num_questions')
      .eq('id', duel_id)
      .single();

    const totalAnswers = (allAnswers?.length || 0) + 1;
    const numQuestions = duel?.num_questions || 10;
    const progress = duel ? Math.round((totalAnswers / numQuestions) * 100) : 0;

    // ОПТИМИЗАЦИЯ: Сразу считаем, закончил ли оппонент
    // ВНИМАНИЕ: Оппонент - это НЕ тот, кто сейчас отвечает.
    // Но в createNotification мы передадим данные СЕНДЕРА (нас).

    try {
      await createNotification({
        duel_id,
        type: isCorrect ? 'answer' : 'progress',
        metadata: {
          is_correct: isCorrect,
          question_number: question.position,
          combo: finalCombo >= 3 ? finalCombo : undefined,
          error_streak: currentErrorStreak >= 2 ? currentErrorStreak : undefined,
          progress: progress >= 25 && progress % 25 === 0 ? progress : undefined,
          opponent_name: player.name || undefined, // Передаем наше имя (сендера)
          num_questions: numQuestions
        }
      }, profileId, supabase);
    } catch (err) {
      console.error('[submit_answer] Notification failed:', err);
    }
  }


  // Bot check
  const { data: botPlayer } = await supabase
    .from('duel_players')
    .select('id, is_bot')
    .eq('duel_id', duel_id)
    .eq('is_bot', true)
    .maybeSingle();

  return new Response(JSON.stringify({
    success: true,
    is_correct: isCorrect, // 🔥 CRITICAL: Client needs this to show correct/wrong effects!
    new_score: newScore,
    combo: finalCombo,
    points_awarded: points,
    has_bot: !!botPlayer
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleBotAnswer(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  // Обработка ответа бота на вопрос
  const { duel_id, duel_question_id } = params;

  // Находим бота в дуэли
  const { data: botPlayer } = await supabase
    .from('duel_players')
    .select('id, bot_difficulty, score, correct_count, bot_name, name')
    .eq('duel_id', duel_id)
    .eq('is_bot', true)
    .single();

  if (!botPlayer) {
    return new Response(JSON.stringify({ error: 'Bot not found in this duel' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Проверяем, не ответил ли бот уже
  const { data: existingAnswer } = await supabase
    .from('duel_answers')
    .select('id')
    .eq('player_id', botPlayer.id)
    .eq('duel_question_id', duel_question_id)
    .single();

  if (existingAnswer) {
    return new Response(JSON.stringify({ error: 'Bot already answered' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Получаем вопрос
  const { data: question } = await supabase
    .from('duel_questions')
    .select('*')
    .eq('id', duel_question_id)
    .single();

  if (!question) {
    return new Response(JSON.stringify({ error: 'Question not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // КРИТИЧНО: Проверяем, что бот отвечает строго по порядку
  // Бот может ответить только на следующий вопрос по position
  const { data: botAnswers } = await supabase
    .from('duel_answers')
    .select('duel_question_id')
    .eq('duel_id', duel_id)
    .eq('player_id', botPlayer.id);

  const answeredQuestionIds = new Set((botAnswers || []).map((a: { duel_question_id: string }) => a.duel_question_id));

  // Получаем все вопросы дуэли, отсортированные по position
  const { data: allQuestions } = await supabase
    .from('duel_questions')
    .select('id, position')
    .eq('duel_id', duel_id)
    .order('position', { ascending: true });

  if (allQuestions && allQuestions.length > 0) {
    // Находим следующий вопрос по порядку (минимальный position среди неотвеченных)
    let nextQuestionPosition: number | null = null;
    for (const q of allQuestions) {
      if (!answeredQuestionIds.has(q.id)) {
        nextQuestionPosition = q.position;
        break;
      }
    }

    // Если пытаемся ответить не на следующий вопрос - отклоняем
    if (nextQuestionPosition !== null && question.position !== nextQuestionPosition) {
      console.warn(`[bot_answer] ⚠️ Bot tried to answer question ${question.position}, but next question is ${nextQuestionPosition}`);
      return new Response(JSON.stringify({
        error: `Bot must answer questions in order. Expected position ${nextQuestionPosition}, got ${question.position}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const questionDifficulty = (question.question_snapshot as any).difficulty || 'medium';
  const botDifficulty = botPlayer.bot_difficulty || 'medium';

  // Симулируем ответ бота
  const botSimulation = simulateBotAnswer(botDifficulty, questionDifficulty);

  // 🔥 FIX: Get correct answer from answer_options directly (same as player)
  const allOptions = (question.question_snapshot as any).answer_options || [];

  if (allOptions.length === 0) {
    return new Response(JSON.stringify({ error: 'Question has no answer options' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Find correct option
  const correctOption = allOptions.find((opt: any) => opt.is_correct);
  const wrongOptions = allOptions.filter((opt: any) => !opt.is_correct);

  let selectedOptionId: string | null = null;
  if (botSimulation.willBeCorrect && correctOption) {
    // Bot answers correctly
    selectedOptionId = correctOption.id;
  } else {
    // Bot answers incorrectly - choose random wrong option
    if (wrongOptions.length > 0) {
      selectedOptionId = wrongOptions[Math.floor(Math.random() * wrongOptions.length)].id;
    } else {
      // Fallback: if no wrong options, choose any option
      selectedOptionId = allOptions[Math.floor(Math.random() * allOptions.length)].id;
    }
  }

  // КРИТИЧНО: Бот НИКОГДА не пропускает вопросы
  if (!selectedOptionId) {
    console.error('[bot_answer] ❌ CRITICAL: No option selected, selecting random option as fallback');
    selectedOptionId = allOptions[Math.floor(Math.random() * allOptions.length)].id;
  }

  const isCorrect = selectedOptionId === correctOption?.id;
  const isSkipped = false; // Бот никогда не пропускает вопросы

  console.log('[bot_answer] 🤖 Bot answer:', {
    selected: selectedOptionId,
    correct: correctOption?.id,
    isCorrect,
    willBeCorrect: botSimulation.willBeCorrect
  });

  // Вычисляем очки (бот не получает комбо бонусы для упрощения)
  const timeLimit = 60000;

  // Естественное время ответа бота зависит от сложности вопроса и бота
  // Легкие вопросы - быстрее, сложные - медленнее
  // Сильные боты отвечают быстрее на легкие вопросы
  const difficultyTimeModifiers = {
    easy: { min: 8000, max: 20000 },    // 8-20 секунд для легких
    medium: { min: 15000, max: 35000 },  // 15-35 секунд для средних
    hard: { min: 25000, max: 50000 },   // 25-50 секунд для сложных
  };

  const timeRange = difficultyTimeModifiers[questionDifficulty as keyof typeof difficultyTimeModifiers] || difficultyTimeModifiers.medium;

  // Сильные боты отвечают быстрее
  const botSpeedModifier = {
    easy: 1.0,    // Без изменений
    medium: 0.9,  // На 10% быстрее
    hard: 0.8,    // На 20% быстрее
    insane: 0.7, // На 30% быстрее
  }[botDifficulty] || 1.0;

  const adjustedMin = Math.floor(timeRange.min * botSpeedModifier);
  const adjustedMax = Math.floor(timeRange.max * botSpeedModifier);
  const timeRemain = Math.floor(Math.random() * (adjustedMax - adjustedMin) + adjustedMin);

  // Ограничиваем время ответа разумными пределами (не меньше 5 секунд, не больше 55 секунд)
  const clampedTimeRemain = Math.max(5000, Math.min(55000, timeRemain));

  const points = isCorrect ? calculateScore(questionDifficulty, clampedTimeRemain, timeLimit, 0) : 0;

  console.log(`[bot_answer] ⏱️ Bot answer timing:`, {
    botDifficulty,
    questionDifficulty,
    timeRemain: clampedTimeRemain,
    timeTaken: timeLimit - clampedTimeRemain,
    isCorrect,
    points
  });

  // Сохраняем ответ бота
  await supabase.from('duel_answers').insert({
    duel_id,
    player_id: botPlayer.id,
    duel_question_id,
    selected_option_id: selectedOptionId,
    is_correct: isCorrect,
    is_skipped: isSkipped,
    time_taken_ms: timeLimit - timeRemain,
    points_awarded: points,
    combo_at_time: 0,
    boost_used: null,
  });

  // Обновляем счет бота
  const newBotScore = botPlayer.score + points;
  await supabase
    .from('duel_players')
    .update({
      score: newBotScore,
      correct_count: botPlayer.correct_count + (isCorrect ? 1 : 0),
    })
    .eq('id', botPlayer.id);

  // Создаем уведомление для игрока о прогрессе бота (как в реальных дуэлях)
  // Всегда уведомляем о каждом ответе бота
  console.log('[bot_answer] Creating progress notification for human player');

  const { data: duel } = await supabase
    .from('duels')
    .select('num_questions')
    .eq('id', duel_id)
    .single();

  // Total answers including current one
  const { count: botAnswersCount } = await supabase
    .from('duel_answers')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', botPlayer.id)
    .eq('duel_id', duel_id);

  const totalAnswers = (botAnswersCount || 0);
  const progress = duel ? Math.round((totalAnswers / duel.num_questions) * 100) : 0;

  // Находим реального игрока (не бота) - ищем игрока с user_id (не null)
  const { data: humanPlayer } = await supabase
    .from('duel_players')
    .select('user_id')
    .eq('duel_id', duel_id)
    .not('user_id', 'is', null)
    .eq('is_bot', false)
    .single();

  // Сохраняем humanPlayer для использования ниже
  const savedHumanPlayer = humanPlayer;

  if (savedHumanPlayer?.user_id) {
    const botName = botPlayer.bot_name || 'Бот';

    console.log('[bot_answer] Notification metadata:', {
      is_correct: isCorrect,
      question_number: question.position,
      progress,
      totalAnswers,
      bot_name: botName
    });

    // Уведомляем о каждом ответе бота
    // Используем тип 'answer' для правильных ответов, 'progress' для неправильных
    try {
      await createNotification({
        duel_id,
        recipient_profile_id: humanPlayer.user_id, // Явно указываем получателя
        type: isCorrect ? 'answer' : 'progress',
        metadata: {
          is_correct: isCorrect,
          question_number: question.position,
          progress: progress >= 25 && progress % 25 === 0 ? progress : undefined, // Процент только на milestones (25%, 50%, 75%)
          opponent_name: botName, // Имя бота для правильного отображения в уведомлении
        }
      }, profileId, supabase);
      console.log('[bot_answer] ✅ Progress notification created successfully');
    } catch (err) {
      console.error('[bot_answer] Error creating progress notification:', err);
    }
  } else {
    console.warn('[bot_answer] ⚠️ Human player not found in duel');
  }

  // КРИТИЧНО: Проверяем, закончил ли бот все вопросы
  // Если да - автоматически завершаем дуэль
  const { count: botTotalAnswersCount } = await supabase
    .from('duel_answers')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', botPlayer.id)
    .eq('duel_id', duel_id);

  const { data: duelData } = await supabase
    .from('duels')
    .select('num_questions, status')
    .eq('id', duel_id)
    .single();

  const botFinishedAllQuestions = duelData && (botTotalAnswersCount || 0) >= duelData.num_questions;

  if (botFinishedAllQuestions && duelData?.status !== 'finished') {
    console.log('[bot_answer] 🤖 Bot finished all questions, checking if human player also finished...');

    // Получаем ID реального игрока
    let humanPlayerId: string | null = null;
    if (savedHumanPlayer?.user_id) {
      const { data: humanPlayerData } = await supabase
        .from('duel_players')
        .select('id')
        .eq('duel_id', duel_id)
        .eq('user_id', savedHumanPlayer.user_id)
        .eq('is_bot', false)
        .single();
      humanPlayerId = humanPlayerData?.id || null;
    }

    if (humanPlayerId) {
      // Проверяем, закончил ли реальный игрок все вопросы
      const { count: humanAnswersCount } = await supabase
        .from('duel_answers')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', humanPlayerId)
        .eq('duel_id', duel_id);

      const humanFinishedAllQuestions = duelData && (humanAnswersCount || 0) >= duelData.num_questions;

      if (humanFinishedAllQuestions) {
        console.log('[bot_answer] ✅ Both players finished, finishing duel automatically');

        // Оба игрока закончили - завершаем дуэль
        // Используем внутреннюю логику finish_duel
        const { data: allPlayers } = await supabase
          .from('duel_players')
          .select('id, user_id, score, correct_count')
          .eq('duel_id', duel_id);

        // Обновляем статус дуэли
        await supabase
          .from('duels')
          .update({
            status: 'finished',
            finished_at: new Date().toISOString()
          })
          .eq('id', duel_id);

        // Вызываем settleBetPayout если есть ставки
        if (duelData && allPlayers && allPlayers.length >= 2) {
          const botPlayerData = allPlayers.find((p: { id: string }) => p.id === botPlayer.id);
          const humanPlayerData = allPlayers.find((p: { user_id: string }) => p.user_id === savedHumanPlayer.user_id);

          if (botPlayerData && humanPlayerData) {
            const botScore = botPlayerData.score || 0;
            const humanScore = humanPlayerData.score || 0;
            const isDraw = botScore === humanScore;
            const winnerUserId = isDraw ? null : (botScore > humanScore ? null : savedHumanPlayer.user_id); // Боты не получают награды

            // Получаем bet_amount из дуэли
            const { data: duelWithBet } = await supabase
              .from('duels')
              .select('bet_amount, host_user')
              .eq('id', duel_id)
              .single();

            if (duelWithBet?.bet_amount > 0) {
              try {
                await settleBetPayout({
                  supabaseClient: supabase,
                  duelId: duel_id,
                  betAmount: duelWithBet.bet_amount,
                  hostUserId: duelWithBet.host_user,
                  players: allPlayers.map((p: { id: string; user_id: string; is_bot: boolean; name: string; score: number; is_active: boolean }) => ({
                    id: p.id,
                    user_id: p.user_id,
                    score: p.score || 0,
                    correct_count: p.correct_count || 0
                  })),
                  winnerUserId,
                  isDraw,
                });
                console.log('[bot_answer] ✅ Bet settled after bot finished');
              } catch (betError) {
                console.error('[bot_answer] ❌ Error settling bet:', betError);
              }
            }
          }
        }

        console.log('[bot_answer] ✅ Duel finished automatically after bot completed all questions');
      } else {
        console.log('[bot_answer] ⏳ Bot finished, but human player has not finished yet. Waiting...');
      }
    }
  }

  return new Response(JSON.stringify({
    is_correct: isCorrect,
    points_awarded: points,
    new_score: newBotScore,
    combo: 0,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleFinishDuel(params: any, profileId: string, supabase: SupabaseClient): Promise<Response> {
  // Get profile_id from params or use the one from request body
  const { duel_id } = params;
  const profile_id = params.profile_id || profileId;

  // Get duel info
  const { data: duel } = await supabase
    .from('duels')
    .select('status, num_questions, started_at, expires_at, host_user, bet_amount')
    .eq('id', duel_id)
    .single();

  if (!duel) {
    return new Response(JSON.stringify({ error: 'Duel not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if already finished
  if (duel.status === 'finished') {
    return new Response(JSON.stringify({ message: 'Already finished', finished: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get current player
  const { data: currentPlayer } = await supabase
    .from('duel_players')
    .select('id, user_id')
    .eq('duel_id', duel_id)
    .eq('user_id', profile_id)
    .single();

  if (!currentPlayer) {
    return new Response(JSON.stringify({ error: 'Player not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Count how many questions this player has answered
  const { count: answeredCount } = await supabase
    .from('duel_answers')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', currentPlayer.id)
    .eq('duel_id', duel_id);

  console.log('[finish_duel] Player finished:', {
    playerId: currentPlayer.id,
    answeredCount,
    totalQuestions: duel.num_questions
  });

  // Check if all players have finished
  const { data: allPlayers } = await supabase
    .from('duel_players')
    .select('id, user_id, score, correct_count, is_bot, profiles(id, username, first_name, photo_url)')
    .eq('duel_id', duel_id);

  // 🆕 ASYNC DUEL: Если только 1 игрок (хост) сыграл
  if (!allPlayers || allPlayers.length < 2) {
    console.log('[finish_duel] 🎯 Async mode: Only host finished, waiting for opponent');

    // Проверяем, что текущий игрок реально ответил на все вопросы
    if ((answeredCount || 0) < duel.num_questions) {
      console.log('[finish_duel] Player has not answered all questions yet:', {
        answered: answeredCount,
        required: duel.num_questions
      });
      return new Response(JSON.stringify({
        success: true,
        finished: false,
        message: 'Not all questions answered yet'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Переводим дуэль в статус "ожидает соперника"
    await supabase
      .from('duels')
      .update({
        status: 'waiting_for_opponent',
        // Сохраняем время когда хост закончил
      })
      .eq('id', duel_id);

    console.log('[finish_duel] ✅ Duel status updated to waiting_for_opponent');

    return new Response(JSON.stringify({
      success: true,
      finished: false,
      waiting_for_opponent: true,
      message: 'Your score is saved! Waiting for opponent to play.',
      your_score: currentPlayer?.score || allPlayers?.find((p: { user_id: string }) => p.user_id === profile_id)?.score || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 🆕 РЕАЛИСТИЧНАЯ ЛОГИКА ДЛЯ ИГР С БОТОМ
  // Бот отвечает параллельно с игроком через useBotOpponent на клиенте
  // Если бот ещё не закончил - показываем экран ожидания
  const opponentPlayer = allPlayers.find((p: { id: string }) => p.id !== currentPlayer.id);
  const isOpponentBot = opponentPlayer?.is_bot === true;

  if (isOpponentBot) {
    console.log('[finish_duel] 🤖 Opponent is BOT - checking bot progress');

    // Считаем ответы текущего игрока
    const myAnswerCount = answeredCount || 0;

    // Считаем ответы бота
    const { count: botAnswerCount } = await supabase
      .from('duel_answers')
      .select('*', { count: 'exact', head: true })
      .eq('duel_id', duel_id)
      .eq('player_id', opponentPlayer.id);

    const botAnswers = botAnswerCount || 0;
    const requiredQuestions = duel.num_questions;

    console.log('[finish_duel] Bot game status:', {
      myAnswerCount,
      botAnswers,
      requiredQuestions,
      iHaveFinished: myAnswerCount >= requiredQuestions,
      botHasFinished: botAnswers >= requiredQuestions
    });

    // Если я ответил на все вопросы
    if (myAnswerCount >= requiredQuestions) {
      // Проверяем закончил ли бот
      if (botAnswers < requiredQuestions) {
        // Бот ещё не закончил - показываем экран ожидания
        console.log('[finish_duel] ⏳ BOT GAME: I finished, bot has', botAnswers, 'of', requiredQuestions, 'answers. Waiting...');

        return new Response(JSON.stringify({
          success: true,
          finished: false,
          reason: 'waiting_for_bot',
          message: 'Ждём ответов бота...',
          bot_progress: {
            answered: botAnswers,
            total: requiredQuestions,
            remaining: requiredQuestions - botAnswers
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Собираем данные для результатов
      const { data: allAnswers } = await supabase
        .from('duel_answers')
        .select('*, duel_questions(*)')
        .eq('duel_id', duel_id);

      const myAnswers = allAnswers?.filter((a: { player_id: string }) => a.player_id === currentPlayer.id) || [];
      const opponentAnswers = allAnswers?.filter((a: { player_id: string }) => a.player_id === opponentPlayer.id) || [];

      // Получаем обновлённые данные игроков
      const { data: updatedPlayers } = await supabase
        .from('duel_players')
        .select('id, user_id, score, correct_count, is_bot, bot_name, name, profiles(id, username, first_name, photo_url)')
        .eq('duel_id', duel_id);

      // 🏆 РАСЧЕТ ПОБЕДИТЕЛЯ ДЛЯ БОТА
      const player1 = updatedPlayers?.find((p: any) => p.user_id === profile_id); // Реальный игрок
      const player2 = updatedPlayers?.find((p: any) => p.id !== player1?.id); // Бот

      const score1 = player1?.score || 0;
      const score2 = player2?.score || 0;
      const isDraw = score1 === score2;

      // ИСПРАВЛЕНИЕ: winner_id должен быть user_id победителя.
      // Если победил бот — у него нет user_id, поэтому winner_id = null (ничья для триггера не выходит).
      // Используем player_id бота как маркер: нет user_id → null, но is_draw = false.
      // Триггер уже умеет пропускать ботов, поэтому нам важен только реальный игрок.
      const humanWon = !isDraw && score1 > score2;
      const winnerId = isDraw ? null : (humanWon ? player1.user_id : null);

      console.log('[finish_duel] 🤖 Bot Game Results:', { score1, score2, isDraw, humanWon, winnerId });

      // Обновляем статус дуэли на finished с результатами
      const { error: botFinishError } = await supabase
        .from('duels')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
          winner_id: winnerId,
          is_draw: isDraw
        })
        .eq('id', duel_id)
        .eq('status', 'active');

      if (botFinishError) {
        console.error('[finish_duel] ❌ Error finishing bot duel:', botFinishError);
      }

      // 🎁 ЯВНОЕ НАЧИСЛЕНИЕ XP для реального игрока (страховка от сбоя триггера)
      // Триггер handle_duel_payout_atomic должен сработать автоматически,
      // но для бот-игр добавляем явный вызов для надёжности
      if (player1?.user_id) {
        let xpToAward = 0;
        if (isDraw) {
          xpToAward = 15; // Ничья
        } else if (humanWon) {
          xpToAward = 50; // Победа над ботом
        } else {
          xpToAward = 5; // Поражение — за участие
        }

        console.log(`[finish_duel] 🎁 Bot game: awarding ${xpToAward} XP to player ${player1.user_id} (humanWon: ${humanWon}, isDraw: ${isDraw})`);

        // Начисляем XP через дельту (триггер обработает основную логику)
        // Этот блок служит fallback — если триггер уже сработал, это будет дублем.
        // Поэтому используем idempotent-флаг через duel_transactions
        const { data: existingXpTx } = await supabase
          .from('duel_transactions')
          .select('id')
          .eq('duel_id', duel_id)
          .eq('user_id', player1.user_id)
          .in('transaction_type', ['win_payout', 'base_payout', 'refund', 'insurance_payout'])
          .limit(1);

        if (!existingXpTx || existingXpTx.length === 0) {
          // Триггер ещё не отработал — начисляем XP вручную через increment_profile_value
          console.log('[finish_duel] 🔄 Trigger not fired yet, manually awarding XP...');
          const { error: xpError } = await supabase.rpc('increment_profile_value', {
            p_profile_id: player1.user_id,
            p_column: 'xp',
            p_amount: xpToAward
          });
          if (xpError) {
            console.error('[finish_duel] ❌ Failed to award XP manually:', xpError);
          } else {
            console.log(`[finish_duel] ✅ Manually awarded ${xpToAward} XP to ${player1.user_id}`);
          }
        } else {
          console.log('[finish_duel] ✅ Trigger already fired, skipping manual XP award');
        }
      }

      console.log('[finish_duel] ✅ BOT GAME COMPLETED');

      return new Response(JSON.stringify({
        success: true,
        finished: true,
        reason: 'bot_game_both_finished',
        duel_data: duel,
        players_data: updatedPlayers || allPlayers,
        my_answers: myAnswers,
        opponent_answers: opponentAnswers
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }


  // CRITICAL FIX: Увеличена задержка с 200ms до 500ms для надёжности
  // Это гарантирует, что последний ответ точно записан в БД перед подсчётом
  console.log('[finish_duel] Waiting 500ms for DB commit...');
  await new Promise(resolve => setTimeout(resolve, 500));

  // CRITICAL FIX: Check duel status FIRST before counting answers
  // This prevents race condition where both players try to finish simultaneously
  const { data: currentDuelStatus } = await supabase
    .from('duels')
    .select('status')
    .eq('id', duel_id)
    .single();

  // If duel already finished/cancelled/drawn - return immediately
  if (['finished', 'technical_draw', 'cancelled'].includes(currentDuelStatus?.status)) {
    console.log('[finish_duel] ✅ Duel already in terminal state - returning finished: true', currentDuelStatus?.status);
    return new Response(JSON.stringify({
      success: true,
      finished: true,
      reason: 'already_finished_by_opponent'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if both players finished by counting their answers
  // IMPORTANT: Count answers AFTER current player's last answer is saved
  // Single check (removed double-check to reduce latency)
  let allPlayersFinished = false;
  let playerAnswerCounts: { [playerId: string]: number } = {};

  const checkPlayersFinished = async (): Promise<boolean> => {
    let allFinished = true;
    const counts: { [playerId: string]: number } = {};

    for (const player of allPlayers) {
      const { count: playerAnswers } = await supabase
        .from('duel_answers')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', player.id)
        .eq('duel_id', duel_id);

      const answerCount = playerAnswers || 0;
      counts[player.id] = answerCount;

      console.log('[finish_duel] Player answer count:', {
        playerId: player.id,
        userId: player.user_id,
        answerCount,
        required: duel.num_questions,
        hasFinished: answerCount >= duel.num_questions
      });

      if (!player.is_bot && answerCount < duel.num_questions) {
        allFinished = false;
      }
    }

    playerAnswerCounts = counts;
    return allFinished;
  };

  // Single check - removed double-check for faster response
  allPlayersFinished = await checkPlayersFinished();

  console.log('[finish_duel] All players finished check:', {
    allPlayersFinished,
    playerAnswerCounts,
    requiredAnswers: duel.num_questions,
    currentPlayerId: currentPlayer.id,
    currentPlayerAnswers: playerAnswerCounts[currentPlayer.id] || 0
  });

  // Check timeout (10 minutes after start or 15 minutes total)
  const now = new Date();
  const startedAt = duel.started_at ? new Date(duel.started_at) : null;
  const expiresAt = duel.expires_at ? new Date(duel.expires_at) : null;
  const timeoutMs = 10 * 60 * 1000; // 10 minutes
  const isTimeout = startedAt && (now.getTime() - startedAt.getTime() > timeoutMs) ||
    (expiresAt && now > expiresAt);

  console.log('[finish_duel] Status check:', {
    allPlayersFinished,
    isTimeout,
    startedAt: startedAt?.toISOString(),
    expiresAt: expiresAt?.toISOString()
  });

  // Only finish duel if both players finished OR timeout occurred
  if (allPlayersFinished || isTimeout) {
    // OPTIMIZED: Reuse already counted answers instead of querying DB again
    // This saves ~100-200ms by avoiding duplicate queries
    const playersWithScores = allPlayers.map((player) => ({
      ...player,
      answersCount: playerAnswerCounts[player.id] || 0
    }));

    // Sort by score (descending)
    playersWithScores.sort((a, b) => b.score - a.score);
    const isDraw = playersWithScores[0].score === playersWithScores[1].score;
    const winnerId = isDraw ? null : playersWithScores[0].id;

    // Build match_summary for compact storage
    // This allows us to safely delete detailed duel_answers data later
    const player1 = playersWithScores[0];
    const player2 = playersWithScores[1];
    const player1Accuracy = duel.num_questions > 0
      ? Math.round((player1.correct_count / duel.num_questions) * 100 * 100) / 100
      : 0;
    const player2Accuracy = duel.num_questions > 0
      ? Math.round((player2.correct_count / duel.num_questions) * 100 * 100) / 100
      : 0;

    // Get used boosts for both players (if any)
    const { data: player1Boosts } = await supabase
      .from('duel_answers')
      .select('boost_used')
      .eq('player_id', player1.id)
      .eq('duel_id', duel_id)
      .not('boost_used', 'is', null);

    const { data: player2Boosts } = await supabase
      .from('duel_answers')
      .select('boost_used')
      .eq('player_id', player2.id)
      .eq('duel_id', duel_id)
      .not('boost_used', 'is', null);

    const usedBoosts1 = player1Boosts?.map((b: { boost_used: string }) => b.boost_used).filter(Boolean) || [];
    const usedBoosts2 = player2Boosts?.map((b: { boost_used: string }) => b.boost_used).filter(Boolean) || [];

    const matchSummary = {
      player_1_id: player1.user_id,
      player_1_score: player1.score,
      player_1_correct: player1.correct_count || 0,
      player_1_accuracy: player1Accuracy,
      player_1_boosts: [...new Set(usedBoosts1)], // Remove duplicates
      player_2_id: player2.user_id,
      player_2_score: player2.score,
      player_2_correct: player2.correct_count || 0,
      player_2_accuracy: player2Accuracy,
      player_2_boosts: [...new Set(usedBoosts2)], // Remove duplicates
      total_questions: duel.num_questions,
      winner_id: isDraw ? null : player1.user_id,
      is_draw: isDraw,
      finish_reason: allPlayersFinished ? 'both_finished' : 'timeout',
      finished_at: new Date().toISOString()
    };

    // CRITICAL FIX: Atomic update using WHERE clause to prevent race condition
    // Only one player can successfully update status from 'active' to 'finished'
    // If update returns no rows, another player already finished the duel
    const { data: updateResult, error: updateError } = await supabase
      .from('duels')
      .update({
        status: 'finished',
        winner_id: isDraw ? null : player1.user_id,
        is_draw: isDraw,
        finished_at: new Date().toISOString(),
        match_summary: matchSummary as any, // Save compact match summary
      })
      .eq('id', duel_id)
      .in('status', ['active', 'waiting_for_opponent']) // CRITICAL: Match both real-time and async duel states
      .select('id, status');

    // If no rows updated - another player already finished the duel
    if (!updateResult || updateResult.length === 0) {
      console.log('[finish_duel] ⚠️ Race condition detected - duel already finished by opponent');
      console.log('[finish_duel] This is expected when both players finish simultaneously');

      // Track race condition metric for monitoring
      console.log('[finish_duel] METRIC: duel_race_condition_detected', { duel_id });

      return new Response(JSON.stringify({
        success: true,
        finished: true,
        reason: 'already_finished_by_opponent_race'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (updateError) {
      console.error('[finish_duel] Error updating duel status:', updateError);
      throw updateError;
    }

    console.log('[finish_duel] ✅ Successfully updated duel status to finished (atomic)');

    // Update stats for both players (except bots)
    for (const player of playersWithScores) {
      // 🔥 CRITICAL FIX: Skip bots - they don't have user_id and cause constraint violation
      if (!player.user_id) {
        console.log('[finish_duel] ⏭️ Skipping stats update for bot player:', player.id);
        continue;
      }

      const isWin = player.id === winnerId;
      await supabase.rpc('upsert_duel_stats', {
        p_user_id: player.user_id,
        p_is_win: isWin && !isDraw,
        p_is_draw: isDraw,
        p_score: player.score
      });
    }

    // 🛡️ ANTI-FARMING PROTECTION: Update win_streak based on duel outcome
    // Проверяем, есть ли бот в дуэли
    const { data: botPlayer } = await supabase
      .from('duel_players')
      .select('id, is_bot')
      .eq('duel_id', duel_id)
      .eq('is_bot', true)
      .single();

    const hasBot = !!botPlayer;

    if (hasBot) {
      // Если в дуэли есть бот - обновляем win_streak для реальных игроков
      for (const player of playersWithScores) {
        if (player.user_id) { // Только для реальных игроков (не ботов)
          const isWin = player.id === winnerId && !isDraw;

          if (isWin) {
            // Победа над ботом - увеличиваем win_streak
            await supabase.rpc('increment_profile_value', {
              p_profile_id: player.user_id,
              p_column: 'win_streak',
              p_amount: 1
            });
            console.log(`[finish_duel] 🛡️ Win streak incremented for player ${player.user_id} (won against bot)`);
          } else {
            // Поражение или ничья - сбрасываем win_streak
            await supabase
              .from('profiles')
              .update({ win_streak: 0 })
              .eq('id', player.user_id);
            console.log(`[finish_duel] 🛡️ Win streak reset for player ${player.user_id} (lost/draw against bot)`);
          }
        }
      }
    } else {
      // Если это дуэль с реальным игроком - не трогаем win_streak
      console.log('[finish_duel] Real player duel - win_streak not affected');
    }

    console.log('[finish_duel] Duel finished:', {
      winnerId,
      isDraw,
      reason: allPlayersFinished ? 'both_finished' : 'timeout'
    });

    await settleBetPayout({
      supabaseClient: supabase,
      duelId: duel_id,
      betAmount: duel.bet_amount || 0,
      hostUserId: duel.host_user,
      players: playersWithScores,
      winnerUserId: isDraw ? null : playersWithScores[0].user_id,
      isDraw,
    });

    // 🆕 НОВОЕ: Отправляем Telegram уведомления обоим игрокам
    // Получаем код дуэли для уведомления
    const { data: duelData } = await supabase
      .from('duels')
      .select('code')
      .eq('id', duel_id)
      .single();
    const duelCode = duelData?.code || 'XXXX';

    // Отправляем уведомления каждому игроку
    for (const player of playersWithScores) {
      if (!player.user_id || player.is_bot) continue; // Пропускаем ботов

      // Получаем telegram_id игрока
      const { data: playerProfile } = await supabase
        .from('profiles')
        .select('telegram_id, first_name')
        .eq('id', player.user_id)
        .single();

      if (!playerProfile?.telegram_id) {
        console.log(`[finish_duel] Player ${player.user_id} has no telegram_id, skipping notification`);
        continue;
      }

      // Находим оппонента
      const opponent = playersWithScores.find((p: { user_id: string }) => p.user_id !== player.user_id);
      const opponentName = opponent?.is_bot ? 'Бот' : (opponent?.profiles?.first_name || 'Соперник');

      // Определяем результат для этого игрока
      const isPlayerWinner = player.id === winnerId;
      const myScore = player.score || 0;
      const opponentScore = opponent?.score || 0;

      // Отправляем уведомление
      await sendDuelCompletionNotification({
        supabaseClient: supabase,
        recipientTelegramId: playerProfile.telegram_id,
        opponentName,
        isWinner: isPlayerWinner,
        isDraw,
        myScore,
        opponentScore,
        coinsWon: isPlayerWinner && duel.bet_amount > 0 ? duel.bet_amount * 2 : 0,
        duelCode,
      });
    }

    // Create finish notification for opponent
    const opponentPlayerForNotify = playersWithScores.find((p: { user_id: string }) => p.user_id !== profile_id);
    if (opponentPlayerForNotify) {
      let currentPlayerName = 'Игрок';
      try {
        currentPlayerName = await getOpponentName(profile_id, supabase);
      } catch {
        // Fallback
      }
      console.log('[finish_duel] Creating finish notification with player name:', currentPlayerName);

      try {
        await createNotification({
          duel_id,
          type: 'finish',
          metadata: {
            opponent_name: currentPlayerName,
            is_winner: opponentPlayerForNotify.id === winnerId,
            correct_answers: opponentPlayerForNotify.correct_count || 0,
            is_last_question: false,
          }
        }, profile_id, supabase);
      } catch (err) {
        console.error('[finish_duel] Error creating finish notification:', err);
      }
    }

    // 🆕 OPTIMIZATION: Return full results data for immediate snapshot creation
    const { data: allAnswers } = await supabase
      .from('duel_answers')
      .select('*, duel_questions(*)')
      .eq('duel_id', duel_id);

    const myAnswers = allAnswers?.filter((a: { player_id: string }) => a.player_id === currentPlayer.id) || [];
    const opponentAnswers = allAnswers?.filter((a: { player_id: string }) => a.player_id === opponentPlayerForNotify?.id) || [];

    return new Response(JSON.stringify({
      success: true,
      finished: true,
      reason: allPlayersFinished ? 'both_finished' : 'timeout',
      duel_data: duel,
      players_data: allPlayers,
      my_answers: myAnswers,
      opponent_answers: opponentAnswers
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } else {
    // Not all players finished yet - just acknowledge this player finished
    console.log('[finish_duel] Player finished, waiting for opponent');

    // Create finish notification for opponent (first player finished)
    const opponentPlayerForNotify = allPlayers.find((p: { user_id: string }) => p.user_id !== profile_id);
    const currentPlayerData = allPlayers.find((p: { user_id: string }) => p.user_id === profile_id);
    if (opponentPlayerForNotify && currentPlayerData) {
      // Get current player name (who finished) for personalized notification to opponent
      let currentPlayerName = 'Игрок';
      try {
        currentPlayerName = await getOpponentName(profile_id, supabase);
      } catch {
        // Fallback
      }
      console.log('[finish_duel] Creating finish notification with player name:', currentPlayerName);

      try {
        await createNotification({
          duel_id,
          type: 'finish',
          metadata: {
            opponent_name: currentPlayerName,
            is_winner: false,
            correct_answers: currentPlayerData.correct_count || 0,
            is_last_question: false,
          }
        }, profile_id, supabase);
      } catch (err) {
        console.error('[finish_duel] Error creating finish notification:', err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      finished: false,
      message: 'Waiting for opponent to finish'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
