import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncTelegramProfilePhoto } from '../_shared/telegram-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Telegram Auth] Request received:', {
    method: req.method,
    url: req.url,
    headers: {
      origin: req.headers.get('origin'),
      contentType: req.headers.get('content-type')
    }
  });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody = await req.json();
    console.log('[Telegram Auth] Request body received:', {
      hasUser: !!requestBody.user,
      userId: requestBody.user?.id,
      platform: requestBody.platform
    });

    const { user, platform = 'telegram', referred_by_code } = requestBody;

    console.log('[Telegram Auth] Processing user:', {
      userId: user?.id,
      firstName: user?.first_name,
      lastName: user?.last_name,
      username: user?.username,
      platform,
      referredByCode: referred_by_code
    });

    if (!user || !user.id) {
      console.error('[Telegram Auth] Missing user data');
      return new Response(
        JSON.stringify({ error: 'User data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
    const photoUrl = await syncTelegramProfilePhoto(supabase, user.id as number, botToken, user.photo_url);

    // Определяем финальный URL фото:
    // 1. Загруженный в Storage (photoUrl)
    // 2. Исходный из Telegram (user.photo_url)
    // 3. Если ничего нет - null
    let finalPhotoUrl = photoUrl;
    if (!finalPhotoUrl && user.photo_url) {
      console.log(`[telegram-auth] Storage sync failed, falling back to raw Telegram URL`);
      finalPhotoUrl = user.photo_url;
    }

    const profilePayload: any = {
      telegram_id: user.id,
      first_name: user.first_name,
      last_name: user.last_name || null,
      username: user.username || null,
      language_code: user.language_code || null,
      is_premium: user.is_premium || false,
      platform: platform,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      settings: {
        theme: 'light',
        language: user.language_code || 'en',
        notifications: true
      }
    };

    // Обновляем фото только если нашли новое, иначе оставляем как есть
    if (finalPhotoUrl) {
      profilePayload.photo_url = finalPhotoUrl;
    }


    // Сначала ищем по telegram_id
    let { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', user.id)
      .maybeSingle();

    if (profile) {
      const { data: updatedProf, error: updateError } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', profile.id)
        .select()
        .single();

      profile = updatedProf;
      upsertError = updateError;
    } else {
      // Иначе вставляем (триггер handle_new_user здесь не должен мешать, так как telegram-auth не создает auth.users напрямую)
      const { data: insertedProf, error: insertError } = await supabase
        .from('profiles')
        .insert(profilePayload)
        .select()
        .single();

      profile = insertedProf;
      upsertError = insertError;
    }

    if (upsertError) {
      console.error('[Telegram Auth] Upsert error:', {
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        code: upsertError.code
      });
      return new Response(
        JSON.stringify({ error: upsertError.message, details: upsertError.details }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Telegram Auth] Profile saved successfully:', {
      profileId: profile.id,
      telegramId: profile.telegram_id,
      firstName: profile.first_name,
      platform: profile.platform,
      hasReferralCode: !!profile.referral_code
    });

    // Log link history once
    try {
      const { data: existingLink } = await supabase
        .from('telegram_link_history')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('action', 'linked')
        .limit(1);

      if (!existingLink || existingLink.length === 0) {
        await supabase.from('telegram_link_history').insert({
          profile_id: profile.id,
          telegram_id: user.id,
          action: 'linked',
          metadata: {
            source: platform,
            username: user.username || null,
          },
        });
      }
    } catch (historyError) {
      console.warn('[Telegram Auth] Failed to record link history:', historyError);
    }

    // Assign trial period if not set
    if (!profile.trial_until) {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 3);
      await supabase
        .from('profiles')
        .update({ trial_until: trialEnds.toISOString() })
        .eq('id', profile.id);
      profile.trial_until = trialEnds.toISOString();
    }

    // Generate referral code if doesn't exist
    if (!profile.referral_code) {
      console.log('[Telegram Auth] Generating referral code for profile:', profile.id);
      const { data: codeResult, error: codeError } = await supabase.rpc('generate_referral_code');

      if (!codeError && codeResult) {
        await supabase
          .from('profiles')
          .update({ referral_code: codeResult })
          .eq('id', profile.id);

        profile.referral_code = codeResult;
        console.log('[Telegram Auth] Referral code generated:', codeResult);
      }
    }

    // Handle referral if code provided and user is new (or hasn't been referred yet)
    if (referred_by_code && !profile.referred_by) {
      console.log('[Telegram Auth] Processing referral with code:', referred_by_code);

      const { data: referralResult, error: referralError } = await supabase.rpc('create_referral', {
        p_referrer_code: referred_by_code,
        p_referred_id: profile.id
      });

      if (referralError) {
        console.error('[Telegram Auth] Referral error:', referralError);
      } else if (referralResult && referralResult.length > 0) {
        const result = referralResult[0];
        console.log('[Telegram Auth] Referral processed:', {
          success: result.success,
          message: result.message,
          referredBonus: result.referred_bonus
        });

        if (result.success && result.result_referrer_id) {
          // Reload profile to get updated coins
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profile.id)
            .single();

          if (updatedProfile) {
            Object.assign(profile, updatedProfile);
            console.log('[Telegram Auth] Profile updated with referral bonus. New coins:', profile.coins);
          }

          // Send notification to referrer
          const referredName = profile.first_name || profile.username || 'Новый пользователь';
          const { data: notificationId, error: notifError } = await supabase.rpc('send_referral_notification', {
            p_referrer_id: result.result_referrer_id,
            p_referred_name: referredName,
            p_bonus_amount: result.referred_bonus,
            p_notification_type: 'referral_joined'
          });

          if (notifError) {
            console.error('[Telegram Auth] Error sending referral notification:', notifError);
          } else {
            console.log('[Telegram Auth] Referral notification sent:', notificationId);
          }
        }
      }
    }

    // Generate a simple JWT-like token (for demo purposes)
    // In production, use proper JWT signing
    const token = btoa(JSON.stringify({
      telegram_id: user.id,
      username: user.username,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    }));

    console.log('[Telegram Auth] Sending success response with profile ID:', profile.id);

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Telegram Auth] Unexpected error:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
