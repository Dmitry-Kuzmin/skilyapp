// =====================================================
// Email Morning Routine — Ежедневный quiz по DGT на email
// 3 вопроса дня, красивый HTML, без ответов в письме.
// Ответ → клик → открытие приложения (retention hook).
//
// Bulk-режим:  вызов без test_email → все пользователи с real email
// Тест-режим:  вызов с test_email → один адрес
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL     = 'Skily <quiz@skilyapp.com>';
const APP_URL        = 'https://skilyapp.com';

type Lang = 'ru' | 'es' | 'en';

// ── Определение языка пользователя ──────────────────────────────────────────
function getUserLang(profile: any): Lang {
  // 1. Явный выбор языка в настройках приложения
  const settingsLang = profile?.settings?.language;
  if (settingsLang && ['ru', 'en', 'es'].includes(settingsLang)) return settingsLang as Lang;

  // 2. Telegram language_code
  const code = profile?.language_code?.toLowerCase()?.split('-')[0];
  if (code) {
    if (['ru', 'uk', 'be', 'kk'].includes(code)) return 'ru';
    if (['es', 'ca', 'gl'].includes(code)) return 'es';
    if (['en', 'de', 'fr', 'it', 'pt', 'nl'].includes(code)) return 'en';
  }

  // 3. Дефолт — испанский (большинство пользователей DGT)
  return 'es';
}

// ── Утилиты ────────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── i18n ────────────────────────────────────────────────────────────────────
const i18n: Record<Lang, {
  subject: string;
  preheader: string;
  tagline: string;
  questionOf: (n: number, total: number) => string;
  optionLabels: string[];
  ctaText: string;
  footerText: string;
  unsubText: string;
  greeting: (name?: string) => string;
  intro: string;
  questsTitle: string;
  questsSubtitle: string;
  seasonTitle: string;
  seasonSubtitle: (name: string, days: number) => string;
  seasonCta: string;
  seasonPrize1: string;
  seasonPrize2: string;
  seasonPrize3: string;
  questTargets: Record<string, (val: number) => string>;
}> = {
  es: {
    subject: '🚗 Tu quiz DGT del día — 3 preguntas nuevas',
    preheader: 'Practica y prepárate para el examen DGT. 3 preguntas de hoy.',
    tagline: 'QUIZ DEL DÍA',
    questionOf: (n, t) => `Pregunta ${n} de ${t}`,
    optionLabels: ['A', 'B', 'C', 'D'],
    ctaText: 'Ver respuesta →',
    footerText: 'Preparación para el examen de conducir DGT España',
    unsubText: 'No quieres recibir estos emails',
    greeting: (name) => name ? `¡Hola, ${name}!` : '¡Hola!',
    intro: 'Aquí tienes tus 3 preguntas de hoy. Piénsalas y luego comprueba las respuestas en la app.',
    questsTitle: '🎯 Misiones de hoy',
    questsSubtitle: 'Completa las misiones y gana SP para el ranking de la temporada',
    seasonTitle: '🏆 Temporada activa',
    seasonSubtitle: (name, days) => `${name} · Quedan ${days} días`,
    seasonCta: 'Ver mis recompensas →',
    seasonPrize1: '1er lugar: Premium gratis',
    seasonPrize2: '2do lugar: 500 monedas',
    seasonPrize3: '3er lugar: 250 monedas',
    questTargets: {
      tests_completed: (v) => `Completa ${v} tests hoy`,
      tests_perfect:   (v) => `${v} tests sin errores`,
      questions_answered: (v) => `Responde ${v} preguntas`,
      sp_earned:       (v) => `Gana ${v} SP hoy`,
      duels_won:       (v) => `Gana ${v} duelos`,
      duels_played:    (v) => `Juega ${v} duelos`,
    },
  },
  ru: {
    subject: '🚗 Твои 3 вопроса DGT на сегодня',
    preheader: 'Ежедневная практика — 3 новых вопроса экзамена DGT.',
    tagline: 'ВОПРОС ДНЯ',
    questionOf: (n, t) => `Вопрос ${n} из ${t}`,
    optionLabels: ['А', 'Б', 'В', 'Г'],
    ctaText: 'Посмотреть ответ →',
    footerText: 'Подготовка к экзамену по вождению DGT Испания',
    unsubText: 'Отписаться от рассылки',
    greeting: (name) => name ? `Привет, ${name}!` : 'Привет!',
    intro: 'Вот твои 3 вопроса на сегодня. Подумай — потом проверь ответы в приложении.',
    questsTitle: '🎯 Задачи на сегодня',
    questsSubtitle: 'Выполни задачи и заработай SP для рейтинга сезона',
    seasonTitle: '🏆 Активный сезон',
    seasonSubtitle: (name, days) => `${name} · Осталось ${days} дней`,
    seasonCta: 'Посмотреть награды →',
    seasonPrize1: '1 место: Premium бесплатно',
    seasonPrize2: '2 место: 500 монет',
    seasonPrize3: '3 место: 250 монет',
    questTargets: {
      tests_completed: (v) => `Пройди ${v} тестов`,
      tests_perfect:   (v) => `${v} тестов без ошибок`,
      questions_answered: (v) => `Ответь на ${v} вопросов`,
      sp_earned:       (v) => `Набери ${v} SP за день`,
      duels_won:       (v) => `Выиграй ${v} дуэлей`,
      duels_played:    (v) => `Сыграй ${v} дуэлей`,
    },
  },
  en: {
    subject: '🚗 Your 3 DGT questions for today',
    preheader: 'Daily practice — 3 new DGT exam questions.',
    tagline: 'DAILY QUIZ',
    questionOf: (n, t) => `Question ${n} of ${t}`,
    optionLabels: ['A', 'B', 'C', 'D'],
    ctaText: 'See answer →',
    footerText: 'DGT Spain driving exam preparation',
    unsubText: 'Unsubscribe from these emails',
    greeting: (name) => name ? `Hi, ${name}!` : 'Hi!',
    intro: 'Here are your 3 questions for today. Think them through, then check answers in the app.',
    questsTitle: '🎯 Today\'s missions',
    questsSubtitle: 'Complete missions to earn SP and climb the season leaderboard',
    seasonTitle: '🏆 Active season',
    seasonSubtitle: (name, days) => `${name} · ${days} days left`,
    seasonCta: 'View rewards →',
    seasonPrize1: '1st place: Premium free',
    seasonPrize2: '2nd place: 500 coins',
    seasonPrize3: '3rd place: 250 coins',
    questTargets: {
      tests_completed: (v) => `Complete ${v} tests`,
      tests_perfect:   (v) => `${v} perfect tests`,
      questions_answered: (v) => `Answer ${v} questions`,
      sp_earned:       (v) => `Earn ${v} SP today`,
      duels_won:       (v) => `Win ${v} duels`,
      duels_played:    (v) => `Play ${v} duels`,
    },
  },
};

