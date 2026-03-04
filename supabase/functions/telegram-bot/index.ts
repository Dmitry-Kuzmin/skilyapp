// =====================================================
// Telegram Bot - Main Webhook Handler
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  TelegramUpdate,
  TelegramCallbackQuery,
  TelegramInlineQuery,
  TelegramPreCheckoutQuery,
  AnswerCallbackQueryOptions,
  EditMessageTextOptions,
  TelegramMessage,
  TelegramUser
} from "./types.ts";
import * as commands from "./commands.ts";
import * as keyboards from "./keyboards.ts";
import { t, getUserLanguage, normalizeLanguage, SupportedLanguage, getDaysWord } from "./translations.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MINI_APP_URL = Deno.env.get("MINI_APP_URL") || "https://skilyapp.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log("[Bot] Initializing bot handler...");
console.log(`[Bot] MINI_APP_URL: ${MINI_APP_URL}`);

serve(async (req) => {
  try {
    if (req.method === "GET") {
      return new Response(JSON.stringify({ ok: true, bot: "SkilyBot" }), { headers: { "Content-Type": "application/json" } });
    }

    const update: TelegramUpdate = await req.json();
    console.log(`[Update] Received update_id: ${update.update_id}`);

    // =====================================================
    // ПЛАТЕЖИ: pre_checkout_query и successful_payment
    // КРИТИЧНО: Telegram ждёт ответ на pre_checkout за 10 сек!
    // Без этого — все платежи тихо отклоняются.
    // =====================================================
    if (update.pre_checkout_query) {
      await handlePreCheckoutQuery(update.pre_checkout_query);
    } else if (update.message?.successful_payment) {
      await handleSuccessfulPayment(update.message);
    } else if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.inline_query) {
      await handleInlineQuery(update.inline_query);
    }

    return new Response("OK", { status: 200 });
  } catch (error: unknown) {
    console.error("[Bot] Global Error:", error);
    return new Response("OK", { status: 200 });
  }
});

// =====================================================
// ОБРАБОТКА PRE-CHECKOUT (подтверждение платежа)
// Telegram ждёт ответ МАКСИМУМ 10 секунд!
// =====================================================
async function handlePreCheckoutQuery(query: TelegramPreCheckoutQuery) {
  console.log(`[PreCheckout] query_id=${query.id} payload=${query.invoice_payload}`);

  try {
    const STARS_PAYMENT_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-stars-payment`;
    const response = await fetch(STARS_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        action: 'pre_checkout_query',
        query_id: query.id,
        invoice_payload: query.invoice_payload,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[PreCheckout] Stars payment error: ${errText}`);
      // При ошибке — всё равно отвечаем OK чтобы не блокировать юзера
      await fetch(`${TELEGRAM_API}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_checkout_query_id: query.id, ok: true }),
      });
    } else {
      console.log(`[PreCheckout] Stars payment processed successfully`);
    }
  } catch (err: unknown) {
    console.error('[PreCheckout] Fatal error:', err);
    // Fallback: отвечаем OK чтобы Telegram не отклонял
    try {
      await fetch(`${TELEGRAM_API}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_checkout_query_id: query.id, ok: true }),
      });
    } catch (e: unknown) {
      console.error('[PreCheckout] Fallback answerPreCheckout failed:', e);
    }
  }
}

