// =====================================================
// Поддержка курса DGT — ИИ-продавец + эскалация к менеджеру
// Triggered by: /start support
// =====================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TelegramMessage } from "./types.ts";
import { COURSE_KNOWLEDGE_BASE } from "../_shared/course-knowledge-base.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const ADMIN_CHAT_ID = parseInt(Deno.env.get("ADMIN_TELEGRAM_ID") || "488159880");

// ── Хелпер: отправить сообщение ─────────────────────
async function sendMsg(chatId: number, text: string, replyMarkup?: object): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
}

// ── Хелпер: typing indicator ─────────────────────────
async function sendTyping(chatId: number): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

// ── Хелпер: строим кнопки под ответом ───────────────
function buildButtons(opts: { enroll?: boolean; manager?: boolean } = {}) {
  const rows: object[][] = [];
  if (opts.enroll) {
    rows.push([{ text: "🎓 Хочу записаться!", callback_data: "course_start" }]);
  }
  if (opts.manager) {
    rows.push([{ text: "💬 Позвать менеджера", callback_data: "support_request_manager" }]);
  }
  rows.push([{ text: "🏠 Главное меню", callback_data: "main_menu" }]);
  return { inline_keyboard: rows };
}

// ── Загружаем актуальные цены из course_plans ────────
async function loadCoursePlans(supabase: SupabaseClient): Promise<string> {
  try {
    const { data: plans } = await supabase
      .from("course_plans")
      .select("label_ru, price_eur, original_price_eur, format, features, promo_label")
      .eq("active", true)
      .order("price_eur", { ascending: true });

    const { data: addons } = await supabase
      .from("course_addons")
      .select("label, price_group, price_individual")
      .eq("is_active", true);

    if (!plans || plans.length === 0) return "";

    let plansText = "\n## АКТУАЛЬНЫЕ ТАРИФЫ И ЦЕНЫ (ДАННЫЕ ИЗ БД — ИСПОЛЬЗУЙ ТОЛЬКО ЭХТИ ЦЕНЫ!)\n\n";
    for (const p of plans) {
      const formatLabel = p.format === "group" ? "Группа" : p.format === "mini_group" ? "Мини-группа" : "Индивидуально";
      const oldPrice = p.original_price_eur && p.original_price_eur > p.price_eur ? ` (Зачёркнуто: ${p.original_price_eur}€)` : "";
      plansText += `### ${p.label_ru} — ${p.price_eur}€${oldPrice} [${formatLabel}]\n`;
      if (p.promo_label) plansText += `🔥 Акция: ${p.promo_label}\n`;
      if (Array.isArray(p.features)) {
        for (const f of p.features) plansText += `• ${f}\n`;
      }
      plansText += "\n";
    }

    if (addons && addons.length > 0) {
      plansText += "### ДОПОЛНИТЕЛЬНЫЕ ОПЦИИ (аддоны)\n";
      for (const a of addons) {
        plansText += `• ${a.label}: группа — ${a.price_group}€, индивидуально — ${a.price_individual}€\n`;
      }
    }
    return plansText;
  } catch (err) {
    console.error("[CourseSupport] loadCoursePlans error:", err);
    return "";
  }
}

// ── Загружаем историю диалога ────────────────────────
async function loadHistory(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<{ role: string; parts: { text: string }[] }[]> {
  try {
    const { data } = await supabase
      .from("ai_chat_history")
      .select("role, content")
      .eq("user_id", userId)
      .eq("conversation_id", sessionId)
      .order("message_index", { ascending: true })
      .limit(20);

    if (!data || data.length === 0) return [];
    return data.map((h: { role: string; content: string }) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    }));
  } catch {
    return [];
  }
}

// ── Сохраняем сообщение в историю ───────────────────
async function saveHistory(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  index: number,
): Promise<void> {
  try {
    await supabase.from("ai_chat_history").insert({
      user_id: userId,
      role,
      content,
      conversation_id: sessionId,
      message_index: index,
      model_used: "gemini-3.1-flash-lite-preview",
    });
  } catch (err) {
    console.error("[CourseSupport] saveHistory error:", err);
  }
}

