// =====================================================
// AI Handler for Telegram Bot (Gemini Integration)
// =====================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TelegramMessage } from "./types.ts";
import { SupportedLanguage } from "./translations.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MINI_APP_URL = Deno.env.get("MINI_APP_URL") || "https://t.me/skilyapp_bot/app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ── System Prompt ────────────────────────────────────
const getSystemPrompt = (country: string = 'spain', language: SupportedLanguage = 'ru'): string => {
  const languageName = language === 'ru' ? 'Russian' : language === 'en' ? 'English' : 'Spanish';

  return `You are Skily 💡, an elite AI mentor and assistant for the DGT driving exam prep and general traffic rules (ПДД).
Respond in ${languageName}.

## UI WIDGET TAGS
Output these tags on a **separate line**. NEVER translate them. NEVER replace them with a URL or text link.

| When to use | Tag |
|---|---|
| User wants to pay quickly / buy coins / Premium (instant) | [WIDGET:STARS:PAY] |
| User wants to connect TON wallet / pay with crypto | [WIDGET:TON:CONNECT] |
| Encourage user to start a test | [WIDGET:CTA:TEST:Начать тест] |
| Encourage user to start a duel | [WIDGET:CTA:DUEL:Начать дуэль] |
| Link to the app (general) | [WIDGET:CTA:APP:Открыть Skily] |
| Show a road sign by code | [WIDGET:SIGN:CODE] |
| Give badge/achievement | [WIDGET:MEME:BADGE:Name] |
| Custom Premium CTA | [WIDGET:CTA:PREMIUM:Text] |

### CRITICAL RULES:
- When the user asks to pay, buy, or get Premium → output BOTH [WIDGET:STARS:PAY] and [WIDGET:TON:CONNECT].
- [WIDGET:STARS:PAY] sends a native Telegram Stars payment right in chat (no redirect!).
- [WIDGET:TON:CONNECT] opens the wallet screen in the Mini App for TON crypto payment.
- When user finishes a conversation about rules and seems ready → suggest [WIDGET:CTA:TEST:Проверить знания].
- When user is competitive or bored → suggest [WIDGET:CTA:DUEL:Сразиться в дуэли].
- You may combine text + up to TWO widget tags per message. Put tags at the END.
- Do NOT output a URL, always use tags.

Be friendly, encouraging, and use emojis. Keep your responses concise and accurate.
You can answer questions about traffic rules, the app (Skily), and the user's progress.

If the user asks about their stats/progress/coins/rating, you MUST use the provided tool "get_user_stats".
Your goal is to be a "premium co-pilot" for the student.
If the user wants to join or buy something, encourage them!
`;
};

// ── Typing Indicator (keeps alive every 4s) ──────────
function startTypingLoop(chatId: number): { stop: () => void } {
  let active = true;

  const send = () => {
    if (!active) return;
    fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    }).catch(() => {});
  };

  // Send immediately, then every 4s (Telegram typing expires after ~5s)
  send();
  const interval = setInterval(send, 4000);

  return {
    stop: () => {
      active = false;
      clearInterval(interval);
    },
  };
}

