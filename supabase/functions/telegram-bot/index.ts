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
import { t, getUserLanguage, normalizeLanguage, SupportedLanguage, getDaysWord, formatMarkdown } from "./translations.ts";
import { handleAIChat, sendStarsInvoice } from "./ai-handler.ts";
import { handleCourseCallback, handleCourseStart } from "./course-funnel.ts";

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
    const updateKeys = Object.keys(update).filter(k => k !== 'update_id');
    console.log(`[Update] id=${update.update_id} types=[${updateKeys.join(',')}]`);
    if (update.poll_answer) {
      console.log(`[Update] POLL_ANSWER received! user=${update.poll_answer.user?.id} options=${JSON.stringify(update.poll_answer.option_ids)}`);
    }

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
        case "checklist":
          await commands.handleChecklist(message);
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
  } else if (text || message.photo) {
    const ADMIN_CHAT_ID = 488159880; // @guapo_pub

    // ── Если это ADMIN отвечает на сообщение с меткой — пересылаем юзеру ──
    if (user.id === ADMIN_CHAT_ID && message.reply_to_message) {
      const replyText = message.reply_to_message.text || message.reply_to_message.caption || '';
      const match = replyText.match(/\[user_chat_id:(\d+)\]/);
      if (match) {
        const userChatId = parseInt(match[1]);
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userChatId,
            text: `💬 <b>Поддержка Skily:</b>\n\n${text || ''}`,
            parse_mode: 'HTML',
            reply_markup: keyboards.getBackToMenuKeyboard('ru')
          })
        });
        // Подтверждаем admin что ответ отправлен
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: `✅ Ответ отправлен пользователю (${userChatId})` })
        });
        return;
      }
    }

    // ── Проверяем support_mode — если включён, пересылаем в поддержку ──
    try {
      const { data: profile } = await supabase.from('profiles').select('settings').eq('telegram_id', user.id).maybeSingle();
      const settings = (typeof profile?.settings === 'object' && profile?.settings) as Record<string, unknown> | null;
      if (settings?.support_mode === true) {
        const senderName = `${user.first_name || ''}${user.last_name ? ' ' + user.last_name : ''}`.trim() || 'User';
        const username = user.username ? ` @${user.username}` : '';
        const lang = await getUserLanguage(user.id, user.language_code, supabase);

        // Сначала шлём метку с chat_id — admin будет отвечать именно на неё (reply)
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: `📩 <b>Вопрос в поддержку</b>\n👤 ${senderName}${username}\n\n<i>${text || '[фото/медиа]'}</i>\n\n<b>↩️ Ответь на это сообщение чтобы написать пользователю</b>\n[user_chat_id:${message.chat.id}]`,
            parse_mode: 'HTML'
          })
        });

        // Сбрасываем support_mode
        const currentSettings = { ...settings, support_mode: false };
        await supabase.from('profiles').update({ settings: currentSettings }).eq('telegram_id', user.id);
        // Подтверждаем пользователю
        await commands.sendMessage({ chat_id: message.chat.id, text: t('help.supportSent', lang), reply_markup: keyboards.getBackToMenuKeyboard(lang) });
        return;
      }
    } catch (supportErr) {
      console.error('[Support] Error:', supportErr);
    }
    // Обработка не-команд или фото через AI
    console.log("[Message] Not a command or contains photo, calling AI...");
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

  // Убираем часики мгновенно (без await, чтобы не ждать ответа API)
  fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: query.id })
  }).catch((e) => console.error("[Callback] answerCallbackQuery failed:", e));

  if (!message) return;

  try {
    const langPromise = getUserLanguage(user.id, user.language_code, supabase);

    if (data === "main_menu") {
      const lang = await langPromise;
      const { data: activeSeason } = await supabase.from('duel_pass_seasons').select('name_ru, name_en, name_es').eq('is_active', true).maybeSingle();
      const activeSeasonName = activeSeason ? ((activeSeason as Record<string, string>)[`name_${lang}`] ?? activeSeason.name_ru) : null;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: lang === 'es' ? '🏠 Menú Principal' : lang === 'en' ? '🏠 Main Menu' : '🏠 Главное меню',
        reply_markup: keyboards.getMainMenuKeyboard(lang, activeSeasonName)
      });
    }
    else if (data === "profile") {
      const lang = await langPromise;
      await showProfile(message.chat.id, user.id, lang, message.message_id);
    }
    // ── Обучение ──
    else if (data === "learning_menu") {
      const lang = await langPromise;
      const { data: prof } = await supabase.from('profiles').select('id').eq('telegram_id', user.id).maybeSingle();
      const { data: metrics } = prof ? await supabase.from('user_metrics').select('readiness_level').eq('user_id', prof.id).maybeSingle() : { data: null };
      const examUnlocked = (metrics?.readiness_level ?? 0) >= 10;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('learning.title', lang),
        parse_mode: 'HTML',
        reply_markup: keyboards.getLearningKeyboard(lang, examUnlocked)
      });
    }
    else if (data === "test_size_menu") {
      const lang = await langPromise;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('learning.testSize', lang),
        parse_mode: 'HTML',
        reply_markup: keyboards.getTestSizeKeyboard(lang)
      });
    }
    else if (data === "test_10" || data === "test_20" || data === "test_30") {
      const count = data.replace('test_', '');
      // Открываем mini app с нужным количеством вопросов
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: query.id,
          url: `${MINI_APP_URL}/tests?mode=random&count=${count}`,
        })
      });
      return;
    }
    else if (data === "exam_locked") {
      const lang = await langPromise;
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: query.id,
          text: t('learning.examLockedPopup', lang),
          show_alert: true,
        })
      });
      return;
    }
    else if (data === "exam_open") {
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: query.id,
          url: `${MINI_APP_URL}/exam`,
        })
      });
      return;
    }
    // ── Дуэли ──
    else if (data === "duels_menu") {
      const lang = await langPromise;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('duels.menuTitle', lang),
        parse_mode: 'HTML',
        reply_markup: keyboards.getDuelsMenuKeyboard(lang)
      });
    }
    else if (data === "duel_inline") {
      const lang = await langPromise;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('duel.invite', lang),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: t('keyboard.challengeFriend', lang), switch_inline_query: (lang === 'en' ? 'duel' : lang === 'es' ? 'duelo' : 'дуэль') }],
            [{ text: t('keyboard.backToMenu', lang), callback_data: 'duels_menu' }]
          ]
        }
      });
    }
    // ── Премиум ──
    else if (data === "premium_menu" || data === "payment_methods") {
      const lang = await langPromise;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('premium.title', lang),
        parse_mode: 'HTML',
        reply_markup: keyboards.getPremiumKeyboard(lang)
      });
    }
    // ── Помощь ──
    else if (data === "help_menu") {
      const lang = await langPromise;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('help.title', lang),
        parse_mode: 'HTML',
        reply_markup: keyboards.getHelpKeyboard(lang)
      });
    }
    else if (data === "support_chat") {
      const lang = await langPromise;
      // Устанавливаем флаг support_mode в профиле
      const { data: currentProfile } = await supabase.from('profiles').select('settings').eq('telegram_id', user.id).maybeSingle();
      const currentSettings = (typeof currentProfile?.settings === 'object' && currentProfile?.settings) || {};
      await supabase.from('profiles').update({ settings: { ...currentSettings, support_mode: true } }).eq('telegram_id', user.id);
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('help.supportPrompt', lang),
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: t('keyboard.backToMenu', lang), callback_data: 'help_menu' }]] }
      });
    }
    // ── Настройки ──
    else if (data === "settings") {
      const lang = await langPromise;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('settings.title', lang),
        reply_markup: keyboards.getSettingsKeyboard(lang)
      });
    }
    else if (data === "settings_language") {
      const lang = await langPromise;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('keyboard.language', lang),
        reply_markup: keyboards.getLanguageKeyboard(lang)
      });
    }
    else if (data.startsWith("set_language_")) {
      const newLang = data.replace("set_language_", "");
      // ВАЖНО: мержим settings, а не заменяем (чтобы не стереть checklist_msg_id и др.)
      const { data: currentProfile } = await supabase.from("profiles").select("settings").eq("telegram_id", user.id).single();
      const currentSettings = (typeof currentProfile?.settings === 'object' && currentProfile.settings) || {};
      await supabase.from("profiles").update({ settings: { ...currentSettings, language: newLang } }).eq("telegram_id", user.id);
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('language.changed', newLang as SupportedLanguage),
        reply_markup: keyboards.getBackToMenuKeyboard(newLang as SupportedLanguage)
      });
    }
    else if (data === "tips_menu") {
      const lang = await langPromise;
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: t('tips.title', lang),
        reply_markup: keyboards.getTipsMenuKeyboard(lang)
      });
    }
    else if (data === "pay_stars") {
      // Мгновенно — никаких API-запросов, цены захардкожены
      const lang = await langPromise;
      const titleText = lang === 'es'
        ? '⭐ <b>Telegram Stars</b>\n\nElige tu plan Premium:'
        : lang === 'en'
        ? '⭐ <b>Telegram Stars</b>\n\nChoose your Premium plan:'
        : '⭐ <b>Telegram Stars</b>\n\nВыбери тариф Premium:';
      await editMessage({
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: titleText,
        parse_mode: 'HTML',
        reply_markup: keyboards.getStarsTiersKeyboard(lang)
      });
    }
    // Выбор конкретного тарифа Stars — создаём 1 инвойс по клику
    else if (data.startsWith("stars_")) {
      const tier = data.replace("stars_", ""); // monthly | quarterly | biannual | yearly
      const packageKey = `premium_${tier}`;
      const lang = await langPromise;
      const { data: profile } = await supabase.from("profiles").select("id").eq("telegram_id", user.id).maybeSingle();
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/telegram-stars-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
          body: JSON.stringify({ action: 'create_invoice', user_id: profile?.id || "", package_key: packageKey, telegram_user_id: user.id })
        });
        const result = await resp.json();
        if (result.invoice_link) {
          // Открываем инвойс через answerCallbackQuery url
          await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: query.id, url: result.invoice_link })
          });
          return;
        }
      } catch (e) {
        console.error('[Stars] Invoice create error:', e);
      }
    }
    else if (data === "payment_methods") {
      const lang = await langPromise;
      await showPaymentMethods(message.chat.id, lang, message.message_id);
    }
    // Quest info — клик по кнопке квеста в чеклисте
    else if (data.startsWith("quest_info:")) {
      // Показываем popup с деталями
      const parts = data.split(':');
      const questId = parts[2] || '';
      try {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: query.id,
            text: `🎯 Открой Skily чтобы выполнить задачу!`,
            show_alert: false,
          }),
        });
      } catch {}
    }
    // ── Воронка курса DGT ──────────────────────────────
    else if (data === "course_start") {
      // Кнопка из главного меню — редактируем то же сообщение (инлайн)
      await handleCourseStart(
        message.chat.id,
        user.first_name || 'друг',
        user.id,
        user.username,
        supabase,
        message.message_id
      );
    }
    else if (data.startsWith("course_")) {
      await handleCourseCallback(
        data,
        message.chat.id,
        message.message_id,
        user.id,
        user.first_name || 'друг',
        user.username,
        supabase
      );
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
      // IMPORTANT: web_app buttons don't work in inline results!
      // Use t.me deep link instead → opens Mini App via bot
      const refDeepLink = `https://t.me/skilyapp_bot/app?startapp=ref_${refProfileId}`;
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
            url: refDeepLink
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
          inline_keyboard: [[{ text: t('inline.duel.button', lang), url: `https://t.me/skilyapp_bot/app?startapp=duel_${duelCode}` }]]
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

async function showProfile(chatId: number, telegramId: number, lang: SupportedLanguage, messageId?: number) {
  try {
    const { data: profile } = await supabase.from("profiles").select("id, first_name").eq("telegram_id", telegramId).maybeSingle();
    if (!profile) {
      console.log(`[Profile] No profile found for telegramId: ${telegramId}`);
      return;
    }

    const { data: metrics } = await supabase.from("user_metrics").select("*").eq("user_id", profile.id).maybeSingle();
    const userName = profile.first_name || "Pilot";
    const readiness = Math.round(metrics?.readiness_level || 0);
    const streak = metrics?.streak_days || 0;
    const tests = metrics?.total_tests_completed || 0;
    const correct = metrics?.correct_answers || 0;
    const total = metrics?.total_questions_answered || 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    const text = `👤 <b>${t('profile.title', lang)}</b>\n\n<b>${userName}</b>\n\n🎯 ${t('profile.readiness', lang)}: <b>${readiness}%</b>\n🔥 ${t('profile.streak', lang)}: <b>${streak} ${getDaysWord(streak, lang)}</b>\n📋 ${lang === 'ru' ? 'Тестов пройдено' : lang === 'es' ? 'Tests completados' : 'Tests completed'}: <b>${tests}</b>\n✅ ${lang === 'ru' ? 'Точность' : lang === 'es' ? 'Precisión' : 'Accuracy'}: <b>${accuracy}%</b>\n\n<a href="${MINI_APP_URL}/dashboard">${t('profile.detailedStats', lang)}</a>`;

    const backKeyboard = keyboards.getProfileKeyboard(lang);

    if (messageId) {
      await editMessage({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        reply_markup: backKeyboard,
        disable_web_page_preview: true
      });
    } else {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: backKeyboard,
          disable_web_page_preview: true
        })
      });
    }
  } catch (error: unknown) {
    console.error("[Profile] Error showing profile:", error);
  }
}

