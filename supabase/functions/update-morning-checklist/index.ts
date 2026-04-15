// =====================================================
// Update Morning Checklist — Автообновление чеклиста
// =====================================================
// Вызывается из фронтенда когда квест-прогресс обновился
// Редактирует закреплённое сообщение в Telegram с новыми кнопками и таймером

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

type Lang = 'ru' | 'en' | 'es';

function getBotLang(profile: any): Lang {
  const code = profile?.language_code?.toLowerCase()?.split('-')[0];
  if (code) {
    if (['ru', 'uk', 'be', 'kk'].includes(code)) return 'ru';
    if (['es', 'ca', 'gl'].includes(code)) return 'es';
    if (['en', 'de', 'fr', 'it', 'pt', 'nl'].includes(code)) return 'en';
  }
  return 'ru';
}

function getTimeRemaining(lang: Lang): string {
  const now = new Date();
  const madridOffset = 2;
  const madridHour = (now.getUTCHours() + madridOffset) % 24;
  const madridMin = now.getUTCMinutes();
  const hoursLeft = 23 - madridHour;
  const minsLeft = 59 - madridMin;
  if (lang === 'ru') return `${hoursLeft}ч ${minsLeft}мин`;
  if (lang === 'es') return `${hoursLeft}h ${minsLeft}min`;
  return `${hoursLeft}h ${minsLeft}m`;
}

function buildChecklistText(quests: any[], lang: Lang): string {
  const day = new Date().getDate();
  const months: Record<Lang, string[]> = {
    ru: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    es: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
  };
  const m = months[lang][new Date().getMonth()];
  let totalSP = 0, done = 0;
  quests.forEach((q: any) => { totalSP += q.reward_sp || 0; if (q.is_completed) done++; });
  const allDone = done === quests.length;
  const tl = getTimeRemaining(lang);

  const lines: string[] = [];
  lines.push(lang === 'ru' ? `🗓 <b>Дейли-квесты · ${day} ${m}</b>` : `🗓 <b>Daily Quests · ${m} ${day}</b>`);
  lines.push(`⏰ ${lang === 'ru' ? 'До сброса' : 'Resets in'}: ${tl}`);
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  quests.forEach((q: any) => {
    const d = q.is_completed;
    const cur = q.current_progress || 0;
    const tgt = q.target_value || 1;
    const sp = q.reward_sp || 0;
    const title = q.title || q.quest_id || '???';
    if (d) {
      lines.push(`✅ <s>${title}</s>  <b>+${sp} SP</b> 🎉`);
      lines.push(`     ▰▰▰▰▰▰▰▰▰▰ ${tgt}/${tgt}`);
    } else if (cur > 0) {
      const ratio = Math.min(cur / Math.max(tgt, 1), 1);
      const filled = Math.round(ratio * 10);
      const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
      lines.push(`🔥 <b>${title}</b>  +${sp} SP`);
      lines.push(`     ${bar} ${cur}/${tgt} · ${Math.round(ratio * 100)}%`);
    } else {
      lines.push(`⬜ ${title}  +${sp} SP`);
      lines.push(`     ▱▱▱▱▱▱▱▱▱▱ 0/${tgt}`);
    }
    lines.push('');
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  if (allDone) {
    lines.push('');
    lines.push(`🏆 <b>ВСЕ ВЫПОЛНЕНО!</b>`);
    lines.push(`💎 Забери свои <b>${totalSP} SP</b> в приложении`);
  } else {
    const progressBar = Array.from({ length: quests.length }, (_, i) => quests[i].is_completed ? '🟢' : '⚫').join('');
    lines.push('');
    lines.push(`${progressBar}  ${done}/${quests.length}`);
    lines.push(`💰 На кону: <b>${totalSP} SP</b>`);
  }
  lines.push('');
  lines.push(`<i>🔄 ${new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</i>`);

  return lines.join('\n');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: corsHeaders });

    const supabase = createPooledSupabaseClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, telegram_id, language_code, settings')
      .eq('id', user_id)
      .single();

    if (!profile?.telegram_id) {
      return new Response(JSON.stringify({ error: 'no telegram_id' }), { status: 404, headers: corsHeaders });
    }

    let settings = profile.settings;
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch { settings = {}; }
    }

    const msgId = settings?.checklist_msg_id;
    const checklistDate = settings?.checklist_date;
    const today = new Date().toISOString().split('T')[0];

    if (!msgId || checklistDate !== today) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no checklist today' }));
    }

    const { data: quests } = await supabase
      .rpc('get_or_assign_daily_quests', { p_user_id: user_id });

    if (!quests || quests.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no quests' }));
    }

    const lang = getBotLang(profile);
    const text = buildChecklistText(quests, lang);

    const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_id,
        message_id: msgId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json();
    console.log(`[UpdateChecklist] ${profile.telegram_id}: ${response.ok ? 'updated' : result.description}`);

    return new Response(JSON.stringify({ success: response.ok, updated: true }));
  } catch (error: any) {
    console.error('[UpdateChecklist] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
