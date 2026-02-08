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
  showComparison?: boolean;
}

interface UsageData {
  limit_reached: boolean;
  current_count: number;
}

const getSystemPrompt = (country: string = 'spain', showComparison: boolean = true): string => {
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

  // Spain Logic
  let comparisonLogic = "";
  if (showComparison) {
    comparisonLogic = `
# 🇷🇺 VS 🇪🇸 COMPARISON MODE (ACTIVE)
Ты ОБЯЗАН сравнивать правила Испании и РФ, если есть отличия.
1. Если правило отличается от РФ:
   - Напиши: "⚠️ Внимание! В РФ это <как в РФ>, а здесь <как в Испании>."
   - Объясни, почему это важно (штраф, опасность).
2. Если правило такое же:
   - Напиши: "✅ Как и в РФ, здесь <правило>."
`;
  } else {
    comparisonLogic = `
# ⛔ NO COMPARISON MODE
- Ты объясняешь ТОЛЬКО правила Испании (DGT).
- ЗАПРЕЩЕНО упоминать правила РФ или сравнивать с ними.
- Концентрируйся только на испанской специфике.
`;
  }

  return `You are Skily 💡, a friendly AI mentor for the DGT driving exam in Spain.
Write grammatically correct text.
Answer ONLY about Spain.

${comparisonLogic}

# TONE & STYLE
- Friendly, encouraging, professional.
- Use emojis significantly (🚗, 🇪🇸, ⚠️, ✅).
- Be concise but clear.

# FORMATTING
- Use Markdown.
- Highlight key terms in **bold**.
- Use lists for readability.

Respond in the SAME LANGUAGE the user writes in (usually Russian).`;
};

async function tryGroq(messages: Message[], country: string = 'spain', mode: string = 'chat', showComparison: boolean = true, modelName: string = 'llama-3.1-8b-instant'): Promise<Response | null> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return null;

  try {
    // 🔥 Если mode === 'debrief', НЕ добавляем system prompt (unified prompt уже в messages)
    const systemMessage = mode === 'debrief' ? [] : [{ role: 'system', content: getSystemPrompt(country, showComparison) }];

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Chat] Groq error (${response.status}):`, errorText);
      return null;
    }
    return new Response(response.body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
  } catch (err) {
    console.error('[AI Chat] Groq exception:', err);
    return null;
  }
}

async function tryGemini(messages: Message[], country: string = 'spain', mode: string = 'chat', showComparison: boolean = true): Promise<Response | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;

  try {
    let prompt = mode === 'debrief' ? '' : getSystemPrompt(country, showComparison) + '\n\n';
    messages.forEach(m => prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n\n`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4000 }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Chat] Gemini error (${response.status}):`, errorText);
      return null;
    }
    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Ошибка ИИ.";
    const ssePayload = `data: ${JSON.stringify({ choices: [{ delta: { content: aiText } }] })}\n\ndata: [DONE]\n\n`;

    return new Response(ssePayload, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  } catch (err) {
    console.error('[AI Chat] Gemini exception:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({ identifier: clientIP, limit: 30, windowMs: 60000 });
  if (!rateLimit.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const body: ChatRequest = await req.json();
    const { messages, country = 'spain', mode = 'chat', showComparison = true } = body;

    console.log('[AI Chat] Request:', {
      mode,
      country,
      showComparison,
      messagesCount: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) + '...'
    });

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabase = createPooledSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

      if (user && mode !== 'debrief') {
        const { data: usage } = await supabase.rpc('increment_ai_usage', { p_user_id: user.id }) as { data: UsageData[] | null };
        if (usage?.[0]?.limit_reached) {
          console.log('[AI Chat] Limit reached for user:', user.id);
          return new Response(JSON.stringify({ error: 'daily_limit_reached', message: 'Дневной лимит Skily исчерпан. Попробуй завтра или активируй Premium!' }), { status: 429, headers: corsHeaders });
        }
      }
    }

    // 1️⃣ Приоритет: Gemini 3 Flash Preview
    console.log('[AI Chat] Trying Gemini 3 Flash Preview...');
    const gemini = await tryGemini(messages, country, mode, showComparison);

    if (gemini) {
      console.log('[AI Chat] ✅ Gemini success');
      return gemini;
    }

    // 2️⃣ Fallback: Groq (если Gemini недоступен)
    console.log('[AI Chat] Gemini failed, trying Groq fallback...');
    const groq = await tryGroq(messages, country, mode, showComparison);
    if (groq) {
      console.log('[AI Chat] ✅ Groq success');
      return groq;
    }

    // 3️⃣ Только если оба не работают → ошибка
    console.error('[AI Chat] ❌ Both Gemini and Groq failed');
    return new Response(JSON.stringify({ error: 'AI unavailable' }), { status: 503, headers: corsHeaders });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[AI Chat] ERROR:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: corsHeaders });
  }
});
