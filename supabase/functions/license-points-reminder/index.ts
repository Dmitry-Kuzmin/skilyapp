// =====================================================
// License Points Reminder
// Отправляет email браузерным пользователям (без Telegram),
// у которых вчера или позавчера был последний вход.
// Правила:
//   - day 1 пропуска → дружеское предупреждение
//   - day 2 пропуска → срочное предупреждение
//   - day 3+ → НЕ отправляем (списание остановилось)
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL     = 'Skily <noreply@skilyapp.com>';
const APP_URL        = 'https://skilyapp.com';

type Lang = 'ru' | 'es' | 'en';

function getUserLang(profile: any): Lang {
  const s = profile?.settings?.language;
  if (s && ['ru', 'en', 'es'].includes(s)) return s as Lang;
  const code = profile?.language_code?.toLowerCase()?.split('-')[0];
  if (code) {
    if (['ru', 'uk', 'be', 'kk'].includes(code)) return 'ru';
    if (['es', 'ca', 'gl'].includes(code)) return 'es';
  }
  return 'es';
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── i18n ─────────────────────────────────────────────────────────────────────

const copy: Record<Lang, {
  subject1: string;
  subject2: string;
  preheader1: string;
  preheader2: string;
  greeting: (name?: string) => string;
  body1: (pts: number) => string;
  body2: (pts: number) => string;
  pointsLabel: string;
  ctaText: string;
  footerText: string;
  unsubText: string;
}> = {
  ru: {
    subject1: '🚗 Сегодня спишется балл — не пропусти занятие',
    subject2: '⚠️ Ещё один балл под угрозой — войди в Skily',
    preheader1: 'Войди сегодня и сохрани свой счёт водительского удостоверения.',
    preheader2: 'Вчера списался балл. Сегодня ещё один — если не зайдёшь.',
    greeting: (n?: string) => n ? `${n}, не теряй баллы!` : 'Не теряй баллы!',
    body1: (pts: number) =>
      `У тебя сейчас <b>${pts} из 15 баллов</b> водительского удостоверения. Если не зайдёшь сегодня — спишется 1 балл. Достаточно одного упражнения, чтобы сохранить прогресс.`,
    body2: (pts: number) =>
      `Вчера списался 1 балл, и сегодня та же история, если ты не вернёшься. Сейчас у тебя <b>${pts} из 15 баллов</b>. Одна сессия — и счётчик остановится.`,
    pointsLabel: 'баллов вод. уд.',
    ctaText: 'Войти и сохранить балл →',
    footerText: 'Ты получаешь это письмо, потому что зарегистрировался на Skily.',
    unsubText: 'Отписаться от напоминаний',
  },
  es: {
    subject1: '🚗 Hoy perderás un punto — no pierdas tu racha',
    subject2: '⚠️ Otro punto en riesgo — entra a Skily hoy',
    preheader1: 'Entra hoy y conserva tus puntos del carnet de conducir.',
    preheader2: 'Ayer perdiste un punto. Hoy otro, si no entras.',
    greeting: (n?: string) => n ? `${n}, ¡no pierdas tus puntos!` : '¡No pierdas tus puntos!',
    body1: (pts: number) =>
      `Ahora tienes <b>${pts} de 15 puntos</b> del carnet de conducir. Si no entras hoy, perderás 1 punto. Con un ejercicio corto puedes mantener tu progreso.`,
    body2: (pts: number) =>
      `Ayer perdiste 1 punto, y hoy lo mismo si no vuelves. Ahora tienes <b>${pts} de 15 puntos</b>. Una sesión y el contador se detiene.`,
    pointsLabel: 'puntos carnet',
    ctaText: 'Entrar y conservar el punto →',
    footerText: 'Recibes este correo porque te registraste en Skily.',
    unsubText: 'Cancelar recordatorios',
  },
  en: {
    subject1: '🚗 You\'ll lose a point today — don\'t skip your session',
    subject2: '⚠️ Another point at risk — log in to Skily',
    preheader1: 'Log in today and keep your driving licence points.',
    preheader2: 'You lost a point yesterday. Today another, if you don\'t log in.',
    greeting: (n?: string) => n ? `${n}, don\'t lose your points!` : 'Don\'t lose your points!',
    body1: (pts: number) =>
      `You currently have <b>${pts} of 15 licence points</b>. If you don't log in today, 1 point will be deducted. One short exercise is enough to keep your progress.`,
    body2: (pts: number) =>
      `You lost 1 point yesterday, and the same will happen today if you don't return. You have <b>${pts} of 15 points</b>. One session stops the counter.`,
    pointsLabel: 'licence points',
    ctaText: 'Log in and keep the point →',
    footerText: 'You\'re receiving this because you registered at Skily.',
    unsubText: 'Unsubscribe from reminders',
  },
};

// ── Генерация HTML письма ─────────────────────────────────────────────────────

function buildPointsBar(points: number): string {
  const max = 15;
  const pct = Math.round((points / max) * 100);
  const color = points >= 10 ? '#22c55e' : points >= 6 ? '#f59e0b' : '#ef4444';
  const dots = Array.from({ length: max }, (_, i) => {
    const filled = i < points;
    return `<td style="padding:0 2px;">
      <div style="width:14px;height:14px;border-radius:50%;background:${filled ? color : 'rgba(255,255,255,0.1)'};">&nbsp;</div>
    </td>`;
  }).join('');

  return `
    <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>${dots}</tr>
    </table>
    <div style="margin-top:8px;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;">
      <div style="height:6px;border-radius:3px;background:${color};width:${pct}%;"></div>
    </div>`;
}

function buildEmailHtml(
  lang: Lang,
  firstName: string | null,
  points: number,
  daysMissed: 1 | 2,
  appUrl: string,
): string {
  const t = copy[lang];
  const subject  = daysMissed === 1 ? t.subject1  : t.subject2;
  const preheader = daysMissed === 1 ? t.preheader1 : t.preheader2;
  const bodyText  = daysMissed === 1 ? t.body1(points) : t.body2(points);
  const alertColor = daysMissed === 1 ? '#f59e0b' : '#ef4444';
  const alertIcon  = daysMissed === 1 ? '⚠️' : '🚨';

  const utmUrl = `${appUrl}/dashboard?utm_source=email&utm_medium=points-reminder&utm_campaign=day${daysMissed}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#0f172a;min-width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);text-align:center;line-height:44px;font-size:22px;">🚗</div>
                  </td>
                  <td valign="middle">
                    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Skily</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background:#1e293b;border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">

                <!-- Alert accent bar -->
                <tr>
                  <td style="height:4px;background:${alertColor};font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Alert badge -->
                <tr>
                  <td style="padding:24px 32px 0;text-align:center;">
                    <div style="display:inline-block;background:rgba(245,158,11,0.1);border:1px solid ${alertColor}40;border-radius:20px;padding:6px 16px;">
                      <span style="color:${alertColor};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${alertIcon} День ${daysMissed} без занятий</span>
                    </div>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:20px 32px 0;text-align:center;">
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#f8fafc;line-height:1.2;">${escapeHtml(t.greeting(firstName ?? undefined))}</h1>
                  </td>
                </tr>

                <!-- Points widget -->
                <tr>
                  <td style="padding:24px 32px;">
                    <div style="background:#0f172a;border-radius:16px;border:1px solid rgba(255,255,255,0.06);padding:20px 24px;text-align:center;">
                      <div style="font-size:12px;font-weight:600;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(t.pointsLabel)}</div>
                      <div style="font-size:48px;font-weight:900;color:#f8fafc;line-height:1;margin-bottom:16px;">${points}<span style="font-size:20px;color:#64748b;font-weight:400;">/15</span></div>
                      ${buildPointsBar(points)}
                    </div>
                  </td>
                </tr>

                <!-- Body text -->
                <tr>
                  <td style="padding:0 32px 28px;">
                    <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;text-align:center;">${bodyText}</p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding:0 32px 32px;text-align:center;">
                    <a href="${utmUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 32px;letter-spacing:-0.2px;">${escapeHtml(t.ctaText)}</a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:16px 32px 20px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
                    <p style="margin:0;font-size:12px;color:#475569;">
                      Skily · <a href="${appUrl}" style="color:#6366f1;text-decoration:none;">skilyapp.com</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Unsubscribe -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0 0 6px;font-size:12px;color:#334155;">${escapeHtml(t.footerText)}</p>
              <a href="${appUrl}/unsubscribe?utm_source=email&type=points-reminder" style="font-size:11px;color:#334155;">${escapeHtml(t.unsubText)}</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Send via Resend ───────────────────────────────────────────────────────────

async function sendReminderEmail(
  to: string,
  lang: Lang,
  firstName: string | null,
  points: number,
  daysMissed: 1 | 2,
): Promise<{ ok: boolean; error?: string }> {
  const t = copy[lang];
  const subject = daysMissed === 1 ? t.subject1 : t.subject2;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: buildEmailHtml(lang, firstName, points, daysMissed, APP_URL),
    }),
  });

  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }
  return { ok: true };
}

// ── Main ──────────────────────────────────────────────────────────────────────

serve(async (req) => {
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createPooledSupabaseClient(SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const testEmail: string | undefined = body?.test_email;
    const dryRun: boolean               = body?.dry_run === true;

    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);

    // ── Кто попадает в окно напоминания ──────────────────────────────────────
    // last_daily_point_at = вчера (1 день пропуска) или позавчера (2 дня)
    // Только браузерные пользователи (telegram_id IS NULL)
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, license_points, last_daily_point_at, settings, language_code')
      .is('telegram_id', null)
      .in('last_daily_point_at', [yesterday, twoDaysAgo])
      .gt('license_points', 0);

    if (pErr) throw pErr;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No users in reminder window' }));
    }

    // Получаем email из auth.users
    const userIds = profiles.map((p: any) => p.user_id).filter(Boolean);
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of (authData?.users ?? [])) {
      if (u.email && !u.email.includes('telegram.auth') && !u.email.includes('@t.me')) {
        emailMap.set(u.id, u.email);
      }
    }

    // ── Test-режим ────────────────────────────────────────────────────────────
    if (testEmail) {
      const profile = profiles[0];
      const lang = getUserLang(profile);
      const pts  = profile.license_points ?? 12;
      if (dryRun) {
        return new Response(JSON.stringify({ ok: true, dry_run: true, lang, pts, would_send_to: testEmail }));
      }
      const result = await sendReminderEmail(testEmail, lang, profile.first_name, pts, 1);
      return new Response(JSON.stringify({ ok: result.ok, error: result.error, lang, pts }));
    }

    // ── Bulk-режим ────────────────────────────────────────────────────────────
    console.log(`[PointsReminder] ${profiles.length} candidates in window`);

    let sent = 0, skipped = 0, failed = 0;

    for (const profile of profiles) {
      const email = profile.user_id ? emailMap.get(profile.user_id) : undefined;
      if (!email) { skipped++; continue; }

      // Не отправляли сегодня?
      const lastSent = profile.settings?.points_reminder_sent_date;
      if (lastSent === today) { skipped++; continue; }

      const daysMissed = profile.last_daily_point_at === yesterday ? 1 : 2;
      const lang       = getUserLang(profile);
      const points     = profile.license_points ?? 12;

      if (dryRun) {
        console.log(`[PointsReminder] DRY RUN: ${email} day=${daysMissed} lang=${lang} pts=${points}`);
        sent++;
        continue;
      }

      const result = await sendReminderEmail(email, lang, profile.first_name, points, daysMissed as 1 | 2);

      if (result.ok) {
        sent++;
        const newSettings = { ...(profile.settings ?? {}), points_reminder_sent_date: today };
        await supabase.from('profiles').update({ settings: newSettings }).eq('id', profile.id);
        console.log(`[PointsReminder] ✅ ${email} day=${daysMissed} lang=${lang} pts=${points}`);
      } else {
        failed++;
        console.error(`[PointsReminder] ✗ ${email}: ${result.error}`);
      }

      await new Promise(r => setTimeout(r, 120)); // Resend rate limit
    }

    console.log(`[PointsReminder] Done: sent=${sent} skipped=${skipped} failed=${failed}`);
    return new Response(JSON.stringify({ ok: true, dry_run: dryRun, sent, skipped, failed, total: profiles.length }));

  } catch (err) {
    console.error('[PointsReminder] Fatal:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
