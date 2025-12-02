import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ КРИТИЧНО: Используем СЕРВЕРНОЕ UTC время (защита от timezone exploit)
    const serverNow = new Date();
    const serverToday = serverNow.toISOString().split('T')[0];
    const serverYesterday = new Date(serverNow.getTime() - 86400000)
      .toISOString().split('T')[0];

    console.log('[claim-daily-bonus] Server time check:', {
      serverNow: serverNow.toISOString(),
      serverToday,
      serverYesterday,
      user_id
    });

    // ✅ Вызываем atomic функцию PostgreSQL
    const { data, error } = await supabase.rpc('claim_daily_bonus_atomic', {
      p_user_id: user_id,
      p_server_today: serverToday,
      p_server_yesterday: serverYesterday
    });

    if (error) {
      console.error('[claim-daily-bonus] RPC error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'database_error',
          message: error.message,
          details: error
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверяем результат
    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.success) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result?.error || 'unknown',
          message: result?.message || 'Failed to claim bonus'
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  // ✅ Успех (с оптимизированными данными)
  return new Response(
    JSON.stringify({
      success: true,
      new_streak: result.new_streak,
      week_day: result.week_day,
      reward: result.reward,
      new_xp: result.new_balance_xp,
      new_coins: result.new_balance_coins,
      freeze_used: result.freeze_used || false,
      mystery_reward: result.mystery_reward || null,
      server_time: serverToday,
      message: result.message || 'Награда получена!'
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

  } catch (error) {
    console.error('[claim-daily-bonus] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'internal_error',
        message: 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

