import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileData {
  id: string;
  premium_until: string | null;
  trial_until: string | null;
  coins: number | null;
  subscription_type: string | null;
  subscription_status: string | null;
  premium_forever_purchased_at: string | null;
}

interface StatusRequest {
  user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createPooledSupabaseClient();
    const body: StatusRequest = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, premium_until, trial_until, coins, subscription_type, subscription_status, premium_forever_purchased_at")
      .eq("id", user_id)
      .maybeSingle() as { data: ProfileData | null, error: any };

    if (error || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();

    const hasPremiumForever =
      !!profile.premium_forever_purchased_at &&
      profile.subscription_type === 'lifetime' &&
      profile.subscription_status === 'pro';

    const premiumUntilDate = profile.premium_until ? new Date(profile.premium_until) : null;
    const trialUntilDate = profile.trial_until ? new Date(profile.trial_until) : null;

    const isPremium = hasPremiumForever || !!(premiumUntilDate && premiumUntilDate > now);
    const isTrial = !!(!isPremium && !hasPremiumForever && trialUntilDate && trialUntilDate > now);
    const activeUntil = hasPremiumForever ? null : (isPremium ? premiumUntilDate : isTrial ? trialUntilDate : null);

    const daysRemaining = hasPremiumForever
      ? null
      : activeUntil
        ? Math.ceil((activeUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return new Response(JSON.stringify({
      success: true,
      isPremium: isPremium || isTrial || hasPremiumForever,
      isTrial,
      isLifetime: hasPremiumForever,
      activeUntil: activeUntil?.toISOString() || null,
      daysRemaining,
      coins: profile.coins ?? 0,
      subscriptionType: profile.subscription_type || null,
      subscriptionStatus: profile.subscription_status || null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[premium-status] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
