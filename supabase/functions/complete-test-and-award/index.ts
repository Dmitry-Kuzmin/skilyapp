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
  mode?: string;
}

interface TestRewardResponse {
  coins_awarded: number;
  sp_awarded: number;
  xp_awarded?: number;
  new_balance?: number;
  new_sp?: number;
  bonus_applied?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: TestRewardRequest = await req.json();
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
      mode = 'practice',
    } = body;

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

    // Anti-speed-cheat: минимум 2 сек на вопрос
    const MIN_SECONDS_PER_QUESTION = 2;
    const minExpectedDuration = questions_count * MIN_SECONDS_PER_QUESTION;
    const isTooFast = test_duration_seconds > 0 && test_duration_seconds < minExpectedDuration;
    if (isTooFast) {
      console.warn(`[complete-test-and-award] 🚨 Speed cheat detected: ${test_duration_seconds}s for ${questions_count} questions (min ${minExpectedDuration}s). user=${user_id}`);
    }

    // Проверка idempotency
    const { data: existingResult, error: checkError } = await supabase
      .from('test_results')
      .select('coins_awarded, sp_awarded')
      .eq('session_id', session_id)
      .maybeSingle();

    if (checkError) {
      console.error('[complete-test-and-award] ❌ Idempotency check error:', checkError);
      // Мы продолжаем, так как это не критично, RPC упадет если запись уже есть (по уникальному session_id)
    }

    if (existingResult) {
      console.log('[complete-test-and-award] ⚠️ Already processed');
      // sp_awarded in test_results is always 0 (SP goes to season-sp separately).
      // Recalculate SP/XP for the display so the client gets the correct values.
      const baseSp = body.correct_count * 2;
      const bonusSp = body.score === 100 ? 50 : body.score >= 90 ? 30 : 0;
      const xpAwarded = (body.mode === 'exam' || body.mode === 'exam-russia') && body.score >= 90 ? 100
        : body.score === 100 ? 30 : 10;
      return new Response(
        JSON.stringify({
          success: true,
          coins_awarded: 0,
          sp_awarded: baseSp + bonusSp,
          sp_base: baseSp,
          sp_bonus: bonusSp,
          xp_awarded: xpAwarded,
          message: "Test already processed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // ВЫЗОВ ОПТИМИЗИРОВАННОГО RPC ДЛЯ НАГРАД
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
      p_double_sp_active: double_sp_active,
    }) as { data: TestRewardResponse | null, error: unknown };

    if (rpcError) {
      console.error('[complete-test-and-award] ❌ RPC Error:', rpcError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to process test completion",
          details: rpcError instanceof Error ? rpcError.message : String(rpcError)
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // ВЫЗОВ СИСТЕМЫ КВАЛИФИКАЦИИ (LICENSE POINTS)
    // ============================================
    // Определяем тип события для системы баллов
    let licenseEvent: string | null = null;

    if (mode === 'exam' || mode === 'exam-russia') {
      licenseEvent = score >= 90 ? 'exam_pass' : 'exam_fail';
    } else if (score === 100 && questions_count >= 10) {
      licenseEvent = 'topic_perfect';
    } else if (mode === 'marathon' && score >= 90) {
      licenseEvent = 'marathon_completed';
    }

    if (licenseEvent) {
      console.log(`[complete-test-and-award] 🛡️ Triggering license event: ${licenseEvent}`);
      const { data: licenseData, error: licenseError } = await supabase.rpc('process_license_event', {
        p_user_id: user_id,
        p_event_type: licenseEvent
      });

      if (licenseError) {
        console.error('[complete-test-and-award] ⚠️ License event failed:', licenseError);
      } else {
        // Мягко расширяем rewardData информацией о баллах
        if (rewardData) {
          (rewardData as any).license_update = licenseData;
        }
      }
    }

    // ============================================
    // СЕЗОН: Season Points для лидерборда + трекинг челленджей
    // ============================================
    // Различаем экзамен и обычный тест
    const isExam = mode === 'exam' || mode === 'exam-russia';
    const sourceType = isExam
      ? 'exam_completed'
      : score === 100
        ? 'test_perfect'
        : 'test_completed';

    // ── Расчёт SP по той же формуле что в season-sp/computeTestSP ─────────
    // Дублируем расчёт здесь чтобы вернуть клиенту сразу (не ждать фоновый вызов)
    const baseSp = isTooFast ? 0 : correct_count * 2;
    let bonusSp = 0;
    if (!isTooFast) {
      if (score === 100)    bonusSp = 50;
      else if (score >= 90) bonusSp = 30;
    }
    const spAwarded = baseSp + bonusSp;

    const spMetadata = {
      questions_count,
      score,
      correct_count,
      mode,
      sp_earned: spAwarded,
    };

    // ── СИНХРОННО ждём season-sp чтобы получить level_up для celebration popup
    let levelUp = false;
    let newLevel = 0;
    let totalSp = 0;
    try {
      const { data: spResult } = await supabase.functions.invoke('season-sp', {
        body: { user_id, source_type: sourceType, metadata: spMetadata },
      });
      if (spResult) {
        levelUp = spResult.level_up === true;
        newLevel = spResult.level ?? 0;
        totalSp = spResult.total_sp ?? 0;
      }
    } catch (err) {
      console.error('[complete-test-and-award] ⚠️ season-sp error:', err);
    }

    // Трекинг season_challenges (фоном — не блокирует ответ)
    supabase.functions.invoke('season-challenges-track', {
      body: { user_id, source_type: sourceType, metadata: spMetadata },
    }).catch((err: unknown) => {
      console.error('[complete-test-and-award] ⚠️ challenges-track error:', err);
    });

    console.log(`[complete-test-and-award] ✅ SP: ${spAwarded} (base ${baseSp} + bonus ${bonusSp}), level_up=${levelUp}, newLevel=${newLevel}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...rewardData,
        sp_awarded: spAwarded,
        sp_base: baseSp,
        sp_bonus: bonusSp,
        coins_awarded: 0,
        level_up: levelUp,
        new_level: newLevel,
        total_sp: totalSp,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[complete-test-and-award] ❌ FATAL:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: message
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
