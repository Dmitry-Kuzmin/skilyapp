import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import {
    corsHeaders,
    createDuelSchema,
    joinDuelSchema,
    findMatchSchema,
    fetchRandomQuestions,
    getInsuranceConfig,
    generateBotProfile,
    generateDuelCode
} from '../_shared/duel-helpers.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const clientIP = getClientIP(req);
    const rateLimit = await checkRateLimit({
        identifier: clientIP,
        limit: 100,
        windowMs: 60000,
    });

    if (!rateLimit.allowed) {
        return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
        }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const supabase = createPooledSupabaseClient();

        const contentType = req.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            return new Response(JSON.stringify({ error: 'Body must be JSON' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const text = await req.text();
        if (!text) {
            return new Response(JSON.stringify({ error: 'Empty request body' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const body = JSON.parse(text);
        const { action, profile_id, ...params } = body;

        let profileId: string | null = profile_id || null;

        if (!profileId) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

                    if (user && !authError) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('user_id', user.id)
                            .maybeSingle();

                        if (profile) profileId = profile.id;
                    }
                } catch (e) {
                    console.error('[Duel Matchmaking] Auth lookup error:', e);
                }
            }
        }

        if (!profileId) {
            return new Response(JSON.stringify({ error: 'Profile not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Rate limiting per action
        const heavyActions = ['create_duel', 'join_duel', 'find_match'];
        if (heavyActions.includes(action)) {
            const actionRL = await checkRateLimit({
                identifier: `${profileId}:${action}`,
                limit: 10,
                windowMs: 60000,
            });

            if (!actionRL.allowed) {
                return new Response(JSON.stringify({
                    error: 'Too many requests',
                    message: 'Слишком много попыток. Подождите немного.',
                }), {
                    status: 429,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        switch (action) {
            case 'check_status': {
                const { duel_id } = params;

                const { data: duel, error } = await supabase
                    .from('duels')
                    .select('id, status, started_at, host_user, num_questions')
                    .eq('id', duel_id)
                    .maybeSingle();

                if (error || !duel) {
                    return new Response(JSON.stringify({ error: 'Duel not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                return new Response(JSON.stringify({
                    status: duel.status,
                    started_at: duel.started_at,
                    host_user: duel.host_user,
                    num_questions: duel.num_questions
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            case 'create_duel': {
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
                    rematch_from_duel_id,
                    license_category,
                } = validated;

                const hostInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
                    enabled: insurance_enabled,
                    rate: insurance_rate,
                    coverageRate: insurance_coverage_rate
                }) : { enabled: false, rate: 0, coverageRate: 0, premium: 0 };

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

                if (bet_amount > 0) {
                    const requiredCoins = bet_amount + (hostInsurance.premium || 0);

                    if ((profile.coins || 0) < requiredCoins) {
                        return new Response(JSON.stringify({
                            error: `Insufficient coins. You need ${requiredCoins} coins but only have ${profile.coins || 0}`
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        });
                    }

                    await supabase.rpc('increment_profile_value', {
                        p_profile_id: profileId,
                        p_column: 'coins',
                        p_amount: -requiredCoins
                    });
                }

                const code = generateDuelCode();
                const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);
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
                        expires_at: expiresAt,
                        country: profile.preferred_country || 'spain',
                    })
                    .select()
                    .single();

                if (duelError) throw duelError;

                const questions = await fetchRandomQuestions(
                    supabase,
                    num_questions,
                    profile.preferred_country || 'spain',
                    questionSeed,
                    categories,
                    difficulty,
                    license_category
                );

                if (questions.length < num_questions) {
                    await supabase.from('duels').delete().eq('id', duel.id);
                    return new Response(JSON.stringify({
                        error: `Not enough questions. Found only ${questions.length} of ${num_questions}`
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                const duelQuestions = questions.map((q: any, index: number) => ({
                    duel_id: duel.id,
                    question_id: q.id,
                    position: index + 1,
                    question_snapshot: q,
                    correct_option_ids: q.correct_option_id ? [q.correct_option_id] : [],
                }));

                await supabase.from('duel_questions').insert(duelQuestions);

                // Запись транзакций для ставки и страховки
                if (bet_amount > 0) {
                    try {
                        const txData = [];
                        txData.push({
                            duel_id: duel.id,
                            user_id: profileId,
                            amount: -bet_amount,
                            transaction_type: 'bet'
                        });
                        if (hostInsurance.enabled && (hostInsurance.premium || 0) > 0) {
                            txData.push({
                                duel_id: duel.id,
                                user_id: profileId,
                                amount: -hostInsurance.premium,
                                transaction_type: 'insurance_premium'
                            });
                        }
                        await supabase.from('duel_transactions').insert(txData);
                        console.log(`[create_duel] Transactions saved for user ${profileId} in duel ${duel.id}`);
                    } catch (txErr) {
                        console.error('[create_duel] Failed to save transactions', txErr);
                    }
                }

                // ✅ Host already added by trigger auto_add_host_to_duel_players
                // Но нам нужно обновить его данными страховки
                if (hostInsurance.enabled) {
                    await supabase
                        .from('duel_players')
                        .update({
                            insurance_enabled: hostInsurance.enabled,
                            insurance_premium: hostInsurance.premium,
                            insurance_coverage_rate: hostInsurance.coverageRate,
                        })
                        .eq('duel_id', duel.id)
                        .eq('user_id', profileId);
                }

                console.log('[create_duel] Host automatically added by trigger and updated with insurance');

                // Если это реванш, уведомляем соперника из предыдущей дуэли
                if (rematch_from_duel_id) {
                    try {
                        console.log(`[create_duel] Handling rematch from duel ${rematch_from_duel_id}`);
                        // Находим другого игрока из предыдущей дуэли
                        const { data: oldPlayers, error: oldPlayersError } = await supabase
                            .from('duel_players')
                            .select('user_id')
                            .eq('duel_id', rematch_from_duel_id)
                            .neq('user_id', profileId);

                        if (!oldPlayersError && oldPlayers && oldPlayers.length > 0) {
                            const opponentUserId = oldPlayers[0].user_id;

                            if (opponentUserId) {
                                // Создаем уведомление для соперника
                                // Линк к старой дуэли, чтобы он увидел это на экране результатов
                                const { error: notifyError } = await supabase.from('duel_notifications').insert({
                                    user_id: opponentUserId,
                                    duel_id: rematch_from_duel_id,
                                    type: 'rematch_proposed',
                                    title: 'Запрос реванша',
                                    message: `Ваш соперник предлагает реванш! Ставка: ${bet_amount} монет.`,
                                    metadata: {
                                        new_duel_id: duel.id,
                                        new_duel_code: code,
                                        bet_amount: bet_amount,
                                        num_questions: num_questions,
                                        initiator_id: profileId
                                    }
                                });

                                if (notifyError) {
                                    console.error('[create_duel] Error inserting rematch notification:', notifyError);
                                } else {
                                    console.log(`[create_duel] Rematch notification sent to opponent ${opponentUserId}`);
                                }
                            }
                        }
                    } catch (notifyErr) {
                        console.error('[create_duel] Failed to handle rematch notification:', notifyErr);
                    }
                }

                return new Response(JSON.stringify({ duel, code }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            case 'join_duel': {
                const validated = joinDuelSchema.parse(params);
                const { code, insurance_enabled, insurance_rate, insurance_coverage_rate } = validated;

                const { data: duel, error: duelError } = await supabase
                    .from('duels')
                    .select('*')
                    .eq('code', code.toUpperCase())
                    .maybeSingle();

                if (duelError || !duel) {
                    return new Response(JSON.stringify({ error: 'Duel not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                if (duel.status !== 'waiting') {
                    // Идемпотентность: если игрок уже внутри и дуэль активна, возвращаем успех
                    const { data: existingPlayer } = await supabase
                        .from('duel_players')
                        .select('id')
                        .eq('duel_id', duel.id)
                        .eq('user_id', profileId)
                        .maybeSingle();

                    if (existingPlayer && duel.status === 'active') {
                        return new Response(JSON.stringify({
                            duel,
                            player: existingPlayer,
                            auto_started: true,
                            idempotent: true
                        }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        });
                    }

                    return new Response(JSON.stringify({ error: 'Duel already started or finished' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                const joinerInsurance = duel.bet_amount > 0 ? getInsuranceConfig(duel.bet_amount, {
                    enabled: insurance_enabled,
                    rate: insurance_rate,
                    coverageRate: insurance_coverage_rate
                }) : { enabled: false, rate: 0, coverageRate: 0, premium: 0 };

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('coins')
                    .eq('id', profileId)
                    .single();

                if (duel.bet_amount > 0) {
                    const requiredCoins = duel.bet_amount + (joinerInsurance.premium || 0);
                    if ((profile?.coins || 0) < requiredCoins) {
                        return new Response(JSON.stringify({
                            error: `Insufficient coins. You need ${requiredCoins} coins`
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        });
                    }

                    await supabase.rpc('increment_profile_value', {
                        p_profile_id: profileId,
                        p_column: 'coins',
                        p_amount: -requiredCoins
                    });
                }

                const { data: player } = await supabase
                    .from('duel_players')
                    .insert({
                        duel_id: duel.id,
                        user_id: profileId,
                        is_bot: false,
                        score: 0,
                        correct_count: 0,
                        insurance_enabled: joinerInsurance.enabled,
                        insurance_premium: joinerInsurance.premium,
                        insurance_coverage_rate: joinerInsurance.coverageRate,
                    })
                    .select()
                    .single();

                const { error: activeError } = await supabase
                    .from('duels')
                    .update({ status: 'active', started_at: new Date().toISOString() })
                    .eq('id', duel.id);

                if (activeError) throw activeError;

                // Запись транзакций для ставки и страховки присоединившегося игрока
                if (duel.bet_amount > 0) {
                    try {
                        const txData = [];
                        txData.push({
                            duel_id: duel.id,
                            user_id: profileId,
                            amount: -duel.bet_amount,
                            transaction_type: 'bet'
                        });
                        if (joinerInsurance.enabled && (joinerInsurance.premium || 0) > 0) {
                            txData.push({
                                duel_id: duel.id,
                                user_id: profileId,
                                amount: -joinerInsurance.premium,
                                transaction_type: 'insurance_premium'
                            });
                        }
                        await supabase.from('duel_transactions').insert(txData);
                        console.log(`[join_duel] Transactions saved for user ${profileId} in duel ${duel.id}`);
                    } catch (txErr) {
                        console.error('[join_duel] Failed to save transactions', txErr);
                    }
                }

                return new Response(JSON.stringify({
                    duel,
                    player,
                    auto_started: true
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            case 'find_match': {
                const validated = findMatchSchema.parse(params);
                const {
                    num_questions,
                    categories,
                    difficulty,
                    bet_amount = 0,
                    bet_type = 'none',
                    insurance_enabled,
                    insurance_rate,
                    insurance_coverage_rate,
                    license_category,
                    rematch_opponent_id,
                    rematch_bot_name,
                } = validated;

                const { data: playerProfile } = await supabase
                    .from('profiles')
                    .select('duel_pass_level, coins, preferred_country, win_streak')
                    .eq('id', profileId)
                    .single();

                if (!playerProfile) {
                    return new Response(JSON.stringify({ error: 'Profile not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                const playerCountry = playerProfile.preferred_country || 'spain';

                // Рассчитываем страховку хоста
                const hostInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
                    enabled: insurance_enabled,
                    rate: insurance_rate,
                    coverageRate: insurance_coverage_rate
                }) : { enabled: false, rate: 0, coverageRate: 0, premium: 0 };

                // Списываем монеты если есть ставка
                if (bet_amount > 0) {
                    const requiredCoins = bet_amount + (hostInsurance.premium || 0);
                    if ((playerProfile.coins || 0) < requiredCoins) {
                        return new Response(JSON.stringify({
                            error: `Insufficient coins. You need ${requiredCoins} coins but only have ${playerProfile.coins || 0}`
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        });
                    }
                    await supabase.rpc('increment_profile_value', {
                        p_profile_id: profileId,
                        p_column: 'coins',
                        p_amount: -(requiredCoins)
                    });
                }

                const queueData: Record<string, any> = {
                    profile_id: profileId,
                    num_questions,
                    difficulty: difficulty || 'mix',
                    bet_amount: bet_amount || 0,
                    bet_type: bet_type || 'none',
                    expires_at: new Date(Date.now() + 30000).toISOString(),
                    matched: false,
                    preferred_country: playerCountry
                };

                if (categories && Array.isArray(categories) && categories.length > 0) {
                    queueData.categories = categories;
                }

                // РЕВАНШ С ДРУГОМ: создаём приватную дуэль и уведомляем оппонента
                if (rematch_opponent_id) {
                    console.log(`[find_match] 🔄 Rematch requested with opponent: ${rematch_opponent_id}`);

                    const rematchCode = generateDuelCode();
                    const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);
                    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

                    const { data: rematchDuel, error: rematchDuelError } = await supabase
                        .from('duels')
                        .insert({
                            code: rematchCode,
                            host_user: profileId,
                            num_questions,
                            categories,
                            difficulty,
                            question_seed: questionSeed,
                            bet_amount: bet_amount,
                            bet_type: bet_amount > 0 ? bet_type : 'none',
                            expires_at: expiresAt,
                            country: playerCountry,
                            status: 'waiting',
                        })
                        .select()
                        .single();

                    if (rematchDuelError || !rematchDuel) {
                        // Возвращаем монеты при ошибке
                        if (bet_amount > 0) {
                            const requiredCoins = bet_amount + (hostInsurance.premium || 0);
                            await supabase.rpc('increment_profile_value', {
                                p_profile_id: profileId,
                                p_column: 'coins',
                                p_amount: requiredCoins
                            });
                        }
                        throw rematchDuelError || new Error('Failed to create rematch duel');
                    }

                    // Добавляем хоста в duel_players (без этого дуэль пуста)
                    const { error: hostPlayerError } = await supabase
                        .from('duel_players')
                        .insert({
                            duel_id: rematchDuel.id,
                            user_id: profileId,
                            is_bot: false,
                            insurance_enabled: hostInsurance.enabled,
                            insurance_premium: hostInsurance.premium,
                            insurance_coverage_rate: hostInsurance.coverageRate,
                        });

                    if (hostPlayerError) {
                        console.error('[find_match] ❌ Failed to insert host player for rematch:', hostPlayerError);
                        throw hostPlayerError;
                    }

                    // Создаём вопросы для дуэли (без этого нечего играть)
                    const rematchQuestions = await fetchRandomQuestions(
                        supabase,
                        num_questions,
                        playerCountry,
                        questionSeed,
                        categories,
                        difficulty,
                        license_category
                    );

                    const rematchDuelQuestions = rematchQuestions.map((q: any, index: number) => ({
                        duel_id: rematchDuel.id,
                        question_id: q.id,
                        position: index + 1,
                        question_snapshot: q,
                        correct_option_ids: q.correct_option_id ? [q.correct_option_id] : [],
                    }));

                    const { error: rematchQuestionsError } = await supabase
                        .from('duel_questions')
                        .insert(rematchDuelQuestions);

                    if (rematchQuestionsError) {
                        console.error('[find_match] ❌ Failed to insert questions for rematch:', rematchQuestionsError);
                        throw rematchQuestionsError;
                    }

                    // Получаем имя инициатора для уведомления
                    const { data: senderProfile } = await supabase
                        .from('profiles')
                        .select('first_name, username, telegram_id')
                        .eq('id', profileId)
                        .maybeSingle();

                    const senderName = senderProfile?.first_name || senderProfile?.username || 'Соперник';

                    // Получаем telegram_id получателя (оппонента)
                    const { data: opponentProfile } = await supabase
                        .from('profiles')
                        .select('telegram_id, first_name')
                        .eq('id', rematch_opponent_id)
                        .maybeSingle();

                    // Всегда создаём in-app уведомление о реванше (независимо от Telegram)
                    await supabase.from('duel_notifications').insert({
                        duel_id: rematchDuel.id,
                        type: 'rematch_challenge',
                        metadata: {
                            duel_code: rematchCode,
                            challenger_name: senderName,
                            challenger_id: profileId,
                        },
                        recipient_id: rematch_opponent_id,
                    }).then(({ error: notifErr }) => {
                        if (notifErr) console.warn('[find_match] ⚠️ Failed to insert duel_notification:', notifErr.message);
                    });

                    // Отправляем Telegram уведомление если есть telegram_id
                    let notificationSent = false;
                    if (opponentProfile?.telegram_id) {
                        try {
                            const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
                            const botUsername = Deno.env.get('TELEGRAM_BOT_USERNAME');
                            if (botToken && botUsername) {
                                // Используем правильный формат deeplink для Telegram Mini App
                                const deepLink = `https://t.me/${botUsername}?startapp=duel_${rematchCode}`;
                                const messageText = `⚔️ *${senderName}* вызывает тебя на реванш!\\n\\nКод дуэли: \`${rematchCode}\`\\nНажми кнопку ниже, чтобы принять вызов.`;

                                const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        chat_id: opponentProfile.telegram_id,
                                        text: messageText,
                                        parse_mode: 'Markdown',
                                        reply_markup: {
                                            inline_keyboard: [[{
                                                text: '⚔️ Принять реванш',
                                                url: deepLink
                                            }]]
                                        }
                                    })
                                });
                                const tgResult = await tgResponse.json();
                                if (tgResult.ok) {
                                    notificationSent = true;
                                    console.log(`[find_match] ✅ Rematch notification sent to telegram_id: ${opponentProfile.telegram_id}`);
                                } else {
                                    console.error(`[find_match] ❌ Telegram API error:`, tgResult);
                                }
                            } else if (botToken) {
                                // Fallback: без botUsername используем APP_URL
                                const appUrl = Deno.env.get('APP_URL') || 'https://skilyapp.com';
                                const deepLink = `${appUrl}/games/duel?code=${rematchCode}`;
                                const messageText = `⚔️ *${senderName}* вызывает тебя на реванш!\\n\\nКод дуэли: \`${rematchCode}\`\\nНажми кнопку ниже, чтобы принять вызов.`;

                                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        chat_id: opponentProfile.telegram_id,
                                        text: messageText,
                                        parse_mode: 'Markdown',
                                        reply_markup: {
                                            inline_keyboard: [[{ text: '⚔️ Принять реванш', url: deepLink }]]
                                        }
                                    })
                                });
                                notificationSent = true;
                                console.log(`[find_match] ✅ Rematch notification sent (fallback URL) to: ${opponentProfile.telegram_id}`);
                            }
                        } catch (notifyError) {
                            console.error('[find_match] ⚠️ Failed to send rematch notification:', notifyError);
                        }
                    } else {
                        console.warn(`[find_match] ⚠️ No telegram_id for opponent ${rematch_opponent_id}, skipping Telegram notification (in-app already sent)`);
                    }

                    return new Response(JSON.stringify({
                        duel: rematchDuel,
                        code: rematchCode,
                        auto_started: false,
                        opponent_type: 'human',
                        rematch_notification_sent: notificationSent
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                await supabase.from('duel_matchmaking_queue').insert(queueData);

                // Ищем реального оппонента ~5 секунд (или пропускаем если immediate_bot)
                let matchedOpponent = null;
                const searchTimeout = (params.immediate_bot) ? 0 : 5000;
                const searchStart = Date.now();

                while (Date.now() - searchStart < searchTimeout) {
                    const { data: queueEntries } = await supabase.rpc('find_matchmaking_opponent', {
                        p_profile_id: profileId,
                        p_bet_amount: bet_amount,
                        p_difficulty: difficulty || 'mix'
                    });

                    if (queueEntries && queueEntries.length > 0) {
                        matchedOpponent = queueEntries[0];
                        break;
                    }

                    await new Promise(r => setTimeout(r, 1000));
                }

                // --- REAL OPPONENT MATCHED ---
                if (matchedOpponent) {
                    console.log(`[find_match] ✅ Match found! Joining duel: ${matchedOpponent.duel_id}`);

                    const { data: duel, error: duelError } = await supabase
                        .from('duels')
                        .select('*')
                        .eq('id', matchedOpponent.duel_id)
                        .single();

                    if (duelError || !duel) {
                        console.error('[find_match] Error fetching matched duel:', duelError);
                        // Fallback to bot if duel fetch fails
                    } else {
                        // Join the matched duel
                        const joinerInsurance = duel.bet_amount > 0 ? getInsuranceConfig(duel.bet_amount, {
                            enabled: insurance_enabled,
                            rate: insurance_rate,
                            coverageRate: insurance_coverage_rate
                        }) : { enabled: false, rate: 0, coverageRate: 0, premium: 0 };

                        const { data: player, error: playerError } = await supabase
                            .from('duel_players')
                            .insert({
                                duel_id: duel.id,
                                user_id: profileId,
                                is_bot: false,
                                insurance_enabled: joinerInsurance.enabled,
                                insurance_premium: joinerInsurance.premium,
                                insurance_coverage_rate: joinerInsurance.coverageRate,
                            })
                            .select()
                            .single();

                        if (!playerError) {
                            // Update duel status
                            await supabase
                                .from('duels')
                                .update({ status: 'active', started_at: new Date().toISOString() })
                                .eq('id', duel.id);

                            // Remove from queue
                            await supabase.rpc('mark_matchmaking_matched', {
                                p_queue_id: matchedOpponent.id
                            });

                            return new Response(JSON.stringify({
                                duel,
                                player,
                                auto_started: true,
                                code: duel.code,
                                opponent_type: 'human'
                            }), {
                                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            });
                        }
                    }
                }

                // --- BOT FALLBACK (Default) ---
                // Создаём бот-дуэль
                let botProfile;
                if (params.rematch_bot_name) {
                    // Используем того же самого бота для реванша
                    botProfile = generateBotProfile(playerProfile.duel_pass_level || 1, playerProfile.win_streak || 0);
                    botProfile.name = params.rematch_bot_name;
                } else {
                    botProfile = generateBotProfile(playerProfile.duel_pass_level || 1, playerProfile.win_streak || 0);
                }

                const code = generateDuelCode();
                const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);
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
                        bet_amount: bet_amount,
                        bet_type: bet_amount > 0 ? bet_type : 'none',
                        expires_at: expiresAt,
                        country: playerCountry,
                        status: 'active',
                        started_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (duelError || !duel) {
                    // Возвращаем монеты если дуэль не создалась
                    if (bet_amount > 0) {
                        const requiredCoins = bet_amount + (hostInsurance.premium || 0);
                        await supabase.rpc('increment_profile_value', {
                            p_profile_id: profileId,
                            p_column: 'coins',
                            p_amount: requiredCoins
                        });
                    }
                    throw duelError || new Error('Failed to create duel');
                }

                const questions = await fetchRandomQuestions(
                    supabase,
                    num_questions,
                    playerCountry,
                    questionSeed,
                    categories,
                    difficulty,
                    license_category
                );

                const duelQuestions = questions.map((q: any, index: number) => ({
                    duel_id: duel.id,
                    question_id: q.id,
                    position: index + 1,
                    question_snapshot: q,
                    correct_option_ids: q.correct_option_id ? [q.correct_option_id] : [],
                }));

                const { data: insertedQuestions, error: questionsError } = await supabase
                    .from('duel_questions')
                    .insert(duelQuestions)
                    .select();

                if (questionsError || !insertedQuestions || insertedQuestions.length === 0) {
                    console.error('[find_match] Failed to insert questions:', questionsError);
                    throw new Error('Failed to create duel questions');
                }

                // Запись транзакций для ставки и страховки хоста (бота)
                if (bet_amount > 0) {
                    try {
                        const txData = [];
                        txData.push({
                            duel_id: duel.id,
                            user_id: profileId,
                            amount: -bet_amount,
                            transaction_type: 'bet'
                        });
                        if (hostInsurance.enabled && (hostInsurance.premium || 0) > 0) {
                            txData.push({
                                duel_id: duel.id,
                                user_id: profileId,
                                amount: -hostInsurance.premium,
                                transaction_type: 'insurance_premium'
                            });
                        }
                        await supabase.from('duel_transactions').insert(txData);
                        console.log(`[find_match] Transactions saved for user ${profileId} in duel ${duel.id}`);
                    } catch (txErr) {
                        console.error('[find_match] Failed to save transactions', txErr);
                    }
                }

                // Обновляем запись хоста в duel_players (добавляем страховку)
                // Хост уже добавлен триггером auto_add_host_to_duel_players
                if (hostInsurance.enabled) {
                    await supabase
                        .from('duel_players')
                        .update({
                            insurance_enabled: hostInsurance.enabled,
                            insurance_premium: hostInsurance.premium,
                            insurance_coverage_rate: hostInsurance.coverageRate,
                        })
                        .eq('duel_id', duel.id)
                        .eq('user_id', profileId);
                }

                console.log('[find_match] Inserting bot player...');

                const { data: botPlayer, error: botError } = await supabase
                    .from('duel_players')
                    .insert({
                        duel_id: duel.id,
                        user_id: null,
                        score: 0,
                        correct_count: 0,
                        is_bot: true,
                        bot_difficulty: botProfile.difficulty,
                        bot_name: botProfile.name,
                        name: botProfile.name,
                    })
                    .select()
                    .single();

                if (botError || !botPlayer) {
                    console.error('[find_match] Failed to insert bot:', botError);
                    throw new Error('Failed to create bot player');
                }

                return new Response(JSON.stringify({
                    duel,
                    code,
                    auto_started: true,
                    opponent_type: 'bot',
                    bot_name: botProfile.name,
                    bot_difficulty: botProfile.difficulty
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            case 'cancel_duel': {
                const { duel_id } = params;

                const { data: duel } = await supabase
                    .from('duels')
                    .select('*, duel_players(*)')
                    .eq('id', duel_id)
                    .single();

                if (!duel) {
                    return new Response(JSON.stringify({ error: 'Duel not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                if (duel.status !== 'waiting') {
                    return new Response(JSON.stringify({ error: 'Can only cancel waiting duels' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                await supabase
                    .from('duels')
                    .update({ status: 'cancelled' })
                    .eq('id', duel_id);

                let refunded = 0;
                if (duel.bet_amount > 0) {
                    for (const player of duel.duel_players) {
                        const refundAmount = duel.bet_amount + (player.insurance_premium || 0);
                        await supabase.rpc('increment_profile_value', {
                            p_profile_id: player.user_id,
                            p_column: 'coins',
                            p_amount: refundAmount
                        });
                        refunded = refundAmount;
                    }
                }

                return new Response(JSON.stringify({ success: true, refunded }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            case 'process_help': {
                const { duel_id, requester_id, helper_id, amount } = params;

                if (!duel_id || !requester_id || !helper_id) {
                    return new Response(JSON.stringify({ error: 'Missing required params: duel_id, requester_id, helper_id' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // 1. Проверяем баланс хоста (helper)
                const { data: helperProfile, error: helperError } = await supabase
                    .from('profiles')
                    .select('coins')
                    .eq('id', helper_id)
                    .single();

                if (helperError || !helperProfile) {
                    return new Response(JSON.stringify({ error: 'Helper profile not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                if ((helperProfile.coins || 0) < amount) {
                    return new Response(JSON.stringify({ error: 'Insufficient coins for help' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // 2. Проверяем дуэль
                const { data: duel, error: duelError } = await supabase
                    .from('duels')
                    .select('id, status, bet_amount, code')
                    .eq('id', duel_id)
                    .single();

                if (duelError || !duel) {
                    return new Response(JSON.stringify({ error: 'Duel not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                if (duel.status === 'active') {
                    // Идемпотентность: дуэль уже активна (предыдущий запрос мог завершиться частично)
                    const { data: guestPlayer } = await supabase
                        .from('duel_players')
                        .select('id')
                        .eq('duel_id', duel_id)
                        .eq('user_id', requester_id)
                        .maybeSingle();

                    return new Response(JSON.stringify({
                        success: true,
                        duel: { id: duel_id, code: duel.code, status: 'active' },
                        player: guestPlayer,
                        idempotent: true
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                if (duel.status !== 'waiting') {
                    return new Response(JSON.stringify({ error: 'Duel not in waiting state' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // 3. Проверяем что гость ещё не в дуэли
                const { data: existingPlayer } = await supabase
                    .from('duel_players')
                    .select('id')
                    .eq('duel_id', duel_id)
                    .eq('user_id', requester_id)
                    .maybeSingle();

                if (existingPlayer) {
                    return new Response(JSON.stringify({ error: 'Requester already in duel' }), {
                        status: 409,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // 5. Атомарно списываем монеты у хоста (helper)
                const { error: withdrawError } = await supabase.rpc('increment_profile_value', {
                    p_profile_id: helper_id,
                    p_column: 'coins',
                    p_amount: -amount
                });

                if (withdrawError) throw withdrawError;

                // 6. Добавляем гостя в дуэль
                const { data: newPlayer, error: playerError } = await supabase
                    .from('duel_players')
                    .insert({
                        duel_id: duel_id,
                        user_id: requester_id,
                        is_bot: false,
                        score: 0,
                        correct_count: 0,
                        insurance_enabled: false,
                        insurance_premium: 0,
                        insurance_coverage_rate: 0,
                    })
                    .select()
                    .single();

                if (playerError) {
                    // Откатываем монеты при ошибке
                    try {
                        await supabase.rpc('increment_profile_value', {
                            p_profile_id: helper_id,
                            p_column: 'coins',
                            p_amount: amount
                        });
                    } catch (rollbackErr) {
                        console.error('[process_help] Rollback error:', rollbackErr);
                    }
                    throw playerError;
                }

                // 7. Активируем дуэль
                const { error: activeError } = await supabase
                    .from('duels')
                    .update({ status: 'active', started_at: new Date().toISOString() })
                    .eq('id', duel_id);

                if (activeError) throw activeError;

                // 8. Записываем транзакцию списания у хоста (helper)
                try {
                    await supabase.from('duel_transactions').insert({
                        duel_id: duel_id,
                        user_id: helper_id,
                        amount: -amount,
                        transaction_type: 'help_friend'
                    });
                    console.log(`[process_help] Transaction record created for helper ${helper_id}`);
                } catch (txErr) {
                    console.error('[process_help] Failed to create transaction record:', txErr);
                }

                // 9. Уведомляем гостя о том, что помощь получена и дуэль началась
                try {
                    const { error: notifError } = await supabase.from('duel_notifications').insert({
                        user_id: requester_id,
                        duel_id: duel_id,
                        type: 'help_received',
                        title: 'Помощь получена! ⚔️',
                        message: `Друг доплатил ${amount} монет. Дуэль начинается!`,
                        metadata: {
                            duel_id: duel_id,
                            amount: amount,
                            helper_id: helper_id,
                        }
                    });
                    if (notifError) console.error('[process_help] Notification insert error:', notifError);
                } catch (notifErr) {
                    console.error('[process_help] Notification exception:', notifErr);
                }


                return new Response(JSON.stringify({
                    success: true,
                    duel: { id: duel_id, code: duel.code, status: 'active' },
                    player: newPlayer
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }


            default:
                return new Response(JSON.stringify({ error: 'Unknown action' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
        }
    } catch (error: any) {
        console.error('[duel-matchmaking] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

