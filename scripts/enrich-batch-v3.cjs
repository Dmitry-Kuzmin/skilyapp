const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sharp = require('sharp');

// --- KONFIGURACJA ---
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview", // Updated to strongest text model
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
            type: "object",
            properties: {
                question: {
                    type: "object",
                    properties: {
                        es: { type: "string" },
                        en: { type: "string" },
                        ru: { type: "string" }
                    },
                    required: ["es", "en", "ru"]
                },
                answers: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string", enum: ["a", "b", "c"] },
                            text: {
                                type: "object",
                                properties: {
                                    es: { type: "string" },
                                    en: { type: "string" },
                                    ru: { type: "string" }
                                },
                                required: ["es", "en", "ru"]
                            },
                            is_correct: { type: "boolean" }
                        },
                        required: ["id", "text", "is_correct"]
                    }
                },
                explanation: {
                    type: "object",
                    properties: {
                        es: { type: "string" },
                        en: { type: "string" },
                        ru: { type: "string" }
                    },
                    required: ["es", "en", "ru"]
                }
            },
            required: ["question", "answers", "explanation"]
        }
    }
});

// --- HELPER: UNIVERSAL ID EXTRACTOR ---
function extractUniversalId(q) {
    // 1. Попытка из поля (если уже есть)
    if (q.external_id) return q.external_id;

    // 2. Из Image URL
    if (q.image_url) {
        const match = q.image_url.match(/\/question\/([a-f0-9\-]{36})/);
        if (match) return match[1];
    }

    // 3. Из Schema URL
    if (q.schema_url) {
        const match = q.schema_url.match(/\/question\/([a-f0-9\-]{36})/);
        if (match) return match[1];
    }

    // 4. Fallback: Hash от текста (для тех 0.6% без ID)
    const crypto = require('crypto');
    return "hash_" + crypto.createHash('md5').update((q.question.es || "").trim()).digest('hex');
}

// --- GLOBAL CACHE ---
const GLOBAL_CACHE = new Map(); // ID -> { enriched_data }

function buildGlobalCache(rootDir) {
    console.log("🔍 Строим Глобальный Кэш переводов...");
    let count = 0;

    function scan(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                scan(fullPath);
            } else if (file.endsWith("-enriched.json")) {
                try {
                    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    data.forEach(q => {
                        const id = extractUniversalId(q);
                        // Сохраняем в кэш полный объект перевода
                        if (id && !GLOBAL_CACHE.has(id)) {
                            GLOBAL_CACHE.set(id, {
                                question: q.question, // ru/en уже тут
                                answers: q.answers,   // ru/en уже тут
                                explanation: q.explanation
                            });
                            count++;
                        }
                    });
                } catch (e) { }
            }
        }
    }

    scan(rootDir);
    console.log(`✅ Кэш построен: ${count} уникальных вопросов уже переведены.`);
}

