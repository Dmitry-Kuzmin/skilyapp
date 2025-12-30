import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Максимальное количество попыток автоматического retry
const MAX_RETRY_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Stars Payment Retry] Starting retry process...');

    // Найти все платежи, которые требуют retry
    const { data: pendingPayments, error: fetchError } = await supabase
      .from('stars_payments')
      .select('id, user_id, package_id, retry_count, rewards_status, rewards_errors')
      .eq('status', 'completed') // Только completed платежи
      .in('rewards_status', ['pending', 'failed', 'retrying'])
      .lt('retry_count', MAX_RETRY_ATTEMPTS) // Меньше максимального количества попыток
      .order('created_at', { ascending: true })
      .limit(50); // Обрабатываем по 50 за раз

    if (fetchError) {
      console.error('[Stars Payment Retry] Error fetching payments:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      console.log('[Stars Payment Retry] No payments to retry');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No payments to retry' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Stars Payment Retry] Found ${pendingPayments.length} payments to retry`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      manual_review: 0,
      errors: [] as string[]
    };

    // Обработать каждый платеж
    for (const payment of pendingPayments) {
      try {
        // Обновить статус на retrying
        await supabase
          .from('stars_payments')
          .update({ rewards_status: 'retrying' })
          .eq('id', payment.id);

        // Попытаться начислить награды
        const { data: rewardsResult, error: rewardsError } = await supabase.rpc(
          'process_stars_payment_rewards',
          { p_payment_id: payment.id }
        );

        if (rewardsError) {
          throw new Error(rewardsError.message);
        }

        if (rewardsResult && rewardsResult.success) {
          // Успешно начислено
          results.succeeded++;
          console.log(`[Stars Payment Retry] ✅ Payment ${payment.id} rewards processed successfully`);
        } else {
          // Ошибка начисления
          const errors = rewardsResult?.errors || ['Unknown error'];

          // Проверить, не превышен ли лимит попыток
          const newRetryCount = payment.retry_count + 1;

          if (newRetryCount >= MAX_RETRY_ATTEMPTS) {
            // Превышен лимит - перевести в manual_review
            await supabase
              .from('stars_payments')
              .update({
                rewards_status: 'manual_review',
                retry_count: newRetryCount,
                rewards_errors: rewardsResult?.errors || errors
              })
              .eq('id', payment.id);

            results.manual_review++;
            console.warn(`[Stars Payment Retry] ⚠️ Payment ${payment.id} moved to manual review (max retries reached)`);
          } else {
            // Еще можно попробовать
            results.failed++;
            console.warn(`[Stars Payment Retry] ❌ Payment ${payment.id} failed (attempt ${newRetryCount}/${MAX_RETRY_ATTEMPTS}):`, errors);
          }
        }

        results.processed++;

      } catch (error: unknown) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Payment ${payment.id}: ${errorMessage}`);
        console.error(`[Stars Payment Retry] Error processing payment ${payment.id}:`, error);
      }
    }

    console.log('[Stars Payment Retry] Retry process completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Stars Payment Retry] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

