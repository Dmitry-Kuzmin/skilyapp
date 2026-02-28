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
    model: "gemini-3.1-pro-preview",
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

async function fixFile(filePath, mode) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📂 Processing: ${filePath}`);
    console.log(`🔧 Mode: ${mode}`);

    const rawData = await fs.readFile(filePath, 'utf8');
    let questions = JSON.parse(rawData);

    let fixedCount = 0;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let needsRegeneration = false;

        // Check if this question needs fixing
        if (mode === 'clean-cyrillic') {
            // Only fix questions with cyrillic in ES
            if (/[а-яА-ЯёЁ]/.test(q.explanation.es || '')) {
                console.log(`  🧹 Q${q.question_number}: Cleaning cyrillic from ES...`);
                needsRegeneration = true;
            }
        } else if (mode === 'remove-answer-mentions') {
            // Only fix questions mentioning answers
            const allText = JSON.stringify(q.explanation).toLowerCase();
            if (/respuesta correcta es|correct answer is|правильный ответ|ответ [abc]/i.test(allText)) {
                console.log(`  ✂️  Q${q.question_number}: Removing answer mentions...`);
                needsRegeneration = true;
            }
        } else if (mode === 'full-regenerate') {
            // Regenerate all
            needsRegeneration = true;
        }

        if (!needsRegeneration) continue;

        // Generate new explanation
        const correctAns = q.answers.find(a => a.is_correct)?.text?.es || "Unknown";
        const prompt = PROMPT_TEMPLATE
            .replace('{QUESTION_ES}', q.question.es)
            .replace('{ANSWER_CORRECT_ES}', correctAns);

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            // Clean control characters
            const cleanText = responseText.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            const json = JSON.parse(cleanText);

            if (json.explanation?.es && json.explanation?.ru && json.explanation?.en) {
                questions[i].explanation = json.explanation;
                fixedCount++;
                process.stdout.write(`✅ `);
            } else {
                console.error(`\n❌ Q${q.question_number}: Invalid response`);
            }
        } catch (error) {
            console.error(`\n❌ Q${q.question_number}: ${error.message}`);
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 1500));
    }

    await fs.writeFile(filePath, JSON.stringify(questions, null, 2));
    console.log(`\n✨ Fixed ${fixedCount} questions in ${filePath}`);
}

async function main() {
    // 1. Clean cyrillic in Topic 2, Test 2
    await fixFile('data/parsed/topic-02/topic-02_test-002.json', 'clean-cyrillic');

    // 2. Remove answer mentions in Topic 1, Test 1
    await fixFile('data/parsed/topic-01/topic-01_test-001-enriched.json', 'remove-answer-mentions');

    // 3. Full regeneration of Topic 2, Test 1
    await fixFile('data/parsed/topic-02/topic-02_test-001-enriched.json', 'full-regenerate');

    console.log('\n' + '='.repeat(70));
    console.log('🎉 ALL FIXES COMPLETE!');
    console.log('Run audit script again to verify.');
}

main().catch(console.error);
