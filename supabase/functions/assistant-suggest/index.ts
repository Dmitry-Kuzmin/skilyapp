import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Suggestion = {
  mood: "happy" | "excited" | "encouraging";
  message: string;
  cta: "premium_trial" | "coins_pack" | "duel_pass";
  showPaywall: boolean;
};

const RULES: Record<string, Suggestion> = {
  after_2_failed_tests: {
    mood: "encouraging",
    message: "Сложный блок? Включи Premium и получай подробные разборы ошибок.",
    cta: "premium_trial",
    showPaywall: true,
  },
  low_coins_in_duel: {
    mood: "excited",
    message: "Монеты закончились. Пополни баланс и возьми бустер прямо сейчас!",
    cta: "coins_pack",
    showPaywall: true,
  },
  duel_pass_level_up: {
    mood: "happy",
    message: "Ты поднял уровень Duel Pass. Открой премиальные награды сезона!",
    cta: "duel_pass",
    showPaywall: true,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { trigger } = await req.json();

    if (!trigger || !RULES[trigger]) {
      return new Response(
        JSON.stringify({ error: "Unknown trigger" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, suggestion: RULES[trigger] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[assistant-suggest] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