// =====================================================
// ОБРАБОТКА SUCCESSFUL PAYMENT (успешная оплата)
// =====================================================
async function handleSuccessfulPayment(message: TelegramMessage) {
  const payment = message.successful_payment!;
  console.log(`[SuccessfulPayment] charge_id=${payment.telegram_payment_charge_id} stars=${payment.total_amount}`);

  try {
    const STARS_PAYMENT_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-stars-payment`;
    const response = await fetch(STARS_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        action: 'successful_payment',
        invoice_payload: payment.invoice_payload,
        telegram_payment_charge_id: payment.telegram_payment_charge_id,
        total_amount: payment.total_amount,
        currency: payment.currency,
      }),
    });

    const result = await response.json();
    console.log(`[SuccessfulPayment] Result: success=${result.success} rewards=${result.rewards_status}`);

    // Отправляем пользователю сообщение об успехе
    if (message.chat?.id) {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: `🎉 *Оплата успешна!*\n\nСпасибо за поддержку! Ваши награды уже начислены.\n\n⭐ Потрачено: ${payment.total_amount} Stars`,
          parse_mode: 'Markdown',
        }),
      });
    }
  } catch (err: unknown) {
    console.error('[SuccessfulPayment] Fatal error:', err);
  }
}



async function handleMessage(message: TelegramMessage) {
  const text = message.text || "";
  const user = message.from;
  if (!user) {
    console.log("[handleMessage] No user data, skipping");
    return;
  }

  console.log(`[Message] @${user.username || user.id} text: "${text}"`);

  // Обворачиваем каждый этап в try-catch
  try {
    console.log("[Auth] Authenticating user...");
    await authenticateUser(user);
    console.log("[Auth] User authenticated successfully");
  } catch (authError: unknown) {
    console.error("[Auth] Error in authenticateUser:", authError);
    // Продолжаем, даже если аутентификация не удалась
  }

  if (text.startsWith("/")) {
    const parts = text.split(" ");
    const command = parts[0].toLowerCase().replace("/", "");
    console.log(`[Command] Executing: ${command}`);

    try {
      switch (command) {
        case "start":
          console.log("[Command] Calling handleStart...");
          await commands.handleStart(message, supabase);
          break;
        case "stats":
          await commands.handleStats(message, supabase);
          break;
        case "duel":
          await commands.handleDuel(message, supabase);
          break;
        case "streak":
          await commands.handleStreak(message, supabase);
          break;
        case "help":
          await commands.handleHelp(message, supabase);
          break;
        case "settings":
          await commands.handleSettings(message, supabase);
          break;
        case "tips":
          await commands.handleTips(message, supabase);
          break;
        default:
          console.log(`[Command] Unknown: ${command}`);
          await commands.sendMessage({
            chat_id: message.chat.id,
            text: "❓ Неизвестная команда. Списки команд: /help"
          });
      }
      console.log(`[Command] ${command} finished successfully`);
    } catch (cmdError: unknown) {
      console.error(`[Command] Fatal error in ${command}:`, cmdError);
      // Пытаемся отправить сообщение об ошибке пользователю
      try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            text: "❌ Произошла ошибка при выполнении команды. Мы уже знаем об этом и чиним!"
          })
        });
      } catch (e: unknown) {
        console.error("[Command] Failed to send error message:", e);
      }
    }
  } else {
    // Обработка не-команд (если нужно)
    console.log("[Message] Not a command, skipping");
  }
}

async function handleCallbackQuery(query: TelegramCallbackQuery) {
  const data = query.data || "";
  const user = query.from;
  const message = query.message;

  console.log(`[Callback] @${user.username || user.id} -> ${data}`);

  // Убираем часики сразу
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: query.id })
    });
  } catch (e: unknown) {
    console.error("[Callback] answerCallbackQuery failed:", e);
  }

  if (!message) return;

  try {
    const lang = await getUserLanguage(user.id, user.language_code, supabase);
    console.log(`[Callback] User language: ${lang}`);

    if (data === "main_menu") {
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: lang === 'es' ? '🏠 Menú Principal' : lang === 'en' ? '🏠 Main Menu' : '🏠 Главное меню',
        reply_markup: keyboards.getMainMenuKeyboard(lang)
      });
    }
    else if (data === "profile") {
      await showProfile(message.chat.id, user.id, lang);
    }
    else if (data === "duel_inline") {
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('duel.invite', lang),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: t('keyboard.challengeFriend', lang), switch_inline_query: (lang === 'en' ? 'duel' : lang === 'es' ? 'duelo' : 'дуэль') }],
            [{ text: t('keyboard.backToMenu', lang), callback_data: 'main_menu' }]
          ]
        }
      });
    }
    else if (data === "settings") {
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('settings.title', lang),
        reply_markup: keyboards.getSettingsKeyboard(lang)
      });
    }
    else if (data === "settings_language") {
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('keyboard.language', lang),
        reply_markup: keyboards.getLanguageKeyboard(lang)
      });
    }
    else if (data.startsWith("set_language_")) {
      const newLang = data.replace("set_language_", "");
      await supabase.from("profiles").update({ settings: { language: newLang } }).eq("telegram_id", user.id);
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('language.changed', newLang as SupportedLanguage),
        reply_markup: keyboards.getBackToMenuKeyboard(newLang as SupportedLanguage)
      });
    }
    else if (data === "tips_menu") {
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('tips.title', lang),
        reply_markup: keyboards.getTipsMenuKeyboard(lang)
      });
    }
  } catch (e: unknown) {
    console.error("[Callback] Error handling callback:", e);
  }
}

async function handleInlineQuery(query: TelegramInlineQuery) {
  try {
    console.log(`[Inline] @${query.from.username || query.from.id}: "${query.query}"`);

    const lang = normalizeLanguage(query.from.language_code);
    const duelCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const duelUrl = `${MINI_APP_URL}/games/duel?code=${duelCode}`;

    const results = [
      {
        type: "article",
        id: `duel_${duelCode}`,
        title: lang === 'en' ? "⚔️ Challenge to Duel" : lang === 'es' ? "⚔️ Retar a Duelo" : "⚔️ Вызвать на дуэль",
        description: lang === 'en' ? "Quick battle right now!" : "¡Batalla rápida ahora mismo!",
        input_message_content: {
          message_text: `⚔️ <b>${query.from.first_name}</b> ${t('inline.duel.title', lang)}\n\n${t('inline.duel.description', lang)}\n\n🆔 ${lang === 'ru' ? 'Код битвы' : 'Match ID'}: <code>${duelCode}</code>`,
          parse_mode: "HTML"
        },
        reply_markup: {
          inline_keyboard: [[{ text: t('inline.duel.button', lang), web_app: { url: duelUrl } }]]
        }
      }
    ];

    console.log(`[Inline] Sending answer with web_app URL: ${duelUrl}`);
    const response = await fetch(`${TELEGRAM_API}/answerInlineQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inline_query_id: query.id,
        results,
        cache_time: 0,
        is_personal: true
      })
    });

    if (!response.ok) {
      console.error("[Inline] answerInlineQuery error:", await response.json());
    } else {
      console.log("[Inline] Sent results successfully");
    }
  } catch (error: unknown) {
    console.error("[Inline] Fatal error:", error);
  }
}

