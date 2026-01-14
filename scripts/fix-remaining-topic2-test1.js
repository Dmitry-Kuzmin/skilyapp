import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY не установлен.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-preview",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
    }
});

const PROMPT_TEMPLATE = `You are a Spanish DGT driving test expert. Generate explanations in 3 languages.

QUESTION (ES): {QUESTION_ES}
CORRECT ANSWER (ES): {ANSWER_CORRECT_ES}

STRICT FORMAT (use EXACTLY this structure for ALL languages):

🧠 **[Logic Header]**:
[Clear explanation of WHY this is the answer. Use simple language, analogies. 2-3 sentences max.]

💣 **[Trap Header]**:
[What confuses people? Common mistakes. 1-2 sentences.]

HEADERS BY LANGUAGE:
- ES: 🧠 **La Lógica "Por qué"**: / 💣 **La Trampa / El Truco**:
- EN: 🧠 **The Logic "Why"**: / 💣 **The Trap / The Trick**:
- RU: 🧠 **Логика "Почему"**: / 💣 **Ловушка / Трюк**:

CRITICAL RULES:
- NEVER mention "Answer A/B/C" or "Option X" (answers are shuffled!)
- NO cyrillic in ES/EN text
- Keep it conversational, educational
- Use markdown bold (**) for headers only

OUTPUT JSON:
{
  "explanation": {
    "es": "...",
    "en": "...",
    "ru": "..."
  }
}`;

async function fixOldFormatQuestions(filePath) {
    console.log(`\n📂 Processing: ${filePath}`);

    const rawData = await fs.readFile(filePath, 'utf8');
    let questions = JSON.parse(rawData);

    let fixedCount = 0;
    let toFix = [];

    // Find questions with old format
    questions.forEach((q, idx) => {
        const ruExpl = q.explanation.ru || '';
        const isNewFormat = /🧠.*Логика.*Почему/.test(ruExpl) && /💣.*Ловушка/.test(ruExpl);
        if (!isNewFormat) {
            toFix.push(idx);
        }
    });

    console.log(`🔍 Found ${toFix.length} questions in old format`);

    for (const idx of toFix) {
        const q = questions[idx];
        console.log(`  🔄 Q${q.question_number}: Regenerating...`);

        const correctAns = q.answers.find(a => a.is_correct)?.text?.es || "Unknown";
        const prompt = PROMPT_TEMPLATE
            .replace('{QUESTION_ES}', q.question.es)
            .replace('{ANSWER_CORRECT_ES}', correctAns);

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const cleanText = responseText.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            const json = JSON.parse(cleanText);

            if (json.explanation?.es && json.explanation?.ru && json.explanation?.en) {
                questions[idx].explanation = json.explanation;
                fixedCount++;
                console.log(`  ✅ Q${q.question_number}: Done`);
            } else {
                console.error(`  ❌ Q${q.question_number}: Invalid response`);
            }
        } catch (error) {
            console.error(`  ❌ Q${q.question_number}: ${error.message}`);
        }

        // Rate limiting - longer pause for Pro model
        await new Promise(r => setTimeout(r, 3000));
    }

    await fs.writeFile(filePath, JSON.stringify(questions, null, 2));
    console.log(`\n✨ Fixed ${fixedCount}/${toFix.length} questions`);
}

fixOldFormatQuestions('data/parsed/topic-02/topic-02_test-001-enriched.json')
    .catch(console.error);