async function showPaymentMethods(chatId: number, lang: SupportedLanguage, messageId?: number) {
  const text = lang === 'en' 
    ? "💎 <b>Choose Payment Method</b>\n\nSelect how you want to pay for Premium access:"
    : lang === 'es'
    ? "💎 <b>Elige el método de pago</b>\n\nSelecciona cómo quieres pagar tu acceso Premium:"
    : "💎 <b>Выбери способ оплаты</b>\n\nВыбери удобный способ получения Premium-доступа:";
  
  const keyboard = {
    inline_keyboard: [
      [{ text: "⭐ Telegram Stars", callback_data: "pay_stars" }],
      [{ text: "💎 TON (Wallet)", web_app: { url: `${MINI_APP_URL}/dashboard?modal=boost-shop&initialTab=premium` } }],
      [{ text: "💳 Bank Card / Stripe", web_app: { url: `${MINI_APP_URL}/dashboard?modal=boost-shop&initialTab=premium` } }],
      [{ text: t('keyboard.backToMenu', lang), callback_data: "main_menu" }]
    ]
  };

  if (messageId) {
    await editMessage({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  } else {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: keyboard
      })
    });
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
    if (!user) {
      console.error("[PollAnswer] No user in pollAnswer:", pollAnswer);
      return;
    }

    console.log(`[PollAnswer] Processing answer from ${user.id} (${user.username})`);

    // DEBUG: Отправляем уведомление пользователю что мы получили ответ
    /*
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.id,
        text: `🔍 Системное: Обрабатываю ваш ответ на опрос... (User ID: ${user.id})`
      })
    }).catch(() => {});
    */

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, settings')
      .eq('telegram_id', user.id)
      .maybeSingle();

    if (!profile) {
      console.log(`[PollAnswer] No profile found for telegram_id=${user.id}, error=${profileError?.message}`);
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: user.id,
          text: `❌ Ошибка: Профиль не найден в базе данных (ID: ${user.id}). Попробуйте /start`
        })
      }).catch(() => {});
      return;
    }

    // Последовательный квиз: проверяем сессию
    let settings = profile.settings || {};
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch { settings = {}; }
    }

    const quiz = settings.morning_quiz;
    if (!quiz || !quiz.questions) {
      console.log(`[PollAnswer] No active quiz session for profile ${profile.id}`);
      /*
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: user.id,
          text: `⏹️ Сессия викторины не найдена. Возможно, она уже завершена.`
        })
      }).catch(() => {});
      */
      return;
    }

    const chatId = quiz.chat_id || user.id;
    const current = quiz.current || 0;
    const questions = quiz.questions;
    const total = questions.length;

    // Проверяем правильность ответа
    const isCorrect = pollAnswer.option_ids?.[0] === questions[current]?.correct_idx;

    // Сохраняем результат текущего вопроса для финального анализа
    if (!quiz.results) quiz.results = [];
    quiz.results.push({
      index: current,
      isCorrect,
      text: formatMarkdown(questions[current].text),
      explanation: formatMarkdown(questions[current].explanation)
    });

    const isCorrectCurrent = isCorrect;
    if (isCorrectCurrent) quiz.correct = (quiz.correct || 0) + 1;

    // Ждём 0.5 секунды чтобы работало мгновенно
    await new Promise(r => setTimeout(r, 500));

    // Удаляем текущие сообщения (фото + poll)
    if (quiz.photo_msg_id) await tgDelete(chatId, quiz.photo_msg_id);
    if (quiz.poll_msg_id) await tgDelete(chatId, quiz.poll_msg_id);

    const nextIdx = current + 1;

    if (nextIdx >= total) {
      // Финальный итог
      const correct = quiz.correct || 0;
      const pct = Math.round((correct / total) * 100);
      const grade = pct === 100 ? '🏆' : pct >= 66 ? '💪' : '📚';
      
      const dots = quiz.results.map((r: any) => r.isCorrect ? '✅' : '❌').join(' ');

      const lines = [
        `🏁 <b>Разминка завершена!</b>`,
        '',
        `📊 <b>Результат:</b> ${dots} (${correct}/${total})`,
        '─────────────',
        ''
      ];

      // Детальный разбор
      quiz.results.forEach((r: any, i: number) => {
        lines.push(`${r.isCorrect ? '✅' : '❌'} <b>Вопрос ${i + 1}:</b> ${r.text}`);
        if (r.explanation) {
          lines.push(`<blockquote>📖 ${r.explanation}</blockquote>`);
        }
        lines.push('');
      });

      lines.push('─────────────');
      lines.push(
        pct === 100 ? '🚀 <b>Идеально!</b> Вы полностью готовы к экзамену. Так держать!' :
        pct >= 66 ? '✨ <b>Хороший результат!</b> Ещё немного практики, и будет 100%.' :
        '📚 <b>Нужно подтянуться.</b> Рекомендуем разобрать ошибки в приложении.'
      );

      console.log(`[PollAnswer] Quiz finished! ${correct}/${total}`);
      
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join('\n'),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Открыть Skilyapp', web_app: { url: MINI_APP_URL } }],
              [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
            ]
          }
        }),
      });

      // Очищаем сессию
      delete settings.morning_quiz;
      const { error: clearErr } = await supabase.from('profiles').update({ settings }).eq('id', profile.id);
      if (clearErr) console.error('[PollAnswer] Failed to clear quiz session:', clearErr.message);
    } else {
      // Следующий вопрос
      const nextQ = questions[nextIdx];
      console.log(`[PollAnswer] Sending next question ${nextIdx + 1}/${total}`);
      const msgIds = await sendQuizQuestionFromBot(chatId, nextQ, nextIdx, total, quiz.botLang || 'ru');
      console.log(`[PollAnswer] Next question sent: photo=${msgIds?.photoMsgId}, poll=${msgIds?.pollMsgId}`);

      // Обновляем сессию
      quiz.current = nextIdx;
      quiz.photo_msg_id = msgIds?.photoMsgId || null;
      quiz.poll_msg_id = msgIds?.pollMsgId || null;
      settings.morning_quiz = quiz;
      const { error: updateErr } = await supabase.from('profiles').update({ settings }).eq('id', profile.id);
      if (updateErr) console.error('[PollAnswer] Failed to update quiz session:', updateErr.message);
      else console.log(`[PollAnswer] Session updated: current=${nextIdx}`);
    }
  } catch (error) {
    console.error('[PollAnswer] Error:', error);
  }
}

