import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Создать подпись для Cryptomus API
 */
function createCryptomusSignature(payload: string, secret: string): string {
  const base64Payload = btoa(unescape(encodeURIComponent(payload)))
  const dataToHash = base64Payload + secret
  const hash = createHash('md5')
  hash.update(dataToHash)
  return hash.digest('hex')
}

/**
 * Проверить статус платежа в Cryptomus
 */
async function checkCryptomusPayment(
  orderId: string,
  merchantId: string,
  paymentKey: string
): Promise<{ status: string; paid: boolean } | null> {
  try {
    const payload = JSON.stringify({ order_id: orderId })
    const signature = createCryptomusSignature(payload, paymentKey)

    const response = await fetch('https://api.cryptomus.com/v1/payment/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        merchant: merchantId,
        sign: signature,
      },
      body: payload,
    })

    if (!response.ok) {
      console.error(`[check-pending] Cryptomus API error for order ${orderId}:`, response.statusText)
      return null
    }

    const data = await response.json()
    return {
      status: data.result?.payment_status || 'unknown',
      paid: data.result?.payment_status === 'paid',
    }
  } catch (error) {
    console.error(`[check-pending] Error checking Cryptomus order ${orderId}:`, error)
    return null
  }
}

/**
 * Проверить статус транзакции в Paddle
 */
