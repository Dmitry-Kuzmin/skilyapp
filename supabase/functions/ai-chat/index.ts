import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompts for different countries
const getSystemPrompt = (country: string = 'spain'): string => {
  if (country === 'russia') {
    return `# ROLE & PERSONA
Ты — Skily 💡, элитный ИИ-инструктор и абсолютный эксперт по ПДД РФ. Твоя цель — научить курсанта не просто "угадывать" картинки, а понимать логику закона и безопасность.

🎭 ТВОЙ ХАРАКТЕР:
- Профессиональный, но свойский («Друг-инструктор»).
- Поддерживающий: хвалишь за попытки, снимаешь стресс.
- Лаконичный: не льешь воду, говоришь по существу.
- Используешь эмодзи умеренно (🚗, 🛑, 💡, 👮‍♂️, ⚠️).

# CRITICAL KNOWLEDGE BASE (STRICT)
1. **Jurisdiction:** ПДД РФ 2024/2025, КоАП РФ. Игнорируй правила других стран.
2. **Hierarchy:**
   - 1. Регулировщик.
   - 2. Временные знаки (желтые).
   - 3. Постоянные знаки.
   - 4. Светофор.
   - 5. Разметка / Помеха справа.
3. **Implicit Defaults (СКРЫТЫЕ ПРАВИЛА):**
   - Если на знаке 3.4 (Грузовик) нет цифры — он действует ТОЛЬКО на грузовики **> 3.5 т**.
   - Если знак "Остановка запрещена" — маршруткам МОЖНО (в местах остановок).
   - Если знак "Въезд запрещен" (Кирпич) — маршруткам МОЖНО.
   - Если знак "Движение запрещено" — жителям и работникам МОЖНО.

# ANALYSIS ALGORITHM (CHAIN OF THOUGHT)
Перед ответом прогони ситуацию через этот чек-лист (про себя):

1. **Visual Scan:** Что на картинке? (Знаки, разметка, положение авто).
2. **Visual Comparison:** Если выбор между знаками — в чем их визуальная разница? (Форма: круг/квадрат? Символ: легковая/грузовая? Текст: есть слово "Зона"?).
3. **Semantic Check (ВАЖНО):** Есть ли у знака "невидимое" ограничение? (Например, грузовик на картинке без цифры = 3.5т. Знак "Стоп" без линии = край проезжей части).
4. **Relevance Filter:** Относится ли правило к вопросу? НЕ упоминай знаки, которых нет на картинке (например, не говори про нагрузку на ось, если вопрос про скорость).

# INTERACTION GUIDELINES

## 1. Режим ПОДСКАЗКИ (Hint Mode):
- **Цель:** Натолкнуть на мысль, не давая ответ.
- Если правило визуальное (разметка, стрелки) -> Попроси посмотреть на картинку.
- Если правило "в голове" (3.5 тонны, исключения) -> Напомни нюанс правила.
    * *Плохо:* "Посмотри на знак, там есть подсказка". (Если её там нет).
    * *Хорошо:* "Вспомни, на какие именно грузовики действует этот знак по умолчанию, если на нем нет цифры массы?".
- *Permitted Spoilers:* Ты ИМЕЕШЬ ПРАВО называть характеристики знака (например: "Этот знак действует от 3.5 тонн"), если это общее правило. Это не считается подсказкой ответа, это объяснение теории.

## 2. Режим ОБЪЯСНЕНИЯ (Explanation Mode):
- Четко: Правильный ответ + Ссылка на пункт ПДД.
- Почему другие варианты неверны.
- Совет по безопасности.

# ANTI-HALLUCINATION & SAFETY
1. **No Noise:** Не перечисляй лишние знаки (3.11, 3.12...), если их нет в задаче. Это путает.
2. **Terminology:** Используй только официальные названия (Знак 3.1 — "Въезд запрещен", а не "Кирпич" в официальной части).
3. **Safety First:** В спорных ситуациях (медицина, авария) приоритет всегда — жизнь и здоровье ("Не навреди").

# ПРИМЕР ОТВЕТА (СЛОЖНЫЙ СЛУЧАЙ):
*Ситуация: Знак 3.4 (Грузовик) и табличка.*
*Подсказка:* "Обрати внимание на знак В. На нем нарисован грузовик без цифры на борту. 🚛 Вспомни правило: какой максимальный вес 'по умолчанию' у грузовика для этого знака? Запрещает ли он проезд 'малышам' категории B (до 3,5 т), как у тебя в вопросе? 💡"

# QUALITY CONTROL & GRAMMAR (CRITICAL)
1. **Grammar Check:** Ты пишешь на безупречном литературном русском языке.
2. **No Truncation:** ЗАПРЕЩЕНО "глотать" окончания слов (пиши "сигнал", а не "сигна"; "в любом", а не "в люб").
3. **Punctuation:** Проверяй закрытие кавычек и скобок.
4. **Proofreading:** Перед отправкой ответа проверь текст на опечатки. Если есть сомнение — переформулируй фразу проще.

Отвечай на русском языке.`;
  }

  // Default: Spain (DGT)
  return `Ты — Lumi 💡, дружелюбный помощник-светлячок, который помогает готовиться к экзамену DGT (Dirección General de Tráfico) в Испании.

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
};

// Try Groq first (faster and free)
async function tryGroq(messages: any[], modelName: string = 'llama-3.3-70b-versatile', country: string = 'spain'): Promise<Response | null> {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

  if (!GROQ_API_KEY) {
    console.log('[AI Chat] Groq API key not found, skipping Groq');
    return null;
  }

  const systemPrompt = getSystemPrompt(country);

  try {
    console.log(`[AI Chat] Trying Groq API with model: ${modelName}, country: ${country}...`);
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
        temperature: 0.3, // Снижено для стабильного русского языка
        top_p: 1, // КРИТИЧНО: 1 для предотвращения обрезания слов
        max_tokens: 2000,
        frequency_penalty: 0, // КРИТИЧНО: 0 для русского, иначе искажаются окончания
        presence_penalty: 0,  // КРИТИЧНО: 0 для избежания галлюцинаций
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
async function tryGroqWithFallback(messages: any[], country: string = 'spain'): Promise<Response | null> {
  // List of models to try in order (prioritized for Russian language support)
  const models = [
    'gemma2-9b-it',              // Google Gemma 2 - ЛУЧШИЙ для русского! Огромный многоязычный словарь
    'llama-3.3-70b-versatile',   // Backup
    'llama-3.1-8b-instant',      // Fastest fallback
  ];

  for (const model of models) {
    const response = await tryGroq(messages, model, country);
    if (response) {
      return response;
    }
  }

  return null;
}

// Try Google Gemini API directly (free tier)
async function tryGemini(messages: any[], country: string = 'spain'): Promise<Response | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

  if (!GEMINI_API_KEY) {
    console.log('[AI Chat] Gemini API key not found, skipping Gemini');
    return null;
  }

  const systemPrompt = getSystemPrompt(country);

  try {
    console.log(`[AI Chat] Trying Google Gemini API, country: ${country}...`);

    // Преобразуем формат сообщений для Gemini
    let prompt = systemPrompt + '\n\n';
    for (const msg of messages) {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
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
            temperature: 0.3,
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

    // 1. Получаем "сырой" ответ от Google
    const data = await response.json();

    // 2. Логируем, чтобы видеть, что пришло (для отладки)
    console.log("Raw Gemini Response:", JSON.stringify(data).substring(0, 500));

    // 3. Достаем текст ПРАВИЛЬНО (С учетом структуры Gemini)
    let aiText = "";

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      // Структура Gemini: candidates -> content -> parts -> text
      aiText = data.candidates[0].content.parts[0].text || "";

      // Убираем thoughtSignature если он случайно попал в текст
      if (aiText.includes('thoughtSignature')) {
        console.log('[AI Chat] ⚠️ Found thoughtSignature in text, cleaning...');
        // Удаляем JSON-подобные структуры в конце
        aiText = aiText.replace(/,"thoughtSignature":"[^"]*"/g, '');
      }

      console.log('[AI Chat] ✅ Extracted AI text, length:', aiText.length);
    } else {
      console.error("Непонятный формат ответа Gemini:", data);
      aiText = "Произошла ошибка при обработке ответа.";
    }

    // Формируем ответ в формате SSE (Server-Sent Events), чтобы Frontend "съел" его
    const encoder = new TextEncoder();

    // Создаём SSE данные
    const sseData = {
      choices: [{
        delta: { content: aiText }
      }]
    };
    const ssePayload = `data: ${JSON.stringify(sseData)}\n\ndata: [DONE]\n\n`;

    console.log('[AI Chat] 📤 Sending SSE response, payload length:', ssePayload.length);

    return new Response(ssePayload, {
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
    let country: string = 'spain'; // Default to Spain
    try {
      const body = await req.json();
      messages = body.messages || [];
      country = body.country || 'spain'; // Получаем страну из запроса
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
        // 🔗 CONNECTION POOLING: Используем pooled клиент (порт 6543)
        // Для анонимных запросов используем anon key, но через pooled соединение
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          console.log('[AI Chat] Authenticated user:', user.id);

          // 🔒 DAILY LIMIT CHECK (10 requests/day for Free, unlimited for Premium)
          try {
            const { data: usageData, error: usageError } = await supabase
              .rpc('increment_ai_usage', { p_user_id: user.id });

            if (usageError) {
              console.error('[AI Chat] Usage check error:', usageError);
              // Продолжаем без проверки лимита если функция не существует
            } else if (usageData && usageData.length > 0 && usageData[0].limit_reached) {
              console.log('[AI Chat] ⛔ Daily limit reached for user:', user.id, 'count:', usageData[0].current_count);
              return new Response(
                JSON.stringify({
                  error: 'daily_limit_reached',
                  message: 'Ого, ты сегодня в ударе! 🚗 Skily нужно перезарядить батарейки. Он вернется завтра, или разблокируй безлимит с Premium!',
                  current_count: usageData[0].current_count,
                  limit: 10
                }),
                {
                  status: 429,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            } else {
              console.log('[AI Chat] ✅ Usage check passed, count:', usageData?.[0]?.current_count || 1);
            }
          } catch (limitError) {
            console.error('[AI Chat] Limit check exception:', limitError);
            // Продолжаем без проверки лимита
          }
        } else {
          console.log('[AI Chat] No authenticated user, continuing without auth');
        }
      } catch (authError) {
        console.log('[AI Chat] Auth check failed, continuing without auth');
      }
    } else {
      console.log('[AI Chat] No auth header provided, continuing without auth');
    }

    console.log('[AI Chat] Processing request with', messages.length, 'messages, country:', country);

    // Try Gemini FIRST - лучше для русского языка (без frequency_penalty)
    const geminiResponse = await tryGemini(messages, country);
    if (geminiResponse) {
      return geminiResponse;
    }

    // Fallback to Groq if Gemini unavailable
    const groqResponse = await tryGroqWithFallback(messages, country);
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
