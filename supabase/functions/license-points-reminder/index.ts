// =====================================================
// License Points Reminder
// Отправляет email браузерным пользователям (без Telegram),
// у которых вчера или позавчера был последний вход.
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL     = 'Skily <noreply@skilyapp.com>';
const APP_URL        = 'https://skilyapp.com';
const LOGO_URL       = 'https://skilyapp.com/apple-touch-icon.png';

type Lang = 'ru' | 'es' | 'en';

interface DailyQuest { title: string; reward_sp: number; target_type: string; target_value: number; }
interface SeasonInfo  { id: number; name: string; daysLeft: number; }
interface UserStats   { dpXp: number; dpLevel: number; dpRank: number; }

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
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── i18n ─────────────────────────────────────────────────────────────────────

const copy: Record<Lang, {
  subject1: string; subject2: string;
  preheader1: string; preheader2: string;
  badge1: string; badge2: string;
  greeting: (name?: string) => string;
  whatArePoints: string;
  body1: (pts: number) => string;
  body2: (pts: number) => string;
  consequence: string;
  pointsLabel: string;
  ctaText: string;
  seasonTitle: (name: string, days: number) => string;
  seasonPrize: string;
  dpRankLabel: string; dpLevelLabel: string; dpSpLabel: string;
  leaderboardLink: string;
  questsTitle: string;
  questTargets: Record<string, (v: number) => string>;
  questsLink: string;
  footerText: string; unsubText: string;
}> = {
  ru: {
    subject1: '🚗 Зайди сегодня — иначе потеряешь балл в Skily',
    subject2: '⚡ Второй день пропуска — балл спишется снова',
    preheader1: 'Один раз зайти — и прогресс сохранится.',
    preheader2: 'Вчера ушёл балл. Сегодня ещё один, если не зайдёшь.',
    badge1: '☀️ День 1 — загляни на минутку',
    badge2: '⚡ День 2 — ещё не поздно',
    greeting: (n?: string) => n ? `${n}, твои баллы ждут тебя!` : 'Твои баллы ждут тебя!',
    whatArePoints: 'В Skily есть <b>шкала прогресса из 15 баллов</b> — как настоящая система баллов испанских прав. Каждый день занятий = +1 балл. Пропускаешь день — балл уходит.',
    body1: (pts) => `Сейчас у тебя <b>${pts}/15 баллов</b>. Если не зайдёшь сегодня — спишется 1. Не нужно много: пара вопросов или один дуэль — и балл твой.`,
    body2: (pts) => `Вчера ушёл 1 балл. Сегодня та же история, если не вернёшься. У тебя сейчас <b>${pts}/15</b>. Одна короткая сессия — и счётчик остановится.`,
    consequence: 'Когда баллы падают до нуля — шкала сбрасывается и ты теряешь уровень прогресса. Не критично, но обидно перед экзаменом.',
    pointsLabel: 'баллов прогресса',
    ctaText: 'Зайти в Skily →',
    seasonTitle: (name, days) => `🏁 ${name} — осталось ${days} дн.`,
    seasonPrize: '🎁 Топ-3 получают Skily Premium',
    dpRankLabel: 'Место', dpLevelLabel: 'Уровень', dpSpLabel: 'SP',
    leaderboardLink: 'Смотреть рейтинг →',
    questsTitle: '🎯 Задачи на сегодня',
    questTargets: {
      duels_won:          (v) => `Выиграй ${v} дуэль`,
      questions_answered: (v) => `Ответь на ${v} вопросов`,
      streak_days:        (v) => `${v} дней подряд`,
      tests_completed:    (v) => `Пройди ${v} тест`,
      xp_earned:          (v) => `Заработай ${v} XP`,
    },
    questsLink: 'Открыть задачи →',
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
    whatArePoints: 'En Skily tienes una <b>barra de progreso de 15 puntos</b> — igual que el sistema de puntos del carnet real. Un día de estudio = +1 punto. Si no entras, pierdes 1.',
    body1: (pts) => `Ahora tienes <b>${pts}/15 puntos</b>. Si no entras hoy, perderás 1. No hace falta mucho: un par de preguntas o un duelo — y el punto es tuyo.`,
    body2: (pts) => `Ayer perdiste 1 punto. Hoy lo mismo si no vuelves. Tienes <b>${pts}/15</b>. Una sesión corta y el contador se detiene.`,
    consequence: 'Cuando los puntos llegan a cero, la barra se reinicia y pierdes tu nivel de progreso. No es grave, pero duele antes del examen.',
    pointsLabel: 'puntos de progreso',
    ctaText: 'Entrar a Skily →',
    seasonTitle: (name, days) => `🏁 ${name} — ${days} días restantes`,
    seasonPrize: '🎁 Top 3 ganan Skily Premium',
    dpRankLabel: 'Posición', dpLevelLabel: 'Nivel', dpSpLabel: 'SP',
    leaderboardLink: 'Ver clasificación →',
    questsTitle: '🎯 Misiones de hoy',
    questTargets: {
      duels_won:          (v) => `Gana ${v} duelo`,
      questions_answered: (v) => `Responde ${v} preguntas`,
      streak_days:        (v) => `${v} días seguidos`,
      tests_completed:    (v) => `Completa ${v} test`,
      xp_earned:          (v) => `Gana ${v} XP`,
    },
    questsLink: 'Ver misiones →',
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
    whatArePoints: 'Skily has a <b>15-point progress bar</b> — modelled on the real Spanish driving licence system. Study daily = +1 point. Skip a day = −1 point.',
    body1: (pts) => `You have <b>${pts}/15 points</b> right now. Skip today and you'll lose 1. A few questions or a quick duel is enough to keep your streak alive.`,
    body2: (pts) => `You lost 1 point yesterday. Same again today if you don't come back. You're at <b>${pts}/15</b>. One short session stops the counter.`,
    consequence: 'When points reach zero, your bar resets and you lose your progress level. Not fatal — but frustrating right before an exam.',
    pointsLabel: 'progress points',
    ctaText: 'Open Skily →',
    seasonTitle: (name, days) => `🏁 ${name} — ${days} days left`,
    seasonPrize: '🎁 Top 3 win Skily Premium',
    dpRankLabel: 'Position', dpLevelLabel: 'Level', dpSpLabel: 'SP',
    leaderboardLink: 'View leaderboard →',
    questsTitle: '🎯 Today\'s missions',
    questTargets: {
      duels_won:          (v) => `Win ${v} duel`,
      questions_answered: (v) => `Answer ${v} questions`,
      streak_days:        (v) => `${v} days in a row`,
      tests_completed:    (v) => `Complete ${v} test`,
      xp_earned:          (v) => `Earn ${v} XP`,
    },
    questsLink: 'Open missions →',
    footerText: 'You\'re receiving this because you registered at Skily.',
    unsubText: 'Unsubscribe from reminders',
  },
};

