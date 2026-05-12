// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';
import { getSystemPrompt as getSharedSystemPrompt } from '../_shared/ai-prompts.ts';

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
  imageUrl?: string | null;
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    if (!mimeType.startsWith('image/')) return null;
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { data: btoa(binary), mimeType };
  } catch {
    return null;
  }
}

interface UsageData {
  limit_reached: boolean;
  current_count: number;
}

// System prompt — uses shared module (change in _shared/ai-prompts.ts → applies to bot too)
const getSystemPrompt = (country: string = 'spain', showComparison: boolean = true, language: string = 'es'): string => {
  return getSharedSystemPrompt({
    country,
    language: language as 'ru' | 'en' | 'es',
    showComparison,
    context: 'app',
  });
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

async function tryGemini(messages: Message[], country: string = 'spain', mode: string = 'chat', showComparison: boolean = true, language: string = 'es', supabaseClient?: any, userId?: string | null, weakTopicsContext?: string | null, imageUrl?: string | null): Promise<Response | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;

  try {
    const basePrompt = getSystemPrompt(country, showComparison, language);
    // Merge client-sent system messages into system_instruction so Gemini sees question context
    const clientSystemContent = messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n\n');
    const systemPrompt = [
      basePrompt,
      clientSystemContent || null,
      weakTopicsContext || null,
    ].filter(Boolean).join('\n\n');

    // Filter system messages from contents (handled above via system_instruction)
    let currentContents: any[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

    // Guard: Gemini requires the first turn to be 'user'.
    // Срезаем leading model-сообщения (pre-loaded explanation из store на клиенте).
    while (currentContents.length > 0 && currentContents[0].role !== 'user') {
      currentContents.shift();
    }
    if (currentContents.length === 0) {
      console.warn('[AI Chat] Gemini: no user messages after stripping leading model turns');
      return null;
    }

    // Inject question image into the first user message as inline_data (multimodal)
    if (imageUrl) {
      const img = await fetchImageAsBase64(imageUrl);
      if (img) {
        console.log(`[AI Chat] 🖼️ Injecting image into Gemini (${img.mimeType}, ${Math.round(img.data.length * 0.75 / 1024)}KB)`);
        currentContents[0] = {
          ...currentContents[0],
          parts: [
            { inline_data: { mime_type: img.mimeType, data: img.data } },
            ...currentContents[0].parts,
          ],
        };
      } else {
        console.warn('[AI Chat] Failed to fetch image, proceeding without it');
      }
    }

    for (let iteration = 0; iteration < 2; iteration++) {
      const tools = (supabaseClient && userId) ? [{
        functionDeclarations: [{
          name: "get_user_stats",
          description: "Returns user statistics (XP, coins, Duel Pass level, season points) and recent test sessions. Call ONLY when the user explicitly asks about their progress, XP, coins, level, or test results. Do NOT call proactively.",
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
            const { data: profile } = await supabaseClient.from('profiles').select('id, xp, coins').or(`id.eq.${userId},user_id.eq.${userId}`).single();
            const profileId = profile?.id || userId;

            // Real Duel Pass level from user_season_progress (not the stale profiles.duel_pass_level)
            const { data: seasonProgress } = await supabaseClient
              .from('user_season_progress')
              .select('level, season_points, season_id')
              .eq('user_id', profileId)
              .order('season_id', { ascending: false })
              .limit(1)
              .maybeSingle();

            // score = XP earned per session, NOT correct answer count
            const { data: sessions } = await supabaseClient
              .from('game_sessions')
              .select('score, total_questions, game_type, created_at')
              .eq('user_id', profileId)
              .order('created_at', { ascending: false })
              .limit(5);

            const formattedSessions = sessions?.map((s: { score: number; total_questions: number; game_type: string; created_at: string }) => ({
              xp_earned: s.score,
              total_questions: s.total_questions,
              game_type: s.game_type,
              date: s.created_at,
              note: "xp_earned is XP points gained, NOT correct answer count",
            }));

            toolResult = {
              user_stats: {
                xp: profile?.xp ?? 0,
                coins: profile?.coins ?? 0,
                duel_pass_level: seasonProgress?.level ?? 1,
                season_points: seasonProgress?.season_points ?? 0,
              },
              latest_tests: formattedSessions || [],
            };
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
  // Layer 1: IP-level protection against anonymous abuse / DDoS
  const ipRateLimit = await checkRateLimit({ identifier: `ip:${clientIP}`, limit: 60, windowMs: 60000 });
  if (!ipRateLimit.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: corsHeaders });

  try {
    const body: ChatRequest = await req.json();
    const { messages, country = 'spain', mode = 'chat', showComparison = false, language = 'es', imageUrl = null } = body;

    const authHeader = req.headers.get('Authorization');
    let supabaseClient: any = null;
    let userId: string | null = null;

    let isPremiumUser = false;
    let weakTopicsContext: string | null = null;

    if (authHeader) {
      supabaseClient = createPooledSupabaseClient();
      const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user && mode !== 'debrief') {
        userId = user.id;
        console.log(`[ai-chat] Checking access for user: ${userId}`);

        // 1. Проверяем Premium статус ПЕРЕД инкрементом (расширенная проверка)
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id, is_premium, premium_until, trial_until, subscription_type, subscription_status, premium_forever_purchased_at')
          .eq('user_id', userId)
          .maybeSingle();
        
        const now = new Date();
        const hasPremiumForever = 
          !!profile?.premium_forever_purchased_at && 
          profile?.subscription_type === 'lifetime' && 
          profile?.subscription_status === 'pro';
        
        const premiumUntilDate = profile?.premium_until ? new Date(profile.premium_until) : null;
        const trialUntilDate = profile?.trial_until ? new Date(profile.trial_until) : null;

        isPremiumUser = profile?.is_premium || 
                        hasPremiumForever || 
                        (premiumUntilDate && premiumUntilDate > now) || 
                        (trialUntilDate && trialUntilDate > now);

        if (isPremiumUser) {
          console.log(`[ai-chat] ✅ User ${userId} is Premium`);
        }

        // Layer 2: per-user rate limit (sliding window, independent of IP)
        const userLimit = isPremiumUser ? 20 : 10;
        const userRateLimit = await checkRateLimit({ identifier: `user:${userId}`, limit: userLimit, windowMs: 60000 });
        if (!userRateLimit.allowed) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded', remaining: 0 }), { status: 429, headers: corsHeaders });
        }

        // 2. Инкрементируем лимит только если НЕ premium
        if (!isPremiumUser) {
          const { data: usage } = await supabaseClient.rpc('increment_ai_usage', { p_user_id: userId }) as { data: UsageData[] | null };
          if (usage?.[0]?.limit_reached) {
            console.warn(`[ai-chat] 🚫 User ${userId} blocked: limit reached`);
            return new Response(JSON.stringify({ 
              error: 'daily_limit_reached', 
              message: 'Дневной лимит Skily исчерпан. Активируй Premium!',
              current_count: usage[0].current_count,
              limit: 5
            }), { status: 429, headers: corsHeaders });
          }
        } else {
          // Для premium записываем статистику без блокировки потока
          supabaseClient.rpc('increment_ai_usage', { p_user_id: userId }).then(() => {}, () => {});
        }

        // Загружаем слабые темы с таймаутом 3с чтобы не блокировать ответ
        try {
          const profileId = profile?.id;
          if (profileId) {
            const weakTopicsResult = await Promise.race([
              supabaseClient.rpc('get_weak_topics', { p_profile_id: profileId, p_limit: 5 }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
            ]);
            const weakTopics = weakTopicsResult?.data;
            if (weakTopics && weakTopics.length > 0) {
              const topicLines = weakTopics
                .map((t: { topic_title: string; accuracy: number; attempt_count: number }) =>
                  `- ${t.topic_title}: ${t.accuracy}% correct (${t.attempt_count} attempts)`)
                .join('\n');
              weakTopicsContext = `\n\n[USER WEAK TOPICS - use this to personalize advice]:\n${topicLines}`;
            }
          }
        } catch (e) {
          console.error('[AI Chat] Failed to load weak topics:', e);
        }
      }
    }

    const gemini = await tryGemini(messages, country, mode, showComparison, language, supabaseClient, userId, weakTopicsContext, imageUrl);
    if (gemini) return gemini;

    const groq = await tryGroq(messages, country, mode, showComparison, 'llama-3.1-8b-instant', language);
    if (groq) return groq;

    return new Response(JSON.stringify({ error: 'AI unavailable' }), { status: 503, headers: corsHeaders });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
