// =====================================================
// Telegram Chat Sync: Синхронизация участников групп
// =====================================================
// Edge Function для синхронизации участников Telegram групп
// Вызывается ботом при получении сообщений из групп

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { chat_id, chat_type, chat_title, telegram_id, user_id } = body;

    if (!chat_id || !telegram_id) {
      return new Response(
        JSON.stringify({ error: "chat_id and telegram_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[telegram-chat-sync] Syncing member: chat_id=${chat_id}, telegram_id=${telegram_id}`);

    // Добавляем или обновляем участника группы
    const { data, error } = await supabase.rpc("upsert_chat_member", {
      p_chat_id: chat_id,
      p_chat_type: chat_type || "group",
      p_chat_title: chat_title || null,
      p_telegram_id: telegram_id,
      p_user_id: user_id || null,
    });

    if (error) {
      console.error("[telegram-chat-sync] Error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, member_id: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[telegram-chat-sync] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

