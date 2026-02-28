/**
 * generate-flashcards - Генерация элитных инсайт-карточек (Reflection Protocol)
 * 
 * ВАЖНО: Использует принцип "Grounding" — ИИ переупаковывает объяснение из БД,
 * а не выдумывает правила из головы. Это исключает галлюцинации.
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FailedQuestion {
    questionId: string;
    questionText: string;
    userAnswer: string;
    correctAnswer: string; // Прямой текст правильного ответа из БД
    explanation: string;   // Официальное объяснение из БД
    topic?: string;
}

const getSystemPrompt = (country: string): string => {
    const isRussia = country === 'russia';

    return `Ты — Skily, элитный ИИ-инструктор и эксперт по подвохам в экзаменах ${isRussia ? 'ПДД РФ' : 'DGT Испании'}.

ТВОЯ РОЛЬ:
Ты — ментор-проводник. Твоя задача — объяснить, ГДЕ пользователя подловили. Ты должен превратить сухое правило в "Чит-код" (Insight).

КРИТИЧЕСКИЕ ПРАВИЛА (GROUNDING):
1. 🛑 ИСТОЧНИК ПРАВДЫ: Объяснение (explanation) и правильный ответ (correct_answer) из базы данных.
2. ЕСЛИ В БАЗЕ НАПИСАНО "50 км/ч", А ТЫ ДУМАЕШЬ "40 км/ч" — ПИШИ 50. Твои внутренние знания ВТОРИЧНЫ по сравнению с базой.
3. НИКАКИХ ГАЛЛЮЦИНАЦИЙ: Не выдумывай странные термины (например, не используй "emergencia cruda" — это звучит нелепо. Используй "urgencia justificada").
4. СТАТЬИ И ПУНКТЫ: Ссылка на статью (article) должна быть ТОЧНОЙ из db_explanation. Если в базе НЕТ номера статьи, оставь поле "article" ПУСТЫМ или напиши кратко тему. НИКОГДА не пиши заглушки типа "[NÚMERO ARTÍCULO]".

ФОРМАТ ОТВЕТА (JSON):
{
  "flashcards": [
    {
      "question_id": "...",
      "trap_alert": "Хлёсткий заголовок ловушки (например: 'Обочина — это не Autovía!')",
      "explanation": "Глубокий инсайт на основе db_explanation. Почему вариант пользователя был 'логичной ловушкой'?",
      "visual_focus": "Акцент на картинку: 'Посмотри на синий знак в правом углу...'",
      "difficulty_rating": "Hardcore (72% ошибок)",
      "mnemonic": "Яркая запоминалка (например: 'Синий круг — минимум, красный — максимум')",
      "article": "Пункт ПДД или статья (только если есть в базе, иначе пусто)"
    }
  ]
}

Язык: ${isRussia ? 'Разговорный русский' : 'Conversational Spanish'}. Тон: Хитрый, экспертный, без воды.`;
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { failedQuestions, country = 'russia' } = await req.json() as {
            failedQuestions: FailedQuestion[];
            country?: string;
        };

        if (!failedQuestions || failedQuestions.length === 0) {
            throw new Error('No failed questions provided');
        }

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

        const questionsContext = failedQuestions.slice(0, 10).map((q, i) =>
            `ВОПРОС #${i + 1} (ID: ${q.questionId}):
      Текст вопроса: ${q.questionText}
      Ошибка пользователя: ${q.userAnswer}
      ПРАВИЛЬНЫЙ ОТВЕТ: ${q.correctAnswer}
      ОБЪЯСНЕНИЕ ИЗ БД: ${q.explanation}
      ${q.topic ? `Тема: ${q.topic}` : ''}`
        ).join('\n\n---\n\n');

        const userMessage = `Создай Инсайт-карточки для этих ошибок. Помни про строгое следование фактам из БД!
    
    ДАННЫЕ:
    ${questionsContext}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: getSystemPrompt(country) + '\n\n' + userMessage }] }],
                    generationConfig: {
                        temperature: 0.7,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        );

        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) throw new Error('Empty response from Gemini');

        const parsed = JSON.parse(content);
        const flashcards = Array.isArray(parsed) ? parsed : (parsed.flashcards || []);

        const finalFlashcards = flashcards.map((card: Record<string, unknown>, index: number) => ({
            ...card,
            question_id: card.question_id || failedQuestions[index]?.questionId
        }));

        return new Response(
            JSON.stringify({ flashcards: finalFlashcards }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        console.error('[generate-flashcards] Error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