// ── DB helpers ────────────────────────────────────────────────────────────────

async function loadDailyQuests(supabase: any, lang: Lang): Promise<DailyQuest[]> {
  const today = new Date().toISOString().split('T')[0];
  const field = lang === 'ru' ? 'title_ru' : lang === 'es' ? 'title_es' : 'title_en';
  const { data } = await supabase
    .from('season_challenges')
    .select('title_ru, title_es, title_en, reward_sp, target_type, target_value')
    .eq('challenge_type', 'daily').eq('is_active', true).gte('start_date', today)
    .order('reward_sp', { ascending: false }).limit(3);
  return (data || []).map((q: any) => ({ title: q[field] || q.title_ru || '', reward_sp: q.reward_sp || 0, target_type: q.target_type || '', target_value: q.target_value || 0 }));
}

async function loadSeasonInfo(supabase: any, lang: Lang): Promise<SeasonInfo | null> {
  const field = lang === 'ru' ? 'name_ru' : lang === 'es' ? 'name_es' : 'name_en';
  const { data } = await supabase.from('duel_pass_seasons').select('id,name_ru,name_es,name_en,end_date').eq('is_active', true).limit(1).single();
  if (!data) return null;
  const daysLeft = Math.max(0, Math.ceil((new Date(data.end_date).getTime() - Date.now()) / 86400000));
  return { id: data.id, name: data[field] || data.name_en || 'Season', daysLeft };
}

// ── Points bar ────────────────────────────────────────────────────────────────

function buildPointsBar(points: number): string {
  const max = 15, pct = Math.round((points / max) * 100);
  const color = points >= 10 ? '#22c55e' : points >= 6 ? '#f59e0b' : '#ef4444';
  const dots = Array.from({ length: max }, (_, i) =>
    `<td style="padding:0 2px;"><div style="width:13px;height:13px;border-radius:50%;background:${i < points ? color : '#e2e8f0'};">&nbsp;</div></td>`
  ).join('');
  return `
    <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>${dots}</tr></table>
    <div style="margin-top:10px;height:6px;border-radius:3px;background:#e2e8f0;overflow:hidden;">
      <div style="height:6px;border-radius:3px;background:${color};width:${pct}%;"></div>
    </div>`;
}

