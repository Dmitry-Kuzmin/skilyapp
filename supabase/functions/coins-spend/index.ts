import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COSTS: Record<string, number> = {
  boost_50_50: 40,
  boost_hint: 60,
  boost_time: 50,
  second_chance: 60,
  slot_unlock: 500, // Разблокировка 2-го RAM слота
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("[coins-spend] Request body:", body);
    
    const { user_id, spend_type, metadata } = body;

    if (!user_id || !spend_type) {
      console.error("[coins-spend] Missing required fields:", { user_id: !!user_id, spend_type: !!spend_type });
      return new Response(
        JSON.stringify({ error: "user_id and spend_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cost = COSTS[spend_type];
    if (!cost) {
      console.error("[coins-spend] Unsupported spend_type:", spend_type, "Available:", Object.keys(COSTS));
      return new Response(
        JSON.stringify({ error: `Unsupported spend_type: ${spend_type}. Available: ${Object.keys(COSTS).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("[coins-spend] Processing:", { user_id, spend_type, cost, metadata });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, coins")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((profile.coins ?? 0) < cost) {
      return new Response(
        JSON.stringify({ error: "Insufficient balance" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: decrementError } = await supabase.rpc("increment_profile_value", {
      p_profile_id: profile.id,
      p_column: "coins",
      p_amount: -cost,
    });

    if (decrementError) {
      console.error("[coins-spend] decrement error", decrementError);
      return new Response(
        JSON.stringify({ error: "Failed to update balance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Определяем тип транзакции в зависимости от типа траты
    const transactionType = spend_type === 'slot_unlock' 
      ? 'coins_spent_slot_unlock'
      : 'coins_spent_boost';

    await supabase.from("transactions").insert({
      user_id: profile.id,
      transaction_type: transactionType,
      amount: -cost,
      metadata: {
        spend_type,
        ...(metadata || {}),
      },
    });

    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", profile.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        spend_amount: cost,
        new_balance: updatedProfile?.coins ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[coins-spend] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