// ── Parse Widget Tags → Telegram Inline Buttons ──────
function parseWidgetButtons(text: string): { cleanText: string; buttons: any[][]; sendStarsInvoice: boolean } {
  let cleaned = text;
  const buttons: any[][] = [];
  let sendStarsInvoice = false;

  // [WIDGET:STARS:PAY] — native Telegram Stars payment (no button, handled separately)
  if (cleaned.includes('[WIDGET:STARS:PAY]')) {
    cleaned = cleaned.replace(/\[WIDGET:STARS:PAY\]/g, '').trim();
    sendStarsInvoice = true;
  }

  // [WIDGET:TON:CONNECT] — deep-link directly to wallet screen in Mini App
  if (cleaned.includes('[WIDGET:TON:CONNECT]')) {
    cleaned = cleaned.replace(/\[WIDGET:TON:CONNECT\]/g, '').trim();
    buttons.push([
      { text: "👛 Подключить TON кошелёк", url: `${MINI_APP_URL}?startapp=wallet` },
    ]);
  }

  // [WIDGET:CTA:PREMIUM:Text]
  const ctaPremium = cleaned.match(/\[WIDGET:CTA:PREMIUM:(.*?)\]/);
  if (ctaPremium) {
    cleaned = cleaned.replace(ctaPremium[0], '').trim();
    buttons.push([{ text: `👑 ${ctaPremium[1]}`, url: `${MINI_APP_URL}?startapp=premium` }]);
  }

  // [WIDGET:CTA:TEST:Text]
  const ctaTest = cleaned.match(/\[WIDGET:CTA:TEST:(.*?)\]/);
  if (ctaTest) {
    cleaned = cleaned.replace(ctaTest[0], '').trim();
    buttons.push([{ text: `📝 ${ctaTest[1]}`, url: `${MINI_APP_URL}?startapp=test` }]);
  }

  // [WIDGET:CTA:DUEL:Text]
  const ctaDuel = cleaned.match(/\[WIDGET:CTA:DUEL:(.*?)\]/);
  if (ctaDuel) {
    cleaned = cleaned.replace(ctaDuel[0], '').trim();
    buttons.push([{ text: `⚔️ ${ctaDuel[1]}`, url: `${MINI_APP_URL}?startapp=duel` }]);
  }

  // [WIDGET:CTA:APP:Text]
  const ctaApp = cleaned.match(/\[WIDGET:CTA:APP:(.*?)\]/);
  if (ctaApp) {
    cleaned = cleaned.replace(ctaApp[0], '').trim();
    buttons.push([{ text: `🚀 ${ctaApp[1]}`, url: MINI_APP_URL }]);
  }

  // Clean up any remaining widget tags
  cleaned = cleaned.replace(/\[WIDGET:.*?\]/g, '').trim();

  // Remove empty lines left by tag removal
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return { cleanText: cleaned, buttons, sendStarsInvoice };
}

// ── Send Stars Invoice directly in chat ──────────────
async function sendStarsInvoice(chatId: number, telegramId: number) {
  try {
    // Create invoice via telegram-stars-payment Edge Function
    const STARS_PAYMENT_URL = `${SUPABASE_URL}/functions/v1/telegram-stars-payment`;

    // First, find user profile to get user_id
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?telegram_id=eq.${telegramId}&select=id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    const profiles = await profileResponse.json();
    const userId = profiles?.[0]?.id;

    if (!userId) {
      console.error('[Stars] No profile found for telegram_id:', telegramId);
      return;
    }

    // Create invoice for premium_monthly package
    const response = await fetch(STARS_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        action: 'create_invoice',
        user_id: userId,
        package_key: 'premium_monthly',
        telegram_user_id: telegramId,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Stars] Invoice creation failed:', errText);
      // Fallback: send button to open shop in Mini App
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '⭐ Оплата Stars временно недоступна. Можно оплатить через приложение:',
          reply_markup: {
            inline_keyboard: [[{ text: '💎 Открыть магазин', url: `${MINI_APP_URL}?startapp=shop` }]],
          },
        }),
      });
      return;
    }

    const data = await response.json();

    if (data.invoice_link) {
      // Send the native Stars invoice as a button
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `⭐ *Оплата через Telegram Stars*\n\n💎 Premium подписка — ${data.stars_amount} Stars\n🎁 Включает: X2 монеты, без рекламы, AI-наставник`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: `⭐ Оплатить ${data.stars_amount} Stars`, url: data.invoice_link }],
            ],
          },
        }),
      });
      console.log(`[Stars] Invoice sent to chat ${chatId}: ${data.stars_amount} Stars`);
    }
  } catch (err) {
    console.error('[Stars] Error sending invoice:', err);
  }
}

