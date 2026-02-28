// =====================================================
// User Event Dispatcher
// =====================================================
// Получает события из приложения, проверяет правила и
// отправляет релевантные уведомления через notification-sender.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  UserMetrics,
  UserNotificationSettings,
  NotificationRule,
  NotificationTemplate,
  RuleFilter
} from '../_shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFICATION_SENDER_URL = `${SUPABASE_URL}/functions/v1/notification-sender`;
const IMPORTANT_CATEGORIES = new Set(['duel', 'progress', 'system', 'monetization', 'premium']);

type EventPayload = Record<string, string | number | boolean | null | undefined>;

interface EventRequest {
  event_id?: string;
  user_id: string;
  event_type: string;
  payload?: EventPayload;
  override_template_type?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: EventRequest = await req.json();
    const { event_id, user_id, event_type, payload = {}, override_template_type } = body;

    if (!user_id || !event_type) {
      return new Response(JSON.stringify({ error: 'user_id and event_type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createPooledSupabaseClient(SUPABASE_SERVICE_ROLE_KEY);

    // КРИТИЧНО: Дедупликация по event_id
    if (event_id) {
      const { data: existingEvent } = await supabase
        .from('analytics_events_log')
        .select('id, processed')
        .eq('event_id', event_id)
        .maybeSingle();

      if (existingEvent) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: existingEvent.processed ? 'already_processed' : 'duplicate'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('analytics_events_log')
        .insert({
          event_id,
          user_id,
          event_type,
          payload,
          override_template_type,
          processed: false,
        })
        .catch((error) => {
          if (error.code !== '23505') {
            console.error('[EventDispatcher] Error logging event:', error);
          }
        });
    }

    const { data: settings } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle() as { data: UserNotificationSettings | null };

    const now = new Date();

    if (settings && settings.enabled === false) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'notifications_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (
      settings?.quiet_mode_until &&
      new Date(settings.quiet_mode_until).getTime() > now.getTime()
    ) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'quiet_mode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: metrics } = await supabase
      .from('user_metrics')
      .select('last_login_at, streak_days, total_tests_completed, total_duels_played, readiness_level')
      .eq('user_id', user_id)
      .maybeSingle() as { data: UserMetrics | null };

    const userState = determineUserState(metrics);
    const templateCache = new Map<string, NotificationTemplate>();

    // Manual override path
    if (override_template_type) {
      const template = await loadTemplate(supabase, override_template_type, templateCache);
      if (!template) {
        return new Response(JSON.stringify({ error: 'Template not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const variables = buildVariables(event_type, payload, metrics, template);
      await sendViaNotificationSender({
        templateType: override_template_type,
        userId: user_id,
        variables,
      });

      return new Response(JSON.stringify({ success: true, sent: 1, manual: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: rules, error: rulesError } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('event_type', event_type)
      .eq('enabled', true)
      .order('priority', { ascending: false });

    if (rulesError || !rules) {
      console.error('[EventDispatcher] Rules query error:', rulesError);
      return new Response(JSON.stringify({ error: 'Failed to load rules' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[EventDispatcher] Processing ${rules.length} potential rules for event: ${event_type}`);

    const filteredRules = rules.filter((rule) => {
      const matched = matchesFilters(rule.user_state_filter, userState, settings, payload, metrics);
      if (!matched) {
        console.log(`[EventDispatcher] Rule "${rule.rule_name}" skipped by filter:`, rule.user_state_filter);
      }
      return matched;
    });

    console.log(`[EventDispatcher] Rules after filter: ${filteredRules.length}`);

    let sentCount = 0;

    for (const rule of filteredRules) {
      if (!categoryAllowed(settings, rule.category)) {
        console.log(`[EventDispatcher] Category "${rule.category}" not allowed by settings for rule: ${rule.rule_name}`);
        continue;
      }

      const canSend = await checkCooldown(
        supabase,
        user_id,
        rule.template_type,
        rule.cooldown_hours,
        rule.max_per_day
      );

      if (!canSend) {
        console.log(`[EventDispatcher] Cooldown active for rule "${rule.rule_name}" (template: ${rule.template_type})`);
        continue;
      }

      const template = await loadTemplate(supabase, rule.template_type, templateCache);

      if (!template) {
        console.warn('[EventDispatcher] Template not found:', rule.template_type);
        continue;
      }

      const variables = buildVariables(rule.event_type, payload, metrics, template);

      const sent = await sendViaNotificationSender({
        templateType: rule.template_type,
        userId: user_id,
        variables,
      });

      if (!sent) {
        console.warn(`[EventDispatcher] notification-sender failed to send for rule: ${rule.rule_name}`);
        continue;
      }

      sentCount += 1;
    }

    if (event_id) {
      await supabase
        .from('analytics_events_log')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('event_id', event_id)
        .catch((error) => {
          console.error('[EventDispatcher] Error marking event as processed:', error);
        });
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error('[EventDispatcher] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal error', details: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function determineUserState(metrics: UserMetrics | null): 'new' | 'active' | 'passive' | 'at_risk' {
  if (!metrics) return 'new';

  const now = Date.now();
  const lastLogin = metrics.last_login_at ? Date.parse(metrics.last_login_at) : null;
  const daysSince = lastLogin ? (now - lastLogin) / (1000 * 60 * 60 * 24) : Infinity;
  const streak = metrics.streak_days ?? 0;

  if (daysSince <= 3 && streak >= 3) return 'active';
  if (daysSince > 7) return 'passive';
  if (streak === 0) return 'at_risk';

  return 'active';
}

function matchesFilters(
  filter: RuleFilter | null,
  userState: string,
  settings: UserNotificationSettings | null,
  payload: EventPayload,
  metrics: UserMetrics | null
): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;

  if (filter.state && Array.isArray(filter.state)) {
    if (!filter.state.includes(userState)) {
      return false;
    }
  }

  if (typeof filter.coins_lt === 'number') {
    const coinsLeft = payload.coins_left;
    if (typeof coinsLeft !== 'number' || coinsLeft >= filter.coins_lt) return false;
  }

  if (typeof filter.season_progress_gt === 'number') {
    const progress = payload.season_progress;
    if (typeof progress !== 'number' || progress <= filter.season_progress_gt) return false;
  }

  return true;
}

function categoryAllowed(settings: UserNotificationSettings | null, category: string): boolean {
  if (!settings || settings.enabled === null) return true;
  if (settings.enabled === false) return false;

  if (settings.only_important && category && !IMPORTANT_CATEGORIES.has(category)) {
    return false;
  }

  let categories = settings.categories_enabled;
  if (typeof categories === 'string') {
    try {
      categories = JSON.parse(categories);
    } catch {
      categories = null;
    }
  }

  if (!categories || (Array.isArray(categories) && categories.length === 0)) return true;
  if (Array.isArray(categories) && categories.includes(category)) return true;

  return false;
}

async function checkCooldown(
  supabase: SupabaseClient,
  userId: string,
  templateType: string,
  cooldownHours: number,
  maxPerDay: number
): Promise<boolean> {
  if (!cooldownHours && !maxPerDay) return true;

  const now = new Date();
  const cooldownDate = cooldownHours
    ? new Date(now.getTime() - cooldownHours * 60 * 60 * 1000)
    : null;
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let query = supabase
    .from('notification_logs')
    .select('id, sent_at')
    .eq('user_id', userId)
    .eq('type', templateType)
    .order('sent_at', { ascending: false });

  if (cooldownDate) {
    query = query.gte('sent_at', cooldownDate.toISOString());
  } else if (maxPerDay) {
    query = query.gte('sent_at', dayAgo.toISOString());
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('[EventDispatcher] Cooldown query error:', error);
    return false;
  }

  if (!data || data.length === 0) {
    return true;
  }

  if (cooldownDate) {
    const latest = new Date(data[0].sent_at);
    if (latest >= cooldownDate) {
      return false;
    }
  }

  if (maxPerDay) {
    const countPerDay = data.filter(
      (item: { sent_at: string }) => new Date(item.sent_at) >= dayAgo
    ).length;
    if (countPerDay >= maxPerDay) {
      return false;
    }
  }

  return true;
}

async function loadTemplate(supabase: SupabaseClient, templateType: string, cache: Map<string, NotificationTemplate>): Promise<NotificationTemplate | null> {
  if (cache.has(templateType)) {
    return cache.get(templateType)!;
  }

  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('type', templateType)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[EventDispatcher] Template query error:', error);
    return null;
  }

  cache.set(templateType, data);
  return data;
}

function buildVariables(
  eventType: string,
  payload: EventPayload,
  metrics: UserMetrics | null,
  template: NotificationTemplate
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...payload };

  switch (eventType) {
    case 'duel_invite_created':
      base.opponent_name = payload.opponent_name || 'Соперник';
      base.num_questions = payload.num_questions || payload.question_count || 10;
      base.bet_amount = payload.bet_amount || 0;
      break;
    case 'duel_finished_win':
    case 'duel_finished_lose':
      base.your_score = payload.your_score ?? 0;
      base.opponent_score = payload.opponent_score ?? 0;
      base.personalized_comment = payload.personalized_comment || '';
      break;
    case 'reminder_daily':
      base.task_description = payload.task_description || '10 минут — 1 тест';
      break;
    case 'low_balance':
      base.coins_left = payload.coins_left ?? 0;
      break;
    case 'season_near_reward':
      base.reward_name = payload.reward_name || 'награда';
      base.season_progress = payload.season_progress;
      break;
    case 'inactive_3d':
    case 'inactive_7d':
      base.progress_percent = payload.progress_percent ?? metrics?.readiness_level ?? null;
      base.streak_was = payload.streak_was ?? metrics?.streak_days ?? 0;
      base.days_inactive = payload.days_inactive ?? (eventType === 'inactive_3d' ? 3 : 7);
      break;
    case 'streak_reminder':
      base.streak_days = payload.streak_days ?? metrics?.streak_days ?? null;
      break;
    case 'email_changed':
    case 'phone_changed':
      base.new_value = payload.new_value || '';
      base.old_value = payload.old_value || '';
      break;
    case 'identity_linked':
    case 'identity_unlinked':
      base.provider_name = payload.provider_name || 'Unknown';
      break;
    case 'suspicious_login':
      base.location = payload.location || 'Unknown location';
      base.ip_address = payload.ip_address || '';
      break;
    case 'almost_ready':
      base.readiness_level = payload.readiness_level ?? metrics?.readiness_level ?? null;
      break;
    case 'purchase_completed':
      base.product_name = payload.product_name || 'Покупка';
      break;
    case 'boost_purchase':
      base.boost_name = payload.boost_name || 'Boost';
      break;
    default:
      break;
  }

  if (metrics) {
    base.streak_days = metrics.streak_days ?? base.streak_days ?? null;
    base.readiness_level = metrics.readiness_level ?? base.readiness_level ?? null;
  }

  return base;
}

async function sendViaNotificationSender(params: {
  userId: string;
  templateType: string;
  variables: Record<string, unknown>;
}): Promise<boolean> {
  const response = await fetch(NOTIFICATION_SENDER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      user_id: params.userId,
      template_type: params.templateType,
      variables: params.variables,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[EventDispatcher] notification-sender error:', err);
    return false;
  }

  return true;
}