// ── HTML Email Builder ──────────────────────────────────────────────────────
interface Question {
  id: string;
  text: string;
  image_url: string | null;
  options: string[];
}

interface DailyQuest {
  title: string;
  reward_sp: number;
  reward_coins: number;
  target_type: string;
  target_value: number;
}

interface SeasonInfo {
  name: string;
  days_remaining: number;
}

function buildEmailHtml(
  lang: Lang,
  firstName: string | null,
  questions: Question[],
  quests: DailyQuest[],
  season: SeasonInfo | null,
  appUrl: string,
): string {
  const t = i18n[lang];
  const today = new Date().toLocaleDateString(
    lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-ES' : 'en-US',
    { day: 'numeric', month: 'long' },
  );

  // ── Блок каждого вопроса ─────────────────────────────────────────────────
  const questionBlocks = questions.map((q, idx) => {
    const label = t.questionOf(idx + 1, questions.length);
    const imageBlock = q.image_url
      ? `<tr>
           <td style="padding:0 0 20px;">
             <img src="${escapeHtml(q.image_url)}"
               alt="Imagen de la pregunta" width="100%"
               style="display:block;border-radius:12px;max-height:220px;object-fit:cover;border:1px solid rgba(255,255,255,0.08);" />
           </td>
         </tr>`
      : '';

    const optionRows = q.options.map((opt, i) => {
      const letter = t.optionLabels[i] ?? String.fromCharCode(65 + i);
      return `<tr>
        <td style="padding:0 0 10px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td width="36" valign="top" style="padding-right:12px;">
              <div style="width:28px;height:28px;border-radius:8px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#818cf8;">${letter}</div>
            </td>
            <td valign="middle" style="font-size:14px;color:#cbd5e1;line-height:1.5;padding-top:4px;">${escapeHtml(opt)}</td>
          </tr></table>
        </td>
      </tr>`;
    }).join('');

    const divider = idx < questions.length - 1
      ? `<tr><td style="height:1px;background:rgba(255,255,255,0.07);" colspan="1">&nbsp;</td></tr><tr><td style="height:28px;"></td></tr>`
      : '';

    // CTA со ссылкой на конкретный вопрос
    const answerUrl = `${appUrl}/dashboard?morning_q=${encodeURIComponent(q.id)}&utm_source=email&utm_medium=daily_quiz`;

    return `
      <tr><td>
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr><td style="padding:0 0 14px;">
            <span style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:#818cf8;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(label)}</span>
          </td></tr>
          ${imageBlock}
          <tr><td style="font-size:16px;font-weight:700;color:#f1f5f9;line-height:1.5;padding:0 0 18px;">${escapeHtml(q.text)}</td></tr>
          ${optionRows}
          <tr><td style="padding:16px 0 0;">
            <table border="0" cellpadding="0" cellspacing="0"><tr>
              <td style="border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);">
                <a href="${answerUrl}" style="display:inline-block;padding:11px 24px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">${escapeHtml(t.ctaText)}</a>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>
      ${divider}
    `;
  }).join('');

  // ── Блок квестов ─────────────────────────────────────────────────────────
  const questRows = quests.slice(0, 3).map(q => {
    const desc = t.questTargets[q.target_type]?.(q.target_value) || q.title;
    return `<tr>
      <td style="padding:0 0 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td valign="middle" style="font-size:13px;color:#cbd5e1;line-height:1.4;">${escapeHtml(desc)}</td>
          <td valign="middle" align="right" style="white-space:nowrap;padding-left:12px;">
            <span style="display:inline-block;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.3);border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700;color:#fbbf24;">+${q.reward_sp} SP</span>
          </td>
        </tr></table>
      </td>
    </tr>`;
  }).join('');

  const questsBlock = quests.length > 0 ? `
    <!-- QUESTS SECTION -->
    <tr><td style="padding:0 32px 28px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:16px;">
        <tr><td style="padding:20px 20px 16px;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:#f1f5f9;">${escapeHtml(t.questsTitle)}</p>
          <p style="margin:0 0 16px;font-size:12px;color:#64748b;">${escapeHtml(t.questsSubtitle)}</p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            ${questRows}
          </table>
          <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="padding-top:8px;">
              <a href="${appUrl}/dashboard?utm_source=email&utm_medium=quests"
                style="display:inline-block;font-size:12px;color:#818cf8;text-decoration:none;font-weight:600;">
                Ir a la app →
              </a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  ` : '';

  // ── Блок сезона ──────────────────────────────────────────────────────────
  const seasonBlock = season ? `
    <!-- SEASON SECTION -->
    <tr><td style="padding:0 32px 32px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg,rgba(234,179,8,0.08),rgba(249,115,22,0.06));border:1px solid rgba(234,179,8,0.2);border-radius:16px;overflow:hidden;">
        <tr><td style="height:2px;background:linear-gradient(90deg,#f59e0b,#ef4444);" colspan="1">&nbsp;</td></tr>
        <tr><td style="padding:18px 20px 20px;">
          <p style="margin:0 0 2px;font-size:15px;font-weight:800;color:#f1f5f9;">${escapeHtml(t.seasonTitle)}</p>
          <p style="margin:0 0 16px;font-size:12px;color:#94a3b8;">${escapeHtml(t.seasonSubtitle(season.name, season.days_remaining))}</p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:0 0 8px;">
                <table border="0" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:20px;font-size:14px;padding-right:8px;">🥇</td>
                  <td style="font-size:13px;color:#fbbf24;font-weight:600;">${escapeHtml(t.seasonPrize1)}</td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 8px;">
                <table border="0" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:20px;font-size:14px;padding-right:8px;">🥈</td>
                  <td style="font-size:13px;color:#94a3b8;">${escapeHtml(t.seasonPrize2)}</td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 16px;">
                <table border="0" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:20px;font-size:14px;padding-right:8px;">🥉</td>
                  <td style="font-size:13px;color:#94a3b8;">${escapeHtml(t.seasonPrize3)}</td>
                </tr></table>
              </td>
            </tr>
          </table>
          <table border="0" cellpadding="0" cellspacing="0"><tr>
            <td style="border-radius:8px;background:rgba(234,179,8,0.15);border:1px solid rgba(234,179,8,0.3);">
              <a href="${appUrl}/dashboard?open=duel_pass&utm_source=email&utm_medium=season"
                style="display:inline-block;padding:9px 18px;font-size:12px;font-weight:700;color:#fbbf24;text-decoration:none;">${escapeHtml(t.seasonCta)}</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>${escapeHtml(t.subject)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader (hidden, shown in inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(t.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f172a;min-width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">

          <!-- ── Logo ── -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;">
                      <img src="${appUrl}/favicon.ico" width="28" height="28" alt="S" style="display:block;border-radius:6px;" />
                    </div>
                  </td>
                  <td valign="middle">
                    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Skily</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Main Card ── -->
          <tr>
            <td style="background:#1e293b;border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">

                <!-- Top accent bar -->
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#4f46e5,#7c3aed,#ec4899);font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Card header -->
                <tr>
                  <td style="padding:28px 32px 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <div style="display:inline-block;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:20px;padding:5px 13px;margin-bottom:16px;">
                            <span style="color:#818cf8;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">🚗 ${escapeHtml(t.tagline)} · ${escapeHtml(today)}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:22px;font-weight:800;color:#f8fafc;padding-bottom:8px;line-height:1.2;">${escapeHtml(t.greeting(firstName || undefined))}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#94a3b8;line-height:1.6;padding-bottom:28px;">${escapeHtml(t.intro)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding:0 32px;">
                    <div style="height:1px;background:rgba(255,255,255,0.07);"></div>
                  </td>
                </tr>

                <!-- Questions -->
                <tr>
                  <td style="padding:28px 32px 28px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      ${questionBlocks}
                    </table>
                  </td>
                </tr>

                <!-- Quests section -->
                ${questsBlock}

                <!-- Season section -->
                ${seasonBlock}

                <!-- Card footer -->
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

          <!-- ── Footer ── -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0 0 6px;font-size:12px;color:#334155;">${escapeHtml(t.footerText)}</p>
              <p style="margin:0;font-size:11px;color:#1e293b;">
                <a href="${appUrl}/unsubscribe?utm_source=email" style="color:#334155;text-decoration:underline;">${escapeHtml(t.unsubText)}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Загрузка квестов дня ────────────────────────────────────────────────────
async function loadDailyQuests(supabase: any, lang: Lang): Promise<DailyQuest[]> {
  const today = new Date().toISOString().split('T')[0];
  const titleField = lang === 'es' ? 'title_es' : lang === 'ru' ? 'title_ru' : 'title_en';

  const { data } = await supabase
    .from('season_challenges')
    .select('title_ru, title_es, title_en, reward_sp, reward_coins, target_type, target_value')
    .eq('challenge_type', 'daily')
    .eq('is_active', true)
    .gte('start_date', today)
    .order('reward_sp', { ascending: false })
    .limit(3);

  return (data || []).map((q: any) => ({
    title: q[titleField] || q.title_ru || '',
    reward_sp: q.reward_sp || 0,
    reward_coins: q.reward_coins || 0,
    target_type: q.target_type || '',
    target_value: q.target_value || 0,
  }));
}

// ── Загрузка активного сезона ───────────────────────────────────────────────
async function loadSeasonInfo(supabase: any, lang: Lang): Promise<SeasonInfo | null> {
  const nameField = lang === 'es' ? 'name_es' : lang === 'ru' ? 'name_ru' : 'name_en';

  const { data } = await supabase
    .from('duel_pass_seasons')
    .select('name_ru, name_es, name_en, end_date')
    .eq('is_active', true)
    .order('season_number', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(data.end_date).getTime() - Date.now()) / 86400000),
  );

  return {
    name: data[nameField] || data.name_ru || 'Season',
    days_remaining: daysRemaining,
  };
}

// ── Отправка письма через Resend ────────────────────────────────────────────
async function sendQuizEmail(
  to: string,
  lang: Lang,
  firstName: string | null,
  questions: Question[],
  quests: DailyQuest[],
  season: SeasonInfo | null,
): Promise<{ ok: boolean; error?: string }> {
  const t = i18n[lang];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: t.subject,
      html: buildEmailHtml(lang, firstName, questions, APP_URL),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err };
  }
  return { ok: true };
}

// ── Загрузка 3 вопросов дня ─────────────────────────────────────────────────
async function loadDailyQuestions(supabase: any, lang: Lang): Promise<Question[]> {
  const textField = lang === 'es' ? 'question_es' : lang === 'ru' ? 'question_ru' : 'question_es';
  const optField  = lang === 'es' ? 'text_es'     : lang === 'ru' ? 'text_ru'     : 'text_es';

  // Приоритет — вопросы с картинками
  const { data: withImg } = await supabase
    .from('questions_new')
    .select('id, question_ru, question_es, image_url')
    .eq('country', 'es')
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .limit(40);

  const pool = shuffle(withImg || []);

  // Добираем без картинок если мало
  if (pool.length < 6) {
    const { data: noImg } = await supabase
      .from('questions_new')
      .select('id, question_ru, question_es, image_url')
      .eq('country', 'es')
      .or('image_url.is.null,image_url.eq.')
      .limit(20);
    pool.push(...shuffle(noImg || []));
  }

  const result: Question[] = [];

  for (const q of pool) {
    if (result.length >= 3) break;

    const { data: opts, error } = await supabase
      .from('answer_options')
      .select('text_ru, text_es, is_correct')
      .eq('question_id', q.id)
      .order('position', { ascending: true });

    if (error || !opts || opts.length < 2) continue;
    if (!opts.some((o: any) => o.is_correct)) continue;

    result.push({
      text: stripHtml(q[textField] || q.question_ru || ''),
      image_url: q.image_url || null,
      options: opts.map((o: any) => stripHtml(o[optField] || o.text_ru || '')).filter(Boolean),
    });
  }

  return result;
}

// ── Main handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createPooledSupabaseClient(SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const testEmail: string | undefined = body?.test_email;
    const forceLang: Lang | undefined   = body?.lang;
    const dryRun: boolean               = body?.dry_run === true;

    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // ── ТЕСТ-РЕЖИМ ──────────────────────────────────────────────────────────
    if (testEmail) {
      console.log(`[EmailQuiz] Test mode → ${testEmail}`);
      const lang = forceLang ?? 'es';
      const questions = await loadDailyQuestions(supabase, lang);

      if (questions.length === 0) {
        return new Response(JSON.stringify({ ok: false, error: 'No questions found' }), { status: 500 });
      }

      if (dryRun) {
        return new Response(JSON.stringify({ ok: true, dry_run: true, questions: questions.length, lang }));
      }

      const result = await sendQuizEmail(testEmail, lang, 'Test User', questions);
      return new Response(JSON.stringify({ ok: result.ok, error: result.error, questions: questions.length, lang }));
    }

    // ── BULK-РЕЖИМ ──────────────────────────────────────────────────────────
    console.log('[EmailQuiz] Bulk mode — fetching users with real emails');

    // Получаем всех пользователей из auth.users (реальные email адреса)
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authUsers = authData?.users || [];

    // Фильтруем: только реальные email (не telegram.auth заглушки)
    const realEmailUsers = authUsers.filter(
      (u: any) => u.email && !u.email.includes('telegram.auth') && !u.email.includes('@t.me'),
    );

    console.log(`[EmailQuiz] Found ${realEmailUsers.length} users with real emails`);

    if (realEmailUsers.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No users with real emails' }));
    }

    // Загружаем профили для определения языка и защиты от дублей
    const userIds = realEmailUsers.map((u: any) => u.id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, settings, language_code')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Кэшируем вопросы по языку — не генерируем заново для каждого пользователя
    const questionsCache = new Map<Lang, Question[]>();

    const getQuestions = async (lang: Lang): Promise<Question[]> => {
      if (questionsCache.has(lang)) return questionsCache.get(lang)!;
      const qs = await loadDailyQuestions(supabase, lang);
      questionsCache.set(lang, qs);
      return qs;
    };

    let sent = 0, skipped = 0, failed = 0;

    for (const authUser of realEmailUsers) {
      const email = authUser.email as string;
      const profile = profileMap.get(authUser.id);

      // Защита от дублей — уже отправляли сегодня?
      const lastSent = profile?.settings?.email_quiz_sent_date;
      if (lastSent === todayStr) {
        skipped++;
        continue;
      }

      const lang = forceLang ?? getUserLang(profile ?? {});
      const questions = await getQuestions(lang);

      if (questions.length === 0) {
        console.error(`[EmailQuiz] No questions for lang=${lang}`);
        failed++;
        continue;
      }

      if (dryRun) {
        console.log(`[EmailQuiz] DRY RUN: would send to ${email} (lang=${lang})`);
        sent++;
        continue;
      }

      const result = await sendQuizEmail(email, lang, profile?.first_name ?? null, questions);

      if (result.ok) {
        sent++;
        // Сохраняем дату отправки чтобы не дублировать
        const updatedSettings = { ...(profile?.settings ?? {}), email_quiz_sent_date: todayStr };
        await supabase
          .from('profiles')
          .update({ settings: updatedSettings })
          .eq('id', authUser.id);
        console.log(`[EmailQuiz] ✅ ${email} (lang=${lang})`);
      } else {
        failed++;
        console.error(`[EmailQuiz] ✗ ${email}: ${result.error}`);
      }

      // Resend rate limit: 2 emails/sec на free плане, 10/sec на paid
      await new Promise(r => setTimeout(r, 120));
    }

    console.log(`[EmailQuiz] Done: sent=${sent} skipped=${skipped} failed=${failed}`);
    return new Response(JSON.stringify({
      ok: true,
      dry_run: dryRun,
      sent,
      skipped,
      failed,
      total: realEmailUsers.length,
    }));

  } catch (err) {
    console.error('[EmailQuiz] Fatal:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
