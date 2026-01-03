import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  country?: 'spain' | 'russia';
  mode?: 'chat' | 'debrief';
}

interface UsageData {
  limit_reached: boolean;
  current_count: number;
}

const getSystemPrompt = (country: string = 'spain'): string => {
  if (country === 'russia') {
    return `# ROLE & PERSONA
Ты — Skily 💡, элитный ИИ-инструктор и абсолютный эксперт по ПДД РФ.

🎭 ТВОЙ ХАРАКТЕР:
- Профессиональный, но свойский («Друг-инструктор»).
- Поддерживающий.
- Лаконичный.
- Эмодзи (🚗, 🛑, 💡).

# CRITICAL KNOWLEDGE BASE
1. ПДД РФ 2024/2025.
2. Иерархия: Регулировщик > Временные знаки > Постоянные знаки > Светофор > Разметка.

# ANALYSIS ALGORITHM
1. Visual Scan.
2. Visual Comparison.
3. Semantic Check.
4. Relevance Filter.

# INTERACTION GUIDELINES
1. Hint Mode: Натолкнуть на мысль.
2. Explanation Mode: Ответ + ПДД пункт.

# ANTI-HALLUCINATION
Только официальные названия.

Отвечай на русском языке.`;
  }

  return `You are Skily 💡, a friendly AI mentor for the DGT driving exam in Spain.
Write grammatically correct text.
Answer ONLY about Spain.
Short clear answers (2-3 sentences for hints).
Respond in the SAME LANGUAGE the user writes in.`;
};

async function tryGroq(messages: Message[], country: string = 'spain', mode: string = 'chat', modelName: string = 'gemma2-9b-it'): Promise<Response | null> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return null;

  try {
    // 🔥 Если mode === 'debrief', НЕ добавляем system prompt (unified prompt уже в messages)
    const systemMessage = mode === 'debrief' ? [] : [{ role: 'system', content: getSystemPrompt(country) }];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [...systemMessage, ...messages],
        stream: true,
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) return null;
    return new Response(response.body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
  } catch { return null; }
}

async function tryGemini(messages: Message[], country: string = 'spain', mode: string = 'chat'): Promise<Response | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;

  try {
    let prompt = mode === 'debrief' ? '' : getSystemPrompt(country) + '\n\n';
    messages.forEach(m => prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n\n`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4000 }
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Ошибка ИИ.";
    const ssePayload = `data: ${JSON.stringify({ choices: [{ delta: { content: aiText } }] })}\n\ndata: [DONE]\n\n`;

    return new Response(ssePayload, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({ identifier: clientIP, limit: 30, windowMs: 60000 });
  if (!rateLimit.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const body: ChatRequest = await req.json();
    const { messages, country = 'spain', mode = 'chat' } = body;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabase = createPooledSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

      if (user && mode !== 'debrief') {
        const { data: usage } = await supabase.rpc('increment_ai_usage', { p_user_id: user.id }) as { data: UsageData[] | null };
        if (usage?.[0]?.limit_reached) {
          return new Response(JSON.stringify({ error: 'daily_limit_reached', message: 'Дневной лимит Skily исчерпан. Попробуй завтра или активируй Premium!' }), { status: 429, headers: corsHeaders });
        }
      }
    }

    // 1️⃣ Приоритет: Gemini 2.0 Flash
    const gemini = await tryGemini(messages, country, mode);
    if (gemini) return gemini;

    // 2️⃣ Fallback: Groq (если Gemini недоступен)
    const groq = await tryGroq(messages, country, mode);
    if (groq) return groq;

    // 3️⃣ Только если оба не работают → ошибка
    return new Response(JSON.stringify({ error: 'AI unavailable' }), { status: 503, headers: corsHeaders });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: corsHeaders });
  }
});
