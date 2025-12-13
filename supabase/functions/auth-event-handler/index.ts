// =====================================================
// Auth Event Handler
// =====================================================
// Обрабатывает события безопасности Supabase Auth
// (password changed, email changed, MFA enrolled/unenrolled, etc.)
// и отправляет уведомления через user-event-dispatcher

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EVENT_DISPATCHER_URL = `${SUPABASE_URL}/functions/v1/user-event-dispatcher`;

interface AuthEventPayload {
  event_type: 'password_changed' | 'email_changed' | 'phone_changed' | 
               'identity_linked' | 'identity_unlinked' | 
               'mfa_enrolled' | 'mfa_unenrolled' | 'suspicious_login';
  user_id: string;
  old_value?: string; // Старое значение (email, phone)
  new_value?: string; // Новое значение (email, phone)
  provider_name?: string; // Для identity_linked/unlinked
  provider_email?: string; // Для identity_linked
  location?: string; // Для suspicious_login
  device_info?: string; // Для suspicious_login
  ip_address?: string; // Для suspicious_login
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

    const body: AuthEventPayload = await req.json();
    const { event_type, user_id, old_value, new_value, provider_name, provider_email, location, device_info, ip_address } = body;

    if (!event_type || !user_id) {
      return new Response(JSON.stringify({ error: 'event_type and user_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем профиль пользователя для отправки уведомления
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, telegram_id, user_id, email, first_name')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('[AuthEventHandler] Error fetching profile:', profileError);
    }

    // Если нет профиля или нет telegram_id, пропускаем уведомление
    if (!profile || !profile.telegram_id) {
      console.log('[AuthEventHandler] No Telegram profile found, skipping notification');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'no_telegram_profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Формируем payload для user-event-dispatcher
    const eventPayload: Record<string, any> = {
      user_id: profile.id,
    };

    // Добавляем специфичные данные в зависимости от типа события
    switch (event_type) {
      case 'email_changed':
        eventPayload.old_email = old_value;
        eventPayload.new_email = new_value;
        break;
      case 'phone_changed':
        eventPayload.old_phone = old_value;
        eventPayload.new_phone = new_value;
        break;
      case 'identity_linked':
      case 'identity_unlinked':
        eventPayload.provider_name = provider_name || 'Unknown';
        eventPayload.provider_email = provider_email;
        break;
      case 'suspicious_login':
        eventPayload.location = location;
        eventPayload.device_info = device_info;
        eventPayload.ip_address = ip_address;
        break;
    }

    // Генерируем уникальный event_id для дедупликации
    const event_id = `auth_${event_type}_${user_id}_${Date.now()}`;

    // Отправляем событие в user-event-dispatcher
    const dispatcherResponse = await fetch(EVENT_DISPATCHER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        event_id,
        user_id: profile.id,
        event_type,
        payload: eventPayload,
        override_template_type: event_type, // Используем тип события как тип шаблона
      }),
    });

    if (!dispatcherResponse.ok) {
      const errorText = await dispatcherResponse.text();
      console.error('[AuthEventHandler] Dispatcher error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to dispatch event', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dispatcherResult = await dispatcherResponse.json();
    console.log('[AuthEventHandler] Event dispatched:', event_type, dispatcherResult);

    return new Response(
      JSON.stringify({
        success: true,
        event_type,
        user_id: profile.id,
        notification_sent: dispatcherResult.success !== false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[AuthEventHandler] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});




