import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

// ВАЖНО: Мы больше не начисляем монеты в Edge Function.
// Теперь это делает Postgres Trigger "on_duel_finished_payout" в базе данных.
// Это гарантирует 100% надежность (атомарность) начисления при обновлении статуса дуэли.
export async function settleBetPayout({
  supabaseClient,
  duelId,
  betAmount,
  hostUserId,
  players,
  winnerUserId,
  isDraw,
}: {
  supabaseClient: ReturnType<typeof createClient>;
  duelId: string;
  betAmount: number;
  hostUserId: string;
  players: Array<{ user_id: string; id: string }>;
  winnerUserId: string | null;
  isDraw: boolean;
}) {
  console.log(`[settleBetPayout] ℹ️ Payout calculation skipped in Edge Function.Trigger will handle it.Duel: ${duelId} `);

  // Мы возвращаем 0/null для всех выплат, так как они произойдут в базе асинхронно
  // Фронтенд увидит актуальный баланс при следующем обновлении дашборда
  return;
}
