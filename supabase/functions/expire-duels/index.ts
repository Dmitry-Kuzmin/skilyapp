// Cron-функция для обработки истёкших дуэлей
// Запускается каждый час, проверяет дуэли с истёкшим TTL
// Возвращает ставки хостам и отправляет уведомления

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://skilyapp.com';

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        console.log('[expire-duels] 🕐 Starting expired duels check...');

        // Находим все дуэли со статусом 'pending' где expires_at < NOW()
        const { data: expiredDuels, error: fetchError } = await supabase
            .from('duels')
            .select(`
        id,
        code,
        host_user,
        bet_amount,
        status,
        expires_at,
        created_at
      `)
            .in('status', ['pending', 'waiting_for_opponent'])
            .lt('expires_at', new Date().toISOString())
            .limit(100); // Обрабатываем максимум 100 за раз

        if (fetchError) {
            console.error('[expire-duels] Error fetching expired duels:', fetchError);
            throw fetchError;
        }

        if (!expiredDuels || expiredDuels.length === 0) {
            console.log('[expire-duels] ✅ No expired duels found');
            return new Response(JSON.stringify({
                success: true,
                message: 'No expired duels',
                processed: 0
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[expire-duels] Found ${expiredDuels.length} expired duels`);

        let processed = 0;
        let refunded = 0;
        let notified = 0;

        for (const duel of expiredDuels) {
            try {
                console.log(`[expire-duels] Processing duel ${duel.id} (code: ${duel.code})`);

                // 1. Обновляем статус дуэли на 'expired'
                const { error: updateError } = await supabase
                    .from('duels')
                    .update({
                        status: 'expired',
                        finished_at: new Date().toISOString()
                    })
                    .eq('id', duel.id)
                    .in('status', ['pending', 'waiting_for_opponent']); // Atomic check

                if (updateError) {
                    console.error(`[expire-duels] Error updating duel ${duel.id}:`, updateError);
                    continue;
                }

                // 2. Возвращаем ставку хосту (если была)
                if (duel.bet_amount > 0 && duel.host_user) {
                    // Получаем информацию о ставке и страховке
                    const { data: betData } = await supabase
                        .from('duel_bets')
                        .select('host_insurance_premium')
                        .eq('duel_id', duel.id)
                        .single();

                    const totalRefund = duel.bet_amount + (betData?.host_insurance_premium || 0);

                    // Возвращаем монеты
                    await supabase.rpc('increment_profile_value', {
                        p_profile_id: duel.host_user,
                        p_column: 'coins',
                        p_amount: totalRefund
                    });

                    // Записываем транзакцию возврата
                    await supabase
                        .from('duel_transactions')
                        .insert({
                            duel_id: duel.id,
                            user_id: duel.host_user,
                            amount: totalRefund,
                            transaction_type: 'refund_expired'
                        });

                    console.log(`[expire-duels] 💰 Refunded ${totalRefund} coins to host ${duel.host_user}`);
                    refunded++;
                }

                // 3. Отправляем уведомление хосту в Telegram
                if (TELEGRAM_BOT_TOKEN && duel.host_user) {
                    // Получаем telegram_id хоста
                    const { data: hostProfile } = await supabase
                        .from('profiles')
                        .select('telegram_id, first_name')
                        .eq('id', duel.host_user)
                        .single();

                    if (hostProfile?.telegram_id) {
                        const message = duel.bet_amount > 0
                            ? `⏰ <b>Дуэль истекла</b>\n\nНикто не принял твой вызов за 24 часа.\n💰 Ставка ${duel.bet_amount} монет возвращена.\n\n🆔 Код битвы: <code>${duel.code}</code>`
                            : `⏰ <b>Дуэль истекла</b>\n\nНикто не принял твой вызов за 24 часа.\nСоздай новую дуэль!\n\n🆔 Код битвы: <code>${duel.code}</code>`;

                        try {
                            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: hostProfile.telegram_id,
                                    text: message,
                                    parse_mode: 'HTML',
                                    reply_markup: {
                                        inline_keyboard: [[
                                            { text: '⚔️ Создать новую дуэль', web_app: { url: `${MINI_APP_URL}/games/duel` } }
                                        ]]
                                    }
                                })
                            });

                            if (response.ok) {
                                console.log(`[expire-duels] 📱 Notification sent to ${hostProfile.telegram_id}`);
                                notified++;
                            } else {
                                const error = await response.json();
                                console.error(`[expire-duels] Telegram API error:`, error);
                            }
                        } catch (tgError) {
                            console.error(`[expire-duels] Failed to send Telegram notification:`, tgError);
                        }
                    }
                }

                processed++;
            } catch (duelError) {
                console.error(`[expire-duels] Error processing duel ${duel.id}:`, duelError);
            }
        }

        console.log(`[expire-duels] ✅ Completed. Processed: ${processed}, Refunded: ${refunded}, Notified: ${notified}`);

        return new Response(JSON.stringify({
            success: true,
            processed,
            refunded,
            notified,
            total_expired: expiredDuels.length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[expire-duels] Fatal error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
