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
  if (!apiKey) { console.warn('[AI Chat] GROQ_API_KEY not set'); return null; }

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

async function tryGemini(messages: Message[], country: string = 'spain', mode: string = 'chat', showComparison: boolean = true, language: string = 'es', supabaseClient?: any, userId?: string | null, weakTopicsContext?: string | null): Promise<Response | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) { console.warn('[AI Chat] GEMINI_API_KEY not set'); return null; }

  try {
    const basePrompt = getSystemPrompt(country, showComparison, language);
    const systemPrompt = weakTopicsContext ? basePrompt + weakTopicsContext : basePrompt;

    // Filter system messages — handled via system_instruction
    // Drop leading model turns so first turn is always 'user'
    let contents: any[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
    while (contents.length > 0 && contents[0].role !== 'user') contents.shift();

    if (contents.length === 0) return null;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Chat] Gemini error (${response.status}):`, errorText);
      return null;
    }

    // Transform Gemini SSE → OpenAI-compatible SSE on-the-fly (no buffering)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const parts = parsed?.candidates?.[0]?.content?.parts;
                if (!parts) continue;
                for (const part of parts) {
                  if (part.text) {
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ choices: [{ delta: { content: part.text } }] })}\n\n`
                    ));
                  }
                }
              } catch { /* skip malformed chunks */ }
            }
          }
        } finally {
          reader.releaseLock();
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(transformedStream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
    });
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
          // Для premium записываем статистику без блокировки (не ждём результата)
          supabaseClient.rpc('increment_ai_usage', { p_user_id: userId }).catch(() => {});
        }

        // Загружаем слабые темы для персонализации совета (с таймаутом 3с)
        try {
          const weakTopicsPromise = supabaseClient.rpc('get_weak_topics', {
            p_profile_id: profile?.id || userId,
            p_limit: 5,
          });
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
          const weakTopicsResult = await Promise.race([weakTopicsPromise, timeoutPromise]);
          const weakTopics = weakTopicsResult?.data;
          if (weakTopics && weakTopics.length > 0) {
            const topicLines = weakTopics
              .map((t: { topic_title: string; accuracy: number; attempt_count: number }) =>
                `- ${t.topic_title}: ${t.accuracy}% correct (${t.attempt_count} attempts)`)
              .join('\n');
            weakTopicsContext = `\n\n[USER WEAK TOPICS - use this to personalize advice]:\n${topicLines}`;
          }
        } catch (e) {
          console.error('[AI Chat] Failed to load weak topics:', e);
        }
      }
    }

    const gemini = await tryGemini(messages, country, mode, showComparison, language, supabaseClient, userId, weakTopicsContext);
    if (gemini) return gemini;

    const groq = await tryGroq(messages, country, mode, showComparison, 'llama-3.1-8b-instant', language);
    if (groq) return groq;

    return new Response(JSON.stringify({ error: 'AI unavailable' }), { status: 503, headers: corsHeaders });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
