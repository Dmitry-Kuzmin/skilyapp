// =====================================================
// bot-send-message — отправка сообщения из админки
// Статусы: delivered | blocked | failed
// Поддерживает inline keyboard (кнопки под сообщением)
// =====================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN        = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_API     = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Тип одной кнопки
type InlineButton = { text: string; url?: string; callback_data?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const body = await req.json();
    const {
      telegram_id,
      text,
      from_admin_id,
      keyboard,   // InlineButton[][] | null
    } = body as {
      telegram_id: number;
      text: string;
      from_admin_id?: string;
      keyboard?: InlineButton[][] | null;
    };

    if (!telegram_id || !text?.trim()) {
      return new Response(JSON.stringify({ error: "telegram_id and text required" }), { status: 400, headers: CORS });
    }

    // Проверяем роль admin
    if (from_admin_id) {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: from_admin_id,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: CORS });
      }
    }

    const fullText = `💬 <b>Команда Skily:</b>\n\n${text.trim()}`;

    // ── Отправляем в Telegram ─────────────────────────────────────────────
    const payload: Record<string, unknown> = {
      chat_id: telegram_id,
      text: fullText,
      parse_mode: "HTML",
    };
    if (keyboard && keyboard.length > 0) {
      payload.reply_markup = { inline_keyboard: keyboard };
    }

    const tgRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const tgBody = await tgRes.json();

    // ── Определяем статус ─────────────────────────────────────────────────
    let status = "delivered";
    let errorDetail: string | null = null;

    if (!tgRes.ok || !tgBody.ok) {
      const errCode = tgBody?.error_code;
      if (errCode === 403) {
        status = "blocked"; // бот заблокирован пользователем
      } else if (errCode === 400) {
        status = "failed";  // chat not found / deactivated
      } else {
        status = "failed";
      }
      errorDetail = tgBody?.description ?? "Unknown Telegram error";
      console.error(`[bot-send-message] TG error ${errCode}: ${errorDetail}`);
    }

    // ── Логируем в bot_messages ───────────────────────────────────────────
    const { data: inserted } = await supabase.from("bot_messages").insert({
      telegram_id,
      username: null,
      direction: "out",
      type: "admin",
      content: text.trim(),
      status,
      extra: {
        sent_by: from_admin_id ?? "admin",
        full_text: fullText,
        tg_message_id: tgBody?.result?.message_id ?? null,
        keyboard: keyboard ?? null,
        error: errorDetail,
      },
    }).select("id").single();

    console.log(`[bot-send-message] ${status} → ${telegram_id} msg_id=${inserted?.id}`);

    return new Response(JSON.stringify({
      ok: status === "delivered",
      status,
      error: errorDetail,
      message_id: inserted?.id,
    }), {
      status: status === "delivered" ? 200 : 200, // всегда 200, статус в теле
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[bot-send-message] Fatal:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: CORS });
  }
});
