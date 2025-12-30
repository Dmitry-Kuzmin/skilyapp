import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COSTS: Record<string, number> = {
  boost_50_50: 40,
  boost_hint: 60,
  boost_time: 50,
  second_chance: 60,
  slot_unlock: 500,
};

interface SpendRequest {
  user_id: string;
  spend_type: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({
    identifier: clientIP,
    limit: 50,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabase = createPooledSupabaseClient();
    const body: SpendRequest = await req.json();
    const { user_id, spend_type, metadata } = body;

    if (!user_id || !spend_type) {
      return new Response(JSON.stringify({ error: "user_id and spend_type are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cost = COSTS[spend_type];
    if (!cost) {
      return new Response(JSON.stringify({ error: `Unsupported spend_type: ${spend_type}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("id, coins").eq("id", user_id).single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if ((profile.coins ?? 0) < cost) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: decrementError } = await supabase.rpc("increment_profile_value", { p_profile_id: profile.id, p_column: "coins", p_amount: -cost });

    if (decrementError) {
      return new Response(JSON.stringify({ error: "Failed to update balance" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const transactionType = spend_type === 'slot_unlock' ? 'coins_spent_slot_unlock' : 'coins_spent_boost';

    await supabase.from("transactions").insert({
      user_id: profile.id,
      transaction_type: transactionType,
      amount: -cost,
      metadata: { spend_type, ...(metadata || {}) },
    });

    const { data: updatedProfile } = await supabase.from("profiles").select("coins").eq("id", profile.id).single();

    return new Response(JSON.stringify({ success: true, spend_amount: cost, new_balance: updatedProfile?.coins ?? null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[coins-spend] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
