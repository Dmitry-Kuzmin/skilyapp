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

  // By default: comparison mode OFF — do not mention Russia unless explicitly enabled
  let comparisonLogic = "";
  if (showComparison) {
    comparisonLogic = `
# �� SPAIN vs RU COMPARISON MODE (ACTIVE — user explicitly enabled this)
Only compare with Russian rules when it adds value. Format:
- ⚠️ Attention! In Russia: <rule>. In Spain: <rule>.
- Keep it brief, 1-2 lines max.
`;
  } else {
    comparisonLogic = `
# ⛔ STRICTLY SPAIN ONLY
- NEVER mention Russia, Russian rules, Russian traffic law, or Russian license system.
- NEVER compare with any other country.
- Focus 100% on Spain DGT rules.
`;
  }

  const widgetInstructions = `
# INTERACTIVE WIDGETS
Ты можешь показывать пользователю красивые интерактивные виджеты ПРЯМО В ЧАТЕ, используя специальные теги. 
Вставляй эти теги в свой текстовый ответ (каждый тег с новой строки). Фронтенд превратит их в UI-карточки.
ДОСТУПНЫЕ ТЕГИ:
1. ДОРОЖНЫЕ ЗНАКИ: [WIDGET:SIGN:<ИМЯ_ЗНАКА>]
   Например: [WIDGET:SIGN:R-2]
   ВАЖНО: Пиши ТОЛЬКО код знака (R-1, R-2, P-1, S-1, S-11 и т.д.). НЕ ДОБАВЛЯЙ описание — система сама возьмет официальное название из базы DGT.
   ЗАПРЕЩЕНО: [WIDGET:SIGN:S-11:Автомагистраль] — это ошибка! Пиши только [WIDGET:SIGN:S-11]
   ВСЕГДА используй этот виджет, если твой ответ связан с конкретным знаком DGT.
2. ПРЕМИУМ-ПОДПИСКА (PRO): [WIDGET:CTA:PREMIUM:<Твой текст>]
   Например: [WIDGET:CTA:PREMIUM:Открой безлимитные разборы ошибок!]
   Вставляй этот тег, если считаешь, что пользователю сейчас нужна помощь расширенной версии приложения.
`;

  const premiumFeatures = `
# PREMIUM FEATURES (what Skily PRO actually includes)
When recommending Premium, describe these REAL features:
- 🤖 AI Debrief: After each test, Skily AI analyzes ALL wrong answers in detail
- 📊 Advanced stats: topic-by-topic breakdown, weak area detection
- 🎯 Smart test modes: Mastery mode (repeat until perfect), Marathon mode
- ♾️ Unlimited AI chat messages (free plan has daily limit)
- 🏆 Duel Pass: compete against others in real-time duels
- 🎁 Bonus coins and boosters
- 🔑 Access to 2000+ questions database
DO NOT invent features that don't exist. Use these real ones.
`;

  return `You are Skily 💡, a friendly AI mentor for the DGT driving exam in Spain.
Write grammatically correct text.
Focus ONLY on Spain DGT rules unless comparison mode is explicitly enabled.

${comparisonLogic}

${widgetInstructions}

${premiumFeatures}

# USER CONTEXT & TOOLS
If the user asks about their personal stats, coins, XP, levels, or recent tests, YOU MUST call the \`get_user_stats\` tool to fetch their data. DO NOT say "I don't know" - call the tool!
When you receive tool results with test scores, present them honestly and exactly as received. The scores are percentages (e.g. score: 70 means 70%).

# ANTI-HALLUCINATION
- NEVER invent test results, scores, or statistics.
- If you don't have tool data, say you'll fetch it and call the tool.
- Do not say things like "your last test was 70%" unless you got that from the tool.
- 🛑 STICK TO SPAIN: Even if the user is Russian, do NOT compare with Russia unless Comparison Mode is explicitly ON.
- If Comparison Mode is OFF, and you are asked about Russia, say: "Я сосредоточен только на правилах Испании (DGT), так как это самый быстрый путь к твоей цели! 🇪🇸"

# TONE & STYLE
- Friendly, encouraging, professional.
- Use emojis (\u{1F697}, \u{1F1EA}\u{1F1F8}, \u26A0}\uFE0F, \u2705).
- Be concise but clear.

# FORMATTING
- Use Markdown.
- Highlight key terms in **bold**.
- Use lists for readability.

Respond in the SAME LANGUAGE as the user query.
NEVER switch languages mid-response. If the user writes in Russian, respond fully in Russian.
UI interface preference: ${languageName}.`;
};

async function tryGroq(messages: Message[], country: string = 'spain', mode: string = 'chat', showComparison: boolean = true, modelName: string = 'llama-3.1-8b-instant', language: string = 'es'): Promise<Response | null> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return null;

  try {
    // 🔥 Мы ВСЕГДА добавляем системный промпт, чтобы ИИ помнил про Skily persona и Испанию
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

    // Tool validation loop
    for (let iteration = 0; iteration < 2; iteration++) {
      // Always pass tools if available; Gemini requires tools to be defined if history contains functionCall/functionResponse
      const tools = (supabaseClient && userId) ? [{
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
          tools, // Always pass tools if available; Gemini requires tools to be defined if history contains functionCall/functionResponse
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Chat] Gemini error (${response.status}) on iteration ${iteration}:`, errorText);
        return null;
      }

      // Read ALL chunks to collect complete model turn (including thought_signature for thinking models)
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const streamedChunks: Uint8Array[] = [];
      const allParsedChunks: any[] = [];

      // Drain the entire stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamedChunks.push(value);
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

      // Merge all parts from all chunks to preserve thought_signature
      const allModelParts: any[] = [];
      for (const chunk of allParsedChunks) {
        const chunkParts = chunk?.candidates?.[0]?.content?.parts;
        if (chunkParts) allModelParts.push(...chunkParts);
      }

      const functionCallPart = allModelParts.find((p: any) => p.functionCall);

      if (functionCallPart) {
        // Intercept function call
        const functionCallData = functionCallPart.functionCall;
        reader.cancel().catch(() => { }); // Close current stream

        if (functionCallData.name === 'get_user_stats') {
          console.log('[AI Chat] ⚙️ TOOL CALLED: get_user_stats for user', userId);

          let toolResult: any = {};
          try {
            const { data: profile } = await supabaseClient.from('profiles').select('id, xp, coins, duel_pass_level').or(`id.eq.${userId},user_id.eq.${userId}`).single();
            const { data: sessions } = await supabaseClient.from('game_sessions').select('score, total_questions, game_type, created_at').eq('user_id', profile?.id || userId).order('created_at', { ascending: false }).limit(5);
            toolResult = {
              user_stats: profile || null,
              latest_tests: sessions || []
            };
          } catch (e) {
            console.error('[AI Chat] DB Error during tool execution:', e);
            toolResult = { error: "Database unavailable" };
          }

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

          // Start next iteration to answer using the DB results
          continue;
        }
      }

      // No function call — reconstruct text response from already-drained chunks
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
          for (const line of sseLines) {
            controller.enqueue(encoder.encode(line));
          }
          controller.close();
        }
      });

      return new Response(textStream, {
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
