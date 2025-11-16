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

    const { action, user_id, session_token, device_fingerprint, user_agent, platform, ip_address } = await req.json();

    if (!user_id || !action) {
      return new Response(
        JSON.stringify({ error: "user_id and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем IP адрес из заголовков
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     ip_address || 
                     null;

    if (action === 'create') {
      if (!session_token) {
        return new Response(
          JSON.stringify({ error: "session_token is required for create action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Получаем device_id по fingerprint
      let deviceId = null;
      if (device_fingerprint) {
        const { data: device } = await supabase
          .from('user_devices')
          .select('id')
          .eq('user_id', user_id)
          .eq('device_fingerprint', device_fingerprint)
          .single();
        
        deviceId = device?.id || null;
      }

      // Создаем или обновляем сессию
      const { data: sessionData, error: sessionError } = await supabase
        .rpc("create_or_update_session", {
          p_user_id: user_id,
          p_device_id: deviceId,
          p_session_token: session_token,
          p_ip_address: clientIP,
          p_user_agent: user_agent || null,
          p_max_sessions: 1, // Только 1 активная сессия
        });

      if (sessionError) {
        console.error("[manage-session] Error:", sessionError);
        return new Response(
          JSON.stringify({ error: sessionError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!sessionData || sessionData.length === 0) {
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = sessionData[0];

      return new Response(
        JSON.stringify({
          success: true,
          session_id: result.session_id,
          previous_sessions_closed: result.previous_sessions_closed,
          message: result.message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'update') {
      if (!session_token) {
        return new Response(
          JSON.stringify({ error: "session_token is required for update action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Обновляем активность сессии
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .eq('session_token', session_token)
        .eq('is_active', true);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Session activity updated",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'check') {
      if (!session_token) {
        return new Response(
          JSON.stringify({ error: "session_token is required for check action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Проверяем валидность сессии
      const { data: session, error: checkError } = await supabase
        .from('user_sessions')
        .select('id, is_active, expires_at')
        .eq('user_id', user_id)
        .eq('session_token', session_token)
        .single();

      if (checkError || !session) {
        return new Response(
          JSON.stringify({
            success: true,
            is_valid: false,
            message: "Session not found",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      const isExpired = expiresAt < now;
      const isValid = session.is_active && !isExpired;

      return new Response(
        JSON.stringify({
          success: true,
          is_valid: isValid,
          expires_at: session.expires_at,
          is_expired: isExpired,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[manage-session] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


