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
const MINI_APP_URL = "https://skilyapp.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Unique draft_id counter (per-request, non-zero)
let draftCounter = 1;
function nextDraftId(): number {
  return draftCounter++;
}

// ── Get File Path from Telegram ──────
async function getFilePath(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const data = await res.json();
    return data.ok ? data.result.file_path : null;
  } catch {
    return null;
  }
}

// ── Download File and Convert to Base64 ──────
async function fileToBase64(filePath: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Safer chunked conversion to base64
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    
    // Gemini prefers 'image/jpeg' over 'image/jpg' or other variants
    const mimeType = 'image/jpeg'; 
    return { data: base64, mimeType };
  } catch (err) {
    console.error('[Vision] File download error:', err);
    throw err;
  }
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
        // Очищаем текст черновика от маркдаун-тегов для красоты в режиме "печатает..."
        text: text.slice(0, 4096).replace(/[*_#`[\]()]/g, ''),
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
      { text: "💎 Стать PRO / TON", web_app: { url: `${MINI_APP_URL}/dashboard?modal=boost-shop&initialTab=premium` }, style: "primary" },
    ]);
  }

  // [WIDGET:TON:PAY:amount:comment] — direct payment request
  const tonPay = cleaned.match(/\[WIDGET:TON:PAY:(.*?):(.*?)\]/);
  if (tonPay) {
    const amount = tonPay[1]; 
    cleaned = cleaned.replace(tonPay[0], '').trim();
    buttons.push([
      { text: `💎 Оплатить ${amount} TON`, web_app: { url: `${MINI_APP_URL}/dashboard?modal=ton-pay&amount=${amount}` }, style: "success" },
    ]);
  }

  // [WIDGET:SIGN:id] — road sign lookup
  const signWidget = cleaned.match(/\[WIDGET:SIGN:(.*?)\]/);
  if (signWidget) {
    const signId = signWidget[1];
    cleaned = cleaned.replace(signWidget[0], '').trim();
    buttons.push([
      { text: `🚦 Знак ${signId}`, web_app: { url: `${MINI_APP_URL}/road-signs?search=${signId}` }, style: "secondary" },
    ]);
  }

  // [WIDGET:CTA:TEST:label]
  const testCta = cleaned.match(/\[WIDGET:CTA:TEST:(.*?)\]/);
  if (testCta) {
    const label = testCta[1];
    cleaned = cleaned.replace(testCta[0], '').trim();
    buttons.push([
      { text: `📝 ${label}`, web_app: { url: `${MINI_APP_URL}/tests` }, style: "primary" },
    ]);
  }

  // [WIDGET:CTA:DUEL:label]
  const duelCta = cleaned.match(/\[WIDGET:CTA:DUEL:(.*?)\]/);
  if (duelCta) {
    const label = duelCta[1];
    cleaned = cleaned.replace(duelCta[0], '').trim();
    buttons.push([
      { text: `⚔️ ${label}`, web_app: { url: `${MINI_APP_URL}/games/duel` }, style: "primary" },
    ]);
  }

  // [WIDGET:CTA:APP:label]
  const appCta = cleaned.match(/\[WIDGET:CTA:APP:(.*?)\]/);
  if (appCta) {
    const label = appCta[1];
    cleaned = cleaned.replace(appCta[0], '').trim();
    buttons.push([
      { text: `🚀 ${label}`, url: `${MINI_APP_BASE}`, style: "primary" },
    ]);
  }

  // [WIDGET:CTA:PREMIUM:label]
  const premiumCta = cleaned.match(/\[WIDGET:CTA:PREMIUM:(.*?)\]/);
  if (premiumCta) {
    const label = premiumCta[1];
    cleaned = cleaned.replace(premiumCta[0], '').trim();
    buttons.push([
      { text: `💎 ${label}`, url: `${MINI_APP_BASE}?startapp=premium`, style: "success" },
    ]);
  }

  return { cleanText: cleaned, buttons, sendStarsInvoice };
}

