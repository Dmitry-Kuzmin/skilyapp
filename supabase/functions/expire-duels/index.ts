import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiredDuel {
    id: string;
    code: string;
    host_user: string;
    bet_amount: number;
    status: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createPooledSupabaseClient();
        const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://sdadim-dgt-prep.vercel.app';

        console.log('[expire-duels] Checking expired duels...');

        const { data: expiredDuels, error: fetchError } = await supabase
            .from('duels')
            .select('id, code, host_user, bet_amount, status')
            .in('status', ['pending', 'waiting_for_opponent'])
            .lt('expires_at', new Date().toISOString())
            .limit(100) as { data: ExpiredDuel[] | null, error: unknown };

        if (fetchError) throw fetchError;
        if (!expiredDuels || expiredDuels.length === 0) {
            return new Response(JSON.stringify({ success: true, processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        let processed = 0;
        let refunded = 0;

        for (const duel of expiredDuels) {
            const { error: updateError } = await supabase
                .from('duels')
                .update({ status: 'expired', finished_at: new Date().toISOString() })
                .eq('id', duel.id)
                .in('status', ['pending', 'waiting_for_opponent']);

            if (updateError) continue;

            if (duel.bet_amount > 0 && duel.host_user) {
                const { data: betData } = await supabase.from('duel_bets').select('host_insurance_premium').eq('duel_id', duel.id).maybeSingle();
                const totalRefund = duel.bet_amount + (betData?.host_insurance_premium || 0);

                await supabase.rpc('increment_profile_value', { p_profile_id: duel.host_user, p_column: 'coins', p_amount: totalRefund });
                await supabase.from('duel_transactions').insert({ duel_id: duel.id, user_id: duel.host_user, amount: totalRefund, transaction_type: 'refund_expired' });
                refunded++;
            }

            if (TELEGRAM_BOT_TOKEN && duel.host_user) {
                const { data: profile } = await supabase.from('profiles').select('telegram_id').eq('id', duel.host_user).maybeSingle();
                if (profile?.telegram_id) {
                    const message = duel.bet_amount > 0
                        ? `⏰ <b>Дуэль истекла</b>\n\nНикто не принял вызов.\n💰 Ставка ${duel.bet_amount} монет возвращена.`
                        : `⏰ <b>Дуэль истекла</b>\n\nСоздай новую битву!`;

                    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: profile.telegram_id,
                            text: message,
                            parse_mode: 'HTML',
                            reply_markup: { inline_keyboard: [[{ text: '⚔️ Новая дуэль', web_app: { url: `${MINI_APP_URL}/games/duel` } }]] }
                        })
                    }).catch(() => { });
                }
            }
            processed++;
        }

        return new Response(JSON.stringify({ success: true, processed, refunded }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
