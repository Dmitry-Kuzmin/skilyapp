// =====================================================
// AI Handler for Telegram Bot (Gemini Integration)
// Features: Streaming via sendMessageDraft (Bot API 9.3+),
//           Styled buttons (Bot API 9.4+), Stars payments
// =====================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TelegramMessage } from "./types.ts";
import { SupportedLanguage } from "./translations.ts";
import { getSystemPrompt } from "../_shared/ai-prompts.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
// Always use Telegram Mini App deep link (not website)
const MINI_APP_BASE = "https://t.me/skilyapp_bot/skilyapp";
const MINI_APP_URL = MINI_APP_BASE; // kept for fallback buttons
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Unique draft_id counter (per-request, non-zero)
let draftCounter = 1;
function nextDraftId(): number {
  return draftCounter++;
}

// ── Send Message Draft (streaming partial text) ──────
async function sendDraft(chatId: number, draftId: number, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessageDraft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        draft_id: draftId,
        text: text.slice(0, 4096), // Telegram limit
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Parse Widget Tags → Styled Telegram Inline Buttons ──
function parseWidgetButtons(text: string): { cleanText: string; buttons: any[][]; sendStarsInvoice: boolean } {
  let cleaned = text;
  const buttons: any[][] = [];
  let sendStarsInvoice = false;

  // [WIDGET:STARS:PAY] — native Telegram Stars payment
  if (cleaned.includes('[WIDGET:STARS:PAY]')) {
    cleaned = cleaned.replace(/\[WIDGET:STARS:PAY\]/g, '').trim();
    sendStarsInvoice = true;
  }

  // [WIDGET:TON:CONNECT] — deep-link to wallet screen
  if (cleaned.includes('[WIDGET:TON:CONNECT]')) {
    cleaned = cleaned.replace(/\[WIDGET:TON:CONNECT\]/g, '').trim();
    buttons.push([
      { text: "👛 Подключить TON кошелёк", url: `${MINI_APP_BASE}?startapp=wallet`, style: "primary" },
    ]);
  }

  // [WIDGET:CTA:PREMIUM:Text]
  const ctaPremium = cleaned.match(/\[WIDGET:CTA:PREMIUM:(.*?)\]/);
  if (ctaPremium) {
    cleaned = cleaned.replace(ctaPremium[0], '').trim();
    buttons.push([{ text: `👑 ${ctaPremium[1]}`, url: `${MINI_APP_BASE}?startapp=premium`, style: "primary" }]);
  }

  // [WIDGET:CTA:TEST:Text]
  const ctaTest = cleaned.match(/\[WIDGET:CTA:TEST:(.*?)\]/);
  if (ctaTest) {
    cleaned = cleaned.replace(ctaTest[0], '').trim();
    buttons.push([{ text: `📝 ${ctaTest[1]}`, url: `${MINI_APP_BASE}?startapp=test`, style: "success" }]);
  }

  // [WIDGET:CTA:DUEL:Text]
  const ctaDuel = cleaned.match(/\[WIDGET:CTA:DUEL:(.*?)\]/);
  if (ctaDuel) {
    cleaned = cleaned.replace(ctaDuel[0], '').trim();
    buttons.push([{ text: `⚔️ ${ctaDuel[1]}`, url: `${MINI_APP_BASE}?startapp=duel`, style: "danger" }]);
  }

  // [WIDGET:CTA:APP:Text]
  const ctaApp = cleaned.match(/\[WIDGET:CTA:APP:(.*?)\]/);
  if (ctaApp) {
    cleaned = cleaned.replace(ctaApp[0], '').trim();
    buttons.push([{ text: `🚀 ${ctaApp[1]}`, url: MINI_APP_BASE, style: "primary" }]);
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
    const STARS_PAYMENT_URL = `${SUPABASE_URL}/functions/v1/telegram-stars-payment`;

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
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '⭐ Оплата Stars временно недоступна. Можно оплатить через приложение:',
          reply_markup: {
            inline_keyboard: [[{ text: '💎 Открыть магазин', url: `${MINI_APP_BASE}?startapp=shop`, style: "primary" }]],
          },
        }),
      });
      return;
    }

    const data = await response.json();

    if (data.invoice_link) {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `⭐ *Оплата через Telegram Stars*\n\n💎 Premium подписка — ${data.stars_amount} Stars\n🎁 Включает: X2 монеты, без рекламы, AI-наставник`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: `⭐ Оплатить ${data.stars_amount} Stars`, url: data.invoice_link, style: "success" }],
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

