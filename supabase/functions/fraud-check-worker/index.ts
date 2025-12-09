import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Инициализация (Service Role обязателен для обхода RLS и выполнения RPC)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Берем 50 невыполненных задач из очереди
    // Важно: Мы просто читаем их. В идеале нужен "lock", но для Free Tier и одного воркера это ок.
    const { data: jobs, error: fetchError } = await supabase
      .from('fraud_check_queue')
      .select('id, conversion_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchError) {
      console.error('[fraud-check-worker] Error fetching jobs:', fetchError)
      throw fetchError
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[fraud-check-worker] Processing ${jobs.length} fraud check jobs...`)

    const results = []

    // 3. Обрабатываем каждую задачу
    for (const job of jobs) {
      // А. Ставим статус "processing"
      await supabase
        .from('fraud_check_queue')
        .update({ status: 'processing' })
        .eq('id', job.id)

      try {
        // Б. Вызываем ту самую тяжелую SQL функцию
        const { data: fraudResult, error: rpcError } = await supabase.rpc(
          'async_check_fraud_patterns',
          { p_conversion_id: job.conversion_id }
        )

        if (rpcError) {
          console.error(`[fraud-check-worker] RPC error for job ${job.id}:`, rpcError)
          throw rpcError
        }

        // В. Если успешно - помечаем completed
        await supabase
          .from('fraud_check_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        results.push({
          id: job.id,
          conversion_id: job.conversion_id,
          success: true,
          fraud_detected: fraudResult?.[0]?.fraud_detected || false,
        })

        console.log(`[fraud-check-worker] ✅ Job ${job.id} completed`)
      } catch (err: any) {
        console.error(`[fraud-check-worker] ❌ Error processing job ${job.id}:`, err)

        // Г. Если ошибка - помечаем failed и пишем ошибку
        await supabase
          .from('fraud_check_queue')
          .update({
            status: 'failed',
            error_message: err?.message || String(err),
            processed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        results.push({
          id: job.id,
          conversion_id: job.conversion_id,
          success: false,
          error: err?.message || String(err),
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        details: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[fraud-check-worker] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