// ── Email HTML ────────────────────────────────────────────────────────────────

function buildEmailHtml(
  lang: Lang, firstName: string | null, points: number, daysMissed: 1 | 2,
  quests: DailyQuest[], season: SeasonInfo | null, stats: UserStats,
  appUrl: string, email: string = '',
): string {
  const t           = copy[lang];
  const badge       = daysMissed === 1 ? t.badge1 : t.badge2;
  const bodyText    = daysMissed === 1 ? t.body1(points) : t.body2(points);
  const accentColor = daysMissed === 1 ? '#f59e0b' : '#ef4444';
  const utmUrl      = `${appUrl}/dashboard?utm_source=email&utm_medium=points-reminder&utm_campaign=day${daysMissed}`;
  const unsubUrl    = `${appUrl}/unsubscribe?email=${encodeURIComponent(email)}&type=points-reminder&lang=${lang}`;
  const subject     = daysMissed === 1 ? t.subject1 : t.subject2;
  const preheader   = daysMissed === 1 ? t.preheader1 : t.preheader2;

  // Единый Season + Duel Pass блок
  const seasonBlock = season ? `
    <tr><td style="padding:16px 28px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%"
        style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a;border-radius:16px;overflow:hidden;">
        <!-- Season header -->
        <tr><td colspan="3" style="padding:13px 20px 12px;border-bottom:1px solid #fde68a;">
          <div style="font-size:13px;font-weight:800;color:#78350f;">${escapeHtml(t.seasonTitle(season.name, season.daysLeft))}</div>
        </td></tr>
        <!-- 3 stats — equal 33% columns -->
        <tr>
          <td width="33%" align="center" style="padding:14px 0 10px;border-right:1px solid #fde68a;">
            <div style="font-size:9px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${escapeHtml(t.dpRankLabel)}</div>
            <div style="font-size:24px;font-weight:900;color:#78350f;line-height:1;">#${stats.dpRank}</div>
          </td>
          <td width="33%" align="center" style="padding:14px 0 10px;border-right:1px solid #fde68a;">
            <div style="font-size:9px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${escapeHtml(t.dpLevelLabel)}</div>
            <div style="font-size:24px;font-weight:900;color:#78350f;line-height:1;">${stats.dpLevel}</div>
          </td>
          <td width="34%" align="center" style="padding:14px 0 10px;">
            <div style="font-size:9px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${escapeHtml(t.dpSpLabel)}</div>
            <div style="font-size:24px;font-weight:900;color:#78350f;line-height:1;">${stats.dpXp}</div>
          </td>
        </tr>
        <!-- Prize + link — seamlessly connected -->
        <tr><td colspan="3" style="padding:9px 20px 13px;border-top:1px solid #fde68a;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="font-size:12px;color:#92400e;">${escapeHtml(t.seasonPrize)}</td>
            <td align="right"><a href="${utmUrl}" style="font-size:12px;color:#b45309;text-decoration:none;font-weight:700;">${escapeHtml(t.leaderboardLink)}</a></td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>` : '';

  // Quests block
  const questRows = quests.map(q => {
    const desc = t.questTargets[q.target_type]?.(q.target_value) || q.title;
    return `<tr><td style="padding:0 0 10px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td valign="middle" style="font-size:13px;color:#334155;line-height:1.4;">${escapeHtml(desc)}</td>
        <td valign="middle" align="right" style="white-space:nowrap;padding-left:12px;">
          <span style="display:inline-block;background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700;color:#b45309;">+${q.reward_sp} SP</span>
        </td>
      </tr></table>
    </td></tr>`;
  }).join('');

  const questsBlock = quests.length > 0 ? `
    <tr><td style="padding:16px 28px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
        <tr><td style="padding:16px 18px 12px;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:800;color:#0f172a;">${escapeHtml(t.questsTitle)}</p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">${questRows}</table>
          <a href="${utmUrl}" style="font-size:12px;color:#6366f1;text-decoration:none;font-weight:600;">${escapeHtml(t.questsLink)}</a>
        </td></tr>
      </table>
    </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:32px 16px 40px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:20px;">
          <table border="0" cellpadding="0" cellspacing="0"><tr>
            <td valign="middle" style="padding-right:10px;">
              <img src="${LOGO_URL}" width="40" height="40" alt="Skily" style="display:block;border-radius:10px;"/>
            </td>
            <td valign="middle">
              <span style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">Skily</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Main Card -->
        <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">

            <!-- Accent bar -->
            <tr><td style="height:4px;background:${accentColor};font-size:0;line-height:0;">&nbsp;</td></tr>

            <!-- Badge -->
            <tr><td style="padding:24px 28px 0;text-align:center;">
              <div style="display:inline-block;background:rgba(245,158,11,0.08);border:1px solid ${accentColor}44;border-radius:20px;padding:5px 14px;">
                <span style="color:${accentColor};font-size:12px;font-weight:700;letter-spacing:0.05em;">${escapeHtml(badge)}</span>
              </div>
            </td></tr>

            <!-- Greeting -->
            <tr><td style="padding:14px 28px 0;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#0f172a;line-height:1.3;">${escapeHtml(t.greeting(firstName ?? undefined))}</h1>
            </td></tr>

            <!-- What are points -->
            <tr><td style="padding:14px 28px 0;">
              <div style="background:#f8fafc;border-radius:12px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#475569;line-height:1.65;">${t.whatArePoints}</p>
              </div>
            </td></tr>

            <!-- Points widget -->
            <tr><td style="padding:14px 28px 0;">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px 24px;text-align:center;">
                <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(t.pointsLabel)}</div>
                <div style="font-size:52px;font-weight:900;color:#0f172a;line-height:1;margin-bottom:14px;">${points}<span style="font-size:20px;color:#94a3b8;font-weight:400;">/15</span></div>
                ${buildPointsBar(points)}
              </div>
            </td></tr>

            <!-- Body text -->
            <tr><td style="padding:16px 28px 0;">
              <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;text-align:center;">${bodyText}</p>
            </td></tr>

            <!-- Consequence -->
            <tr><td style="padding:8px 28px 0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;font-style:italic;">${escapeHtml(t.consequence)}</p>
            </td></tr>

            <!-- CTA -->
            <tr><td style="padding:20px 28px 0;text-align:center;">
              <a href="${utmUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 36px;">${escapeHtml(t.ctaText)}</a>
            </td></tr>

            <!-- Season + Duel Pass block -->
            ${seasonBlock}

            <!-- Quests -->
            ${questsBlock}

            <!-- Card footer -->
            <tr><td style="padding:20px 28px 20px;border-top:1px solid #f1f5f9;margin-top:16px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Skily · <a href="${appUrl}" style="color:#6366f1;text-decoration:none;">skilyapp.com</a>
              </p>
            </td></tr>

          </table>
        </td></tr>

        <!-- Unsubscribe -->
        <tr><td align="center" style="padding-top:20px;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">${escapeHtml(t.footerText)}</p>
          <a href="${unsubUrl}" style="font-size:11px;color:#94a3b8;">${escapeHtml(t.unsubText)}</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Send ──────────────────────────────────────────────────────────────────────

async function sendReminderEmail(
  to: string, lang: Lang, firstName: string | null, points: number,
  daysMissed: 1 | 2, quests: DailyQuest[], season: SeasonInfo | null, stats: UserStats,
): Promise<{ ok: boolean; error?: string }> {
  const subject = daysMissed === 1 ? copy[lang].subject1 : copy[lang].subject2;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL, to: [to], subject,
      html: buildEmailHtml(lang, firstName, points, daysMissed, quests, season, stats, APP_URL, to),
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

// ── Main ──────────────────────────────────────────────────────────────────────

serve(async (req) => {
  const supabase = createPooledSupabaseClient(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const body        = await req.json().catch(() => ({}));
    const testEmail: string | undefined = body?.test_email;
    const dryRun: boolean               = body?.dry_run === true;

    const today      = new Date().toISOString().slice(0, 10);
    const yesterday  = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);

    // Активный сезон для ранга
    const { data: activeSeason } = await supabase
      .from('duel_pass_seasons').select('id').eq('is_active', true).limit(1).single();
    const activeSeasonId: number | null = activeSeason?.id ?? null;

    // Ранг по season_points текущего сезона — один запрос, вычисляем в памяти
    const seasonProgressMap = new Map<string, { sp: number; level: number }>();
    if (activeSeasonId) {
      const { data: allSp } = await supabase
        .from('user_season_progress').select('user_id, season_points, level').eq('season_id', activeSeasonId);
      for (const row of (allSp || [])) {
        seasonProgressMap.set(row.user_id, { sp: row.season_points ?? 0, level: row.level ?? 1 });
      }
    }
    const allSeasonPoints = Array.from(seasonProgressMap.values()).map(v => v.sp).sort((a, b) => b - a);
    const getDpRank = (sp: number) => allSeasonPoints.filter((x) => x > sp).length + 1;

    // ── Test-режим ────────────────────────────────────────────────────────────
    if (testEmail) {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const authUser = (authData?.users ?? []).find((u: any) => u.email?.toLowerCase() === testEmail.toLowerCase());

      let firstName: string | null = 'Test';
      let points = 15, dpXp = 0, dpLevel = 1;
      let lang: Lang = 'ru';
      let profileId: string | null = null;

      if (authUser) {
        const { data: p } = await supabase
          .from('profiles').select('id, first_name, license_points, settings, language_code')
          .eq('user_id', authUser.id).single();
        if (p) { profileId = p.id; firstName = p.first_name ?? firstName; points = p.license_points ?? points; lang = getUserLang(p); }
      }

      // Season progress for test user
      if (profileId && activeSeasonId) {
        const { data: sp } = await supabase
          .from('user_season_progress').select('season_points, level')
          .eq('user_id', profileId).eq('season_id', activeSeasonId).single();
        if (sp) { dpXp = sp.season_points ?? 0; dpLevel = sp.level ?? 1; }
      }

      const [quests, season] = await Promise.all([loadDailyQuests(supabase, lang), loadSeasonInfo(supabase, lang)]);
      const stats: UserStats = { dpXp, dpLevel, dpRank: getDpRank(dpXp) };

      if (dryRun) return new Response(JSON.stringify({ ok: true, dry_run: true, lang, pts: points, firstName, quests: quests.length, season: !!season, stats }));

      const result = await sendReminderEmail(testEmail, lang, firstName, points, 1, quests, season, stats);
      return new Response(JSON.stringify({ ok: result.ok, error: result.error, lang, pts: points, firstName, quests: quests.length }));
    }

    // ── Bulk-режим ────────────────────────────────────────────────────────────
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, license_points, last_daily_point_at, settings, language_code')
      .is('telegram_id', null)
      .in('last_daily_point_at', [yesterday, twoDaysAgo])
      .gt('license_points', 0);

    if (pErr) throw pErr;
    if (!profiles || profiles.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No users in reminder window' }));

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of (authData?.users ?? [])) {
      if (u.email && !u.email.includes('telegram.auth') && !u.email.includes('@t.me')) emailMap.set(u.id, u.email);
    }

    // Кэш квестов и сезона по языку
    const questsCache = new Map<Lang, DailyQuest[]>();
    const seasonCache = new Map<Lang, SeasonInfo | null>();
    const getQuests = async (l: Lang) => { if (!questsCache.has(l)) questsCache.set(l, await loadDailyQuests(supabase, l)); return questsCache.get(l)!; };
    const getSeason = async (l: Lang) => { if (!seasonCache.has(l)) seasonCache.set(l, await loadSeasonInfo(supabase, l)); return seasonCache.get(l)!; };

    console.log(`[PointsReminder] ${profiles.length} candidates`);
    let sent = 0, skipped = 0, failed = 0;

    for (const profile of profiles) {
      const email = profile.user_id ? emailMap.get(profile.user_id) : undefined;
      if (!email) { skipped++; continue; }
      if (profile.settings?.email_points_reminder_disabled || profile.settings?.email_all_disabled) { skipped++; continue; }
      if (profile.settings?.points_reminder_sent_date === today) { skipped++; continue; }

      const daysMissed = profile.last_daily_point_at === yesterday ? 1 : 2;
      const lang       = getUserLang(profile);
      const points     = profile.license_points ?? 12;
      const sp         = seasonProgressMap.get(profile.id);
      const dpXp       = sp?.sp ?? 0;
      const dpLevel    = sp?.level ?? 1;
      const stats: UserStats = { dpXp, dpLevel, dpRank: getDpRank(dpXp) };
      const [quests, season] = await Promise.all([getQuests(lang), getSeason(lang)]);

      if (dryRun) { console.log(`[PointsReminder] DRY RUN: ${email} day=${daysMissed} dpRank=${stats.dpRank}`); sent++; continue; }

      const result = await sendReminderEmail(email, lang, profile.first_name, points, daysMissed as 1 | 2, quests, season, stats);
      if (result.ok) {
        sent++;
        await supabase.from('profiles').update({ settings: { ...(profile.settings ?? {}), points_reminder_sent_date: today } }).eq('id', profile.id);
        console.log(`[PointsReminder] ✅ ${email} day=${daysMissed} dpRank=${stats.dpRank}/${totalPlayers}`);
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
