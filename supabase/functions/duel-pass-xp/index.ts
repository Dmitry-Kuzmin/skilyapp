import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const XP_RULES: Record<string, number> = {
  test: 20,
  duel_win: 30,
  duel_lose: 10,
  daily_login: 15,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, source_type } = await req.json();

    if (!user_id || !source_type) {
      return new Response(
        JSON.stringify({ error: "user_id and source_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const xpGain = XP_RULES[source_type];
    if (!xpGain) {
      return new Response(
        JSON.stringify({ error: "Unsupported source_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [{ data: profile }, { data: rewards }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, duel_pass_xp, duel_pass_level")
        .eq("id", user_id)
        .single(),
      supabase
        .from("duel_pass_rewards")
        .select("level, xp_required")
        .order("level", { ascending: true }),
    ]);

    if (!profile || !rewards) {
      return new Response(
        JSON.stringify({ error: "Profile or rewards not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newXp = (profile.duel_pass_xp || 0) + xpGain;
    let remainingXp = newXp;
    let newLevel = 1;
    const maxLevel = rewards[rewards.length - 1]?.level ?? 10;

    for (const reward of rewards) {
      if (remainingXp >= reward.xp_required) {
        remainingXp -= reward.xp_required;
        newLevel = Math.min(reward.level + 1, maxLevel);
      } else {
        break;
      }
    }

    const levelUp = newLevel > (profile.duel_pass_level || 1);

    await supabase
      .from("profiles")
      .update({
        duel_pass_xp: newXp,
        duel_pass_level: newLevel,
      })
      .eq("id", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        xp_added: xpGain,
        total_xp: newXp,
        level: newLevel,
        level_up: levelUp,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[duel-pass-xp] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