async function showProfile(chatId: number, telegramId: number, lang: SupportedLanguage) {
  try {
    const { data: profile } = await supabase.from("profiles").select("id, first_name").eq("telegram_id", telegramId).maybeSingle();
    if (!profile) {
      console.log(`[Profile] No profile found for telegramId: ${telegramId}`);
      return;
    }

    const { data: metrics } = await supabase.from("user_metrics").select("*").eq("user_id", profile.id).maybeSingle();
    const userName = profile.first_name || "Pilot";
    const readiness = metrics?.readiness_level || 0;
    const streak = metrics?.streak_days || 0;

    const text = `👤 <b>${t('profile.title', lang)}</b>\n\n<b>${userName}</b>\n🎯 ${t('profile.readiness', lang)}: ${readiness}%\n🔥 ${t('profile.streak', lang)}: ${streak} ${getDaysWord(streak, lang)}\n\n<a href="${MINI_APP_URL}/dashboard">${t('profile.detailedStats', lang)}</a>`;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: keyboards.getQuickMenuKeyboard(lang),
        disable_web_page_preview: true
      })
    });
  } catch (error: unknown) {
    console.error("[Profile] Error showing profile:", error);
  }
}

async function authenticateUser(user: TelegramUser) {
  const profileData = {
    telegram_id: user.id,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    username: user.username || "",
    language_code: user.language_code || "ru",
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(profileData, { onConflict: "telegram_id" });

  if (error) {
    console.error("[Auth] Upsert error:", error);
    throw error;
  }
}

async function editMessage(options: EditMessageTextOptions) {
  try {
    const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options)
    });
    if (!response.ok) {
      console.error("[EditMessage] Error:", await response.json());
    }
  } catch (error: unknown) {
    console.error("[EditMessage] Fetch fatal error:", error);
  }
}
