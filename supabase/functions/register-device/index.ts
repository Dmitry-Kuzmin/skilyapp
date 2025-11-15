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

    const { user_id, device_fingerprint, device_name, user_agent, platform, ip_address } = await req.json();

    if (!user_id || !device_fingerprint) {
      return new Response(
        JSON.stringify({ error: "user_id and device_fingerprint are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем IP адрес из заголовков запроса
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     ip_address || 
                     null;

    // Регистрируем или обновляем устройство
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
      console.error("[register-device] Error:", deviceError);
      return new Response(
        JSON.stringify({ error: deviceError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!deviceData || deviceData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to register device" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = deviceData[0];

    return new Response(
      JSON.stringify({
        success: true,
        device_id: result.device_id,
        is_new_device: result.is_new_device,
        device_count: result.device_count,
        requires_verification: result.requires_verification,
        message: result.message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[register-device] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

