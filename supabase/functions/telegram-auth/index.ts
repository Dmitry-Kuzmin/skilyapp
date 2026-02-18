import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncTelegramProfilePhoto } from '../_shared/telegram-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const requestBody = await req.json();
    console.log('[Telegram Auth] Request received:', JSON.stringify(requestBody));

    const { user, platform = 'telegram', referred_by_code } = requestBody;

    if (!user || !user.id) {
      return new Response(
        JSON.stringify({ error: 'User data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    let photoUrl = null;
    if (botToken) {
      try {
        photoUrl = await syncTelegramProfilePhoto(supabase, user.id as number, botToken, user.photo_url);
      } catch (e) {
        console.error('[Telegram Auth] Photo sync failed:', e);
      }
    } else {
      console.warn('[Telegram Auth] TELEGRAM_BOT_TOKEN missing, skipping photo sync');
    }

    let finalPhotoUrl = photoUrl || user.photo_url;

    const profilePayload: any = {
      telegram_id: user.id,
      first_name: user.first_name,
      last_name: user.last_name || null,
      username: user.username || null,
      language_code: user.language_code || null,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      platform: platform,
      is_premium: user.is_premium || false,
      settings: {
        theme: 'light',
        language: user.language_code || 'ru',
        notifications: true
      }
    };

    if (finalPhotoUrl) {
      profilePayload.photo_url = finalPhotoUrl;
    }

    // 4. Upsert profile
    console.log(`[Telegram Auth] Upserting profile for tg_id: ${user.id}`);

    // First, check by telegram_id
    const { data: existingProf, error: findError } = await supabase
      .from('profiles')
      .select('id, trial_until, referral_code, referred_by, coins')
      .eq('telegram_id', user.id)
      .maybeSingle();

    if (findError) {
      console.error('[Telegram Auth] Find error:', findError);
      throw findError;
    }

    let profile: any = null;
    if (existingProf) {
      const { data: updatedProf, error: updateError } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', existingProf.id)
        .select('id, trial_until, referral_code, referred_by, coins, xp, streak_days, first_name, last_name, username, photo_url')
        .single();

      if (updateError) {
        console.error('[Telegram Auth] Update error:', updateError);
        throw updateError;
      }
      profile = updatedProf;
    } else {
      const { data: insertedProf, error: insertError } = await supabase
        .from('profiles')
        .insert(profilePayload)
        .select('id, trial_until, referral_code, referred_by, coins, xp, streak_days, first_name, last_name, username, photo_url')
        .single();

      if (insertError) {
        console.error('[Telegram Auth] Insert error:', insertError);
        throw insertError;
      }
      profile = insertedProf;
    }

    // Link history
    try {
      await supabase.from('telegram_link_history').insert({
        profile_id: profile.id,
        telegram_id: user.id,
        action: 'linked',
        metadata: { source: platform, username: user.username },
      }).select().maybeSingle();
    } catch (e) { /* ignore history errors */ }

    // Trial
    if (!profile.trial_until) {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 3);
      await supabase.from('profiles').update({ trial_until: trialEnds.toISOString() }).eq('id', profile.id);
      profile.trial_until = trialEnds.toISOString();
    }

    // Referral code
    if (!profile.referral_code) {
      const { data: codeResult, error: codeError } = await supabase.rpc('generate_referral_code');
      if (!codeError && codeResult) {
        await supabase.from('profiles').update({ referral_code: codeResult }).eq('id', profile.id);
        profile.referral_code = codeResult;
      }
    }

    // Referral processing
    if (referred_by_code && !profile.referred_by) {
      const { data: referralResult, error: referralError } = await supabase.rpc('create_referral', {
        p_referrer_code: referred_by_code,
        p_referred_id: profile.id
      });

      if (!referralError && referralResult && referralResult[0]?.success) {
        const res = referralResult[0];
        // Send notification
        if (res.result_referrer_id) {
          await supabase.rpc('send_referral_notification', {
            p_referrer_id: res.result_referrer_id,
            p_referred_name: profile.first_name || profile.username || 'User',
            p_bonus_amount: res.referred_bonus || 50,
            p_notification_type: 'referral_joined'
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, profile, token: btoa(user.id.toString()) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Telegram Auth] CRITICAL ERROR:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