// Отправляет один вопрос квиза (фото + poll) из бота
async function sendQuizQuestionFromBot(
  chatId: number, q: any, index: number, total: number, botLang: string
): Promise<{ photoMsgId: number | null; pollMsgId: number } | null> {
  let photoMsgId: number | null = null;

  if (q.image_url) {
    const pr = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: q.image_url,
        caption: `❓ ${botLang === 'ru' ? `Вопрос ${index + 1} из ${total}` : `Question ${index + 1} of ${total}`}`,
      }),
    });
    const prResult = await pr.json();
    if (pr.ok) {
      photoMsgId = prResult.result?.message_id;
      if (photoMsgId) {
        fetch(`${TELEGRAM_API}/setMessageReaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, message_id: photoMsgId,
            reaction: [{ type: 'emoji', emoji: '🚗' }],
          }),
        }).catch(() => {});
      }
    }
  }

  const pollBody: any = {
    chat_id: chatId,
    question: q.text,
    options: q.options.map((text: string) => ({ text })),
    type: 'quiz',
    correct_option_id: q.correct_idx,
    is_anonymous: false,
  };
  if (q.explanation?.trim()) {
    // В полле Telegram лимит 200 символов, обрезаем только тут!
    pollBody.explanation = formatMarkdown(q.explanation).substring(0, 200);
    pollBody.explanation_parse_mode = 'HTML';
  }

  const pollResp = await fetch(`${TELEGRAM_API}/sendPoll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pollBody),
  });
  const pollResult = await pollResp.json();

  if (!pollResp.ok) {
    console.error('[PollAnswer] sendPoll failed:', pollResult.description);
    return null;
  }

  const pollMsgId = pollResult.result?.message_id;
  if (pollMsgId) {
    fetch(`${TELEGRAM_API}/setMessageReaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, message_id: pollMsgId,
        reaction: [{ type: 'emoji', emoji: '🤓' }],
      }),
    }).catch(() => {});
  }

  return { photoMsgId, pollMsgId };
}

async function tgDelete(chatId: number, messageId: number) {
  try {
    await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch {}
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

// Админы: хардкод + из env переменной
const ADMIN_TELEGRAM_IDS_HARDCODED = [488159880]; // @guapo_pub
function getAdminTelegramIds(): number[] {
  const envIds = (Deno.env.get('ADMIN_TELEGRAM_IDS') || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  return [...new Set([...ADMIN_TELEGRAM_IDS_HARDCODED, ...envIds])];
}

async function handleBroadcastCommand(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const userId = message.from?.id;
  const adminIds = getAdminTelegramIds();

  console.log(`[Broadcast] userId=${userId} (type: ${typeof userId}), adminIds=${JSON.stringify(adminIds)}, includes=${adminIds.includes(userId!)}`);

  // Проверка админа
  if (!userId || !adminIds.includes(userId)) {
    await commands.sendMessage({
      chat_id: chatId,
      text: `⛔ Эта команда доступна только администраторам.\n\n<i>Debug: your id=${userId}</i>`,
      parse_mode: 'HTML',
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
    .eq('telegram_id', ADMIN_TELEGRAM_IDS_HARDCODED[0])
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
      .eq('telegram_id', ADMIN_TELEGRAM_IDS_HARDCODED[0]);
  }

  // Итоговый отчёт
  await editMessage({
    chat_id: chatId,
    message_id: confirmMsgId,
    text: `✅ <b>Рассылка завершена!</b>\n\n📨 Отправлено: ${sent}\n❌ Ошибок: ${errors}\n👥 Всего: ${profiles.length}`,
    parse_mode: 'HTML',
  });
}

