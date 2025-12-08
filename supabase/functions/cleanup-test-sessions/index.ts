// supabase/functions/cleanup-test-sessions/index.ts
// Edge Function для очистки старых данных БД и мониторинга размера
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

    // ============================================
    // 1. Очистка test_sessions
    // ============================================
    
    // 1.1. Очистка старых "зависших" начал (старше 24ч)
    const { count: countStarted, error: error1 } = await supabase
      .from('test_sessions')
      .delete({ count: 'exact' })
      .eq('status', 'started')
      .lt('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (error1) {
      console.error('[cleanup-db] Error deleting started sessions:', error1)
      throw error1
    }

    // 1.2. Очистка брошенных (старше 7 дней)
    const { count: countAbandoned, error: error2 } = await supabase
      .from('test_sessions')
      .delete({ count: 'exact' })
      .eq('status', 'abandoned')
      .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (error2) {
      console.error('[cleanup-db] Error deleting abandoned sessions:', error2)
      throw error2
    }

    // ============================================
    // 2. Очистка старых транзакций (> 3 месяцев)
    // ============================================
    // Удаляем только логи транзакций, НЕ покупки за реальные деньги
    // Покупки хранятся в таблице purchases и не удаляются
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { count: countTransactions, error: error3 } = await supabase
      .from('transactions')
      .delete({ count: 'exact' })
      .lt('created_at', threeMonthsAgo)
      // Исключаем важные типы транзакций (если нужно сохранить)
      // .neq('transaction_type', 'coins_purchase_stripe')
      // .neq('transaction_type', 'premium_purchase_monthly')
      // .neq('transaction_type', 'premium_purchase_yearly')

    if (error3) {
      console.error('[cleanup-db] Error deleting old transactions:', error3)
      throw error3
    }

    // ============================================
    // 3. Очистка логов дуэлей (> 90 дней)
    // ============================================
    const { count: countDuelAnswers, error: error4 } = await supabase
      .from('duel_answers')
      .delete({ count: 'exact' })
      .lt('created_at', threeMonthsAgo)

    if (error4) {
      console.error('[cleanup-db] Error deleting old duel answers:', error4)
      throw error4
    }

    // ============================================
    // 4. Мониторинг размера БД (для Free Tier)
    // ============================================
    let dbSizeBytes: number | null = null
    let dbSizeMB: number | null = null
    let dbSizeWarning = false

    try {
      const { data: sizeData, error: sizeError } = await supabase.rpc('get_database_size')
      
      if (!sizeError && sizeData !== null) {
        dbSizeBytes = sizeData as number
        dbSizeMB = dbSizeBytes / 1024 / 1024
        
        // Предупреждение при 80% заполнении (400 MB из 500 MB)
        if (dbSizeMB > 400) {
          dbSizeWarning = true
          console.error(`🚨 WARNING: Database size is ${dbSizeMB.toFixed(2)} MB (${((dbSizeMB / 500) * 100).toFixed(1)}% of 500 MB limit)!`)
        } else {
          console.log(`✅ Database size: ${dbSizeMB.toFixed(2)} MB (${((dbSizeMB / 500) * 100).toFixed(1)}% of 500 MB limit)`)
        }
      } else if (sizeError) {
        console.warn('[cleanup-db] Could not get database size:', sizeError.message)
      }
    } catch (sizeErr) {
      console.warn('[cleanup-db] Error checking database size:', sizeErr)
      // Не прерываем выполнение, если проверка размера не удалась
    }

    const result = {
      success: true,
      deleted: {
        test_sessions_started: countStarted || 0,
        test_sessions_abandoned: countAbandoned || 0,
        transactions: countTransactions || 0,
        duel_answers: countDuelAnswers || 0,
      },
      database_size: dbSizeMB !== null ? {
        bytes: dbSizeBytes,
        mb: parseFloat(dbSizeMB.toFixed(2)),
        percentage: parseFloat(((dbSizeMB / 500) * 100).toFixed(1)),
        warning: dbSizeWarning
      } : null,
      timestamp: new Date().toISOString()
    }

    console.log(`[cleanup-db] Cleanup completed:`, JSON.stringify(result, null, 2))

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[cleanup-db] Cleanup error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

