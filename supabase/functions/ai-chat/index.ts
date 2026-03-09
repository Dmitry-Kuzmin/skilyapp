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

  const widgetInstructions = `
# INTERACTIVE WIDGETS
Ты можешь выводить специальные теги, которые превратятся в кнопки на экране пользователя.
ВЫВОДИ ИХ ТОЧНО КАК НАПИСАНО:
1. Витрина TON (оплата, кошелек, прогресс): [WIDGET:TON:CONNECT]
2. Награда-ачивка (виральность): [WIDGET:MEME:BADGE:Имя_Награды]
3. Прямая оплата (Stripe/Crypto): [WIDGET:CTA:PREMIUM:Купить_Premium]

ПРИМЕР 1 (Юзер: "Награди меня"):
Поздравляю, ты отлично справился!
[WIDGET:MEME:BADGE:Король Круга ⭕]

ПРИМЕР 2 (Юзер: "Хочу оплатить через TON"):
Супер, вот варианты оплаты через блокчейн TON:
[WIDGET:TON:CONNECT]
`;

  const premiumFeatures = `
# PREMIUM FEATURES
Recall these real features: AI Debrief (анализ ошибок), Advanced stats, Mastery & Marathon modes, Unlimited AI chat, Duel Pass, 2000+ questions.
`;

  if (country === 'russia') {
    return `# ROLE & PERSONA
Ты — Skily 💡, элитный ИИ-инструктор по ПДД РФ.
Отвечай на языке: ${languageName}.
${widgetInstructions}
${premiumFeatures}

ВАЖНО: При любых упоминаниях награды, выводи ТОЧНО ЭТОТ ТЕГ С НОВОЙ СТРОКИ:
[WIDGET:MEME:BADGE:Твоё_Название_Награды]
НЕ переводи само слово WIDGET, пиши английскими буквами в квадратных скобках!`;
  }

  // Spain version
  let comparisonLogic = showComparison ? `
# SPAIN vs RU COMPARISON MODE (ACTIVE)
Compare only when valuable. 1-2 lines max.` : `
# STRICTLY SPAIN ONLY
Focus 100% on Spain DGT rules.`;

  return `You are Skily 💡, a friendly AI mentor for the DGT driving exam in Spain.
${comparisonLogic}
${widgetInstructions}
${premiumFeatures}

# USER CONTEXT & TOOLS
Use get_user_stats if asked about profile/coins.

# TONE & STYLE
Friendly, emojis, professional, concise.

# 🛑 FINAL TRUTH / WIDGET RULES (CRITICAL):
- DO NOT translate the widget tags.
- If giving a reward/badge, you MUST write exactly: [WIDGET:MEME:BADGE:Your Badge Name 🏆]
- If asked about TON/Crypto, you MUST write exactly: [WIDGET:TON:CONNECT]
Respond in: ${languageName}.
`;
};

async function tryGroq(messages: Message[], country: string = 'spain', mode: string = 'chat', showComparison: boolean = true, modelName: string = 'llama-3.1-8b-instant', language: string = 'es'): Promise<Response | null> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return null;

  try {
    const systemMessage = [{ role: 'system' as const, content: getSystemPrompt(country, showComparison, language) }];

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
    const systemPrompt = getSystemPrompt(country, showComparison, language);

    let currentContents: any[] = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    for (let iteration = 0; iteration < 2; iteration++) {
      const tools = (supabaseClient && userId) ? [{
        functionDeclarations: [{
          name: "get_user_stats",
          description: "Returns user statistics (XP, level, coins, pass) and recent test results. MUST be called if asked about progress/coins.",
        }]
      }] : undefined;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?alt=sse&key=${apiKey}`, {
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
        const errorText = await response.text();
        console.error(`[AI Chat] Gemini error:`, errorText);
        return null;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const allParsedChunks: any[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              allParsedChunks.push(JSON.parse(dataStr));
            } catch (e) { }
          }
        }
      }

      const allModelParts: any[] = [];
      for (const chunk of allParsedChunks) {
        const chunkParts = chunk?.candidates?.[0]?.content?.parts;
        if (chunkParts) allModelParts.push(...chunkParts);
      }

      const functionCallPart = allModelParts.find((p: any) => p.functionCall);

      if (functionCallPart) {
        const functionCallData = functionCallPart.functionCall;
        if (functionCallData.name === 'get_user_stats') {
          console.log('[AI Chat] ⚙️ TOOL CALLED: get_user_stats');
          let toolResult: any = {};
          try {
            const { data: profile } = await supabaseClient.from('profiles').select('id, xp, coins, duel_pass_level, ton_wallet_address').or(`id.eq.${userId},user_id.eq.${userId}`).single();
            const { data: sessions } = await supabaseClient.from('game_sessions').select('score, total_questions, game_type, created_at').eq('user_id', profile?.id || userId).order('created_at', { ascending: false }).limit(5);
            toolResult = { user_stats: profile || null, latest_tests: sessions || [] };
          } catch (e) { toolResult = { error: "Database unavailable" }; }

          currentContents.push({ role: "model", parts: allModelParts });
          currentContents.push({
            role: "function",
            parts: [{
              functionResponse: {
                name: "get_user_stats",
                response: { name: "get_user_stats", content: toolResult }
              }
            }]
          });
          continue;
        }
      }

      const sseLines: string[] = [];
      for (const chunk of allParsedChunks) {
        const chunkParts = chunk?.candidates?.[0]?.content?.parts;
        if (!chunkParts) continue;
        for (const part of chunkParts) {
          if (part.text) {
            sseLines.push(`data: ${JSON.stringify({ choices: [{ delta: { content: part.text } }] })}\n\n`);
          }
        }
      }
      sseLines.push('data: [DONE]\n\n');

      const encoder = new TextEncoder();
      const textStream = new ReadableStream({
        start(controller) {
          for (const line of sseLines) { controller.enqueue(encoder.encode(line)); }
          controller.close();
        }
      });

      return new Response(textStream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
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
  if (!rateLimit.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: corsHeaders });

  try {
    const body: ChatRequest = await req.json();
    const { messages, country = 'spain', mode = 'chat', showComparison = false, language = 'es' } = body;

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
          return new Response(JSON.stringify({ error: 'daily_limit_reached', message: 'Дневной лимит Skily исчерпан. Активируй Premium!' }), { status: 429, headers: corsHeaders });
        }
      }
    }

    const gemini = await tryGemini(messages, country, mode, showComparison, language, supabaseClient, userId);
    if (gemini) return gemini;

    const groq = await tryGroq(messages, country, mode, showComparison, 'llama-3.1-8b-instant', language);
    if (groq) return groq;

    return new Response(JSON.stringify({ error: 'AI unavailable' }), { status: 503, headers: corsHeaders });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
