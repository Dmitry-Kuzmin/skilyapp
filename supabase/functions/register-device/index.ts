import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Non-critical background task — always return 200 to avoid browser console errors
const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, device_fingerprint, device_name, user_agent, platform, ip_address } = await req.json();

    if (!user_id || !device_fingerprint) {
      // Return 200 to avoid red errors in browser (non-critical task)
      return ok({ success: false, error: "user_id and device_fingerprint are required" });
    }

    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] ||
                     req.headers.get("x-real-ip") ||
                     ip_address ||
                     null;

    const { data: deviceData, error: deviceError } = await supabase
      .rpc("register_or_update_device", {
        p_user_id: user_id,
        p_device_fingerprint: device_fingerprint,
        p_device_name: device_name || null,
        p_user_agent: user_agent || null,
        p_ip_address: clientIP,
        p_platform: platform || 'web',
      });

    if (deviceError) {
      console.error("[register-device] RPC error:", deviceError.message);
      return ok({ success: false, error: deviceError.message });
    }

    // RPC may return array or single object depending on Supabase JS version
    const result = Array.isArray(deviceData) ? deviceData[0] : deviceData;

    if (!result) {
      return ok({ success: false, error: "No result from RPC" });
    }

    return ok({
      success: true,
      device_id: result.device_id,
      is_new_device: result.is_new_device,
      device_count: result.device_count,
      requires_verification: result.requires_verification,
      message: result.message,
    });
  } catch (error) {
    console.error("[register-device] Unexpected error:", (error as Error).message);
    // Return 200 to avoid browser console red errors (non-critical background task)
    return ok({ success: false, error: "Internal error" });
  }
});
