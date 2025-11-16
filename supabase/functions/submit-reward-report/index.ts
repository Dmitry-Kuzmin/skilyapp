import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  user_id: string;
  report_type: "reward_penalty" | "reward_missing" | "reward_incorrect" | "other";
  session_id?: string;
  test_result_id?: string;
  reward_calculation_data: any;
  user_message?: string;
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
      report_type,
      session_id,
      test_result_id,
      reward_calculation_data,
      user_message,
    }: ReportRequest = await req.json();

    // Валидация
    if (!user_id || !report_type || !reward_calculation_data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем информацию о пользователе для контекста
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, first_name, email, telegram_id, premium_until, trial_until")
      .eq("id", user_id)
      .single();

    // Получаем последние тесты пользователя для контекста
    const { data: recentTests } = await supabase
      .from("test_results")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Создаем отчет
    const { data: report, error: reportError } = await supabase
      .from("admin_reports")
      .insert({
        user_id,
        report_type,
        session_id,
        test_result_id,
        reward_calculation_data: {
          ...reward_calculation_data,
          user_context: {
            profile_id: profile?.id,
            first_name: profile?.first_name,
            email: profile?.email,
            telegram_id: profile?.telegram_id,
            is_premium: profile?.premium_until || profile?.trial_until ? true : false,
          },
          recent_tests: recentTests || [],
        },
        user_message,
        status: "pending",
      })
      .select()
      .single();

    if (reportError) {
      console.error("[submit-reward-report] Error creating report:", reportError);
      return new Response(
        JSON.stringify({ error: "Failed to create report", details: reportError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[submit-reward-report] ✅ Report created:", report.id);

    // TODO: Здесь можно добавить отправку уведомления админам (email, Telegram, etc.)

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report.id,
        message: "Отчет отправлен в поддержку. Мы рассмотрим его в ближайшее время.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[submit-reward-report] Exception:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

