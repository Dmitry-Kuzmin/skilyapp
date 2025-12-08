import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create authenticated client
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      partner_code,
      user_id,
      utm_source,
      utm_medium,
      utm_campaign,
      ip_address,
      user_agent,
    } = await req.json();

    if (!partner_code || !user_id) {
      return new Response(
        JSON.stringify({ error: "partner_code and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call RPC function to activate premium
    const { data, error } = await supabase.rpc("activate_partner_premium", {
      p_partner_code: partner_code.toUpperCase().trim(),
      p_user_id: user_id,
      p_utm_source: utm_source || null,
      p_utm_medium: utm_medium || null,
      p_utm_campaign: utm_campaign || null,
      p_ip_address: ip_address || null,
      p_user_agent: user_agent || null,
    });

    if (error) {
      console.error("[activate-partner-premium] Error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to activate premium",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No data returned",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data[0];

    // Send webhook notification to partner if activation successful
    if (result.success) {
      try {
        await sendPartnerWebhookNotification(
          supabase,
          partner_code,
          user_id,
          result.premium_until
        );
      } catch (webhookError) {
        // Don't fail the request if webhook fails
        console.error("[activate-partner-premium] Webhook error:", webhookError);
      }
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        premium_until: result.premium_until,
      }),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[activate-partner-premium] Exception:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Function to send webhook notification to partner
async function sendPartnerWebhookNotification(
  supabase: any,
  partnerCode: string,
  userId: string,
  premiumUntil: string
) {
  // Get partner info
  const { data: partner } = await supabase
    .from("partners")
    .select("id, name, email, webhook_url")
    .eq("partner_code", partnerCode.toUpperCase())
    .single();

  if (!partner || !partner.webhook_url) {
    return; // No webhook configured
  }

  // Get user info
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, email")
    .eq("id", userId)
    .single();

  // Prepare webhook payload
  const payload = {
    event: "premium_activated",
    partner_id: partner.id,
    partner_code: partnerCode.toUpperCase(),
    user_id: userId,
    user_name: profile?.first_name || "User",
    user_email: profile?.email || null,
    premium_until: premiumUntil,
    activated_at: new Date().toISOString(),
  };

  // Send webhook
  try {
    const response = await fetch(partner.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Skilyapp-Partner-Webhook/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("[activate-partner-premium] Webhook failed:", response.status);
    }
  } catch (error) {
    console.error("[activate-partner-premium] Webhook error:", error);
  }
}

















