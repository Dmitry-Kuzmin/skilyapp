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
  badge1: string;
  badge2: string;
  greeting: (name?: string) => string;
  whatArePoints: string;
  body1: (pts: number) => string;
  body2: (pts: number) => string;
  consequence: string;
  pointsLabel: string;
  ctaText: string;
  footerText: string;
  unsubText: string;
}> = {
  ru: {
    subject1: '🚗 Зайди сегодня — иначе потеряешь балл в Skily',
    subject2: '⚡ Второй день пропуска — балл спишется снова',
    preheader1: 'Один раз зайти — и прогресс сохранится.',
    preheader2: 'Вчера ушёл балл. Сегодня — ещё один, если не зайдёшь.',
    badge1: '☀️ День 1 — загляни на минутку',
    badge2: '⚡ День 2 — ещё не поздно',
    greeting: (n?: string) => n ? `${n}, твои баллы ждут тебя!` : 'Твои баллы ждут тебя!',
    whatArePoints:
      'В Skily есть <b>шкала прогресса из 15 баллов</b> — как настоящая система баллов испанских прав. Каждый день занятий = +1 балл. Пропускаешь день — балл уходит. Это помогает тебе учиться регулярно и не растерять знания перед экзаменом.',
    body1: (pts: number) =>
      `Сейчас у тебя <b>${pts}/15 баллов</b>. Если не зайдёшь сегодня — спишется 1. Не нужно много: пара вопросов или один дуэль — и балл твой.`,
    body2: (pts: number) =>
      `Вчера ушёл 1 балл. Сегодня та же история, если не вернёшься. У тебя сейчас <b>${pts}/15</b>. Одна короткая сессия — и счётчик остановится.`,
    consequence:
      'Когда баллы падают до нуля — шкала сбрасывается и ты теряешь свой уровень прогресса. Не критично, но обидно — особенно перед экзаменом.',
    pointsLabel: 'баллов прогресса',
    ctaText: 'Зайти в Skily →',
    footerText: 'Ты получаешь это, потому что зарегистрировался на Skily.',
    unsubText: 'Отписаться от напоминаний',
  },
  es: {
    subject1: '🚗 Entra hoy — o perderás un punto en Skily',
    subject2: '⚡ Segundo día sin estudiar — otro punto en riesgo',
    preheader1: 'Solo un momento en la app y tu progreso se mantiene.',
    preheader2: 'Ayer perdiste un punto. Hoy otro, si no entras.',
    badge1: '☀️ Día 1 — asómate un momento',
    badge2: '⚡ Día 2 — aún estás a tiempo',
    greeting: (n?: string) => n ? `${n}, ¡tus puntos te esperan!` : '¡Tus puntos te esperan!',
    whatArePoints:
      'En Skily tienes una <b>barra de progreso de 15 puntos</b> — igual que el sistema de puntos del carnet real. Un día de estudio = +1 punto. Si no entras, pierdes 1. Así te ayudamos a estudiar con regularidad y no perder ritmo antes del examen.',
    body1: (pts: number) =>
      `Ahora tienes <b>${pts}/15 puntos</b>. Si no entras hoy, perderás 1. No hace falta mucho: un par de preguntas o un duelo — y el punto es tuyo.`,
    body2: (pts: number) =>
      `Ayer perdiste 1 punto. Hoy lo mismo si no vuelves. Tienes <b>${pts}/15</b>. Una sesión corta y el contador se detiene.`,
    consequence:
      'Cuando los puntos llegan a cero, la barra se reinicia y pierdes tu nivel de progreso. No es grave, pero duele — sobre todo antes del examen.',
    pointsLabel: 'puntos de progreso',
    ctaText: 'Entrar a Skily →',
    footerText: 'Recibes esto porque te registraste en Skily.',
    unsubText: 'Cancelar recordatorios',
  },
  en: {
    subject1: '🚗 Log in today — or lose a point in Skily',
    subject2: '⚡ Day 2 without practice — another point at risk',
    preheader1: 'Just one visit to the app keeps your progress safe.',
    preheader2: 'You lost a point yesterday. Today another, if you don\'t log in.',
    badge1: '☀️ Day 1 — just a quick check-in',
    badge2: '⚡ Day 2 — still not too late',
    greeting: (n?: string) => n ? `${n}, your points are waiting!` : 'Your points are waiting!',
    whatArePoints:
      'Skily has a <b>15-point progress bar</b> — modelled on the real Spanish driving licence system. Study daily = +1 point. Skip a day = −1 point. It keeps you on track and consistent before your exam.',
    body1: (pts: number) =>
      `You have <b>${pts}/15 points</b> right now. Skip today and you'll lose 1. You don't need much — a few questions or a quick duel keeps the streak alive.`,
    body2: (pts: number) =>
      `You lost 1 point yesterday. Same again today if you don't come back. You're at <b>${pts}/15</b>. One short session and the counter stops.`,
    consequence:
      'When points reach zero, your bar resets and you lose your progress level. Not the end of the world — but frustrating right before an exam.',
    pointsLabel: 'progress points',
    ctaText: 'Open Skily →',
    footerText: 'You\'re receiving this because you registered at Skily.',
    unsubText: 'Unsubscribe from reminders',
  },
};

// ── Points bar ────────────────────────────────────────────────────────────────

