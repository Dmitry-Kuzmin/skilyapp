import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Skily <quiz@skilyapp.com>";
const APP_URL = "https://skilyapp.com";

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
    const authHeader = req.headers.get("Authorization");
    console.log("[cancel-subscription] authHeader present:", !!authHeader);
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    console.log("[cancel-subscription] user:", user?.id, "authError:", authError?.message);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const authUserId = user.id;

    // Для email-юзеров profiles.id = auth.users.id.
    // Для Telegram-юзеров profiles.id — отдельный UUID, а profiles.user_id = auth.users.id.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, telegram_id, trial_until, premium_until, subscription_status, premium_forever_purchased_at")
      .or(`id.eq.${authUserId},user_id.eq.${authUserId}`)
      .maybeSingle();

    console.log("[cancel-subscription] profile:", JSON.stringify(profile), "err:", profileError?.message);

    if (!profile) return json({ error: "Profile not found" }, 404);

    const profileId = profile.id;

    // Ищем активный Paddle subscription по фактическому profile.id
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .select("id, paddle_subscription_id, item_id, status")
      .eq("user_id", profileId)
      .not("paddle_subscription_id", "is", null)
      .in("status", ["completed", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[cancel-subscription] purchase:", purchase?.id, "paddle_sub:", purchase?.paddle_subscription_id, "err:", purchaseError?.message);

    // ── Путь 1: Paddle subscription ───────────────────────────────────────────
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
      console.log("[cancel-subscription] Paddle status:", paddleRes.status, "data:", JSON.stringify(paddleData).slice(0, 200));

      if (!paddleRes.ok) {
        return json({
          error: "paddle_error",
          detail: paddleData?.error?.detail ?? "Paddle API error",
        }, 502);
      }

      // Помечаем purchase как cancelled, profile.subscription_status НЕ трогаем —
      // юзер сохраняет 'pro' до конца периода, Paddle webhook понизит позже.
      const { error: purchUpdErr } = await supabase.from("purchases").update({ status: "cancelled" }).eq("id", purchase.id);
      if (purchUpdErr) console.error("[cancel-subscription] purchase update err:", purchUpdErr);

      const scheduledEnd: string | null = paddleData?.data?.next_billed_at ?? null;
      const endFormatted = scheduledEnd
        ? new Date(scheduledEnd).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
        : null;

      if (profile.telegram_id) {
        const msg = endFormatted
          ? `✅ Подписка Skily Premium отменена.\n\nДоступ сохраняется до ${endFormatted}. После этой даты подписка не продлится.`
          : "✅ Подписка Skily Premium отменена.\n\nДоступ сохраняется до конца оплаченного периода.";
        supabase.functions.invoke("bot-send-message", {
          body: { telegram_id: profile.telegram_id, text: msg },
        }).catch(() => {});
      }

      const realEmail = user.email && !user.email.endsWith("@telegram.auth") ? user.email : null;
      if (realEmail) {
        const endLine = endFormatted
          ? `Доступ к Premium сохраняется до <strong>${endFormatted}</strong>. После этой даты подписка не продлится автоматически.`
          : "Доступ к Premium сохраняется до конца оплаченного периода.";
        const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1e293b;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,#1e3a5f,#1e293b);">
          <p style="margin:0 0 8px;font-size:32px;">✅</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">Подписка отменена</h1>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;line-height:1.6;">
            Привет! Мы подтверждаем, что твоя подписка Skily Premium успешно отменена.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;line-height:1.6;">
            ${endLine}
          </p>
          <div style="text-align:center;">
            <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
              Открыть Skily
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #334155;">
          <p style="margin:0;font-size:12px;color:#475569;">© Skily · <a href="${APP_URL}" style="color:#475569;">skilyapp.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM_EMAIL, to: [realEmail], subject: "Подписка Skily Premium отменена", html }),
        }).catch(() => {});
      }

      return json({ success: true, method: "paddle", scheduledEnd, notifications: { telegram: !!profile.telegram_id, email: !!realEmail } });
    }

    // ── Путь 2: триал / ручная подписка ──────────────────────────────────────

    const now = new Date();
    const hasLifetime = !!profile.premium_forever_purchased_at;
    const hasTrial =
      (profile.trial_until && new Date(profile.trial_until) > now) ||
      profile.subscription_status === "trial";
    const hasPremium = profile.premium_until && new Date(profile.premium_until) > now;

    console.log("[cancel-subscription] hasLifetime:", hasLifetime, "hasTrial:", hasTrial, "hasPremium:", !!hasPremium);

    if (hasLifetime) return json({ error: "lifetime_not_cancellable" }, 400);

    if (hasTrial) {
      // subscription_status имеет CHECK constraint (free|trial|pro|lifetime),
      // поэтому ставим 'free' — это и есть состояние «нет подписки».
      const updates: Record<string, string> = { subscription_status: "free" };
      if (profile.trial_until) updates.trial_until = now.toISOString();
      const { error: updErr } = await supabase.from("profiles").update(updates).eq("id", profileId);
      if (updErr) {
        console.error("[cancel-subscription] profile update err:", updErr);
        return json({ error: "update_failed", detail: updErr.message }, 500);
      }

      if (profile.telegram_id) {
        const msg = "✅ Пробный период Skily Premium отменён.\n\nЕсли передумаешь — Premium всегда доступен в настройках приложения.";
        supabase.functions.invoke("bot-send-message", {
          body: { telegram_id: profile.telegram_id, text: msg },
        }).catch(() => {});
      }

      const realEmail = user.email && !user.email.endsWith("@telegram.auth") ? user.email : null;
      if (realEmail) {
        const firstName = realEmail.split("@")[0];
        const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1e293b;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,#1e3a5f,#1e293b);">
          <p style="margin:0 0 8px;font-size:32px;">✅</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">Пробный период отменён</h1>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;line-height:1.6;">
            Привет! Мы подтверждаем, что твой пробный период Skily Premium успешно отменён. Доступ к базовым функциям приложения сохраняется.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;line-height:1.6;">
            Если передумаешь — Premium всегда доступен в настройках приложения. Удачи на экзамене!
          </p>
          <div style="text-align:center;">
            <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
              Открыть Skily
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #334155;">
          <p style="margin:0;font-size:12px;color:#475569;">© Skily · <a href="${APP_URL}" style="color:#475569;">skilyapp.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM_EMAIL, to: [realEmail], subject: "Пробный период Skily отменён", html }),
        }).catch(() => {});
      }

      return json({ success: true, method: "trial", notifications: { telegram: !!profile.telegram_id, email: !!realEmail } });
    }

    if (hasPremium) {
      // Оплачено не через Paddle (Stars / Crypto)
      return json({ error: "no_paddle_subscription", method: "manual" }, 422);
    }

    return json({ error: "no_active_subscription" }, 404);
  } catch (err) {
    console.error("[cancel-subscription] Unexpected:", err);
    return json({ error: "internal_error" }, 500);
  }
});
