import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Auth: проверяем JWT пользователя
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const profileId = user.id;

    // Ищем активный Paddle subscription для пользователя
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id, paddle_subscription_id, item_id, status")
      .eq("user_id", profileId)
      .not("paddle_subscription_id", "is", null)
      .in("status", ["completed", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ── Путь 1: есть Paddle subscription — отменяем через API ───────────────
    if (purchase?.paddle_subscription_id) {
      const subId = purchase.paddle_subscription_id;

      const paddleRes = await fetch(
        `https://api.paddle.com/subscriptions/${subId}/cancel`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PADDLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ effective_from: "next_billing_period" }),
        }
      );

      const paddleData = await paddleRes.json().catch(() => ({}));

      if (!paddleRes.ok) {
        console.error("[cancel-subscription] Paddle error:", paddleData);
        return json({
          error: "paddle_error",
          detail: paddleData?.error?.detail ?? "Paddle API error",
        }, 502);
      }

      // Помечаем покупку как отменённую (фактически отключится по вебхуку,
      // но ставим флаг чтобы UI обновился немедленно)
      await supabase
        .from("purchases")
        .update({ status: "cancelled" })
        .eq("id", purchase.id);

      // Webhook от Paddle обновит profiles при следующем биллинге,
      // но можно сразу занулить subscription_status чтобы показать пользователю
      await supabase
        .from("profiles")
        .update({ subscription_status: "cancelling" })
        .eq("id", profileId);

      return json({ success: true, method: "paddle", scheduledEnd: paddleData?.data?.next_billed_at ?? null });
    }

    // ── Путь 2: триал — просто обрезаем trial_until ──────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_until, premium_until, subscription_status, premium_forever_purchased_at")
      .eq("id", profileId)
      .maybeSingle();

    if (!profile) return json({ error: "Profile not found" }, 404);

    const now = new Date();
    const hasTrial = profile.trial_until && new Date(profile.trial_until) > now;
    const hasPremium = profile.premium_until && new Date(profile.premium_until) > now;
    const hasLifetime = !!profile.premium_forever_purchased_at;

    if (hasLifetime) {
      return json({ error: "lifetime_not_cancellable" }, 400);
    }

    if (hasTrial) {
      await supabase
        .from("profiles")
        .update({
          trial_until: now.toISOString(),
          subscription_status: "cancelled",
        })
        .eq("id", profileId);
      return json({ success: true, method: "trial" });
    }

    if (hasPremium) {
      // Оплачено не через Paddle (Stars / Crypto) — не можем отменить автоматически
      return json({ error: "no_paddle_subscription", method: "manual" }, 422);
    }

    return json({ error: "no_active_subscription" }, 404);
  } catch (err) {
    console.error("[cancel-subscription] Unexpected:", err);
    return json({ error: "internal_error" }, 500);
  }
});
