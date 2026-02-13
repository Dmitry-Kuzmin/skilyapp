import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Курс конвертации: 1 Star = 0.5 coins (или 1 coin = 2 stars)
// Рассчитано на основе официальных цен Telegram Stars:
// - Средняя цена 1 звезды: 0.02161 €
// - 100 монет = €2.99 в Stripe
// - С учетом комиссии Telegram (30%): €2.99 / 0.7 ≈ €4.27 → 198 звёзд
// - Курс: 100 монет / 198 звёзд ≈ 0.5 coins/star
// Используем упрощенный курс: 1 Star = 0.5 coins (1 coin = 2 stars)
const EXCHANGE_RATE_COINS_TO_STARS = 0.5;

interface CreateInvoiceParams {
  action: 'create_invoice';
  user_id: string;
  package_key: string;
  telegram_user_id: string | number;
}

interface PreCheckoutParams {
  action: 'pre_checkout_query';
  query_id: string;
  invoice_payload: string;
}

interface SuccessfulPaymentParams {
  action: 'successful_payment';
  invoice_payload: string;
  telegram_payment_charge_id: string;
  total_amount: number;
  currency: string;
}

type PaymentRequest = CreateInvoiceParams | PreCheckoutParams | SuccessfulPaymentParams;

interface PricingPackage {
  id: string;
  package_key: string;
  package_type: string;
  price_coins: number;
  price_stars: number | null;
  title_ru: string;
  description_ru: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createPooledSupabaseClient();
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const body: PaymentRequest = await req.json();
    const { action } = body;

    // ============================================
    // ДЕЙСТВИЕ 1: Создать invoice
    // ============================================
    if (action === 'create_invoice') {
      const { user_id, package_key, telegram_user_id } = body;

      if (!user_id || !package_key || !telegram_user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: pkg, error: pkgError } = await supabase
        .from('pricing_packages')
        .select('*')
        .eq('package_key', package_key)
        .eq('is_active', true)
        .single() as { data: PricingPackage | null, error: unknown };

      if (pkgError || !pkg) {
        console.error('[Stars Payment] Package not found or inactive:', package_key);
        return new Response(
          JSON.stringify({ error: `Package ${package_key} not found or inactive` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const starsAmount = pkg.price_stars
        ? pkg.price_stars
        : Math.round(pkg.price_coins / EXCHANGE_RATE_COINS_TO_STARS);

      if (starsAmount < 1 || starsAmount > 10000) {
        return new Response(
          JSON.stringify({ error: 'Invalid price calculation: 1-10000 stars allowed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const invoicePayload = crypto.randomUUID();

      const { data: payment, error: paymentError } = await supabase
        .from('stars_payments')
        .insert({
          user_id,
          package_id: pkg.id,
          invoice_payload: invoicePayload,
          telegram_user_id: String(telegram_user_id),
          stars_amount: starsAmount,
          coins_equivalent: pkg.price_coins,
          status: 'pending',
          rewards_status: 'pending',
          metadata: {
            package_key: pkg.package_key,
            package_type: pkg.package_type
          }
        })
        .select()
        .single();

      if (paymentError || !payment) {
        console.error('[Stars Payment] Failed to create payment:', paymentError);
        return new Response(
          JSON.stringify({ error: 'Failed to initialize payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const invoiceRequest = {
        title: pkg.title_ru,
        description: pkg.description_ru,
        payload: invoicePayload,
        provider_token: '',
        currency: 'XTR',
        prices: [{
          label: pkg.title_ru,
          amount: starsAmount
        }]
      };

      const invoiceResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceRequest)
      });

      const invoiceData = await invoiceResponse.json();

      if (!invoiceData.ok) {
        console.error('[Stars Payment] Telegram API error:', invoiceData);
        await supabase.from('stars_payments').delete().eq('id', payment.id);
        return new Response(
          JSON.stringify({ error: 'Telegram API error: ' + (invoiceData.description || 'Unknown') }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          invoice_link: invoiceData.result,
          payment_id: payment.id,
          stars_amount: starsAmount,
          coins_equivalent: pkg.price_coins
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ДЕЙСТВИЕ 2: Pre-checkout query
    // ============================================
    if (action === 'pre_checkout_query') {
      const { query_id, invoice_payload } = body;

      const { data: payment, error: paymentError } = await supabase
        .from('stars_payments')
        .select('status')
        .eq('invoice_payload', invoice_payload)
        .maybeSingle();

      if (paymentError || !payment) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pre_checkout_query_id: query_id, ok: false, error_message: 'Заказ не найден' })
        });
        return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (payment.status === 'completed') {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pre_checkout_query_id: query_id, ok: false, error_message: 'Уже оплачено' })
        });
        return new Response(JSON.stringify({ error: 'Already completed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_checkout_query_id: query_id, ok: true })
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============================================
    // ДЕЙСТВИЕ 3: Successful payment
    // ============================================
    if (action === 'successful_payment') {
      const { invoice_payload, telegram_payment_charge_id, total_amount, currency } = body;

      const { data: payment, error: paymentError } = await supabase
        .from('stars_payments')
        .select('*')
        .eq('invoice_payload', invoice_payload)
        .single();

      if (paymentError || !payment) {
        return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (payment.status === 'completed') {
        return new Response(JSON.stringify({ success: true, message: 'Already processed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Проверка на дубликат charge_id
      const { data: existing } = await supabase.from('stars_payments').select('id').eq('telegram_payment_charge_id', telegram_payment_charge_id).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ success: false, error: 'Duplicate charge' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const receivedStars = currency === 'XTR' ? total_amount : Math.round(total_amount / 1000);
      if (receivedStars !== payment.stars_amount) {
        await supabase.from('stars_payments').update({ status: 'failed', metadata: { ...payment.metadata, error: 'Amount mismatch', received_stars: receivedStars } }).eq('id', payment.id);
        return new Response(JSON.stringify({ error: 'Amount mismatch' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error: updateError } = await supabase
        .from('stars_payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          telegram_payment_charge_id: telegram_payment_charge_id,
          metadata: { ...payment.metadata, total_amount, currency }
        })
        .eq('id', payment.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: rewardsResult } = await supabase.rpc('process_stars_payment_rewards', { p_payment_id: payment.id });

      return new Response(
        JSON.stringify({ success: true, payment_id: payment.id, rewards_status: rewardsResult?.success ? 'completed' : 'pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error('[Stars Payment] Error:', error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

