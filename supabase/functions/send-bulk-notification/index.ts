// send-bulk-notification
// One-time bulk email + Telegram blast about DGT bug fix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FROM_EMAIL = "Skily <noreply@skilyapp.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Email HTML ───────────────────────────────────────────────────────────────
function buildEmailHtml(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skily — Исправлено ✅</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f172a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img src="https://skilyapp.com/email-assets/skily-logo.png" alt="Skily" width="64" height="64" style="display:block;border-radius:16px;margin:0 auto 12px;" />
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Skily</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1e293b;border-radius:20px;border:1px solid rgba(99,102,241,0.25);overflow:hidden;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">

                <!-- Green top bar -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#10b981,#3b82f6);"></td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 36px 36px;">

                    <!-- Badge -->
                    <div style="display:inline-block;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:20px;padding:6px 14px;margin-bottom:20px;">
                      <span style="color:#10b981;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">✅ Обновление · Actualización</span>
                    </div>

                    <!-- RU Title + text -->
                    <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#ffffff;line-height:1.2;">
                      Починили — теперь всё работает
                    </h1>
                    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                      Если ты видел вопросы <strong style="color:#f8fafc;">ПДД России</strong> вместо DGT Испании — это был баг. Исправили. Теперь в приложении только <strong style="color:#f8fafc;">экзамен DGT</strong> — можно учиться.
                    </p>

                    <!-- Divider with ES label -->
                    <div style="border-top:1px solid rgba(255,255,255,0.07);margin-bottom:24px;padding-top:24px;">
                      <!-- ES Title + text -->
                      <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#ffffff;line-height:1.2;">
                        Corregido — ya todo funciona
                      </h2>
                      <p style="margin:0 0 28px;font-size:15px;color:#94a3b8;line-height:1.6;">
                        Si veías preguntas de tráfico de Rusia en lugar del DGT — era un error nuestro. Ya está corregido. Ahora la app tiene <strong style="color:#f8fafc;">solo el examen DGT España</strong>.
                      </p>
                    </div>

                    <!-- CTA button -->
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:12px;background:linear-gradient(135deg,#3b82f6,#6366f1);">
                          <a href="https://skilyapp.com" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                            Начать заниматься · Empezar →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer inside card -->
                <tr>
                  <td style="padding:16px 36px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
                    <p style="margin:0;font-size:12px;color:#475569;">
                      Skily · DGT exam prep · <a href="https://skilyapp.com" style="color:#6366f1;text-decoration:none;">skilyapp.com</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Bottom note -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-size:11px;color:#334155;">Ты получил это письмо, потому что зарегистрирован в Skily · You received this because you signed up for Skily.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Send single email via Resend ────────────────────────────────────────────
async function sendEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: "✅ Починили — теперь всё работает правильно",
      html: buildEmailHtml(),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err };
  }
  return { ok: true };
}

// ─── Send Telegram message ────────────────────────────────────────────────────
async function sendTelegram(chatId: string | number): Promise<{ ok: boolean; error?: string }> {
  const text = `✅ *Починили — теперь всё работает*\n\nЕсли раньше ты видел вопросы ПДД России вместо DGT — это был баг\\. Исправили\\. Теперь в приложении только *экзамен DGT Испании*\\. 🚗\n\n─────────────────\n\n✅ *Corregido — ya todo funciona*\n\nSi veías preguntas rusas en lugar del DGT — era un error nuestro\\. Ya está corregido\\. Solo *examen DGT España*\\.\n\n[Открыть · Abrir Skily](https://t.me/skilyapp_bot)`;

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err };
  }
  return { ok: true };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "both"; // "email" | "telegram" | "both"
    const dryRun = body.dry_run === true;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const results: { emails: any[]; telegram: any[] } = { emails: [], telegram: [] };

    // ── EMAIL ──
    if (mode === "email" || mode === "both") {
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const realEmails = (users?.users || [])
        .map((u) => u.email)
        .filter((e): e is string => !!e && !e.includes("telegram.auth"));

      console.log(`[email] Found ${realEmails.length} real emails`);

      for (const email of realEmails) {
        if (dryRun) {
          results.emails.push({ email, status: "dry_run" });
          continue;
        }
        // Small delay to respect rate limits
        await new Promise((r) => setTimeout(r, 100));
        const result = await sendEmail(email);
        results.emails.push({ email, ...result });
        console.log(`[email] ${email}: ${result.ok ? "✓" : "✗ " + result.error}`);
      }
    }

    // ── TELEGRAM ──
    if (mode === "telegram" || mode === "both") {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("telegram_id, first_name")
        .not("telegram_id", "is", null);

      console.log(`[telegram] Found ${profiles?.length || 0} users with telegram_id`);

      for (const p of profiles || []) {
        if (dryRun) {
          results.telegram.push({ telegram_id: p.telegram_id, status: "dry_run" });
          continue;
        }
        await new Promise((r) => setTimeout(r, 50));
        const result = await sendTelegram(p.telegram_id);
        results.telegram.push({ telegram_id: p.telegram_id, ...result });
        console.log(`[telegram] ${p.telegram_id} (${p.first_name}): ${result.ok ? "✓" : "✗ " + result.error}`);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      dry_run: dryRun,
      sent: {
        emails: results.emails.filter((e) => e.ok).length,
        telegram: results.telegram.filter((t) => t.ok).length,
      },
      details: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