// ── Системный промпт продавца ────────────────────────
function buildSystemPrompt(plansFromDb: string, firstName: string): string {
  return `Ты — СТАРШИЙ КУРАТОР (Senior Advisor) курса Skilyapp в Испании. Твоя цель: ПРОДАТЬ курс.

ПРАВИЛО ХАЛЛЮЦИНАЦИЙ:
- Если ты не знаешь точного расписания (дни недели, часы), НЕ ПРИДУМЫВАЙ ИХ. 
- Честно ответь: "По поводу точного расписания на ближайший поток я сейчас уточню у менеджера, он ответит вам здесь в течение 15 минут".
- В этом случае ОБЯЗАТЕЛЬНО добавь тег: [WIDGET:MANAGER]

ИНСТРУКЦИИ ПО ДИАЛОГУ (КРИТИЧНО):
1. Если человек выбрал тариф (например, "Индивидуал") — СРАЗУ подтверждай: "Отличный выбор! Идем на Индивидуал (€799). Я уже вижу твой @username, данные передал. Для завершения брони выбери удобный способ оплаты ниже 👇"
2. Всегда добавляй [WIDGET:ENROLL] после выбора тарифа, чтобы юзер увидел кнопку оплаты.
3. Используй [WIDGET:MANAGER], если юзер злится, задает сложные технические вопросы или ты не знаешь ответа.

БАЗА ЗНАНИЙ КУРСА:
${COURSE_KNOWLEDGE_BASE}
${plansFromDb}

ЗАПРЕЩЕНО:
- Врать про даты и время занятий.
- Повторять вопросы, на которые уже есть ответ.`;
}

