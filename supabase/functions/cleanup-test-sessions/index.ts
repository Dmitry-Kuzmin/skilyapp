// supabase/functions/cleanup-test-sessions/index.ts
// Edge Function для очистки старых тестовых сессий
// Вызывается через GitHub Actions или внешний cron сервис

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Проверка метода
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Инициализация с Service Role (ОБЯЗАТЕЛЬНО, так как у нас нет RLS на DELETE)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Очистка старых "зависших" начал (старше 24ч)
    const { count: countStarted, error: error1 } = await supabase
      .from('test_sessions')
      .delete({ count: 'exact' }) // Возвращает кол-во удаленных
      .eq('status', 'started')
      .lt('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (error1) {
      console.error('[cleanup-test-sessions] Error deleting started sessions:', error1)
      throw error1
    }

    // 2. Очистка брошенных (старше 7 дней)
    const { count: countAbandoned, error: error2 } = await supabase
      .from('test_sessions')
      .delete({ count: 'exact' })
      .eq('status', 'abandoned')
      .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (error2) {
      console.error('[cleanup-test-sessions] Error deleting abandoned sessions:', error2)
      throw error2
    }

    console.log(`[cleanup-test-sessions] Cleanup completed: Deleted ${countStarted} started, ${countAbandoned} abandoned`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_started: countStarted || 0,
        deleted_abandoned: countAbandoned || 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[cleanup-test-sessions] Cleanup error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