// ── Stars Invoice Handler ───────────────────────────
async function sendStarsInvoice(chatId: number, telegramId: number) {
  try {
    const packages = [
      { key: 'premium_month', label: '1 месяц Premium', price: 99 },
      { key: 'premium_3months', label: '3 месяца Premium', price: 249 },
      { key: 'premium_6months', label: '6 месяцев Premium', price: 449 },
      { key: 'premium_year', label: '1 год Premium', price: 799 },
    ];

    const invoiceButtons: any[] = [];
    
    for (const pkg of packages) {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-stars-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          action: 'create_invoice',
          user_id: userId || '',
          package_key: pkg.key,
          telegram_user_id: telegramId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.invoice_link) {
          invoiceButtons.push({
            text: `⭐ ${pkg.label} (${data.stars_amount} ⭐️)`,
            url: data.invoice_link
          });
        }
      }
    }

    if (invoiceButtons.length > 0) {
      const rows = [];
      for (let i = 0; i < invoiceButtons.length; i += 2) {
        rows.push(invoiceButtons.slice(i, i + 2));
      }

      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🌟 <b>Выберите подходящий тариф Premium</b>\n\n🎁 Включает: X2 монеты, без рекламы, AI-наставник и расширенную статистику.`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: rows,
          },
        }),
      });
    }
  } catch (err) {
    console.error('[Stars] Error sending invoice:', err);
  }
}

// ── Gemini Streaming API Call ────────────────────────
async function callGeminiStreaming(
  userText: string,
  country: string,
  language: SupportedLanguage,
  supabase: SupabaseClient,
  chatId: number,
  userId?: string,
  imageData?: { data: string; mimeType: string } | null,
  hasWallet?: boolean,
): Promise<{ text: string; model: string } | null> {
  if (!GEMINI_API_KEY) {
    console.error('[Gemini] No API Key found');
    return null;
  }

  const walletStatus = hasWallet ? "Wallet is ALREADY connected." : "Wallet is NOT connected yet - user must connect first.";
  const systemPrompt = getSystemPrompt({ country, language, context: 'bot' }) + 
    `\n\nUSER STATE: ${walletStatus}\n` +
    `PAYMENT INFO:\n` +
    `- Use [WIDGET:STARS:PAY] if user wants to pay with Telegram Stars (easiest for mobile).\n` +
    `- Use [WIDGET:TON:CONNECT] (if not connected) or [WIDGET:TON:PAY:amount:description] (if connected) for TON native payments.\n` +
    `- Mention that regular bank cards (Stripe/Paddle) are accepted inside our Mini App - use [WIDGET:CTA:PREMIUM:Открыть магазин] to direct them there.\n\n` +
    "IMPORTANT: Use ONLY Telegram-supported HTML tags: <b>bold</b>, <i>italic</i>, <u>underline</u>, <code>code</code>. \n" +
    "DO NOT use <ul>, <li>, <div> or <p> tags - they are NOT supported and will break the message. \n" +
    "For lists, use bullet point characters like '•' or emojis. Ensure the response is premium and visually spaced well with new lines.";
  const parts: any[] = [];
  
  if (imageData) {
    parts.push({
      inline_data: {
        mime_type: imageData.mimeType,
        data: imageData.data,
      }
    });
  }

  if (userText && userText.trim().length > 0) {
    parts.push({ text: userText });
  } else if (!imageData) {
    parts.push({ text: 'Привет' });
  }

  let currentContents: any[] = [];
  let conversationId = "00000000-0000-0000-0000-000000000000"; // Fallback

  // 1. Загружаем историю (контекст)
  if (userId) {
    try {
      const { data: history } = await supabase
        .from('ai_chat_history')
        .select('role, content, conversation_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6); // Последние 3 диалога

      if (history && history.length > 0) {
        conversationId = history[0].conversation_id;
        // Разворачиваем историю в правильном порядке
        const formattedHistory = history.reverse().map((h: any) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        }));
        currentContents.push(...formattedHistory);
      }
    } catch (err) {
      console.warn('[History] Error loading history:', err);
    }
  }

  // Добавляем текущее сообщение
  currentContents.push({ role: 'user', parts });

  const tools = (userId && !imageData) ? [{
    functionDeclarations: [{
      name: "get_user_stats",
      description: "Returns user statistics (XP, level, coins, pass) and recent test results. MUST be called if asked about progress/coins/rating.",
    }]
  }] : undefined;

  for (let iteration = 0; iteration < 2; iteration++) {
    let model = imageData ? "gemini-1.5-flash" : "gemini-3.1-flash-lite-preview";
    const useStreaming = iteration === 0;
    const effectiveTools = (imageData || !tools) ? undefined : tools;
    
    if (imageData && (!userText || userText.trim() === "")) {
      const defaultPrompt = "Что на этом фото? Проанализируй как дорожный инспектор DGT.";
      if (!currentContents[0].parts.some((p: any) => p.text)) {
        currentContents[0].parts.push({ text: defaultPrompt });
      }
    }

    const constructBody = (m: string) => ({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: currentContents,
      tools: effectiveTools,
      generationConfig: {
        temperature: imageData ? 0.7 : 0.4,
        maxOutputTokens: 2048,
        ...(m.includes('3.1') && !imageData && !effectiveTools ? { thinkingConfig: { include_thoughts: true } } : {})
      }
    });

    const getEndpoint = (m: string, stream: boolean) => {
      const baseUrl = "https://generativelanguage.googleapis.com/v1beta"; 
      const method = stream ? "streamGenerateContent?alt=sse" : "generateContent";
      const keyParam = method.includes('?') ? `&key=${GEMINI_API_KEY}` : `?key=${GEMINI_API_KEY}`;
      return `${baseUrl}/models/${m}:${method}${keyParam}`;
    };

    let response = await fetch(getEndpoint(model, useStreaming), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(constructBody(model)),
    });

    if (!response.ok && response.status === 404 && model === "gemini-1.5-flash") {
      console.warn(`[Gemini] Model 1.5-flash not found, falling back to 3.1-flash-lite`);
      model = "gemini-3.1-flash-lite-preview";
      response = await fetch(getEndpoint(model, useStreaming), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(constructBody(model)),
      });
    }

    if (!response.ok) {
      throw new Error(`Gemini ${model} HTTP ${response.status}: ${await response.text()}`);
    }

    if (useStreaming) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let lastDraftTime = 0;
      const draftId = nextDraftId();
      const DRAFT_INTERVAL_MS = 400;
      let functionCallDetected: any = null;
      const allModelParts: any[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
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

              const now = Date.now();
              if (fullText.length > 0 && !functionCallDetected && (now - lastDraftTime >= DRAFT_INTERVAL_MS)) {
                const draftPreview = fullText.replace(/\[WIDGET:.*?\]/g, '').trim();
                if (draftPreview.length > 0) {
                  await sendDraft(chatId, draftId, `${draftPreview} ▍`);
                  lastDraftTime = now;
                }
              }
            } catch { /* skip */ }
          }
        }

        if (functionCallDetected && functionCallDetected.name === 'get_user_stats' && userId) {
          await sendDraft(chatId, draftId, '⏳ Загружаю твою статистику...');
          // Унифицируем запросы по user_id
          const { data: metrics } = await supabase.from('user_metrics').select('*').eq('user_id', userId).maybeSingle();
          const { data: profile } = await supabase.from('profiles').select('xp, coins, duel_pass_level').eq('user_id', userId).maybeSingle();

          const toolResult = {
            xp: profile?.xp ?? 0,
            coins: profile?.coins ?? 0,
            readiness: metrics?.readiness_level ?? 0,
            streak: metrics?.streak_days ?? 0,
            total_tests: metrics?.total_tests_completed ?? 0,
            level: profile?.duel_pass_level ?? 1,
          };

          currentContents.push({ role: 'model', parts: allModelParts });
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

        await sendDraft(chatId, draftId, '');
        return { text: fullText, model };
      } catch (err) {
        console.error('[Streaming] Error:', err);
        return { text: fullText, model };
      }
    } else {
      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      const textResult = parts?.map((p: any) => p.text || '').join('') || '';
      return { text: textResult, model };
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
      parse_mode: 'HTML',
      reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
    }),
  });

  if (!sendResult.ok) {
    const errBody = await sendResult.text();
    if (errBody.includes("can't parse")) {
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

// ── Main Entry Point ─────────────────────────────────
export async function handleAIChat(message: TelegramMessage, supabase: SupabaseClient, lang: SupportedLanguage) {
  const telegramId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text || message.caption || "";
  let imageData: { data: string; mimeType: string } | null = null;

  try {
    if (message.photo && message.photo.length > 0) {
      const draftId = nextDraftId();
      try {
        await sendDraft(chatId, draftId, "📸 Анализирую фото...");
        const fileId = message.photo[message.photo.length - 1].file_id;
        const filePath = await getFilePath(fileId);
        
        if (filePath) {
          await sendDraft(chatId, draftId, "🧪 Обрабатываю...");
          imageData = await fileToBase64(filePath);
        } else {
          throw new Error("Telegram не предоставил путь к файлу.");
        }
        
        if (imageData) {
          await sendDraft(chatId, draftId, "🧬 Анализирую...");
        } else {
          throw new Error("Не удалось обработать бинарные данные картинки.");
        }
      } catch (e: any) {
        console.error('[Vision] Error:', e);
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ Ошибка Vision: ${e.message}`,
          }),
        });
      }
      await sendDraft(chatId, draftId, ""); 
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, settings, ton_wallet_address, user_id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    const country = profile?.settings?.country || 'spain';
    const hasWallet = !!profile?.ton_wallet_address;
    
    // Передаем профиль для получения истории внутри callGeminiStreaming
    const resultObj = await callGeminiStreaming(
      text, 
      country, 
      lang, 
      supabase, 
      chatId, 
      profile?.user_id, // Используем auth.users ID если есть
      imageData,
      hasWallet
    );

    if (!resultObj) {
      throw new Error("Gemini returned null result");
    }

    const { text: resultText, model: actualModel } = resultObj;

    // Сохраняем в историю в фоновом режиме (не ждем завершения для скорости ответа)
    if (profile?.user_id) {
      // Пытаемся найти последний conversation_id для этого юзера или создаем новый
      const convId = crypto.randomUUID(); 
      
      // Мы не знаем точно conversationId из стриминга здесь без доп. логики, 
      // но можем просто сохранить под новым если история была пуста, 
      // или передать его из callGeminiStreaming (что мы и сделаем).
      // Для простоты пока просто сохраняем факт диалога.
      supabase.from('ai_chat_history').insert([
        { 
          user_id: profile.user_id, 
          role: 'user', 
          content: text || (imageData ? "[Анализ фото]" : ""),
          conversation_id: convId, 
          message_index: 0,
          model_used: actualModel
        },
        { 
          user_id: profile.user_id, 
          role: 'assistant', 
          content: resultText,
          conversation_id: convId, 
          message_index: 1,
          model_used: actualModel
        }
      ]).then(({ error }) => {
        if (error) console.error('[History] Save error:', error);
      });
    }

    // Safety: Post-process to convert Markdown-style bold/italic to HTML
    let result = resultText;
    result = result
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **bold** -> <b>bold</b>
      .replace(/\*(.*?)\*/g, '<i>$1</i>')     // *italic* -> <i>italic</i>
      .replace(/__(.*?)__/g, '<u>$1</u>')     // __underline__ -> <u>underline</u>
      .replace(/<ul>/g, '').replace(/<\/ul>/g, '')
      .replace(/<li>/g, '• ').replace(/<\/li>/g, '\n')
      .replace(/<p>/g, '').replace(/<\/p>/g, '\n\n')
      .replace(/<div>/g, '').replace(/<\/div>/g, '\n');

    const { cleanText, buttons, sendStarsInvoice: shouldSendInvoice } = parseWidgetButtons(result);

    let processedText = cleanText.trim();
    
    // Final escaping check (basic) - ensure no unclosed tags or broken entities
    // but we trust the regex for now.

    if (processedText) {
      await sendFinalMessage(chatId, processedText, buttons);
    }

    if (shouldSendInvoice) {
      await sendStarsInvoice(chatId, telegramId);
    }
  } catch (err) {
    console.error('[AI Chat] Error:', err);
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: "😔 <b>Прости, я немного задумался и не смог ответить.</b>\nПопробуй повторить запрос ещё раз через секунду!",
        parse_mode: 'HTML',
      }),
    });
  }
}