async function checkPaddleTransaction(
  transactionId: string,
  apiKey: string
): Promise<{ status: string; paid: boolean } | null> {
  try {
    const response = await fetch(`https://api.paddle.com/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Paddle-Version': '1',
      },
    })

    if (!response.ok) {
      console.error(`[check-pending] Paddle API error for transaction ${transactionId}:`, response.statusText)
      return null
    }

    const data = await response.json()
    const status = data.data?.status || 'unknown'
    return {
      status,
      paid: status === 'completed',
    }
  } catch (error) {
    console.error(`[check-pending] Error checking Paddle transaction ${transactionId}:`, error)
    return null
  }
}

/**
 * Обработать завершенный платеж (начислить награды)
 */
async function processCompletedPurchase(
  supabase: any,
  purchase: any,
  gateway: 'cryptomus' | 'paddle' | 'telegram_stars'
) {
  const userId = purchase.user_id
  const itemType = purchase.item_type
  const itemId = purchase.item_id
  const metadata = purchase.metadata || {}

  console.log(`[check-pending] Processing completed purchase ${purchase.id} (${gateway})`)

  try {
    if (itemType === 'premium') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, premium_until')
        .eq('id', userId)
        .single()

      const current = profile?.premium_until ? new Date(profile.premium_until) : new Date()
      const startDate = current > new Date() ? current : new Date()
      const newDate = new Date(startDate)

      if (itemId?.includes('monthly')) {
        newDate.setMonth(newDate.getMonth() + 1)
      } else if (itemId?.includes('yearly')) {
        newDate.setFullYear(newDate.getFullYear() + 1)
      } else if (itemId?.includes('forever')) {
        // Forever = 100 лет (практически навсегда)
        newDate.setFullYear(newDate.getFullYear() + 100)
      }

      await supabase
        .from('profiles')
        .update({ premium_until: newDate.toISOString(), duel_pass_premium: true })
        .eq('id', userId)

      await supabase.from('transactions').insert({
        user_id: userId,
        transaction_type: itemId?.includes('monthly')
          ? 'premium_purchase_monthly'
          : itemId?.includes('yearly')
          ? 'premium_purchase_yearly'
          : 'premium_purchase_forever',
        amount: 0,
        metadata: {
          purchase_id: purchase.id,
          gateway,
        },
      })

      console.log(`[check-pending] ✅ Premium granted to user ${userId}`)
    } else if (itemType === 'coins_pack') {
      const coins = metadata.coins || purchase.metadata?.coins || 0

      if (coins > 0) {
        const { error: incrementError } = await supabase.rpc('increment_profile_value', {
          p_profile_id: userId,
          p_column: 'coins',
          p_amount: coins,
        })

        if (incrementError) {
          console.error(`[check-pending] ❌ Error incrementing coins:`, incrementError)
          throw new Error(`Failed to add coins: ${incrementError.message}`)
        }

        await supabase.from('transactions').insert({
          user_id: userId,
          transaction_type: `coins_purchase_${gateway}`,
          amount: coins,
          metadata: {
            purchase_id: purchase.id,
            gateway,
            coins,
            catalog_key: metadata.catalog_key || null,
          },
        })

        console.log(`[check-pending] ✅ ${coins} coins added to user ${userId}`)
      }
    } else if (itemType === 'duel_pass') {
      await supabase.from('profiles').update({ duel_pass_premium: true }).eq('id', userId)

      await supabase.from('transactions').insert({
        user_id: userId,
        transaction_type: 'duel_pass_purchase',
        amount: 0,
        metadata: {
          purchase_id: purchase.id,
          gateway,
        },
      })

      console.log(`[check-pending] ✅ Duel Pass granted to user ${userId}`)
    }

    // Обновляем статус покупки
    await supabase
      .from('purchases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', purchase.id)

    return { success: true }
  } catch (error) {
    console.error(`[check-pending] ❌ Error processing purchase ${purchase.id}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Обработать завершенный Telegram Stars платеж
 */
async function processCompletedStarsPayment(supabase: any, payment: any) {
  const userId = payment.user_id
  const packageId = payment.package_id
  const metadata = payment.metadata || {}

  console.log(`[check-pending] Processing completed Stars payment ${payment.id}`)

  try {
    // Получаем информацию о пакете
    const { data: pkg } = await supabase
      .from('pricing_packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (!pkg) {
      throw new Error(`Package ${packageId} not found`)
    }

    // Начисляем награды в зависимости от типа пакета
    if (pkg.package_type === 'premium') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, premium_until')
        .eq('id', userId)
        .single()

      const current = profile?.premium_until ? new Date(profile.premium_until) : new Date()
      const startDate = current > new Date() ? current : new Date()
      const newDate = new Date(startDate)
      newDate.setDate(newDate.getDate() + (pkg.premium_days || 30))

      await supabase
        .from('profiles')
        .update({ premium_until: newDate.toISOString(), duel_pass_premium: true })
        .eq('id', userId)
    } else if (pkg.package_type === 'coins') {
      const coins = pkg.coins_amount || payment.coins_equivalent || 0

      if (coins > 0) {
        const { error: incrementError } = await supabase.rpc('increment_profile_value', {
          p_profile_id: userId,
          p_column: 'coins',
          p_amount: coins,
        })

        if (incrementError) {
          throw new Error(`Failed to add coins: ${incrementError.message}`)
        }
      }
    }

    // Обновляем статус награды
    await supabase
      .from('stars_payments')
      .update({
        rewards_status: 'completed',
        rewards_completed_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    console.log(`[check-pending] ✅ Stars payment rewards granted to user ${userId}`)
    return { success: true }
  } catch (error) {
    console.error(`[check-pending] ❌ Error processing Stars payment ${payment.id}:`, error)
    return { success: false, error: error.message }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Получаем переменные окружения для API
    const cryptomusMerchantId = Deno.env.get('CRYPTOMUS_MERCHANT_ID')
    const cryptomusPaymentKey = Deno.env.get('CRYPTOMUS_PAYMENT_KEY')
    const paddleApiKey = Deno.env.get('PADDLE_API_KEY')

    const results = {
      cryptomus: { checked: 0, completed: 0, failed: 0, errors: [] },
      paddle: { checked: 0, completed: 0, failed: 0, errors: [] },
      telegram_stars: { checked: 0, completed: 0, failed: 0, errors: [] },
    }

    // ============================================
    // 1. Проверка Cryptomus платежей
    // ============================================
    if (cryptomusMerchantId && cryptomusPaymentKey) {
      const { data: cryptomusPurchases, error: cryptomusError } = await supabase
        .from('purchases')
        .select('*')
        .eq('status', 'pending')
        .not('cryptomus_order_id', 'is', null)
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Старше 24 часов
        .limit(50) // Защита от timeout: обрабатываем максимум 50 за раз

      if (cryptomusError) {
        console.error('[check-pending] Error fetching Cryptomus purchases:', cryptomusError)
        results.cryptomus.errors.push(cryptomusError.message)
      } else if (cryptomusPurchases && cryptomusPurchases.length > 0) {
        console.log(`[check-pending] Found ${cryptomusPurchases.length} pending Cryptomus purchases`)

        for (const purchase of cryptomusPurchases) {
          results.cryptomus.checked++
          const orderId = purchase.cryptomus_order_id

          if (!orderId) continue

          const paymentStatus = await checkCryptomusPayment(
            orderId,
            cryptomusMerchantId,
            cryptomusPaymentKey
          )

          if (paymentStatus && paymentStatus.paid) {
            const processResult = await processCompletedPurchase(supabase, purchase, 'cryptomus')
            if (processResult.success) {
              results.cryptomus.completed++
            } else {
              results.cryptomus.failed++
              results.cryptomus.errors.push(`Purchase ${purchase.id}: ${processResult.error}`)
            }
          } else if (paymentStatus && paymentStatus.status === 'fail') {
            // Платеж провалился
            await supabase
              .from('purchases')
              .update({ status: 'failed' })
              .eq('id', purchase.id)
            results.cryptomus.failed++
          }
        }
      }
    } else {
      console.log('[check-pending] Cryptomus credentials not configured, skipping')
    }

    // ============================================
    // 2. Проверка Paddle транзакций
    // ============================================
    if (paddleApiKey) {
      const { data: paddlePurchases, error: paddleError } = await supabase
        .from('purchases')
        .select('*')
        .eq('status', 'pending')
        .not('paddle_transaction_id', 'is', null)
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Старше 24 часов
        .limit(50) // Защита от timeout: обрабатываем максимум 50 за раз

      if (paddleError) {
        console.error('[check-pending] Error fetching Paddle purchases:', paddleError)
        results.paddle.errors.push(paddleError.message)
      } else if (paddlePurchases && paddlePurchases.length > 0) {
        console.log(`[check-pending] Found ${paddlePurchases.length} pending Paddle purchases`)

        for (const purchase of paddlePurchases) {
          results.paddle.checked++
          const transactionId = purchase.paddle_transaction_id

          if (!transactionId) continue

          const transactionStatus = await checkPaddleTransaction(transactionId, paddleApiKey)

          if (transactionStatus && transactionStatus.paid) {
            const processResult = await processCompletedPurchase(supabase, purchase, 'paddle')
            if (processResult.success) {
              results.paddle.completed++
            } else {
              results.paddle.failed++
              results.paddle.errors.push(`Purchase ${purchase.id}: ${processResult.error}`)
            }
          } else if (transactionStatus && transactionStatus.status === 'failed') {
            // Транзакция провалилась
            await supabase
              .from('purchases')
              .update({ status: 'failed' })
              .eq('id', purchase.id)
            results.paddle.failed++
          }
        }
      }
    } else {
      console.log('[check-pending] Paddle API key not configured, skipping')
    }

    // ============================================
    // 3. Проверка Telegram Stars платежей
    // ============================================
    // Telegram Stars не имеет API для проверки статуса,
    // но мы можем проверить платежи, которые были завершены (status='completed'),
    // но награды еще не начислены (rewards_status='pending')
    const { data: starsPayments, error: starsError } = await supabase
      .from('stars_payments')
      .select('*')
      .eq('status', 'completed')
      .eq('rewards_status', 'pending')
      .lt('completed_at', new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()) // Старше 1 часа
      .limit(50) // Защита от timeout: обрабатываем максимум 50 за раз

    if (starsError) {
      console.error('[check-pending] Error fetching Stars payments:', starsError)
      results.telegram_stars.errors.push(starsError.message)
    } else if (starsPayments && starsPayments.length > 0) {
      console.log(`[check-pending] Found ${starsPayments.length} Stars payments with pending rewards`)

      for (const payment of starsPayments) {
        results.telegram_stars.checked++
        const processResult = await processCompletedStarsPayment(supabase, payment)
        if (processResult.success) {
          results.telegram_stars.completed++
        } else {
          results.telegram_stars.failed++
          results.telegram_stars.errors.push(`Payment ${payment.id}: ${processResult.error}`)
        }
      }
    }

    // Итоговый отчет
    const summary = {
      timestamp: new Date().toISOString(),
      results,
      total_checked:
        results.cryptomus.checked + results.paddle.checked + results.telegram_stars.checked,
      total_completed:
        results.cryptomus.completed + results.paddle.completed + results.telegram_stars.completed,
      total_failed: results.cryptomus.failed + results.paddle.failed + results.telegram_stars.failed,
    }

    console.log('[check-pending] Summary:', JSON.stringify(summary, null, 2))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[check-pending] Fatal error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

