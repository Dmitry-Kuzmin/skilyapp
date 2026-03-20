// =====================================================
// Notification Sender Service
// =====================================================
// Умная отправка уведомлений с AI-персонализацией,
// проверкой тихих часов и cooldown

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import { UserNotificationSettings } from '../_shared/types.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const IMPORTANT_CATEGORIES = new Set(['duel', 'progress', 'system', 'monetization', 'premium']);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('[Notification Sender] Service started');

// =====================================================
// Типы
// =====================================================

interface SendNotificationRequest {
  user_id?: string;
  telegram_id?: number;
  template_id?: string;
  template_type?: string;
  variables?: Record<string, string | number | boolean | null>;
  title?: string;
  message?: string;
  icon?: string;
  cta_text?: string;
  cta_deeplink?: string;
  image_url?: string;
  force?: boolean; // игнорировать cooldown и тихие часы
}

interface NotificationTemplate {
  id: string;
  category: string;
  type: string;
  title_template: string;
  message_template: string;
  icon: string | null;
  cooldown_hours: number;
  cta_text: string | null;
  cta_deeplink: string | null;
  priority: number;
  ai_enhance: boolean;
}

interface UserProfile {
  id: string;
  telegram_id: number;
  first_name?: string;
  username?: string;
}

// =====================================================
// Главный обработчик
// =====================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createPooledSupabaseClient();
    const body: SendNotificationRequest = await req.json();

    console.log('[Notification Sender] Request:', {
      user_id: body.user_id,
      telegram_id: body.telegram_id,
      template_id: body.template_id,
      template_type: body.template_type
    });

    if (!body.user_id && !body.telegram_id) {
      return new Response(
        JSON.stringify({ error: 'user_id or telegram_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let profile: UserProfile | null = null;
    if (body.user_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id, telegram_id, first_name, username')
        .eq('id', body.user_id)
        .maybeSingle();
      profile = data as UserProfile | null;
    } else if (body.telegram_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id, telegram_id, first_name, username')
        .eq('telegram_id', body.telegram_id)
        .maybeSingle();
      profile = data as UserProfile | null;
    }

    if (!profile) {
      console.error('[Notification Sender] Profile not found for user_id:', body.user_id);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.telegram_id) {
      console.warn('[Notification Sender] User has no telegram_id:', profile.id);
      return new Response(
        JSON.stringify({ error: 'No telegram_id', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: settings } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle() as { data: UserNotificationSettings | null };

    const now = new Date();

    if (!body.force && settings && settings.enabled === false) {
      console.log('[Notification Sender] Notifications disabled for user:', profile.id);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'notifications_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (
      !body.force &&
      settings?.quiet_mode_until &&
      new Date(settings.quiet_mode_until).getTime() > now.getTime()
    ) {
      console.log('[Notification Sender] Quiet mode active until', settings.quiet_mode_until);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'quiet_mode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let template: NotificationTemplate | null = null;
    if (body.template_id) {
      const { data } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', body.template_id)
        .eq('is_active', true)
        .maybeSingle();
      template = data as NotificationTemplate | null;
    } else if (body.template_type) {
      const { data } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('type', body.template_type)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();
      template = data as NotificationTemplate | null;
    }

    if (!body.force && settings?.quiet_hours_start && settings?.quiet_hours_end) {
      const isQuietHours = checkQuietHours(
        settings.quiet_hours_start,
        settings.quiet_hours_end,
        settings.timezone || 'Europe/Madrid'
      );

      if (isQuietHours) {
        console.log('[Notification Sender] Quiet hours active for user:', profile.id);
        return new Response(
          JSON.stringify({ skipped: true, reason: 'quiet_hours' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (
      !body.force &&
      settings?.only_important &&
      template?.category &&
      !IMPORTANT_CATEGORIES.has(template.category)
    ) {
      console.log('[Notification Sender] Only important mode skips category:', template.category);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'only_important' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.force && template && template.cooldown_hours > 0) {
      const cooldownExpired = await checkCooldown(
        profile.id,
        template.type,
        template.cooldown_hours,
        supabase
      );

      if (!cooldownExpired) {
        console.log('[Notification Sender] Cooldown active for template:', template.type);
        return new Response(
          JSON.stringify({ skipped: true, reason: 'cooldown_active' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let title = body.title || template?.title_template || 'Уведомление';
    let message = body.message || template?.message_template || '';
    const icon = body.icon || template?.icon || '📢';
    const ctaText = body.cta_text || template?.cta_text;
    let ctaDeeplink = body.cta_deeplink || template?.cta_deeplink;

    if (body.variables) {
      title = substituteVariables(title, body.variables);
      message = substituteVariables(message, body.variables);
      if (ctaDeeplink) {
        ctaDeeplink = substituteVariables(ctaDeeplink, body.variables);
      }
    }

    let wasAiEnhanced = false;
    if (template?.ai_enhance && body.variables) {
      try {
        const enhancedMessage = await enhanceWithAI(message, body.variables, profile);
        if (enhancedMessage) {
          message = enhancedMessage;
          wasAiEnhanced = true;
          console.log('[Notification Sender] AI-enhanced message');
        }
      } catch (error) {
        console.error('[Notification Sender] AI enhancement failed:', error);
      }
    }

    // 1. Отправка в Telegram
    const telegramResult = await sendTelegramNotification(
      profile.telegram_id,
      title,
      message,
      icon,
      ctaText,
      ctaDeeplink,
      body.image_url
    );

    // 2. Отправка PWA Push (параллельно)
    const pwaPushResult = await sendPWAPushNotification(
      profile.id,
      title,
      message,
      icon,
      ctaText,
      ctaDeeplink
    ).catch(err => {
      console.error('[Notification Sender] PWA Push failed:', err);
      return { success: false, error: String(err) };
    });

    if (!telegramResult.success && !pwaPushResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Failed to send notification via any channel',
          telegram_error: telegramResult.error,
          pwa_error: pwaPushResult.error
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('notification_logs').insert({
      user_id: profile.id,
      template_id: template?.id || null,
      telegram_message_id: telegramResult.message_id,
      telegram_chat_id: profile.telegram_id,
      title,
      message,
      category: template?.category || 'custom',
      type: template?.type || 'custom',
      metadata: {
        variables: body.variables,
        deeplink: ctaDeeplink,
        ai_enhanced: wasAiEnhanced
      },
      was_ai_enhanced: wasAiEnhanced,
      sent_at: new Date().toISOString()
    });

    console.log('[Notification Sender] Notification sent successfully:', {
      telegram: telegramResult.success,
      pwa_push: pwaPushResult?.success
    });

    return new Response(
      JSON.stringify({
        success: true,
        telegram_sent: telegramResult.success,
        pwa_sent: pwaPushResult?.success,
        message_id: telegramResult.message_id,
        ai_enhanced: wasAiEnhanced
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Notification Sender] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =====================================================
// Вспомогательные функции
// =====================================================

function checkQuietHours(startTime: string, endTime: string, _timezone: string): boolean {
  try {
    const now = new Date();
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentMinutes = currentHour * 60 + currentMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  } catch (error) {
    console.error('[Notification Sender] Quiet hours check error:', error);
    return false;
  }
}

async function checkCooldown(
  userId: string,
  templateType: string,
  cooldownHours: number,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const cooldownDate = new Date();
    cooldownDate.setHours(cooldownDate.getHours() - cooldownHours);

    const { data } = await supabase
      .from('notification_logs')
      .select('sent_at')
      .eq('user_id', userId)
      .eq('type', templateType)
      .gte('sent_at', cooldownDate.toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return !data;
  } catch (error) {
    console.error('[Notification Sender] Cooldown check error:', error);
    return true;
  }
}

function substituteVariables(template: string, variables: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

async function enhanceWithAI(
  message: string,
  context: Record<string, unknown>,
  profile: UserProfile
): Promise<string | null> {
  try {
    const prompt = `Ты — умный тренер по ПДД Испании. Персонализируй уведомление для пользователя.

Исходное сообщение: ${message}

Контекст пользователя:
${JSON.stringify(context, null, 2)}

Имя пользователя: ${profile.first_name || profile.username || 'Друг'}

Требования:
- Лаконично (1-2 предложения)
- Современный, уверенный тон
- Без emoji (они уже есть в иконке)
- Мотивирующе, но не навязчиво
- Персонализируй под контекст

Ответь ТОЛЬКО текстом уведомления без дополнительных пояснений:`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      console.error('[Notification Sender] AI chat error:', response.status);
      return null;
    }

    const reader = response.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let aiResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              aiResponse += content;
            }
          } catch {
            // Пропускаем невалидный JSON
          }
        }
      }
    }

    return aiResponse.trim() || null;
  } catch (error) {
    console.error('[Notification Sender] AI enhancement error:', error);
    return null;
  }
}

async function sendPWAPushNotification(
  userId: string,
  title: string,
  body: string,
  icon: string,
  ctaText?: string | null,
  ctaDeeplink?: string | null
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        userId,
        title,
        body,
        icon,
        url: ctaDeeplink ? (ctaDeeplink.startsWith('http') ? ctaDeeplink : `/dashboard?startapp=${ctaDeeplink.replace(/^\//, '')}`) : '/dashboard',
        actions: ctaText ? [{ action: 'open', title: ctaText }] : undefined
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Unknown error' };
    }

    const result = await response.json();
    return { success: true, sent: result.sent };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

async function sendTelegramNotification(
  chatId: number,
  title: string,
  message: string,
  icon: string,
  ctaText?: string | null,
  ctaDeeplink?: string | null,
  imageUrl?: string
): Promise<{ success: boolean; message_id?: number; error?: string }> {
  try {
    const text = imageUrl 
      ? `<b>${title}</b>\n\n${message}` // В подписке к фото жирный заголовок смотрится лучше
      : `${icon} <b>${title}</b>\n\n${message}`;

    const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://sdadim-dgt-prep.vercel.app';

    const replyMarkup = ctaText && ctaDeeplink ? {
      inline_keyboard: [
        [{
          text: ctaText,
          web_app: {
            url: ctaDeeplink.startsWith('http')
              ? ctaDeeplink
              : `${MINI_APP_URL}?startapp=${ctaDeeplink.replace(/^\//, '')}`
          }
        }]
      ]
    } : undefined;

    const endpoint = imageUrl ? 'sendPhoto' : 'sendMessage';
    const body: any = {
      chat_id: chatId,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    };

    if (imageUrl) {
      body.photo = imageUrl;
      body.caption = text;
    } else {
      body.text = text;
    }

    const response = await fetch(`${TELEGRAM_API}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Notification Sender] Telegram API error:', error);
      return { success: false, error: error.description };
    }

    const result = await response.json();
    return { success: true, message_id: result.result.message_id };

  } catch (error: unknown) {
    console.error('[Notification Sender] Send error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}
