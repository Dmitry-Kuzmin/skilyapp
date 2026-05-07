// Public endpoint — отписка от email рассылок по адресу
// POST { email, type, resubscribe? }
// type: "points-reminder" | "quiz" | "all"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const supabase = createPooledSupabaseClient(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const { email, type = 'points-reminder', resubscribe = false } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'email required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Ищем auth user по email
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authUser = (authData?.users ?? []).find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!authUser) {
      // Не раскрываем что email не найден — просто говорим ок
      return new Response(JSON.stringify({ ok: true, already: false }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Получаем профиль
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, settings')
      .eq('user_id', authUser.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ ok: true, already: false }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const settings = { ...(profile.settings ?? {}) };

    // Ключ отписки зависит от типа
    const flagKey = type === 'all' ? 'email_all_disabled'
      : type === 'quiz'           ? 'email_quiz_disabled'
      :                             'email_points_reminder_disabled';

    const alreadySet = settings[flagKey] === true;

    if (resubscribe) {
      delete settings[flagKey];
    } else {
      settings[flagKey] = true;
    }

    await supabase.from('profiles').update({ settings }).eq('id', profile.id);

    console.log(`[Unsubscribe] ${email} type=${type} resubscribe=${resubscribe} already=${alreadySet}`);

    return new Response(JSON.stringify({ ok: true, already: alreadySet }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[Unsubscribe] Error:', err);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