// ── Вызов Gemini 3.1 flash lite ─────────────────────
async function callGemini(
  chatId: number,
  systemPrompt: string,
  history: { role: string; parts: { text: string }[] }[],
  userText: string,
): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.error("[CourseSupport] GEMINI_API_KEY missing!");
    return null;
  }

  const model = "gemini-3.1-flash-lite-preview";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
  const contents = [...history, { role: "user", parts: [{ text: userText }] }];

  console.log(`[CourseSupport] Calling ${model}, history=${history.length} msgs`);

  try {
    await sendTyping(chatId);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          thinkingConfig: { include_thoughts: true },
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[CourseSupport] Gemini HTTP ${response.status}:`, errBody);
      return null;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const dataStr = line.slice(6);
        if (dataStr === "[DONE]") continue;
        try {
          const chunk = JSON.parse(dataStr);
          const parts = chunk?.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.thought) continue; // пропускаем мысли модели
            if (part.text) fullText += part.text;
          }
        } catch { /* skip */ }
      }
    }

    console.log(`[CourseSupport] OK text length=${fullText.length}`);
    return fullText || null;
  } catch (err) {
    console.error("[CourseSupport] Fetch error:", err);
    return null;
  }
}

// ── Парсинг виджетов ─────────────────────────────────
function parseWidgets(text: string): {
  clean: string;
  showEnroll: boolean;
  showManager: boolean;
  showButtons: boolean;
} {
  let clean = text;
  let showEnroll = false;
  let showManager = false;
  let showButtons = true; // по умолчанию показываем

  if (clean.includes("[WIDGET:ENROLL]")) {
    showEnroll = true;
    showButtons = false;
    clean = clean.replace(/\[WIDGET:ENROLL\]/g, "").trim();
  }
  if (clean.includes("[WIDGET:MANAGER]")) {
    showManager = true;
    showButtons = false;
    clean = clean.replace(/\[WIDGET:MANAGER\]/g, "").trim();
  }
  clean = clean.replace(/\[WIDGET:BUTTONS\]/g, "").trim();

  return { clean, showEnroll, showManager, showButtons };
}

// ── Постобработка HTML ───────────────────────────────
function postprocess(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/__(.*?)__/g, "<u>$1</u>")
    .replace(/<ul>/g, "").replace(/<\/ul>/g, "")
    .replace(/<li>/g, "• ").replace(/<\/li>/g, "\n")
    .replace(/<p>/g, "").replace(/<\/p>/g, "\n\n")
    .replace(/<div>/g, "").replace(/<\/div>/g, "\n");
}

// ── PUBLIC: приветствие при входе в поддержку ────────
export async function handleCourseSupportStart(
  chatId: number,
  firstName: string,
): Promise<void> {
  const name = firstName || "друг";
  await sendMsg(
    chatId,
    `👋 <b>${name}, привет!</b>\n\n` +
    `Я помогу подобрать тариф курса и ответить на любые вопросы о получении прав в Испании.\n\n` +
    `<i>Напиши свой вопрос — и мы разберёмся вместе!</i>`,
    {
      inline_keyboard: [
        [{ text: "🎓 Сразу занять место", callback_data: "course_start" }],
        [{ text: "💬 Поговорить с менеджером", callback_data: "support_request_manager" }],
        [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
      ],
    },
  );
}

// ── PUBLIC: обработка каждого сообщения в режиме поддержки ──
// Теперь это просто обёртка над основным handleAIChat для консистентности истории и моделей
import { handleAIChat } from "./ai-handler.ts";

export async function handleCourseSupportMessage(
  message: TelegramMessage,
  supabase: SupabaseClient,
): Promise<void> {
  const user = message.from;
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, settings")
    .eq("telegram_id", user.id)
    .maybeSingle();

  const firstName = profile?.first_name || user.first_name || "друг";
  const username = user.username || "";
  const plansFromDb = await loadCoursePlans(supabase);

  // Инъектируем данные пользователя прямо в промпт, чтобы ИИ их не переспрашивал
  const userDataContext = `ДАННЫЕ ПОЛЬЗОВАТЕЛЯ (УЖЕ ЕСТЬ):
- Имя: ${firstName}
- Telegram Username: ${username ? `@${username}` : "не указан"}
- Telegram ID: ${user.id}

НИКОГДА НЕ СПРАШИВАЙ ИМЯ ИЛИ @USERNAME — ОНИ У ТЕБЯ УЖЕ ЕСТЬ В КОНТЕКСТЕ ВЫШЕ.`;

  const systemPrompt = buildSystemPrompt(plansFromDb, firstName) + "\n\n" + userDataContext;

  // Вызываем основной ИИ-движок с нашим кастомным промптом курса
  await handleAIChat(message, supabase, 'ru', { systemPromptSuffix: systemPrompt });
}

// ── PUBLIC: эскалация к менеджеру ────────────────────
export async function handleSupportRequestManager(
  chatId: number,
  userId: number,
  firstName: string,
  username: string | undefined,
  supabase: SupabaseClient,
  messageId?: number,
): Promise<void> {
  // Устанавливаем обычный support_mode, сбрасываем course_support_mode
  const { data: profileData } = await supabase
    .from("profiles")
    .select("settings")
    .eq("telegram_id", userId)
    .maybeSingle();

  const cur = (typeof profileData?.settings === "object" && profileData?.settings) as Record<string, unknown> ?? {};
  await supabase.from("profiles").update({
    settings: { ...cur, support_mode: true, course_support_mode: false, course_support_session: null },
  }).eq("telegram_id", userId);

  // Уведомляем менеджера
  const nameStr = firstName || "Пользователь";
  const usernameStr = username ? ` @${username}` : "";
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text:
        `🆘 <b>Запрос к менеджеру (курс DGT)</b>\n` +
        `👤 ${nameStr}${usernameStr}\n` +
        `💬 Пришёл через поддержку курса на сайте\n\n` +
        `<b>↩️ Ответь на это сообщение чтобы написать пользователю</b>\n` +
        `[user_chat_id:${chatId}]`,
      parse_mode: "HTML",
    }),
  });

  const confirmText =
    `✅ <b>Передали менеджеру!</b>\n\n` +
    `Ответим в этом чате в ближайшее время.\n` +
    `<i>Срочно? Пишите напрямую: @SkilySupport</i>`;

  if (messageId) {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: confirmText,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🏠 Главное меню", callback_data: "main_menu" }]] },
      }),
    });
  } else {
    await sendMsg(chatId, confirmText, {
      inline_keyboard: [[{ text: "🏠 Главное меню", callback_data: "main_menu" }]],
    });
  }
}
