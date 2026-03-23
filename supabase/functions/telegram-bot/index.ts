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
import { handleAIChat } from "./ai-handler.ts";

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
    } else if (update.poll_answer) {
      // Обработка ответа на quiz poll — ставим реакцию
      await handlePollAnswer(update.poll_answer);
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

  // Ставим реакцию на сообщение (Bot API 7.0+, best-effort)
  if (message.message_id && message.chat?.id) {
    const emoji = getReactionEmoji(text);
    setMessageReaction(message.chat.id, message.message_id, emoji).catch(() => {});
  }

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
        case "broadcast":
        case "post":
          await handleBroadcastCommand(message);
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
  } else if (text) {
    // Обработка не-команд через AI
    console.log("[Message] Not a command, calling AI...");
    try {
      const lang = await getUserLanguage(user.id, user.language_code, supabase);
      await handleAIChat(message, supabase, lang);
    } catch (aiError: unknown) {
      console.error("[AI] Error in handleAIChat:", aiError);
    }
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
    // Broadcast: подтверждение/отмена рассылки
    else if (data.startsWith("broadcast_confirm:")) {
      await executeBroadcast(message.chat.id, message.message_id, data);
    }
    else if (data === "broadcast_cancel") {
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "❌ Рассылка отменена.",
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

    // Реферальный режим: пользователь делится результатом дуэли через shareMessage
    const isReferral = query.query.startsWith('ref_');
    const refProfileId = isReferral ? query.query.replace('ref_', '') : null;

    let referralCard = null;
    if (isReferral && refProfileId) {
      const refStartUrl = `${MINI_APP_URL}/?start=ref_${refProfileId}`;
      const senderName = query.from.first_name || 'Игрок';
      referralCard = {
        type: "article",
        id: `ref_${refProfileId}_${Date.now()}`,
        title: lang === 'en'
          ? `⚔️ ${senderName} challenges you to a duel!`
          : `⚔️ ${senderName} вызывает тебя на дуэль по ПДД!`,
        description: lang === 'en'
          ? "Test your traffic rules knowledge in a real-time battle"
          : "Проверь знание ПДД в битве в реальном времени",
        thumbnail_url: "https://skilyapp.com/og-image.png",
        input_message_content: {
          message_text: lang === 'en'
            ? `⚔️ <b>${senderName}</b> is challenging you to a duel!\n\n🚗 Test your traffic rules knowledge and beat them!\n\n🏆 Play now and earn coins for your victory!`
            : `⚔️ <b>${senderName}</b> вызывает тебя на дуэль по ПДД!\n\n🚗 Докажи что знаешь правила лучше!\n\n🏆 Победи и получи монеты!`,
          parse_mode: "HTML"
        },
        reply_markup: {
          inline_keyboard: [[{
            text: lang === 'en' ? '⚔️ Accept the challenge!' : '⚔️ Принять вызов!',
            web_app: { url: refStartUrl }
          }]]
        }
      };
    }

    const results = [
      ...(referralCard ? [referralCard] : []),
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

// =====================================================
// РЕАКЦИИ НА СООБЩЕНИЯ (Bot API 7.0+)
// =====================================================
async function setMessageReaction(chatId: number, messageId: number, emoji: string) {
  try {
    await fetch(`${TELEGRAM_API}/setMessageReaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction: [{ type: 'emoji', emoji }],
        is_big: false
      })
    });
  } catch (e) {
    console.warn('[Reaction] Failed:', e);
  }
}

// ВАЖНО: Telegram разрешает только определённые эмодзи для реакций:
// 👍 👎 ❤️ 🔥 🥰 👏 😁 🤔 🤯 😱 🤬 😢 🎉 🤩 🤮 💩 🙏 👌 🕊 🤡 🥱 🥴 😍
// 🐳 ❤️‍🔥 🌚 🌭 💯 🤣 ⚡ 🍌 🏆 💔 🤨 😐 🍓 🍾 💋 🖕 😈 😴 😭 🤓 👻 👨‍💻
// 👀 🎃 🙈 😇 😨 🤝 ✍️ 🤗 🫡 🎅 🎄 ☃️ 💅 🤪 🗿 🆒 💘 🙉 🦄 😘 💊 🙊 😎 👾
function getReactionEmoji(text: string): string {
  const t = text.toLowerCase();
  if (t.startsWith('/start')) return '🎉';
  if (t.startsWith('/stats')) return '🤩';
  if (t.startsWith('/duel')) return '🔥';
  if (t.startsWith('/streak')) return '🔥';
  if (t.startsWith('/help')) return '❤️';
  if (t.startsWith('/settings')) return '👌';
  if (t.startsWith('/tips')) return '🤓';
  if (t.startsWith('/broadcast') || t.startsWith('/post')) return '⚡';
  if (t.includes('привет') || t.includes('здравствуй') || t.includes('hello') || t.includes('hola')) return '🤗';
  if (t.includes('спасибо') || t.includes('thank') || t.includes('gracias')) return '🙏';
  if (t.includes('круто') || t.includes('cool') || t.includes('genial')) return '💯';
  return '👍';
}

// =====================================================
// Poll Answer — Реакция на ответ в quiz
// =====================================================

async function handlePollAnswer(pollAnswer: any) {
  try {
    const user = pollAnswer.user;
    if (!user) return;

    console.log(`[PollAnswer] User ${user.id} answered poll`);

    // Telegram quiz mode автоматически показывает правильный/неправильный
    // Мы дополнительно ставим реакцию на сообщение с опросом

    // К сожалению, poll_answer не содержит chat_id и message_id
    // Реакции уже ставятся при отправке опроса из morning-routine
    // Здесь можно обновить статистику пользователя

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('telegram_id', user.id)
      .maybeSingle();

    if (profile) {
      // Обновляем прогресс daily quest (категория 'questions')
      await supabase.rpc('update_daily_quest_progress', {
        p_user_id: profile.id,
        p_category: 'questions',
        p_delta: 1,
      }).catch((e: any) => console.error('[PollAnswer] Quest progress error:', e));
    }
  } catch (error) {
    console.error('[PollAnswer] Error:', error);
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

// =====================================================
// BROADCAST — рассылка от админа
// =====================================================
// Использование:
// 1. /broadcast Текст сообщения → рассылает текст всем
// 2. Ответить на любое сообщение (фото/опрос/текст) командой /broadcast → пересылает всем
// 3. /post — алиас для /broadcast
// =====================================================

const ADMIN_TELEGRAM_IDS = [488159880]; // @guapo_pub

async function handleBroadcastCommand(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const userId = message.from?.id;

  // Проверка админа
  if (!userId || !ADMIN_TELEGRAM_IDS.includes(userId)) {
    await commands.sendMessage({
      chat_id: chatId,
      text: "⛔ Эта команда доступна только администраторам.",
    });
    return;
  }

  const text = (message.text || "").replace(/^\/(broadcast|post)\s*/i, "").trim();
  const replyMsg = message.reply_to_message;

  // Считаем получателей
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .not('telegram_id', 'is', null);

  const userCount = count || 0;

  if (replyMsg) {
    // Режим 2: пересылка сообщения (фото, опрос, текст, что угодно)
    await commands.sendMessage({
      chat_id: chatId,
      text: `📢 <b>Подтвердите рассылку</b>\n\nСообщение выше будет переслано <b>${userCount}</b> пользователям.\n\n⚠️ Это действие нельзя отменить!`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Отправить всем', callback_data: `broadcast_confirm:forward:${replyMsg.message_id}` },
          { text: '❌ Отмена', callback_data: 'broadcast_cancel' },
        ]]
      }
    });
  } else if (text) {
    // Режим 1: отправить текст
    await commands.sendMessage({
      chat_id: chatId,
      text: `📢 <b>Подтвердите рассылку</b>\n\nТекст:\n<i>${text.substring(0, 500)}</i>\n\nБудет отправлено <b>${userCount}</b> пользователям.`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Отправить всем', callback_data: `broadcast_confirm:text:0` },
          { text: '❌ Отмена', callback_data: 'broadcast_cancel' },
        ]]
      }
    });

    // Сохраняем текст для рассылки во временное хранилище (settings)
    await supabase
      .from('profiles')
      .update({ settings: { ...(await getAdminSettings()), _broadcast_text: text } })
      .eq('telegram_id', userId);
  } else {
    await commands.sendMessage({
      chat_id: chatId,
      text: `📢 <b>Как использовать /broadcast:</b>\n\n` +
        `1️⃣ <code>/broadcast Текст сообщения</code>\n   → Отправит текст всем пользователям\n\n` +
        `2️⃣ Ответьте на любое сообщение (фото, опрос, текст) командой <code>/broadcast</code>\n   → Перешлёт это сообщение всем\n\n` +
        `👥 Активных получателей: <b>${userCount}</b>`,
      parse_mode: 'HTML',
    });
  }
}

async function getAdminSettings(): Promise<Record<string, any>> {
  const { data } = await supabase
    .from('profiles')
    .select('settings')
    .eq('telegram_id', ADMIN_TELEGRAM_IDS[0])
    .single();
  return data?.settings || {};
}

async function executeBroadcast(chatId: number, confirmMsgId: number, callbackData: string): Promise<void> {
  const parts = callbackData.split(':');
  const mode = parts[1]; // 'forward' or 'text'
  const msgId = parseInt(parts[2]) || 0;

  // Обновляем сообщение подтверждения
  await editMessage({
    chat_id: chatId,
    message_id: confirmMsgId,
    text: '⏳ Рассылка запущена...',
  });

  // Получаем всех пользователей с telegram_id
  const { data: profiles } = await supabase
    .from('profiles')
    .select('telegram_id')
    .not('telegram_id', 'is', null);

  if (!profiles || profiles.length === 0) {
    await editMessage({
      chat_id: chatId,
      message_id: confirmMsgId,
      text: '❌ Нет пользователей для рассылки.',
    });
    return;
  }

  let sent = 0;
  let errors = 0;

  if (mode === 'forward' && msgId) {
    // Пересылаем сообщение
    for (const p of profiles) {
      try {
        const resp = await fetch(`${TELEGRAM_API}/copyMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: p.telegram_id,
            from_chat_id: chatId,
            message_id: msgId,
          }),
        });
        if (resp.ok) sent++;
        else errors++;
      } catch {
        errors++;
      }
      // Rate limiting
      await new Promise(r => setTimeout(r, 50));
    }
  } else if (mode === 'text') {
    // Берём текст из settings
    const settings = await getAdminSettings();
    const broadcastText = settings._broadcast_text;

    if (!broadcastText) {
      await editMessage({
        chat_id: chatId,
        message_id: confirmMsgId,
        text: '❌ Текст рассылки не найден.',
      });
      return;
    }

    for (const p of profiles) {
      try {
        const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: p.telegram_id,
            text: broadcastText,
            parse_mode: 'HTML',
          }),
        });
        if (resp.ok) sent++;
        else errors++;
      } catch {
        errors++;
      }
      await new Promise(r => setTimeout(r, 50));
    }

    // Чистим временный текст
    const cleanSettings = { ...settings };
    delete cleanSettings._broadcast_text;
    await supabase
      .from('profiles')
      .update({ settings: cleanSettings })
      .eq('telegram_id', ADMIN_TELEGRAM_IDS[0]);
  }

  // Итоговый отчёт
  await editMessage({
    chat_id: chatId,
    message_id: confirmMsgId,
    text: `✅ <b>Рассылка завершена!</b>\n\n📨 Отправлено: ${sent}\n❌ Ошибок: ${errors}\n👥 Всего: ${profiles.length}`,
    parse_mode: 'HTML',
  });
}
