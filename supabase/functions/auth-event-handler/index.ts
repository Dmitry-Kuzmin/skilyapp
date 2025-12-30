// =====================================================
// Auth Event Handler
// =====================================================
// Обрабатывает события безопасности Supabase Auth

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EVENT_DISPATCHER_URL = `${SUPABASE_URL}/functions/v1/user-event-dispatcher`;

const AUTH_EVENTS = [
  'password_changed', 'email_changed', 'phone_changed',
  'identity_linked', 'identity_unlinked',
  'mfa_enrolled', 'mfa_unenrolled', 'suspicious_login'
] as const;

type AuthEventType = typeof AUTH_EVENTS[number];

interface AuthEventPayload {
  event_type: AuthEventType;
  user_id: string;
  old_value?: string;
  new_value?: string;
  provider_name?: string;
  provider_email?: string;
  location?: string;
  device_info?: string;
  ip_address?: string;
}

interface DispatcherPayload {
  user_id: string;
  old_email?: string;
  new_email?: string;
  old_phone?: string;
  new_phone?: string;
  provider_name?: string;
  provider_email?: string;
  location?: string;
  device_info?: string;
  ip_address?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: AuthEventPayload = await req.json();
    const { event_type, user_id, old_value, new_value, provider_name, provider_email, location, device_info, ip_address } = body;

    if (!event_type || !user_id) {
      return new Response(JSON.stringify({ error: 'event_type and user_id are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createPooledSupabaseClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, telegram_id, user_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('[AuthEventHandler] Error fetching profile:', profileError);
    }

    if (!profile || !profile.telegram_id) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'no_telegram_profile' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const dispatcherPayload: DispatcherPayload = {
      user_id: profile.id,
    };

    switch (event_type) {
      case 'email_changed':
        dispatcherPayload.old_email = old_value;
        dispatcherPayload.new_email = new_value;
        break;
      case 'phone_changed':
        dispatcherPayload.old_phone = old_value;
        dispatcherPayload.new_phone = new_value;
        break;
      case 'identity_linked':
      case 'identity_unlinked':
        dispatcherPayload.provider_name = provider_name || 'Unknown';
        dispatcherPayload.provider_email = provider_email;
        break;
      case 'suspicious_login':
        dispatcherPayload.location = location;
        dispatcherPayload.device_info = device_info;
        dispatcherPayload.ip_address = ip_address;
        break;
    }

    const event_id = `auth_${event_type}_${user_id}_${Date.now()}`;

    const dispatcherResponse = await fetch(EVENT_DISPATCHER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({
        event_id,
        user_id: profile.id,
        event_type,
        payload: dispatcherPayload,
        override_template_type: event_type,
      }),
    });

    if (!dispatcherResponse.ok) {
      const errorText = await dispatcherResponse.text();
      console.error('[AuthEventHandler] Dispatcher error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to dispatch event' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const dispatcherResult = await dispatcherResponse.json();

    return new Response(JSON.stringify({
      success: true,
      event_type,
      user_id: profile.id,
      notification_sent: dispatcherResult.success !== false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[AuthEventHandler] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
