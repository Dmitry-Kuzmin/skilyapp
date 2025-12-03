/**
 * Sync Offline Actions - Edge Function
 * 
 * Обрабатывает batch-синхронизацию offline действий.
 * 
 * Поддерживает:
 * - test-result (результаты тестов через complete-test-and-award)
 * - coin-spend (траты монет на бусты)
 * - progress-update (обновление прогресса)
 * 
 * Idempotency через client_action_id!
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OfflineAction {
  id: string;
  payload: any;
  profileId: string;
  timestamp: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, actions } = (await req.json()) as {
      type: string;
      actions: OfflineAction[];
    };

    console.log(`[sync-offline-actions] Processing ${actions.length} ${type} actions`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Обрабатываем по типу
    switch (type) {
      case 'test-result': {
        // ВАЖНО: Используем существующую Edge Function complete-test-and-award
        // Она уже имеет idempotency через session_id!
        
        for (const action of actions) {
          try {
            const { data, error } = await supabase.functions.invoke('complete-test-and-award', {
              body: {
                user_id: action.payload.user_id,
                session_id: action.payload.session_id, // Idempotency key!
                test_id: action.payload.test_id,
                score: action.payload.score,
                questions_count: action.payload.questions_count,
                correct_count: action.payload.correct_count,
                test_duration_seconds: action.payload.test_duration_seconds,
                premium_flag: action.payload.premium_flag,
                double_sp_active: action.payload.double_sp_active,
              },
            });

            if (error) {
              console.error(`[sync-offline-actions] Failed to sync test ${action.id}:`, error);
              results.failed++;
              results.errors.push(`${action.id}: ${error.message || String(error)}`);
            } else {
              console.log(`[sync-offline-actions] ✅ Synced test ${action.id}`);
              results.success++;
            }
          } catch (err) {
            console.error(`[sync-offline-actions] Exception syncing test ${action.id}:`, err);
            results.failed++;
            results.errors.push(`${action.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        break;
      }

      case 'coin-spend': {
        // Списание монет за бусты
        for (const action of actions) {
          try {
            const payload = action.payload;
            
            // Проверяем не обработали ли уже это действие
            const { data: existing } = await supabase
              .from('transactions')
              .select('id')
              .eq('metadata->>client_action_id', action.id)
              .maybeSingle();

            if (existing) {
              console.log(`[sync-offline-actions] Action ${action.id} already processed (idempotent)`);
              results.success++;
              continue;
            }

            // Списываем монеты
            const { error: coinsError } = await supabase.rpc('increment_profile_value', {
              p_profile_id: action.profileId,
              p_column: 'coins',
              p_amount: -payload.cost,
            });

            if (coinsError) {
              console.error(`[sync-offline-actions] Failed to decrement coins for ${action.id}:`, coinsError);
              results.failed++;
              results.errors.push(`${action.id}: ${coinsError.message}`);
              continue;
            }

            // Добавляем буст в инвентарь
            if (payload.type === 'boost') {
              const { error: boostError } = await supabase.rpc('modify_boost_inventory', {
                p_user_id: action.profileId,
                p_boost_type: payload.itemId,
                p_change: 1,
              });

              if (boostError) {
                console.error(`[sync-offline-actions] Failed to add boost for ${action.id}:`, boostError);
                
                // Откатываем монеты
                await supabase.rpc('increment_profile_value', {
                  p_profile_id: action.profileId,
                  p_column: 'coins',
                  p_amount: payload.cost,
                });

                results.failed++;
                results.errors.push(`${action.id}: ${boostError.message}`);
                continue;
              }
            }

            // Создаём транзакцию с client_action_id для idempotency
            await supabase.from('transactions').insert({
              user_id: action.profileId,
              transaction_type: 'coins_spent_boost',
              amount: -payload.cost,
              metadata: {
                boost_type: payload.itemId,
                boost_name: payload.boost_name,
                client_action_id: action.id, // Idempotency!
              },
            });

            console.log(`[sync-offline-actions] ✅ Synced coin-spend ${action.id}`);
            results.success++;
          } catch (err) {
            console.error(`[sync-offline-actions] Exception syncing coin-spend ${action.id}:`, err);
            results.failed++;
            results.errors.push(`${action.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        break;
      }

      case 'progress-update': {
        // Обновление прогресса по темам
        for (const action of actions) {
          try {
            const payload = action.payload;

            const { error } = await supabase
              .from('user_topic_progress')
              .upsert(
                {
                  user_id: action.profileId,
                  topic_id: payload.topicId,
                  subtopic_id: payload.subtopicId || null,
                  completed: payload.completed,
                  score: payload.score,
                  updated_at: new Date(action.timestamp).toISOString(),
                },
                {
                  onConflict: 'user_id,topic_id,subtopic_id',
                }
              );

            if (error) {
              console.error(`[sync-offline-actions] Failed to sync progress ${action.id}:`, error);
              results.failed++;
              results.errors.push(`${action.id}: ${error.message}`);
            } else {
              console.log(`[sync-offline-actions] ✅ Synced progress ${action.id}`);
              results.success++;
            }
          } catch (err) {
            console.error(`[sync-offline-actions] Exception syncing progress ${action.id}:`, err);
            results.failed++;
            results.errors.push(`${action.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        break;
      }

      case 'bookmark-toggle':
      case 'boost-use':
      case 'cosmetic-equip':
      case 'daily-bonus-claim':
      case 'challenge-bank-add': {
        // TODO: Implement по мере необходимости
        console.warn(`[sync-offline-actions] Type ${type} not yet implemented`);
        results.failed += actions.length;
        results.errors.push(`Type ${type} not implemented`);
        break;
      }

      default:
        throw new Error(`Unknown action type: ${type}`);
    }

    console.log(`[sync-offline-actions] ✅ Sync complete: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: actions.length,
        succeeded: results.success,
        failed: results.failed,
        errors: results.errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[sync-offline-actions] Fatal error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

