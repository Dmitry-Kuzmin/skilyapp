// =====================================================
// AI Handler for Telegram Bot (Gemini Integration)
// =====================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TelegramMessage } from "./types.ts";
import { SupportedLanguage } from "./translations.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

const getSystemPrompt = (country: string = 'spain', language: SupportedLanguage = 'ru'): string => {
  const languageName = language === 'ru' ? 'Russian' : language === 'en' ? 'English' : 'Spanish';
  
  const widgetRules = `
## UI WIDGET TAGS
Output these tags on a separate line. NEVER translate them. NEVER replace them with a URL or text link.

| Intent | Output tag |
|---|---|
| Show road sign | [WIDGET:SIGN:CODE] |
| TON payment / buy Premium | [WIDGET:TON:CONNECT] |
| Give badge/achievement | [WIDGET:MEME:BADGE:Name] |
| Premium CTA button | [WIDGET:CTA:PREMIUM:Text] |

### CRITICAL PAYMENT RULE:
When the user asks to pay, buy premium, pay with TON, or anything about payment → you MUST output [WIDGET:TON:CONNECT] on its own line. Do NOT output a link or URL instead.
`;

  return `You are Skily 💡, an elite AI mentor and assistant for the DGT driving exam prep and general traffic rules (ПДД).
Respond in ${languageName}.
${widgetRules}
Be friendly, encouraging, and use emojis. Keep your responses concise and accurate.
You can answer questions about traffic rules, the app (Skily), and the user's progress.

If the user asks about their stats/progress/coins/rating, you MUST use the provided tool "get_user_stats".
Your goal is to be a "premium co-pilot" for the student.
If the user wants to join or buy something, encourage them!
`;
};

async function sendChatAction(chatId: number, action: string) {
  try {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: action }),
    });
  } catch (e) {
    console.error('[sendChatAction] Error:', e);
  }
}

export async function handleAIChat(message: TelegramMessage, supabase: SupabaseClient, lang: SupportedLanguage) {
  const text = message.text || "";
  const chatId = message.chat.id;
  const telegramId = message.from?.id;

  if (!telegramId || !text) return;

  // 1. Показываем статус "печатает"
  await sendChatAction(chatId, 'typing');

  try {
    // 2. Получаем profile_id для инструментов
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, settings')
      .eq('telegram_id', telegramId)
      .maybeSingle();
      
    const country = profile?.settings?.country || 'spain';

    // 3. Вызываем Gemini
    const result = await callGemini(text, country, lang, supabase, profile?.id);

    if (!result) {
      throw new Error("Gemini returned null result");
    }

    // 4. Парсим теги для кнопок
    let cleanedResult = result;
    const buttons = [];
    
    if (cleanedResult.includes('[WIDGET:TON:CONNECT]')) {
      cleanedResult = cleanedResult.replace('[WIDGET:TON:CONNECT]', '').trim();
      buttons.push([{ text: "💎 Купить Premium", url: "https://t.me/skilyapp_bot/app?startapp=shop" }]);
    }
    
    const ctaMatch = cleanedResult.match(/\[WIDGET:CTA:PREMIUM:(.*?)\]/);
    if (ctaMatch) {
      cleanedResult = cleanedResult.replace(ctaMatch[0], '').trim();
      buttons.push([{ text: ctaMatch[1] || "🚀 В БОЙ", url: "https://t.me/skilyapp_bot/app" }]);
    }
    
    // Очистка всех остальных тегов [WIDGET:...] на всякий случай
    cleanedResult = cleanedResult.replace(/\[WIDGET:.*?\]/g, '').trim();

    // 5. Отправляем ответ
    if (cleanedResult) {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: cleanedResult,
          parse_mode: 'Markdown',
          reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined
        }),
      });
    }
  } catch (err) {
    console.error('[handleAIChat] Error:', err);
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: "😔 Извини, я немного задумался и не смог ответить. Попробуй еще раз чуть позже!",
      }),
    });
  }
}

async function callGemini(userText: string, country: string, language: SupportedLanguage, supabase: SupabaseClient, userId?: string) {
  if (!GEMINI_API_KEY) {
    console.error('[Gemini] No API Key found');
    return null;
  }

  const systemPrompt = getSystemPrompt(country, language);
  let currentContents: any[] = [{
    role: 'user',
    parts: [{ text: userText }]
  }];

  // Допускаем один круг tool_calling
  for (let iteration = 0; iteration < 2; iteration++) {
    const tools = userId ? [{
      functionDeclarations: [{
        name: "get_user_stats",
        description: "Returns user statistics (XP, level, coins, pass) and recent test results. MUST be called if asked about progress/coins/rating.",
      }]
    }] : undefined;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: currentContents,
        tools,
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini] Error:`, errorText);
      return null;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts;

    if (!parts) return null;

    const functionCallPart = parts.find((p: any) => p.functionCall);

    if (functionCallPart) {
      const functionCall = functionCallPart.functionCall;
      if (functionCall.name === 'get_user_stats') {
        console.log('[AI Bot] Tool Call: get_user_stats');
        
        // Получаем детальную статистику
        const { data: metrics } = await supabase.from('user_metrics').select('*').eq('user_id', userId).maybeSingle();
        const { data: profile } = await supabase.from('profiles').select('xp, coins, duel_pass_level').eq('id', userId).maybeSingle();
        
        const toolResult = {
          xp: profile?.xp || 0,
          coins: profile?.coins || 0,
          readiness: metrics?.readiness_level || 0,
          streak: metrics?.streak_days || 0,
          total_tests: metrics?.total_tests_completed || 0,
          level: profile?.duel_pass_level || 1
        };

        currentContents.push(candidate.content);
        currentContents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: 'get_user_stats',
              response: { name: 'get_user_stats', content: toolResult }
            }
          }]
        });
        continue;
      }
    }

    const textResult = parts.map((p: any) => p.text).join("");
    return textResult;
  }

  return null;
}
