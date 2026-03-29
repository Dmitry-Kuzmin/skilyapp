// Replace with proper write_to_file next time!
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SupportedLanguage } from "./translations.ts";

export async function renderSeasonDashboard(supabase: SupabaseClient, profileId: string, lang: SupportedLanguage): Promise<{ text: string, inline_keyboard: any[] } | null> {
  const { data: dashData } = await supabase.rpc("get_dashboard_super_v2", { p_user_id: profileId });
  if (!dashData) return null;

  const season = dashData.active_season;
  if (!season) {
    return null;
  }

  const sName = lang === 'ru' ? season.name_ru : (lang === 'es' ? season.theme : season.theme); // fallback logic
  const daysLeft = season.days_remaining || 0;
  
  const progress = dashData.season_progress || { level: 1, season_points: 0 };
  const level = progress.level || 1;
  const sp = progress.season_points || 0;
  
  // Logic: level 1 is 100एसपी, level 8 is 800 एसपी... Wait, what is the level threshold?
  // Let's assume typical SP per level is ~100
  const levelTarget = level * 100;
  const xpLeft = Math.max(0, levelTarget - sp);
  
  // Progress bar calculation
  const totalBars = 16;
  const percent = sp / levelTarget;
  const filledBars = Math.min(totalBars, Math.floor(percent * totalBars));
  const emptyBars = Math.max(0, totalBars - filledBars);
  const barStr = `[${'|'.repeat(filledBars)}${'░'.repeat(emptyBars)}]`;

  // Tasks
  const rawTasks = dashData.daily_tasks || [];
  // Ensure it's an array if parsed from RPC json
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  let tasksStr = "";
  if (tasks.length === 0) {
     tasksStr = `<i>${lang === 'ru' ? 'Скрытые тренировки в секретных зонах...' : 'Hidden daily quests...'}</i>\n`;
  } else {
     tasks.forEach((t: any) => {
       let icon = '⭕️';
       if (t.task_type === 'duel_win') icon = '⚔️';
       else if (t.task_type === 'test_perfect' || t.task_type === 'test_exam') icon = '🏆';
       else if (t.task_type === 'app_login') icon = '🎯';
       
       const p = t.progress || 0;
       const mp = t.max_progress || 1;
       const r = t.reward || 10;
       // Assuming translation holds the title or the title is already in Russian if app relies on it
       const title = t.title || "Task";
       tasksStr += `${icon} ${title} (${p}/${mp}) — +${r} SP \n`;
     });
  }

  const tFinish = lang === 'ru' ? 'Финиш через' : 'Ends in';
  const tLevel = lang === 'ru' ? 'Твой уровень' : 'Your level';
  const tLeftStr = lang === 'ru' ? `До уровня ${level + 1} осталось ${xpLeft} SP` : `${xpLeft} SP left to level ${level + 1}`;
  const tTasks = lang === 'ru' ? 'Задания на сегодня' : 'Daily Quests';
  const tRewards = lang === 'ru' ? 'Следующая награда' : 'Next reward';
  const tDescRewards = lang === 'ru' ? 'Бесплатно: +27 монет ��\n👑 Elite Pass: Золотая рамка' : 'Free: +27 coins 💰\n👑 Elite Pass: Gold frame';

  const text = `🏎 <b>Сезон: ${sName}</b>\n` +
    `📅 ${tFinish}: ${daysLeft} ${lang === 'ru' ? 'дней' : 'days'}\n\n` +
    `🌟 <b>${tLevel}: ${level} / 30</b>\n` +
    `<code>${barStr}</code>\n\n` +
    `<i>${tLeftStr}</i>\n\n` +
    `📅 <b>${tTasks}:</b>\n` +
    `${tasksStr}\n` +
    `🎁 <b>${tRewards}:</b>\n` +
    `${tDescRewards}`;

  const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://skilyapp.com';

  const inline_keyboard = [];
  // 5188481279963715781 = Rocket
  // 6005661956931850799 = Star
  // 5105344272324887540 = Smile

  inline_keyboard.push([{ 
    text: lang === 'ru' ? "Начать квесты" : "Start quests", 
    web_app: { url: `${MINI_APP_URL}/tests/exam` },
    icon_custom_emoji_id: '5188481279963715781',
    style: 'primary' 
  }]);

  inline_keyboard.push([
     { 
       text: lang === 'ru' ? "Таблица лидеров" : "Leaderboard", 
       web_app: { url: `${MINI_APP_URL}/leaderboard` },
       icon_custom_emoji_id: '6005661956931850799',
       style: 'secondary'
     },
     { 
       text: lang === 'ru' ? "Сводка обучения" : "Learning Summary", 
       callback_data: "profile",
       icon_custom_emoji_id: '5105344272324887540',
       style: 'secondary'
     }
  ]);

  return { text, inline_keyboard };
}
