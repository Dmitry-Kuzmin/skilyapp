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

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, premium_until, trial_until, coins, subscription_type, subscription_status, premium_forever_purchased_at")
      .eq("id", user_id)
      .single();

    if (error || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    
    // Проверяем Premium Forever (lifetime)
    const hasPremiumForever = 
      (profile.subscription_type === 'lifetime' && profile.subscription_status === 'pro') ||
      profile.subscription_status === 'lifetime';
    
    const premiumUntilDate = profile.premium_until ? new Date(profile.premium_until) : null;
    const trialUntilDate = profile.trial_until ? new Date(profile.trial_until) : null;

    // Premium Forever всегда активен
    const isPremium = hasPremiumForever || !!(premiumUntilDate && premiumUntilDate > now);
    const isTrial = !!(!isPremium && !hasPremiumForever && trialUntilDate && trialUntilDate > now);
    
    // Для Premium Forever activeUntil = null (навсегда)
    const activeUntil = hasPremiumForever ? null : (isPremium ? premiumUntilDate : isTrial ? trialUntilDate : null);

    const daysRemaining = hasPremiumForever 
      ? null // Premium Forever = null (навсегда)
      : activeUntil
        ? Math.ceil((activeUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return new Response(
      JSON.stringify({
        success: true,
        isPremium: isPremium || isTrial || hasPremiumForever,
        isTrial,
        isLifetime: hasPremiumForever,
        activeUntil: activeUntil?.toISOString() || null,
        daysRemaining: hasPremiumForever ? null : daysRemaining, // null = навсегда
        coins: profile.coins ?? 0,
        subscriptionType: profile.subscription_type || null,
        subscriptionStatus: profile.subscription_status || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[premium-status] unexpected error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


