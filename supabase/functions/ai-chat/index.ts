import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('AI chat request received with', messages.length, 'messages');

    const systemPrompt = `Ты — профессиональный преподаватель Правил дорожного движения и экзаменационных ситуаций.
Твоя задача — помогать пользователю готовиться к экзамену по ПДД и понимать реальные дорожные ситуации.

Отвечай:
1. Чётко, кратко и логично — 2–5 абзацев максимум.
2. Используй современный язык, но всегда сохраняй точность и официальный тон.
3. При необходимости приводи реальные примеры (на перекрёстке, при обгоне, на парковке и т. д.).
4. Если вопрос связан с тестами или уроками, укажи: "Эта тема раскрывается в модуле X, урок Y".
5. Если вопрос требует практики — предложи пройти соответствующий тест.
6. Отвечай на том языке, на котором задал вопрос пользователь.
7. Всегда пиши букву "ё" корректно.
8. Не извиняйся, не упоминай себя — фокусируйся на обучении.
9. Если вопрос неполный, уточни его вежливо.
10. При сложных терминах давай короткое определение в скобках.

Структура ответа:
• Краткое объяснение сути
• Разбор/пример из практики
• Совет или рекомендация (что запомнить / как действовать)`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('AI chat error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
