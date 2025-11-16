import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const { action, ...params } = await req.json();

    // ============================================
    // ДЕЙСТВИЕ 1: Создать invoice (от клиента)
    // ============================================
    if (action === 'create_invoice') {
      const { user_id, package_key, telegram_user_id } = params;

      if (!user_id || !package_key || !telegram_user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: user_id, package_key, telegram_user_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Stars Payment] Creating invoice:', { user_id, package_key, telegram_user_id });

      // ПРОВЕРКА 1: Получить и проверить пакет (fraud protection)
      const { data: pkg, error: pkgError } = await supabase
        .from('pricing_packages')
        .select('*')
        .eq('package_key', package_key)
        .eq('is_active', true)
        .single();

      if (pkgError || !pkg) {
        console.error('[Stars Payment] Package not found or inactive:', package_key);
        return new Response(
          JSON.stringify({ error: `Package ${package_key} not found or inactive` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Рассчитать количество Stars (Math.round для честного округления)
      // Формула: stars = coins / 0.5 = coins * 2 (1 coin = 2 stars)
      const starsAmount = Math.round(pkg.price_coins / EXCHANGE_RATE_COINS_TO_STARS);

      // Минимальная сумма для Telegram Stars: 1 звезда
      // Максимальная сумма: 10000 звезд
      // ВАЖНО: Для XTR валюта сумма указывается в ЦЕЛЫХ единицах звезд, а не в тысячных долях!

      if (starsAmount <= 0 || starsAmount < 1) {
        return new Response(
          JSON.stringify({ error: 'Invalid price calculation: minimum 1 star required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (starsAmount > 10000) {
        return new Response(
          JSON.stringify({ error: 'Invalid price calculation: maximum 10000 stars allowed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Создать уникальный payload для invoice
      const invoicePayload = crypto.randomUUID();

      // Создать запись платежа в БД
      const { data: payment, error: paymentError } = await supabase
        .from('stars_payments')
        .insert({
          user_id,
          package_id: pkg.id,
          invoice_payload: invoicePayload,
          telegram_user_id: telegram_user_id,
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

      if (paymentError) {
        console.error('[Stars Payment] Failed to create payment:', paymentError);
        return new Response(
          JSON.stringify({ error: `Failed to create payment: ${paymentError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Stars Payment] Invoice details:', {
        starsAmount,
        package_key: pkg.package_key
      });

      // Создать invoice через Telegram Bot API
      // Для Telegram Stars (XTR) в Mini Apps используем createInvoiceLink вместо sendInvoice
      // - currency: 'XTR'
      // - provider_token: пустая строка '' (обязательно для Stars)
      // - amount в ЦЕЛЫХ единицах звезд (не в тысячных долях!)
      // - Минимум: 1 звезда, Максимум: 10000 звезд
      const invoiceRequest = {
        title: pkg.title_ru,
        description: pkg.description_ru,
        payload: invoicePayload, // Важно: наш ID для отслеживания
        provider_token: '', // Пустая строка для Telegram Stars (обязательно!)
        currency: 'XTR', // Код валюты Telegram Stars
        prices: [{
          label: pkg.title_ru,
          amount: starsAmount // В ЦЕЛЫХ единицах звезд (для XTR не нужно умножать на 1000!)
        }]
      };

      console.log('[Stars Payment] Creating invoice link via Telegram API:', JSON.stringify(invoiceRequest, null, 2));

      // Используем createInvoiceLink для Mini Apps (не требует chat_id, возвращает invoice_link напрямую)
      const invoiceResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceRequest)
      });

      const invoiceData = await invoiceResponse.json();

      // Логируем полный ответ от Telegram API для отладки
      console.log('[Stars Payment] Telegram API response:', JSON.stringify(invoiceData, null, 2));

      if (!invoiceData.ok) {
        console.error('[Stars Payment] Telegram API error:', invoiceData);
        
        // Удалить созданный платеж при ошибке
        await supabase
          .from('stars_payments')
          .delete()
          .eq('id', payment.id);

        return new Response(
          JSON.stringify({ error: `Telegram API error: ${invoiceData.description || 'Unknown error'}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Проверить наличие invoice_link в ответе
      // createInvoiceLink возвращает result напрямую как строку (invoice_link)
      const invoiceLink = invoiceData.result;
      if (!invoiceLink || typeof invoiceLink !== 'string') {
        console.error('[Stars Payment] Invoice link missing or invalid in response:', invoiceData);
        
        // Удалить созданный платеж при ошибке
        await supabase
          .from('stars_payments')
          .delete()
          .eq('id', payment.id);

        return new Response(
          JSON.stringify({ error: 'Telegram API did not return valid invoice_link. Response: ' + JSON.stringify(invoiceData) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Stars Payment] Invoice link created successfully:', {
        payment_id: payment.id,
        invoice_link: invoiceLink,
        stars_amount: starsAmount
      });

      // Вернуть invoice_link клиенту
      return new Response(
        JSON.stringify({
          success: true,
          invoice_link: invoiceLink,
          payment_id: payment.id,
          stars_amount: starsAmount,
          coins_equivalent: pkg.price_coins
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ДЕЙСТВИЕ 2: Pre-checkout query (webhook от Telegram)
    // ============================================
    if (action === 'pre_checkout_query') {
      const { query_id, invoice_payload } = params;

      if (!query_id || !invoice_payload) {
        return new Response(
          JSON.stringify({ error: 'Missing query_id or invoice_payload' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Stars Payment] Pre-checkout query:', { query_id, invoice_payload });

      // ПРОВЕРКА 2: Найти платеж по payload (fraud protection)
      const { data: payment, error: paymentError } = await supabase
        .from('stars_payments')
        .select('*, pricing_packages(*)')
        .eq('invoice_payload', invoice_payload)
        .single();

      if (paymentError || !payment) {
        console.error('[Stars Payment] Payment not found:', invoice_payload);
        
        // Отклонить pre-checkout
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: query_id,
            ok: false,
            error_message: 'Заказ не найден'
          })
        });

        return new Response(
          JSON.stringify({ error: 'Payment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Проверить, не был ли уже оплачен
      if (payment.status === 'completed') {
        console.warn('[Stars Payment] Payment already completed:', invoice_payload);
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: query_id,
            ok: false,
            error_message: 'Этот заказ уже был оплачен'
          })
        });

        return new Response(
          JSON.stringify({ error: 'Payment already completed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Подтвердить pre-checkout
      const answerResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: query_id,
          ok: true
        })
      });

      const answerData = await answerResponse.json();

      if (!answerData.ok) {
        console.error('[Stars Payment] Failed to answer pre-checkout:', answerData);
        return new Response(
          JSON.stringify({ error: 'Failed to answer pre-checkout query' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Stars Payment] Pre-checkout confirmed:', invoice_payload);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ДЕЙСТВИЕ 3: Successful payment (webhook от Telegram)
    // ============================================
    if (action === 'successful_payment') {
      const { 
        invoice_payload, 
        telegram_payment_charge_id,
        total_amount, // для XTR - в целых единицах звезд
        currency 
      } = params;

      if (!invoice_payload || !telegram_payment_charge_id) {
        return new Response(
          JSON.stringify({ error: 'Missing invoice_payload or telegram_payment_charge_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Stars Payment] Successful payment:', {
        invoice_payload,
        telegram_payment_charge_id,
        total_amount,
        currency
      });

      // ПРОВЕРКА 3: Найти платеж (fraud protection)
      const { data: payment, error: paymentError } = await supabase
        .from('stars_payments')
        .select('*, pricing_packages(*)')
        .eq('invoice_payload', invoice_payload)
        .single();

      if (paymentError || !payment) {
        console.error('[Stars Payment] Payment not found:', invoice_payload);
        return new Response(
          JSON.stringify({ error: 'Payment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Защита от дублей (idempotency)
      if (payment.status === 'completed') {
        console.log('[Stars Payment] Payment already completed, skipping:', invoice_payload);
        return new Response(
          JSON.stringify({ success: true, message: 'Already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Проверить charge_id на уникальность
      const { data: existingPayment } = await supabase
        .from('stars_payments')
        .select('id')
        .eq('telegram_payment_charge_id', telegram_payment_charge_id)
        .single();

      if (existingPayment) {
        console.warn('[Stars Payment] Duplicate charge_id:', telegram_payment_charge_id);
        return new Response(
          JSON.stringify({ success: false, error: 'Duplicate payment' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Проверить сумму (fraud protection)
      // Для XTR валюта total_amount приходит в целых единицах звезд
      const receivedStars = currency === 'XTR' ? total_amount : Math.round(total_amount / 1000);
      if (receivedStars !== payment.stars_amount) {
        console.error('[Stars Payment] Amount mismatch:', {
          expected: payment.stars_amount,
          received: receivedStars,
          total_amount,
          currency
        });
        
        // Обновить статус как failed
        await supabase
          .from('stars_payments')
          .update({
            status: 'failed',
            metadata: {
              ...payment.metadata,
              error: 'Amount mismatch',
              expected_stars: payment.stars_amount,
              received_stars: receivedStars,
              total_amount,
              currency
            }
          })
          .eq('id', payment.id);

        return new Response(
          JSON.stringify({ error: 'Amount mismatch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Обновить статус платежа
      const { error: updateError } = await supabase
        .from('stars_payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          telegram_payment_charge_id: telegram_payment_charge_id,
          metadata: {
            ...payment.metadata,
            total_amount,
            currency,
            received_at: new Date().toISOString()
          }
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('[Stars Payment] Failed to update payment:', updateError);
        return new Response(
          JSON.stringify({ error: `Failed to update payment: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Stars Payment] Payment marked as completed:', payment.id);

      // Начислить награды через RPC функцию (soft-fail)
      const { data: rewardsResult, error: rewardsError } = await supabase.rpc(
        'process_stars_payment_rewards',
        { p_payment_id: payment.id }
      );

      if (rewardsError) {
        console.error('[Stars Payment] Rewards processing error:', rewardsError);
        // Не бросаем ошибку - платеж уже completed, награды будут начислены через retry
      } else if (rewardsResult && !rewardsResult.success) {
        console.warn('[Stars Payment] Rewards processing failed:', rewardsResult);
        // Награды будут начислены через retry механизм
      } else {
        console.log('[Stars Payment] Rewards processed successfully:', payment.id);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          payment_id: payment.id,
          rewards_status: rewardsResult?.success ? 'completed' : 'pending'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Stars Payment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

