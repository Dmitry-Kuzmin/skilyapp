import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurchaseRequest {
  user_id: string;
  season_id?: string;
  payment_method?: string;
}

interface ProfileData {
  id: string;
  subscription_type: string | null;
  subscription_status: string | null;
  premium_forever_purchased_at: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createPooledSupabaseClient();
    const body: PurchaseRequest = await req.json();
    const { user_id, season_id, payment_method = "telegram_stars" } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, subscription_type, subscription_status, premium_forever_purchased_at")
      .eq("id", user_id)
      .maybeSingle() as { data: ProfileData | null };

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    }

    let activeSeasonId = season_id;
    if (!activeSeasonId) {
      const { data: seasonData } = await supabase.rpc("get_active_season");
      if (!seasonData?.length) {
        return new Response(JSON.stringify({ error: "Active season not found" }), { status: 404, headers: corsHeaders });
      }
      activeSeasonId = seasonData[0].id;
    }

    const hasPremiumForever = !!profile.premium_forever_purchased_at && profile.subscription_type === 'lifetime' && profile.subscription_status === 'pro';

    if (hasPremiumForever) {
      await supabase.rpc("get_or_create_season_progress", { p_user_id: user_id, p_season_id: activeSeasonId });
      await supabase.from("user_season_progress").update({
        premium_pass_purchased: true,
        premium_pass_purchased_at: new Date().toISOString(),
      }).eq("user_id", user_id).eq("season_id", activeSeasonId);

      await supabase.from("transactions").insert({
        user_id,
        transaction_type: "duel_pass_unlocked",
        amount: 0,
        metadata: { season_id: activeSeasonId, method: "premium_forever" },
      });

      return new Response(JSON.stringify({ success: true, method: "premium_forever" }), { headers: corsHeaders });
    }

    const { data: existingProgress } = await supabase
      .from("user_season_progress")
      .select("premium_pass_purchased")
      .eq("user_id", user_id)
      .eq("season_id", activeSeasonId)
      .maybeSingle();

    if (existingProgress?.premium_pass_purchased) {
      return new Response(JSON.stringify({ error: "Already purchased" }), { status: 409, headers: corsHeaders });
    }

    await supabase.rpc("get_or_create_season_progress", { p_user_id: user_id, p_season_id: activeSeasonId });
    await supabase.from("user_season_progress").update({
      premium_pass_purchased: true,
      premium_pass_purchased_at: new Date().toISOString(),
    }).eq("user_id", user_id).eq("season_id", activeSeasonId);

    await supabase.from("transactions").insert({
      user_id,
      transaction_type: "duel_pass_purchase",
      amount: -799,
      metadata: { season_id: activeSeasonId, payment_method },
    });

    return new Response(JSON.stringify({ success: true, method: payment_method, season_id: activeSeasonId }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("[duel-pass-purchase] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
