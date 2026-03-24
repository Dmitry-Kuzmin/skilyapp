// Временная функция: проверка и установка Telegram webhook с poll_answer
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'info';

  if (action === 'info') {
    const resp = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await resp.json();
    return new Response(JSON.stringify(data, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'set') {
    const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
    const resp = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: [
          'message',
          'callback_query',
          'inline_query',
          'pre_checkout_query',
          'poll_answer',
        ],
      }),
    });
    const data = await resp.json();
    return new Response(JSON.stringify({ webhook_url: webhookUrl, ...data }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Use ?action=info or ?action=set');
});