// --- AI WORKER ---
async function processQuestionWithAI(q) {
    const prompt = `
    You are an expert Driving Instructor for DGT Spain.
    
    TASK:
    1. Translate the question and answer choices into Russian and English.
    2. Provide a helpful explanation (why the answer is correct) in Spanish, English, and Russian.
    3. Keep translations concise and natural.
    4. Maintain the EXACT same answer IDs and is_correct flags as input.
    5. Number of answers MUST match input exactly (${q.answers.length} answers).

    INPUT DATA:
    ${JSON.stringify({
        question: q.question.es,
        answers: q.answers.map(a => ({ id: a.id, text: a.text.es, is_correct: a.is_correct }))
    }, null, 2)}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const aiResult = JSON.parse(text);

    // ✅ ВАЛИДАЦИЯ AI ОТВЕТА
    if (!aiResult.question || !aiResult.answers || !aiResult.explanation) {
        throw new Error("AI вернул неполные данные");
    }

    if (aiResult.answers.length !== q.answers.length) {
        throw new Error(`AI вернул ${aiResult.answers.length} ответов, ожидалось ${q.answers.length}`);
    }

    // Проверяем, что ID совпадают
    const originalIds = q.answers.map(a => a.id).sort().join(',');
    const aiIds = aiResult.answers.map(a => a.id).sort().join(',');
    if (originalIds !== aiIds) {
        throw new Error(`AI изменил ID ответов: было ${originalIds}, стало ${aiIds}`);
    }

    return aiResult;
}

// --- MAIN PROCESS ---
async function processFile(filePath) {
    console.log(`\n📂 Обработка файла: ${path.basename(filePath)}`);

    let rawData;
    try {
        rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`❌ Ошибка чтения файла: ${e.message}`);
        return;
    }

    const enrichedResults = [];
    let modifiedCount = 0;
    let cacheHitCount = 0;
    let aiCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rawData.length; i++) {
        const q = rawData[i];
        const id = extractUniversalId(q);

        process.stdout.write(`\r   👉 Вопрос ${i + 1}/${rawData.length} [ID: ${id.substring(0, 8)}...] `);

        // Формируем базу для нового объекта
        const newQ = {
            ...q,
            external_id: id, // ВАЖНО: ЯВНО ПРОПИСЫВАЕМ ID
        };

        // Проверяем Кэш
        if (GLOBAL_CACHE.has(id)) {
            // БЕРЕМ ИЗ КЭША
            const cached = GLOBAL_CACHE.get(id);
            newQ.question = cached.question;
            newQ.answers = cached.answers;
            newQ.explanation = cached.explanation;
            newQ.enriched_from_cache = true; // Метка для отладки
            cacheHitCount++;
        } else {
            // ИДЕМ В AI
            try {
                // Ретрай логика
                let aiResult = null;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        aiResult = await processQuestionWithAI(q);
                        break;
                    } catch (e) {
                        if (attempt === 3) throw e;
                        await new Promise(r => setTimeout(r, 2000 * attempt));
                    }
                }

                // Мержим результат AI
                newQ.question = aiResult.question;
                newQ.answers = aiResult.answers;
                newQ.explanation = aiResult.explanation;

                // Добавляем в кэш "на лету" (вдруг повторится в этом же файле)
                GLOBAL_CACHE.set(id, aiResult);

                aiCount++;
                // Пауза чтобы не задушить API
                await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                console.error(`\n❌ Ошибка AI на вопросе ${i + 1}: ${err.message}`);
                // В случае ошибки оставляем как есть (только ES)
                newQ.error_enriching = true;
                newQ.error_message = err.message;
                errorCount++;
            }
        }

        enrichedResults.push(newQ);
    } // end loop

    // Сохраняем результат
    const newFileName = filePath.replace('.json', '-enriched.json');

    // 🛡️ СОЗДАЕМ BACKUP ЕСЛИ ФАЙЛ УЖЕ СУЩЕСТВУЕТ
    if (fs.existsSync(newFileName)) {
        const backupName = newFileName + '.backup';
        fs.copyFileSync(newFileName, backupName);
        console.log(`\n   💾 Создан backup: ${path.basename(backupName)}`);
    }

    fs.writeFileSync(newFileName, JSON.stringify(enrichedResults, null, 2));

    console.log(`\n✅ Готово!`);
    console.log(`   - Из кэша (бесплатно): ${cacheHitCount}`);
    console.log(`   - AI (платно): ${aiCount}`);
    console.log(`   - Ошибки: ${errorCount}`);
    console.log(`   - Сохранено вопросов: ${enrichedResults.length}`);
    console.log(`   💾 Файл: ${path.basename(newFileName)}`);
}

// --- ORCHESTRATOR ---
async function main() {
    const targetDir = process.argv[2];
    if (!targetDir) {
        console.error("Пожалуйста, укажите папку для обработки.");
        console.error("Пример: node scripts/enrich-batch-v3.js ./data/parsed/dgt_test");
        return;
    }

    const rootDataDir = "./data/parsed";

    // 1. Строим Кэш
    buildGlobalCache(rootDataDir);

    // 2. Ищем файлы для обработки
    const files = fs.readdirSync(targetDir)
        .filter(f => f.endsWith(".json") && !f.includes("-enriched") && f.includes("test-"));
    // Фильтр f.includes("test-") чтобы не брать мусор, если есть

    console.log(`🚀 Найдено ${files.length} файлов для обработки в ${targetDir}`);

    // 3. Обрабатываем (Sequential, чтобы не убить API)
    for (const file of files) {
        await processFile(path.join(targetDir, file));
    }
}

main();
