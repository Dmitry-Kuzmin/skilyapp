import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

interface CleanupResult {
  success: boolean;
  deleted: {
    test_sessions_started: number;
    test_sessions_abandoned: number;
    transactions: number;
    duel_answers: number;
  };
  database_size: {
    bytes: number;
    mb: number;
    percentage: number;
    warning: boolean;
  } | null;
  timestamp: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createPooledSupabaseClient();

    // 1. Sessions Cleanup
    const { count: countStarted } = await supabase
      .from('test_sessions')
      .delete({ count: 'exact' })
      .eq('status', 'started')
      .lt('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { count: countAbandoned } = await supabase
      .from('test_sessions')
      .delete({ count: 'exact' })
      .eq('status', 'abandoned')
      .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // 2. Transactions Cleanup (> 90 days)
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: countTransactions } = await supabase
      .from('transactions')
      .delete({ count: 'exact' })
      .lt('created_at', threeMonthsAgo);

    const { count: countDuelAnswers } = await supabase
      .from('duel_answers')
      .delete({ count: 'exact' })
      .lt('created_at', threeMonthsAgo);

    // 3. Database Size Check
    let dbMetrics = null;
    try {
      const { data: sizeBytes } = await supabase.rpc('get_database_size') as { data: number | null };
      if (sizeBytes !== null) {
        const mb = sizeBytes / (1024 * 1024);
        dbMetrics = {
          bytes: sizeBytes,
          mb: parseFloat(mb.toFixed(2)),
          percentage: parseFloat(((mb / 500) * 100).toFixed(1)),
          warning: mb > 400
        };
      }
    } catch { /* ignore */ }

    const result: CleanupResult = {
      success: true,
      deleted: {
        test_sessions_started: countStarted || 0,
        test_sessions_abandoned: countAbandoned || 0,
        transactions: countTransactions || 0,
        duel_answers: countDuelAnswers || 0,
      },
      database_size: dbMetrics,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[cleanup-db] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