function buildPointsBar(points: number): string {
  const max = 15;
  const pct = Math.round((points / max) * 100);
  const color = points >= 10 ? '#22c55e' : points >= 6 ? '#f59e0b' : '#ef4444';
  const dots = Array.from({ length: max }, (_, i) => {
    const filled = i < points;
    return `<td style="padding:0 2px;">
      <div style="width:13px;height:13px;border-radius:50%;background:${filled ? color : 'rgba(255,255,255,0.1)'};">&nbsp;</div>
    </td>`;
  }).join('');

  return `
    <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>${dots}</tr>
    </table>
    <div style="margin-top:10px;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;">
      <div style="height:6px;border-radius:3px;background:${color};width:${pct}%;"></div>
    </div>`;
}

// ── Email HTML ────────────────────────────────────────────────────────────────

function buildEmailHtml(
  lang: Lang,
  firstName: string | null,
  points: number,
  daysMissed: 1 | 2,
  appUrl: string,
  email: string = '',
): string {
  const t = copy[lang];
  const subject    = daysMissed === 1 ? t.subject1 : t.subject2;
  const preheader  = daysMissed === 1 ? t.preheader1 : t.preheader2;
  const badge      = daysMissed === 1 ? t.badge1 : t.badge2;
  const bodyText   = daysMissed === 1 ? t.body1(points) : t.body2(points);
  const accentColor = daysMissed === 1 ? '#f59e0b' : '#ef4444';

  const utmUrl = `${appUrl}/dashboard?utm_source=email&utm_medium=points-reminder&utm_campaign=day${daysMissed}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

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

                <!-- Accent bar -->
                <tr>
                  <td style="height:4px;background:${accentColor};font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Badge -->
                <tr>
                  <td style="padding:24px 32px 0;text-align:center;">
                    <div style="display:inline-block;background:rgba(255,255,255,0.05);border:1px solid ${accentColor}55;border-radius:20px;padding:6px 16px;">
                      <span style="color:${accentColor};font-size:12px;font-weight:700;letter-spacing:0.06em;">${escapeHtml(badge)}</span>
                    </div>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:16px 32px 0;text-align:center;">
                    <h1 style="margin:0;font-size:22px;font-weight:800;color:#f8fafc;line-height:1.3;">${escapeHtml(t.greeting(firstName ?? undefined))}</h1>
                  </td>
                </tr>

                <!-- What are points explanation -->
                <tr>
                  <td style="padding:16px 32px 0;">
                    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:14px 18px;">
                      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.65;">${t.whatArePoints}</p>
                    </div>
                  </td>
                </tr>

                <!-- Points widget -->
                <tr>
                  <td style="padding:20px 32px 0;">
                    <div style="background:#0f172a;border-radius:16px;border:1px solid rgba(255,255,255,0.06);padding:20px 24px;text-align:center;">
                      <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(t.pointsLabel)}</div>
                      <div style="font-size:52px;font-weight:900;color:#f8fafc;line-height:1;margin-bottom:16px;">${points}<span style="font-size:20px;color:#475569;font-weight:400;">/15</span></div>
                      ${buildPointsBar(points)}
                    </div>
                  </td>
                </tr>

                <!-- Body text -->
                <tr>
                  <td style="padding:20px 32px 0;">
                    <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;text-align:center;">${bodyText}</p>
                  </td>
                </tr>

                <!-- Consequence -->
                <tr>
                  <td style="padding:12px 32px 0;">
                    <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;text-align:center;font-style:italic;">${escapeHtml(t.consequence)}</p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding:24px 32px 32px;text-align:center;">
                    <a href="${utmUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 36px;letter-spacing:-0.2px;">${escapeHtml(t.ctaText)}</a>
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

    const today      = new Date().toISOString().slice(0, 10);
    const yesterday  = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);

    // ── Test-режим: ищем профиль по email, чтобы показать реальные данные ─────
    if (testEmail) {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const authUser = (authData?.users ?? []).find((u: any) => u.email?.toLowerCase() === testEmail.toLowerCase());

      let firstName: string | null = 'Test';
      let points = 15;
      let lang: Lang = 'ru';

      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, license_points, settings, language_code')
          .eq('user_id', authUser.id)
          .single();

        if (profile) {
          firstName = profile.first_name ?? firstName;
          points    = profile.license_points ?? points;
          lang      = getUserLang(profile);
        }
      }

      console.log(`[PointsReminder] Test → ${testEmail} name=${firstName} pts=${points} lang=${lang}`);

      if (dryRun) {
        return new Response(JSON.stringify({ ok: true, dry_run: true, lang, pts: points, firstName }));
      }

      const result = await sendReminderEmail(testEmail, lang, firstName, points, 1);
      return new Response(JSON.stringify({ ok: result.ok, error: result.error, lang, pts: points, firstName }));
    }

    // ── Bulk-режим ────────────────────────────────────────────────────────────
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

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of (authData?.users ?? [])) {
      if (u.email && !u.email.includes('telegram.auth') && !u.email.includes('@t.me')) {
        emailMap.set(u.id, u.email);
      }
    }

    console.log(`[PointsReminder] ${profiles.length} candidates in window`);

    let sent = 0, skipped = 0, failed = 0;

    for (const profile of profiles) {
      const email = profile.user_id ? emailMap.get(profile.user_id) : undefined;
      if (!email) { skipped++; continue; }

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

      await new Promise(r => setTimeout(r, 120));
    }

    console.log(`[PointsReminder] Done: sent=${sent} skipped=${skipped} failed=${failed}`);
    return new Response(JSON.stringify({ ok: true, dry_run: dryRun, sent, skipped, failed, total: profiles.length }));

  } catch (err) {
    console.error('[PointsReminder] Fatal:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
