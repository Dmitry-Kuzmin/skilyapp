import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            throw new Error('No audio file uploaded');
        }

        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiApiKey) {
            throw new Error('OPENAI_API_KEY is not set');
        }

        const language = formData.get('language') || 'ru'; // Default to Russian if not provided

        console.log(`Processing audio file... Size: ${(file as File).size} bytes, Language: ${language}`);

        // Create form data for OpenAI
        const openaiFormData = new FormData();
        openaiFormData.append('file', file);
        openaiFormData.append('model', 'whisper-1');
        openaiFormData.append('language', language as string);
        openaiFormData.append('response_format', 'json');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: openaiFormData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI Whisper API error:', errorData);
            throw new Error(`OpenAI Whisper API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        console.log('Transcription successful:', data.text);

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error processing audio:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
