import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt for AI assistant with Lumi character
const systemPrompt = `Ты — Lumi 💡, дружелюбный помощник-светлячок, который помогает готовиться к экзамену DGT (Dirección General de Tráfico) в Испании.

🎭 ТВОЙ ХАРАКТЕР:
- Дружелюбный, позитивный и подбадривающий
- Терпеливый и понимающий
- Используешь эмодзи умеренно (💡, ✨, 🚗, 🎯, 💪, ⚠️)
- Хвалишь успехи и мотивируешь при ошибках

🇪🇸 КОНТЕКСТ: Все ответы должны быть про ИСПАНСКИЕ правила дорожного движения и экзамен DGT.

ВАЖНО:
- Пиши ГРАМОТНО по-русски, без орфографических ошибок
- Отвечай ТОЛЬКО про Испанию (не "в некоторых странах")
- Штрафы — в ЕВРО, скорости — в км/ч
- Используй испанские термины: autopista, autovía, rotonda, carril BUS, paso de peatones
- Будь конкретным: называй цифры, расстояния, штрафы

СТИЛЬ ОТВЕТА:
- Естественный разговорный язык (как дружелюбный наставник)
- Короткие понятные ответы: 2-3 предложения для подсказок, 2-3 абзаца для объяснений
- Сначала суть, потом детали
- Примеры из реальной жизни в Испании
- Без извинений и формальных вводных фраз

КОГДА ДАЕШЬ ПОДСКАЗКУ:
- НЕ раскрывай правильный ответ полностью
- Направь мысли в правильную сторону
- Задай наводящий вопрос
- Помоги вспомнить правило, а не просто дай ответ

КОГДА ОБЪЯСНЯЕШЬ ПОСЛЕ ОШИБКИ:
- Сначала подбодри: "Ничего страшного! 💪"
- Объясни ПОЧЕМУ правильный ответ правильный
- Укажи на распространенную ошибку
- Дай совет, как запомнить

ПРИМЕРЫ ТВОИХ ФРАЗ:
- "Отлично думаешь! 💡 Давай разберем..."
- "Хороший вопрос! ✨ В Испании это работает так..."
- "Не переживай! Многие путают это правило. Вот как запомнить..."
- "Молодец! 🎯 Ты на правильном пути!"

Отвечай на том языке, на котором спрашивают (русский или испанский).`;

// Try Groq first (faster and free)
async function tryGroq(messages: any[], modelName: string = 'llama-3.3-70b-versatile'): Promise<Response | null> {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  
  if (!GROQ_API_KEY) {
    console.log('[AI Chat] Groq API key not found, skipping Groq');
    return null;
  }

  try {
    console.log(`[AI Chat] Trying Groq API with model: ${modelName}...`);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Chat] Groq API error with ${modelName}:`, response.status, errorText);
      return null;
    }

    console.log(`[AI Chat] ✅ Groq API success with model: ${modelName}`);
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error(`[AI Chat] Groq API exception with ${modelName}:`, error);
    return null;
  }
}

// Try multiple Groq models in order
async function tryGroqWithFallback(messages: any[]): Promise<Response | null> {
  // List of models to try in order (prioritized for Russian language support)
  const models = [
    'mixtral-8x7b-32768',        // Best for Russian, fast and reliable
    'llama-3.3-70b-versatile',   // Backup: latest but weaker Russian
    'llama-3.1-8b-instant',      // Fastest fallback
  ];

  for (const model of models) {
    const response = await tryGroq(messages, model);
    if (response) {
      return response;
    }
  }

  return null;
}

// Try Google Gemini API directly (free tier)
async function tryGemini(messages: any[]): Promise<Response | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    console.log('[AI Chat] Gemini API key not found, skipping Gemini');
    return null;
  }

  try {
    console.log('[AI Chat] Trying Google Gemini API...');
    
    // Преобразуем формат сообщений для Gemini
    let prompt = systemPrompt + '\n\n';
    for (const msg of messages) {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Chat] Gemini API error:', response.status, errorText);
      return null;
    }

    console.log('[AI Chat] ✅ Gemini API success');
    
    // Преобразуем ответ Gemini в формат SSE (Server-Sent Events)
    const reader = response.body?.getReader();
    if (!reader) {
      return null;
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (text) {
                  // Отправляем в формате OpenAI SSE
                  const sseData = {
                    choices: [{
                      delta: { content: text }
                    }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(sseData)}\n\n`));
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        } catch (error) {
          console.error('[AI Chat] Gemini streaming error:', error);
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('[AI Chat] Gemini API exception:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 🛑 RATE LIMITING - защита от DDoS (AI дорогая операция)
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({
    identifier: clientIP,
    limit: 30, // 30 запросов (AI дорогое)
    windowMs: 60000, // в минуту
  });
  
  if (!rateLimit.allowed) {
    console.warn('[ai-chat] Rate limit exceeded:', {
      ip: clientIP,
      remaining: rateLimit.remaining,
      resetAt: new Date(rateLimit.resetAt).toISOString(),
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: 'AI chat is rate limited. Please wait before trying again.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      { 
        status: 429,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    console.log('[AI Chat] Request received:', {
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.get('Authorization')
    });

    // Parse request body
    let messages: any[] = [];
    try {
      const body = await req.json();
      messages = body.messages || [];
    } catch (parseError) {
      console.error('[AI Chat] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format. Expected array of messages.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header (optional since verify_jwt = false)
    const authHeader = req.headers.get('Authorization');
    
    // Try to get user if auth header is provided (optional)
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: { headers: { Authorization: authHeader } }
          }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          console.log('[AI Chat] Authenticated user:', user.id);
        } else {
          console.log('[AI Chat] No authenticated user, continuing without auth');
        }
      } catch (authError) {
        console.log('[AI Chat] Auth check failed, continuing without auth');
      }
    } else {
      console.log('[AI Chat] No auth header provided, continuing without auth');
    }

    console.log('[AI Chat] Processing request with', messages.length, 'messages');

    // Try Google Gemini API FIRST - better for Russian and fewer errors
    const geminiResponse = await tryGemini(messages);
    if (geminiResponse) {
      return geminiResponse;
    }

    // Fallback to Groq if Gemini unavailable
    const groqResponse = await tryGroqWithFallback(messages);
    if (groqResponse) {
      return groqResponse;
    }

    // No API available
    console.error('[AI Chat] ❌ No AI provider available');
    return new Response(
      JSON.stringify({ 
        error: 'AI service temporarily unavailable. Please configure GEMINI_API_KEY or GROQ_API_KEY in Supabase secrets.' 
      }),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (e) {
    console.error('[AI Chat] Unexpected error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
