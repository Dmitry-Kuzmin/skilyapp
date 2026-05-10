import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

// Driving-test vocabulary hint biases Whisper toward correct domain terms.
// Whisper accepts a max ~224 token "prompt" — keep it short and language-specific.
const PROMPT_BY_LANG: Record<string, string> = {
    ru: 'ПДД, ГИБДД, светофор, разметка, обгон, перекрёсток, дорожный знак, полоса, скорость, штраф, водитель, пешеход, зебра, кольцо, главная дорога.',
    es: 'DGT, permiso de conducir, semáforo, glorieta, ceda el paso, prioridad, señal, carril, velocidad, multa, peatón, intersección, autovía, autopista, adelantamiento.',
    en: 'DGT, driving license, traffic light, roundabout, yield, priority, sign, lane, speed, fine, pedestrian, intersection, highway, overtake.',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const groqKey = Deno.env.get('GROQ_API_KEY');
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (!groqKey && !openaiKey) {
            return json({ error: 'No transcription provider configured' }, 500);
        }

        const formData = await req.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File) && !(file as Blob).size) {
            return json({ error: 'No audio file uploaded' }, 400);
        }

        const rawLang = String(formData.get('language') || 'ru').toLowerCase();
        const language = ['ru', 'es', 'en'].includes(rawLang) ? rawLang : 'ru';
        const prompt = PROMPT_BY_LANG[language];

        const size = (file as Blob).size;
        console.log(`[STT] size=${size}b lang=${language} provider=${groqKey ? 'groq' : 'openai'}`);

        // Reject empty/tiny blobs early — usually means the user cancelled mid-record
        if (size < 1024) return json({ text: '' });

        const upstreamForm = new FormData();
        upstreamForm.append('file', file as Blob, 'voice.webm');
        upstreamForm.append('language', language);
        upstreamForm.append('response_format', 'json');
        upstreamForm.append('temperature', '0');
        upstreamForm.append('prompt', prompt);

        let endpoint: string;
        let auth: string;
        if (groqKey) {
            // Groq's whisper-large-v3-turbo: ~10x faster than OpenAI, same accuracy.
            upstreamForm.append('model', 'whisper-large-v3-turbo');
            endpoint = 'https://api.groq.com/openai/v1/audio/transcriptions';
            auth = `Bearer ${groqKey}`;
        } else {
            upstreamForm.append('model', 'whisper-1');
            endpoint = 'https://api.openai.com/v1/audio/transcriptions';
            auth = `Bearer ${openaiKey}`;
        }

        const upstream = await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: auth },
            body: upstreamForm,
        });

        if (!upstream.ok) {
            const errText = await upstream.text();
            console.error('[STT] upstream error', upstream.status, errText);
            return json({ error: `Transcription failed (${upstream.status})` }, 502);
        }

        const data = await upstream.json();
        const text = String(data?.text || '').trim();
        console.log(`[STT] ok len=${text.length}`);
        return json({ text });
    } catch (err) {
        console.error('[STT] fatal', err);
        return json({ error: (err as Error).message || 'Internal error' }, 500);
    }
});
