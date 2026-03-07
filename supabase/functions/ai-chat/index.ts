// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
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
  language?: 'ru' | 'es' | 'en';
  mode?: 'chat' | 'debrief';
  showComparison?: boolean;
}

interface UsageData {
  limit_reached: boolean;
  current_count: number;
}

const getSystemPrompt = (country: string = 'spain', showComparison: boolean = true, language: string = 'es'): string => {
  const languageName = language === 'ru' ? 'Russian' : language === 'en' ? 'English' : 'Spanish';

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

Отвечай на языке: ${languageName}.`;
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

  const widgetInstructions = `
# INTERACTIVE WIDGETS
Ты можешь показывать пользователю красивые интерактивные виджеты ПРЯМО В ЧАТЕ, используя специальные теги. 
Вставляй эти теги в свой текстовый ответ (каждый тег с новой строки). Фронтенд превратит их в UI-карточки.
ДОСТУПНЫЕ ТЕГИ:
1. ДОРОЖНЫЕ ЗНАКИ: [WIDGET:SIGN:<ИМЯ_ЗНАКА>:<Краткое описание>]
   Например: [WIDGET:SIGN:R-2:STOP. Запрет проезда без остановки.]
   Например: [WIDGET:SIGN:P-1:Внимание: Неровная дорога]
   ВСЕГДА используй этот виджет, если твой ответ или объяснение связано с конкретным дорожным знаком (коды: R-1, R-2, P-1, S-11 и тд).
2. ПРЕМИУМ-ПОДПИСКА (PRO): [WIDGET:CTA:PREMIUM:<Твой текст>]
   Например: [WIDGET:CTA:PREMIUM:Открой безлимитные разборы ошибок!]
   Вставляй этот тег, если считаешь, что пользователю сейчас нужна помощь расширенной версии приложения.
`;

  return `You are Skily 💡, a friendly AI mentor for the DGT driving exam in Spain.
Write grammatically correct text.
Answer ONLY about Spain.

${comparisonLogic}

${widgetInstructions}

# TONE & STYLE
- Friendly, encouraging, professional.
- Use emojis significantly (🚗, 🇪🇸, ⚠️, ✅).
- Be concise but clear.

# FORMATTING
- Use Markdown.
- Highlight key terms in **bold**.
- Use lists for readability.

Respond in the SAME LANGUAGE as the user query.
If the user specifically asks you to translate or explain a Spanish term, you can use Spanish context, but ALWAYS formulate the main response in the language the user wrote to you!
Your UI interface language preference is: ${languageName}.`;
};

async function tryGroq(messages: Message[], country: string = 'spain', mode: string = 'chat', showComparison: boolean = true, modelName: string = 'llama-3.1-8b-instant', language: string = 'es'): Promise<Response | null> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return null;

  try {
    // 🔥 Если mode === 'debrief', НЕ добавляем system prompt (unified prompt уже в messages)
    const systemMessage = mode === 'debrief' ? [] : [{ role: 'system' as const, content: getSystemPrompt(country, showComparison, language) }];

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

async function tryGemini(messages: Message[], country: string = 'spain', mode: string = 'chat', showComparison: boolean = true, language: string = 'es', supabaseClient?: any, userId?: string | null): Promise<Response | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;

  try {
    const systemPrompt = mode === 'debrief' ? '' : getSystemPrompt(country, showComparison, language);

    let currentContents: any[] = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    // Tool validation loop
    for (let iteration = 0; iteration < 2; iteration++) {
      const isLastIteration = iteration === 1;

      const tools = (supabaseClient && userId && !isLastIteration) ? [{
        functionDeclarations: [{
          name: "get_user_stats",
          description: "Returns user statistics (XP, level, coins, pass) and recent test results from game_sessions. MUST be called if the user asks about their coins, XP, progress, errors, or stats.",
        }]
      }] : undefined;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:streamGenerateContent?alt=sse&key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents: currentContents,
          tools,
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        }),
      });

      if (!response.ok) {
        if (isLastIteration) {
          const errorText = await response.text();
          console.error(`[AI Chat] Gemini error (${response.status}):`, errorText);
        }
        return null;
      }

      // Read the first chunk to detect function calls early
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstParsedData = null;
      const streamedChunks: Uint8Array[] = [];

      while (!firstParsedData) {
        const { value, done } = await reader.read();
        if (done) break;

        streamedChunks.push(value);
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete part

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              firstParsedData = JSON.parse(dataStr);
              break;
            } catch (e) { }
          }
        }
      }

      const part = firstParsedData?.candidates?.[0]?.content?.parts?.[0];

      if (part?.functionCall) {
        // Intercept function call
        const functionCallData = part.functionCall;
        reader.cancel().catch(() => { }); // Close current stream

        if (functionCallData.name === 'get_user_stats') {
          console.log('[AI Chat] ⚙️ TOOL CALLED: get_user_stats for user', userId);

          let toolResult: any = {};
          try {
            const { data: profile } = await supabaseClient.from('profiles').select('xp, coins, duel_pass_level').eq('id', userId).single();
            const { data: sessions } = await supabaseClient.from('game_sessions').select('score, total_questions, game_type, created_at').eq('user_id', profile?.id || userId).order('created_at', { ascending: false }).limit(5);
            toolResult = {
              user_stats: profile || null,
              latest_tests: sessions || []
            };
          } catch (e) {
            console.error('[AI Chat] DB Error during tool execution:', e);
            toolResult = { error: "Database unavailable" };
          }

          currentContents.push({ role: "model", parts: [{ functionCall: functionCallData }] });
          currentContents.push({
            role: "function",
            parts: [{
              functionResponse: {
                name: "get_user_stats",
                response: { name: "get_user_stats", content: toolResult }
              }
            }]
          });

          // Start next iteration to answer using the DB results
          continue;
        }
      }

      // No function call, proceed to stream text to frontend
      const proxyStream = new ReadableStream({
        async start(controller) {
          for (const chunk of streamedChunks) {
            controller.enqueue(chunk);
          }
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        }
      });

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) {
                  const ssePayload = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
                  controller.enqueue(new TextEncoder().encode(ssePayload));
                }
              } catch (e) {
                // Ignore partial JSON
              }
            }
          }
        },
        flush(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        }
      });

      return new Response(proxyStream.pipeThrough(transformStream), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });
    }

    return null;
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
    const { messages, country = 'spain', mode = 'chat', showComparison = true, language = 'es' } = body;

    console.log('[AI Chat] Request:', {
      mode,
      country,
      language,
      showComparison,
      messagesCount: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) + '...'
    });

    const authHeader = req.headers.get('Authorization');
    let supabaseClient: any = null;
    let userId: string | null = null;

    if (authHeader) {
      supabaseClient = createPooledSupabaseClient();
      const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

      if (user && mode !== 'debrief') {
        userId = user.id;
        const { data: usage } = await supabaseClient.rpc('increment_ai_usage', { p_user_id: user.id }) as { data: UsageData[] | null };
        if (usage?.[0]?.limit_reached) {
          console.log('[AI Chat] Limit reached for user:', user.id);
          return new Response(JSON.stringify({ error: 'daily_limit_reached', message: 'Дневной лимит Skily исчерпан. Попробуй завтра или активируй Premium!' }), { status: 429, headers: corsHeaders });
        }
      }
    }

    // 1️⃣ Приоритет: Gemini 3.1 Flash Lite (Fastest & most efficient)
    console.log('[AI Chat] Trying Gemini 3.1 Flash Lite...');
    const gemini = await tryGemini(messages, country, mode, showComparison, language, supabaseClient, userId);

    if (gemini) {
      console.log('[AI Chat] ✅ Gemini success');
      return gemini;
    }

    // 2️⃣ Fallback: Groq (если Gemini недоступен)
    console.log('[AI Chat] Gemini failed, trying Groq fallback...');
    const groq = await tryGroq(messages, country, mode, showComparison, 'llama-3.1-8b-instant', language);
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