// ── Gemini Streaming API Call ────────────────────────
// Returns SSE stream from Gemini, or handles tool calls internally
// If tool call detected, resolves it and makes a second (non-streaming) request
async function callGeminiStreaming(
  userText: string,
  country: string,
  language: SupportedLanguage,
  supabase: SupabaseClient,
  chatId: number,
  userId?: string,
): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.error('[Gemini] No API Key found');
    return null;
  }

  const systemPrompt = getSystemPrompt({ country, language, context: 'bot' });
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

    // First iteration: try streaming. After tool call: use non-streaming (simpler)
    const useStreaming = iteration === 0;
    const endpoint = useStreaming
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(endpoint, {
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

    if (useStreaming) {
      // ── Stream SSE chunks → sendMessageDraft progressively ──
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let lastDraftTime = 0;
      const draftId = nextDraftId();
      const DRAFT_INTERVAL_MS = 400; // Update draft every 400ms
      let functionCallDetected: any = null;
      const allModelParts: any[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const chunk = JSON.parse(dataStr);
            const parts = chunk?.candidates?.[0]?.content?.parts;
            if (!parts) continue;

            for (const part of parts) {
              if (part.functionCall) {
                functionCallDetected = part.functionCall;
                allModelParts.push(part);
              } else if (part.text) {
                fullText += part.text;
                allModelParts.push(part);
              }
            }

            // Throttled draft updates — only send every DRAFT_INTERVAL_MS
            const now = Date.now();
            if (fullText.length > 0 && !functionCallDetected && (now - lastDraftTime >= DRAFT_INTERVAL_MS)) {
              // Strip widget tags from draft preview (they'd confuse users)
              const draftPreview = fullText.replace(/\[WIDGET:.*?\]/g, '').trim();
              if (draftPreview.length > 0) {
                sendDraft(chatId, draftId, draftPreview + ' ▍'); // cursor indicator
                lastDraftTime = now;
              }
            }
          } catch { /* skip malformed chunks */ }
        }
      }

      // Handle function call
      if (functionCallDetected && functionCallDetected.name === 'get_user_stats' && userId) {
        console.log('[AI Bot] 🛠 Tool Call: get_user_stats (streaming)');

        // Clear the draft
        sendDraft(chatId, draftId, '⏳ Загружаю твою статистику...');

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

        currentContents.push({
          role: 'model',
          parts: allModelParts,
        });
        currentContents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: 'get_user_stats',
              response: { name: 'get_user_stats', content: toolResult },
            }
          }]
        });
        continue; // Go to iteration 1 (non-streaming follow-up)
      }

      // Clear draft (Telegram removes it when final message arrives)
      // Send empty draft to clear
      sendDraft(chatId, draftId, '');

      return fullText || null;
    } else {
      // ── Non-streaming (for tool-call follow-up) ──
      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const parts = candidate?.content?.parts;
      if (!parts) return null;

      const textResult = parts.map((p: any) => p.text || '').join('');
      return textResult || null;
    }
  }

  return null;
}

// ── Send final message with buttons ──────────────────
async function sendFinalMessage(chatId: number, text: string, buttons: any[][]): Promise<void> {
  const sendResult = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
    }),
  });

  // If Markdown fails → retry plain text
  if (!sendResult.ok) {
    const errBody = await sendResult.text();
    if (errBody.includes("can't parse")) {
      console.warn('[AI Bot] Markdown parse failed, retrying as plain text');
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
        }),
      });
    }
  }
}

// ── Main Handler ─────────────────────────────────────
export async function handleAIChat(message: TelegramMessage, supabase: SupabaseClient, lang: SupportedLanguage) {
  const text = message.text || "";
  const chatId = message.chat.id;
  const telegramId = message.from?.id;

  if (!telegramId || !text) return;

  try {
    // Get profile for tools
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, settings')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    const country = profile?.settings?.country || 'spain';

    // Call Gemini with streaming (drafts appear progressively)
    const result = await callGeminiStreaming(text, country, lang, supabase, chatId, profile?.id);

    if (!result) {
      throw new Error("Gemini returned null result");
    }

    // Parse widget tags → styled inline buttons
    const { cleanText, buttons, sendStarsInvoice: shouldSendInvoice } = parseWidgetButtons(result);

    // Send final message (replaces draft)
    if (cleanText) {
      await sendFinalMessage(chatId, cleanText, buttons);
    }

    // Send Stars invoice if triggered
    if (shouldSendInvoice && telegramId) {
      await sendStarsInvoice(chatId, telegramId);
    }
  } catch (err) {
    console.error('[handleAIChat] Error:', err);

    // Retry once (non-streaming fallback)
    try {
      const retryResult = await callGeminiStreaming(text, 'spain', lang, supabase, chatId);

      if (retryResult) {
        const { cleanText, buttons, sendStarsInvoice: retrySendInvoice } = parseWidgetButtons(retryResult);
        if (cleanText) {
          await sendFinalMessage(chatId, cleanText, buttons);
          if (retrySendInvoice && telegramId) {
            await sendStarsInvoice(chatId, telegramId);
          }
          return;
        }
      }
    } catch (retryErr) {
      console.error('[handleAIChat] Retry also failed:', retryErr);
    }

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: "😔 Извини, я немного задумался и не смог ответить. Попробуй ещё раз чуть позже!",
        reply_markup: {
          inline_keyboard: [[{ text: "🚀 Открыть Skily", url: MINI_APP_BASE, style: "primary" }]],
        },
      }),
    });
  }
}
