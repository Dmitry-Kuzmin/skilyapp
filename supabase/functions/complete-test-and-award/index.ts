import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestRewardRequest {
  user_id: string;
  test_id?: string;
  session_id: string;
  score: number;
  questions_count: number;
  correct_count: number;
  test_duration_seconds: number;
  premium_flag?: boolean;
  double_sp_active?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      user_id,
      test_id,
      session_id,
      score,
      questions_count,
      correct_count,
      test_duration_seconds,
      premium_flag = false,
      double_sp_active = false,
    }: TestRewardRequest = await req.json();

    console.log('[complete-test-and-award] 🚀 START:', { user_id, session_id, score });

    // ============================================
    // ВАЛИДАЦИЯ
    // ============================================
    if (!user_id || !session_id || score === undefined || questions_count === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверка idempotency
    const { data: existingResult } = await supabase
      .from('test_results')
      .select('coins_awarded, sp_awarded')
      .eq('session_id', session_id)
      .single();

    if (existingResult) {
      console.log('[complete-test-and-award] ⚠️ Already processed');
      return new Response(
        JSON.stringify({
          success: true,
          coins_awarded: existingResult.coins_awarded,
          sp_awarded: existingResult.sp_awarded,
          message: "Test already processed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // ВЫЗОВ ОПТИМИЗИРОВАННОГО RPC
    // ============================================
    const { data: rewardData, error: rpcError } = await supabase.rpc('process_test_completion', {
      p_user_id: user_id,
      p_test_id: test_id,
      p_session_id: session_id,
      p_score: score,
      p_questions_count: questions_count,
      p_correct_count: correct_count,
      p_test_duration_seconds: test_duration_seconds,
      p_premium_flag: premium_flag,
      p_double_sp_active: double_sp_active
    });

    if (rpcError) {
      console.error('[complete-test-and-award] ❌ RPC Error:', rpcError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to process test completion",
          details: rpcError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[complete-test-and-award] ✅ SUCCESS:', rewardData);

    return new Response(
      JSON.stringify({
        success: true,
        ...rewardData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[complete-test-and-award] ❌ FATAL:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error?.message || "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
