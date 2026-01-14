
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("❌ Ошибка: GEMINI_API_KEY не установлен.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Используем Flash 2.0 для скорости и качества
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2 // Низкая температура для строго соблюдения формата
    }
});

const PROMPT_TEMPLATE = `
You are an expert ancient driving instructor for the Spanish DGT exam.
Your task is to RE-WRITE explanations for a driving test question in 3 languages (ES, EN, RU).

INPUT QUESTION:
Q (ES): {QUESTION_ES}
Correct Answer (ES): {ANSWER_CORRECT_ES}

STYLE GUIDELINES (CRITICAL):
1.  **Format**: Use EXACTLY this markdown structure for ALL languages:
    🧠 **[Header Logic]**:
    [Explanation of WHY]

    💣 **[Header Trap]**:
    [Explanation of the TRICK/TRAP]

2.  **Headers**:
    *   ES: 🧠 **La Lógica "Por qué"** / 💣 **La Trampa / El Truco**
    *   EN: 🧠 **The Logic "Why"** / 💣 **The Trap / The Trick**
    *   RU: 🧠 **Логика "Почему"** / 💣 **Ловушка / Трюк**

3.  **Content**:
    *   **Logic**: Explain the reasoning simply, like to a friend. Use analogies. Don't just quote the law.
    *   **Trap**: Explicitly point out what confuses people (e.g., "People usually think X, but...").
    *   **Tone**: Educational, supportive, "senior instructor".
    *   **No "Answer A/B/C"**: NEVER mention "Option A" or "Answer B". Answers are shuffled. Refer to the content.

OUTPUT JSON SCHEMA:
{
  "explanation": {
    "es": "...",
    "en": "...",
    "ru": "..."
  }
}
`;

async function processFile(filePath) {
    console.log(`\n📂 Processing: ${filePath}`);
    const rawData = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(rawData);

    let updatedCount = 0;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // Находим правильный ответ
        const correctAns = q.answers.find(a => a.is_correct)?.text?.es || "Unknown";

        const prompt = PROMPT_TEMPLATE
            .replace('{QUESTION_ES}', q.question.es)
            .replace('{ANSWER_CORRECT_ES}', correctAns);

        console.log(`  🔄 Q${q.question_number}: Re-generating explanations...`);

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const json = JSON.parse(responseText);

            if (json.explanation && json.explanation.es && json.explanation.ru) {
                questions[i].explanation = json.explanation;
                updatedCount++;
                process.stdout.write(`✅ `);
            } else {
                console.error(`\n❌ Q${q.question_number}: Invalid JSON response`);
            }
        } catch (error) {
            console.error(`\n❌ Q${q.question_number}: Error - ${error.message}`);
            // Wait a bit on error
            await new Promise(r => setTimeout(r, 2000));
        }

        // Rate limiting pause
        await new Promise(r => setTimeout(r, 1500));
    }

    await fs.writeFile(filePath, JSON.stringify(questions, null, 2));
    console.log(`\n✨ Finished! Updated ${updatedCount}/${questions.length} questions in ${filePath}`);
}

const targetFiles = [
    'data/parsed/topic-01/topic-01_test-001-enriched.json',
    'data/parsed/topic-01/topic-01_test-002-enriched.json'
];

async function main() {
    for (const file of targetFiles) {
        await processFile(file);
    }
}

main().catch(console.error);