// ── Main Handler ─────────────────────────────────────
export async function handleAIChat(message: TelegramMessage, supabase: SupabaseClient, lang: SupportedLanguage) {
  const text = message.text || "";
  const chatId = message.chat.id;
  const telegramId = message.from?.id;

  if (!telegramId || !text) return;

  // Start continuous typing indicator
  const typing = startTypingLoop(chatId);

  try {
    // Get profile for tools
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, settings')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    const country = profile?.settings?.country || 'spain';

    // Call Gemini (typing keeps going in background)
    const result = await callGemini(text, country, lang, supabase, profile?.id);

    // Stop typing before sending response
    typing.stop();

    if (!result) {
      throw new Error("Gemini returned null result");
    }

    // Parse widget tags → inline buttons
    const { cleanText, buttons, sendStarsInvoice: shouldSendInvoice } = parseWidgetButtons(result);

    // Send response
    if (cleanText) {
      const sendResult = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: cleanText,
          parse_mode: 'Markdown',
          reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
        }),
      });

      // If Markdown parsing fails, retry without parse_mode
      if (!sendResult.ok) {
        const errBody = await sendResult.text();
        if (errBody.includes("can't parse")) {
          console.warn('[handleAIChat] Markdown parse failed, retrying as plain text');
          await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: cleanText,
              reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
            }),
          });
        }
      }
    }

    // Send Stars invoice as a separate native message (if AI triggered payment)
    if (shouldSendInvoice && telegramId) {
      await sendStarsInvoice(chatId, telegramId);
    }
  } catch (err) {
    typing.stop();
    console.error('[handleAIChat] Error:', err);

    // Retry once before giving up
    const retryTyping = startTypingLoop(chatId);
    try {
      const retryResult = await callGemini(text, 'spain', lang, supabase);
      retryTyping.stop();

      if (retryResult) {
        const { cleanText, buttons, sendStarsInvoice: retrySendInvoice } = parseWidgetButtons(retryResult);
        if (cleanText) {
          await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: cleanText,
              parse_mode: 'Markdown',
              reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
            }),
          });
          if (retrySendInvoice && telegramId) {
            await sendStarsInvoice(chatId, telegramId);
          }
          return;
        }
      }
    } catch (retryErr) {
      retryTyping.stop();
      console.error('[handleAIChat] Retry also failed:', retryErr);
    }

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: "😔 Извини, я немного задумался и не смог ответить. Попробуй еще раз чуть позже!",
        reply_markup: {
          inline_keyboard: [[{ text: "🚀 Открыть Skily", url: MINI_APP_URL }]],
        },
      }),
    });
  }
}

// ── Gemini API Call ──────────────────────────────────
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

  // Allow one round of tool calling
  for (let iteration = 0; iteration < 2; iteration++) {
    const tools = userId ? [{
      functionDeclarations: [{
        name: "get_user_stats",
        description: "Returns user statistics (XP, level, coins, pass) and recent test results. MUST be called if asked about progress/coins/rating.",
      }]
    }] : undefined;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`, {
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
      console.error(`[Gemini] HTTP ${response.status} Error:`, errorText);
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

        const { data: metrics } = await supabase.from('user_metrics').select('*').eq('user_id', userId).maybeSingle();
        const { data: profile } = await supabase.from('profiles').select('xp, coins, duel_pass_level').eq('id', userId).maybeSingle();

        const toolResult = {
          xp: profile?.xp || 0,
          coins: profile?.coins || 0,
          readiness: metrics?.readiness_level || 0,
          streak: metrics?.streak_days || 0,
          total_tests: metrics?.total_tests_completed || 0,
          level: profile?.duel_pass_level || 1,
        };

        currentContents.push(candidate.content);
        currentContents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: 'get_user_stats',
              response: { name: 'get_user_stats', content: toolResult },
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
