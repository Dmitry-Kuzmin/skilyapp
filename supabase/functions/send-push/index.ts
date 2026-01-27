// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { userId, title, body, icon, badge, image, url, actions, data } = await req.json();

        if (!userId || !title || !body) {
            throw new Error('Missing required fields: userId, title, body');
        }

        // Инициализация Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Инициализация Web Push
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
        const vapidSubject = Deno.env.get('VAPID_SUBJECT');
        // Мы знаем Public Key (можно захардкодить или тоже в env, но он не секретный)
        // Но для web-push библиотеки он не обязателен при sendNotification,
        // главное setVapidDetails настроить с парой.
        // Лучше передать Public Key тоже через env VITE_VAPID_PUBLIC_KEY если есть, или взять из клиента.
        // Но так как мы генерируем хедеры сами или библиотека сама подписывает, нам нужен pair.

        // ВАЖНО: web-push library требует оба ключа для подписи.
        // Public Key: BIbTbtur6M7ge2EeItW-bpqGt1MIjiOcJdT4EeUI4cqEB2Nz7fZz2ql734VCtJb6V5B0wco48SCYkujejZ3f6WI
        const vapidPublicKey = "BIbTbtur6M7ge2EeItW-bpqGt1MIjiOcJdT4EeUI4cqEB2Nz7fZz2ql734VCtJb6V5B0wco48SCYkujejZ3f6WI";

        webpush.setVapidDetails(
            vapidSubject!,
            vapidPublicKey,
            vapidPrivateKey!
        );

        // Получаем подписки пользователя
        const { data: subscriptions, error: dbError } = await supabaseClient
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (dbError) throw dbError;

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`No subscriptions found for user ${userId}`);
            return new Response(JSON.stringify({ success: true, message: 'No subscriptions' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Found ${subscriptions.length} subscriptions for user ${userId}`);

        // Формируем payload
        const payload = JSON.stringify({
            title,
            body,
            icon: icon || '/icon-192.png',
            badge: badge || '/badge-72.png',
            image, // Большая картинка
            data: {
                url: url || '/',
                ...(data || {})
            },
            actions: actions || [
                { action: 'open', title: '🚀 Открыть' }
            ]
        });

        // Отправляем пуши
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    const pushSubscription = {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth
                        }
                    };

                    await webpush.sendNotification(pushSubscription, payload);
                    return { success: true, endpoint: sub.endpoint };
                } catch (error: any) {
                    console.error(`Error sending push to ${sub.id}:`, error);

                    // Если подписка устарела (404/410), удаляем её
                    if (error.statusCode === 404 || error.statusCode === 410) {
                        await supabaseClient
                            .from('push_subscriptions')
                            .delete()
                            .eq('id', sub.id);
                        console.log(`Deleted expired subscription ${sub.id}`);
                    }

                    throw error;
                }
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return new Response(JSON.stringify({
            success: true,
            sent: successful,
            failed,
            total: subscriptions.length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
