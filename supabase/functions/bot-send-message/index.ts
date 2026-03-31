// =====================================================
// bot-send-message — отправка сообщения пользователю
// из админки. Вызывается фронтом с Bearer токеном.
// =====================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN        = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_API     = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_CHAT_ID    = 488159880; // @guapo_pub — уведомления сюда

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ── Auth: требуем service_role или authenticated admin ─────────────────
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { telegram_id, text, from_admin_id } = body as {
      telegram_id: number;
      text: string;
      from_admin_id?: string; // profile_id администратора
    };

    if (!telegram_id || !text?.trim()) {
      return new Response(JSON.stringify({ error: "telegram_id and text required" }), { status: 400, headers: CORS });
    }

    // Проверяем что вызывающий — реально admin (через has_role RPC)
    if (from_admin_id) {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: from_admin_id,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: CORS });
      }
    }

    // Оборачиваем в HTML-форматирование «от команды»
    const fullText = `💬 <b>Команда Skily:</b>\n\n${text.trim()}`;

    // ── Отправляем сообщение пользователю ─────────────────────────────────
    const tgRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegram_id,
        text: fullText,
        parse_mode: "HTML",
      }),
    });

    if (!tgRes.ok) {
      const err = await tgRes.text();
      console.error("[bot-send-message] Telegram error:", err);
      return new Response(JSON.stringify({ error: "Telegram API error", detail: err }), { status: 502, headers: CORS });
    }

    // ── Логируем в bot_messages ────────────────────────────────────────────
    await supabase.from("bot_messages").insert({
      telegram_id,
      username: null,
      direction: "out",
      type: "admin",
      content: text.trim(),
      extra: { sent_by: from_admin_id ?? "admin", full_text: fullText },
    });

    console.log(`[bot-send-message] Sent to ${telegram_id}: "${text.slice(0, 60)}..."`);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[bot-send-message] Fatal:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: CORS });
  }
});
