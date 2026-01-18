/**
 * ========================================
 * БАТЧ-ГЕНЕРАТОР ИЗОБРАЖЕНИЙ (GEMINI IMAGEN)
 * ========================================
 * 
 * Генерирует уникальные изображения для всех вопросов из enriched файлов
 * Использует ваш проверенный промпт и двухэтапную систему:
 * 1. Gemini Vision анализирует оригинал
 * 2. Gemini Imagen генерирует новое изображение
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import fs from 'fs/promises';
import fsSync from 'fs'; // For sync methods in checkpoint
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ Ошибка: Не задан GEMINI_API_KEY в .env.local');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const visionModel = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' }); // Vision analysis: Newest Flash model!
const imagenModel = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' }); // Best quality + traffic signs!

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================
const CONFIG = {
    outputDir: './data/generated-images',
    originalsDir: './data/originals',
    checkpointFile: './data/image-gen-checkpoint.json',
    reviewQueueFile: './data/review-queue.json',
    maxRetries: 5,
    delayBetweenImages: 15000, // 15 секунд (очень безопасно)
    delayBetweenVisionAndImagen: 5000, // 5 сек между Vision и Imagen
    batchSize: 10, // Генерировать пачками по 10
    pauseForReview: !process.argv.includes('--no-pause'), // Пауза после каждой пачки
    autoContinueAfter: 10 * 60 * 1000, // Автопродолжение через 10 минут если не проверили
    dryRun: process.argv.includes('--dry-run'),
};

// ==========================================
// ВАШ ПРОВЕРЕННЫЙ ПРОМПТ (из generate-images-gemini.js)
// ==========================================

const VISION_ANALYSIS_PROMPT = `ROLE: Traffic Safety Expert (Spanish DGT).
TASK: Analyze image components for precise 3D recreation.
CONSTRAINT: DO NOT reveal correct answer.

OUTPUT FORMAT: Structured breakdown.

1. VIEWPOINT: Exact angle (top-down, driver POV).
2. VEHICLES:
   - List each: Type, Color, Lane/Shoulder position, Direction.
   - SHOULDER CHECK: If vehicle is on "Arcén", state explicitly.
3. INFRASTRUCTURE:
   - Type (Autopista, Conventional, Urban).
   - Lane count & Surface.
   - TEMPORARY: Cones? Yellow markings?
4. SIGNS: List all visible DGT codes (R-301, P-4, etc). Verify consistency with road.
5. MARKINGS:
   - Center: Continuous or Dashed? White or Yellow?
   - Arrows/Crosswalks.
6. TRAFFIC FLOW:
   - Map vehicle directions relative to markings.
   - Detect contradictions (e.g., solid line but vehicle overtaking).
7. ENVIRONMENT: Lighting, Weather, Surrounding (Urban/Rural).
8. SCENARIO: Objective description of situation (Overtaking, Junction, Parking).
9. TRAJECTORIES: Describe arrow paths (Color, Start/End).

ACCURACY IS PARAMOUNT. FLAG LOGICAL ERRORS.`;

const STYLE_MASTER_PROMPT = `STYLE: Unreleased Unreal Engine 5 rendering. Spanish DGT Driving Test Digital Twin.

## VISUAL SPECS:
- PROJECTION: Isometric Top-Down (45°).
- RENDER: Photorealistic, 8K textures, Ray-traced lighting (Daylight).
- COMPOSITION: Full-frame, edge-to-edge terrain (NO black voids).

## SIGNAGE RULES (STRICT):
- RENDER SYMBOLS, NOT TEXT LABELS.
- **NEVER WRITE THE SIGN CODE (e.g., "R-301", "P-4") ON THE IMAGE.**
- Sign codes are for YOUR definition only. They are NOT physical plates.
- Prompt "R-301 (60)" -> Draw ONLY a Red Circle with "60". NO extra text below.
- Prompt "Stop" -> Draw Red Octagon with "STOP".

## NEGATIVE PROMPT (THINGS TO AVOID):
- **TEXT PLATES WITH CODES** (e.g. small white box saying "R-301").
- Floating text, UI elements, watermarks.
- American road markings (Double yellow lines).

## INFRASTRUCTURE:
1. AUTOPISTA: DUAL carriageway. MUST have PHYSICAL MEDIAN (concrete/grass).
2. CONVENTIONAL: Single carriageway. Dashed/Solid center line. Two-way traffic.
3. URBAN: Curbs, sidewalks, buildings.

## VEHICLES:
- MODELS: Modern European (Seat, Renault, VW).
- DETAIL: Realistic lights, glass, tires.
- PLACEMENT: Strictly centered in lanes (unless overtaking/parking).

## OVERLAYS:
- ARROWS: Orange (#FF8C00), 3D projected on road, smooth curves.
- LOGIC: Show SAFE, LEGAL paths only.

## LOGIC CHECKS:
- ONE-WAY vs TWO-WAY: Check center line consistency.
- SIGNS vs LANES: 3-lane sign requires 3 actual lanes.
- BARRIERS: High speed = Barrier required.

## SPANISH ATMOSPHERE & VARIETY (SELECT 1-2 ELEMENTS PER SCENE, DO NOT OVERLOAD):
- **COMMERCIAL VEHICLES (Randomize)**: "Correos" Yellow Vans, "Amazon Prime" Dark Grey Vans, "Mercadona" delivery trucks, "Guardia Civil" green patrol cars.
- **STREET LIFE (Randomize)**:
   - "Bar" terraces with metal tables.
   - "Farmacia" (Green LED cross).
   - "Tabacos" (Yellow flag).
   - "Kiosco" (Newsstand).
   - "Carrefour Express" or "Dia" supermarkets.
- **LANDSCAPES (Context dependent)**:
   - *Coastal*: Blue Mediterranean sea visible in distance, palm trees.
   - *Mountain*: Pyrenees style, grey rocky cliffs, pine trees.
   - *Rural*: Dry "Meseta" plains, olive groves, bullboards (Osborne bull) in distance.
   - *Urban*: Modern apartment blocks with awnings (toldos), narrow "pueblo" streets.
- **LIGHTING & WEATHER (Vary this)**:
   - Golden Hour (Warm low sun, long shadows).
   - High Noon (Harsh contrast).
   - Occasional Overcast (Soft lighting, Northern Spain vibes).
- **TRANSPORT**: RENFE trains (if rails exist), ALSA buses, City Taxis (White with Red stripe or Black/Yellow).

**IMPORTANT: BE SUBTLE. DO NOT CROWD THE SCENE. LET THE AI CHOOSE THE BEST VIBE.**

GENERATE EXACT SCENE FROM DESCRIPTION.`;

// ==========================================
// CHECKPOINT SYSTEM
// ==========================================
function loadCheckpoint() {
    try {
        if (fsSync.existsSync(CONFIG.checkpointFile)) {
            const data = JSON.parse(fsSync.readFileSync(CONFIG.checkpointFile, 'utf8'));
            return {
                ...data,
                processed: new Set(data.processed || [])
            };
        }
    } catch (e) { }

    return {
        processed: new Set(),
        failed: [],
        stats: { total: 0, success: 0, failed: 0 }
    };
}

function saveCheckpoint(checkpoint) {
    fsSync.writeFileSync(
        CONFIG.checkpointFile,
        JSON.stringify({
            ...checkpoint,
            processed: Array.from(checkpoint.processed)
        }, null, 2)
    );
}

// ==========================================
// АНАЛИЗ ОРИГИНАЛЬНОГО ИЗОБРАЖЕНИЯ (Vision)
// ==========================================
async function analyzeOriginalImage(imageUrl) {
    try {
        console.log(`  🔍 Gemini Vision анализирует оригинал...`);

        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        const base64Image = imageBuffer.toString('base64');

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        const result = await visionModel.generateContent([VISION_ANALYSIS_PROMPT, imagePart]);
        const analysis = result.response.text();

        // Calculate Vision Cost (Gemini Flash: ~$0.10/1M in, ~$0.40/1M out)
        // Image is approx 258 tokens + prompt tokens
        const usage = result.response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
        const visionCost = ((usage.promptTokenCount / 1000000) * 0.10) + ((usage.candidatesTokenCount / 1000000) * 0.40);

        console.log(`  📊 Токенов: ${usage.promptTokenCount} (in) + ${usage.candidatesTokenCount} (out) | Cost: ~$${visionCost.toFixed(5)}`);

        return {
            analysis: analysis,
            imageBuffer: imageBuffer,
            mimeType: mimeType, // 'image/jpeg' or 'image/png'
            visionCost: visionCost
        };

    } catch (error) {
        console.error(`  ⚠️  Ошибка анализа: ${error.message}`);
        return null;
    }
}

// ==========================================
// ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ (Imagen)
// ==========================================
async function generateImage(question, visionAnalysis, attempt = 1) {
    let prompt;

    if (question.custom_prompt) {
        console.log(`   🎨 Используем кастомный промт пользователя`);
        prompt = question.custom_prompt;
    } else {
        const questionText = question.question?.es || '';

        // Формируем блок с ответами для контекста
        const answersContext = question.answers ? question.answers.map((ans, idx) => {
            const isCorrect = ans.is_correct !== undefined ? ans.is_correct : (idx === 0);

            // Extract text handling different formats
            let text = '';
            if (typeof ans.text === 'object') {
                text = ans.text.es || ans.text.ru || ans.text.en || JSON.stringify(ans.text);
            } else {
                text = ans.text || ans;
            }

            return `- ${isCorrect ? '[CORRECT ANSWER] ' : ''}${text}`;
        }).join('\n') : 'No answers provided';

        // Detect unregulated intersection context
        const correctAnswerText = question.answers?.find(a => a.is_correct)?.text?.es?.toLowerCase() || "";
        // If answer mentions yielding to the right, it's unregulated!
        const isPriorityRightContext = correctAnswerText.includes('derecha') &&
            (correctAnswerText.includes('ceder') || correctAnswerText.includes('prioridad'));

        const textToScan = (questionText + ' ' + (typeof visionAnalysis === 'string' ? visionAnalysis : '')).toLowerCase();

        // Extract explanation for context
        let explanationText = "";
        if (question.explanation) {
            if (typeof question.explanation === 'string') {
                explanationText = question.explanation;
            } else {
                explanationText = question.explanation.en || question.explanation.es || question.explanation.ru || "";
            }
        }
        // Clean up explanation (remove markdown bolding for prompt clarity)
        explanationText = explanationText.replace(/\*\*/g, '').replace(/\*/g, '');

        const isUnregulated =
            textToScan.includes('sin señalizar') ||
            (textToScan.includes('prioridad') && textToScan.includes('derecha')) ||
            textToScan.includes('unregulated') ||
            textToScan.includes('no signs') ||
            isPriorityRightContext;

        // Detect "Carril Adicional" (Temporary lane using shoulders)
        const isCarrilAdicional =
            textToScan.includes('carril adicional') ||
            textToScan.includes('additional lane') ||
            explanationText.toLowerCase().includes('carril adicional'); // Check explanation too!

        // Detect Broken Traffic Light
        const isBrokenTrafficLight =
            textToScan.includes('semáforo apagado') ||
            textToScan.includes('no funciona') ||
            textToScan.includes('intermitente') ||
            questionText.toLowerCase().includes('amarillo intermitente'); // blinking yellow is also "broken" mode

        prompt = `${STYLE_MASTER_PROMPT}

## SCENE TO GENERATE:
Based on original DGT test image analysis:

${visionAnalysis}

${explanationText ? `
## CONTEXT FROM EXPERT EXPLANATION (USE FOR VISUAL DETAILS):
The standard DGT explanation for this scenario is:
"${explanationText}"

**AUTO-INSTRUCTION**: If the explanation mentions specific markings (colored lines, cones) or signs, YOU MUST DRAW THEM EXACTLY AS DESCRIBED.
` : ''}

## QUESTION CONTEXT (CRITICAL):
"${questionText}"

## ANSWERS CONTEXT (LOGIC MUST MATCH CORRECT ANSWER):
${answersContext}

Recreate this EXACT scene with improvements:
- Professional 3D isometric style
- Premium educational quality
- Crystal clear DGT road signs (ONLY those from original, NO extras)

${isUnregulated ? `
## 🚫 SPECIAL RULES: UNREGULATED INTERSECTION (CRITICAL)
This scenario tests "Right-of-Way" (Priority to the Right).
To ensure the question is valid, you MUST COMPLY:
1. **NO YIELD MARKINGS**: Do NOT draw white triangles (shark teeth) on the road.
2. **NO STOP LINES**: Do NOT draw transverse lines at the intersection.
3. **CLEAN ASPHALT**: The center of the intersection must be EMPTY and UNMARKED.
4. **NO SIGNS**: Do not generate vertical Stop or Yield signs.
5. **VISUAL EQUALITY**: All roads must look identical in width and importance.
` : ''}

${isCarrilAdicional ? `
## 🚧 SPECIAL RULES: CARRIL ADICIONAL (TEMPORARY ADD. LANE)
This scenario depicts a road where shoulders are used as lanes.
**MANDATORY VISUAL LOGIC**:
1. **SIDE VEHICLES ON SHOULDER**: The vehicles on the FAR LEFT and FAR RIGHT must be driving ON THE PAVED SHOULDER (Arcén), OUTSIDE the main white edge lines.
2. **CENTER VEHICLE**: Only the middle vehicle is in the original lane.
3. **CONES**: A line of CONES separates the traffic.
4. **LIGHTS**: All vehicles must have HEADLIGHTS ON (Low beam).
` : ''}

${isBrokenTrafficLight ? `
## 🚦 SPECIAL RULES: BROKEN/INACTIVE TRAFFIC LIGHT (CRITICAL)
The question context indicates the traffic light is OFF (apagado) or BLINKING.
**MANDATORY VISUAL LOGIC**:
1. **DORMANT SIGNAL**: The traffic light heads MUST BE DARK (Black/Grey) or blinking YELLOW if specified.
2. **NO RED/GREEN**: Absolutely NO solid Red or Green lights.
3. **VISIBILITY**: The traffic light pole must be visible but inactive.
` : ''}

## CRITICAL CONSTRAINTS:
- Road markings: WHITE ONLY (Spanish standard, NOT yellow/USA)
- NO dimension text ("10cm", "6m", "3.5m") on the road
- NO measurement annotations
- NO invented traffic signs
- Clean visual without labels or text overlays

## TRAFFIC LOGIC (OBEY STRICTLY):
- **PRIORITY RULES**: The visual situation MUST justify the correct answer!
- If correct answer says "Blue car passes first", ensure Blue car has NO obstacles/yield signs.
- If answer says "Red car yields", ensure Red car has a Stop/Yield sign or is on minor road.
- **Autopista/Autovía** = MUST draw physical barrier between opposing flows
- **Carretera** = dashed center line for two-way traffic
- **SPEED SIGNS**: MUST match road type.
- Vehicles stay in lanes, trucks on right lane.
- Trajectory arrows (if any) MUST show SAFE paths.

Generate precise, LOGICALLY CORRECT educational traffic scenario that perfectly illustrates why the correct answer is true.

## NEGATIVE PROMPT (AVOID THESE):
- Yellow center lines (USA style) -> MUST BE WHITE
- Text labels floating in air
        - Distorted wheels or cars floating above ground
- Dark or night scenes (unless specified)
- Rain/Snow (unless specified)`;
    }

    // ==========================================
    // AI PROMPT REWRITER (Smart User Instructions)
    // ==========================================
    if (question.user_instruction) {
        console.log(`\n   🧞‍♂️ AI ANALYZING USER WISH: "${question.user_instruction}"`);
        console.log(`   📝 Rewriting technical prompt...`);

        try {
            // Logs to file for debugging
            const logFile = path.resolve('generation-debug.log');
            const log = (msg) => fsSync.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);

            log(`Starting Rewrite for QID: ${question.id}`);
            log(`User Instruction: ${question.user_instruction}`);

            const rewriterPrompt = `ROLE: Expert Prompt Engineer for DGT Traffic Simulations.
TASK: Modify the EXISTING PROMPT to incorporate the USER INSTRUCTION.

EXISTING PROMPT:
"""
${prompt}
"""

USER INSTRUCTION:
"${question.user_instruction}"

STRICT GUIDELINES:
1. **INTEGRATE** the user's request seamlessly into the "SCENE TO GENERATE" section.
2. **TRANSLATE**: If the USER INSTRUCTION is in Russian, Spanish, or any other language, TRANSLATE the intent to English before integrating.
3. **RESOLVE CONTRADICTIONS**: If user asks for "Truck", remove conflicting "Car" descriptions. **CRITICAL: If user asks for "Narrow Road", "Bottleneck", or "Works", YOU MUST REMOVE the "WIDTH: Standard 3.5m lanes" line from DGT standards.**
4. **MAINTAIN STYLE**: Keep "Unreleased Unreal Engine 5", "Isometric" headers intact.
5. **KEEP TECHNICAL RULES**: Keep "WHITE LINES ONLY" unless user explicitly asks for yellow (works).
6. **OUTPUT format**: Return ONLY the full, final, ready-to-use prompt text. NO markdown code blocks, NO "Here is the prompt". Just the raw text.`;

            // Protect against infinite hang with 45s timeout (increased from 10s)
            const rewriterPromise = visionModel.generateContent(rewriterPrompt);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Rewriter Timeout (45s)')), 45000));

            const rewriterResult = await Promise.race([rewriterPromise, timeoutPromise]);
            const newPrompt = rewriterResult.response.text();

            if (newPrompt && newPrompt.length > 100) {
                prompt = newPrompt.replace(/```/g, '').trim();
                log(`Success! New prompt length: ${prompt.length}`);
                console.log(`   ✨ Prompt successfully rewritten!`);
            } else {
                log(`Rewriter returned invalid prompt.`);
                console.warn(`   ⚠️  Rewriter returned empty/short prompt. Using original.`);
            }
        } catch (rwError) {
            fsSync.appendFileSync(path.resolve('generation-debug.log'), `[ERROR] Rewriter failed: ${rwError.message}\n`);
            console.error(`   ⚠️  Rewriter failed: ${rwError.message}. Using original prompt.`);
        }
    }

    try {
        // Лог теперь в главном цикле

        const result = await imagenModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.4,
                candidateCount: 1,
                responseModalities: ['Image'], // Only image, no text
                imageConfig: {
                    aspectRatio: '16:9', // Landscape for DGT tests
                    imageSize: '2K'      // Optimal: clear signs, but ~2MB instead of 10MB
                }
            }
        });

        const response = await result.response;
        const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

        if (!imageData) {
            throw new Error('Gemini 3 Pro не вернул изображение');
        }

        return {
            buffer: Buffer.from(imageData.data, 'base64'),
            prompt: prompt
        };

    } catch (error) {
        if (attempt <= CONFIG.maxRetries) {
            console.error(`   ⚠️  [Попытка ${attempt}/${CONFIG.maxRetries}] Полная ошибка:`, error);
            console.log(`   ⏳ Повтор через ${5 * attempt}с...`);
            await new Promise(r => setTimeout(r, 5000 * attempt));
            return generateImage(question, visionAnalysis, attempt + 1);
        }
        console.error(`   ❌ Все попытки (${CONFIG.maxRetries}) исчерпаны. Пропускаем.`);
        return null;
    }
}

// ==========================================
// ГЛАВНАЯ ФУНКЦИЯ
// ==========================================
async function processAllQuestions() {
    console.log('🚀 Батч-Генератор Изображений (Gemini Imagen)\n');
    console.log(`📁 Вывод: ${CONFIG.outputDir}`);
    console.log(`🔄 Dry Run: ${CONFIG.dryRun ? 'ДА' : 'НЕТ'}\n`);

    // Создаем директории
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    await fs.mkdir(CONFIG.originalsDir, { recursive: true });

    // Загружаем checkpoint
    const checkpoint = loadCheckpoint();
    console.log(`📊 Уже обработано: ${checkpoint.processed.size}\n`);

    // Собираем все вопросы из enriched файлов
    const questionsMap = new Map(); // external_id -> question_data
    const parsedDir = './data/parsed';

    async function scanForEnriched(dir) {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
                await scanForEnriched(fullPath);
            } else if (file.endsWith('-enriched.json')) {
                try {
                    const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
                    data.forEach(q => {
                        if (q.external_id && (q.image_url || q.schema_url)) {
                            // ✅ ДЕДУПЛИКАЦИЯ: сохраняем только первое вхождение
                            if (!questionsMap.has(q.external_id)) {
                                questionsMap.set(q.external_id, {
                                    id: q.external_id,
                                    question: q.question,
                                    originalUrl: q.image_url || q.schema_url,
                                    sourceFile: file,
                                    testId: file.replace('-enriched.json', '')
                                });
                            }
                        }
                    });
                } catch (e) {
                    console.error(`Ошибка чтения ${file}: ${e.message}`);
                }
            }
        }
    }

    await scanForEnriched(parsedDir);

    await scanForEnriched(parsedDir);

    // Обработка --ids-file (если передано из Dashboard)
    const args = process.argv.slice(2);

    // Check for direct input file (first argument not starting with --)
    const inputFileArg = args.find(a => !a.startsWith('--'));

    if (inputFileArg) {
        try {
            console.log(`📂 Загрузка вопросов из файла: ${inputFileArg}`);
            const inputData = JSON.parse(await fsSync.readFileSync(inputFileArg, 'utf8'));

            // Clear map and populate only with file content
            questionsMap.clear();

            const questionsArray = Array.isArray(inputData) ? inputData : [inputData];

            questionsArray.forEach(q => {
                if (q.external_id || q.id) {
                    // Normalize ID
                    const id = q.external_id || q.id;

                    questionsMap.set(id, {
                        id: id,
                        question: q.question,
                        // Fix URL loading - check both fields
                        originalUrl: q.image_url || q.schema_url || q.originalUrl,
                        sourceFile: inputFileArg,
                        testId: q.testId || 'single-gen',
                        // Valid for both format types
                        generation_prompt: q.generation_prompt
                    });
                }
            });
            console.log(`🎯 Загружено ${questionsMap.size} вопросов из целевого файла`);

        } catch (e) {
            console.error(`❌ Ошибка чтения входного файла: ${e.message}`);
        }
    }

    const idsFileArg = args.find(a => a.startsWith('--ids-file='));
    let targetIds = null;

    if (idsFileArg) {
        const idsPath = idsFileArg.split('=')[1];
        try {
            targetIds = JSON.parse(await fs.readFile(idsPath, 'utf8'));
            console.log(`🎯 Передан список из ${targetIds.length} ID для обработки`);
        } catch (e) {
            console.error(`❌ Ошибка чтения ids-file: ${e.message}`);
        }
    }

    // Обработка --limit
    const limitArg = args.find(a => a.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

    // Собираем массив для обработки
    let toProcess = [];

    if (targetIds) {
        console.log(`🔍 Проверка ${targetIds.length} ID из файла...`);
        console.log(`   Пример ID из файла: ${targetIds[0]}`);
        console.log(`   Пример ключей в базе: ${Array.from(questionsMap.keys())[0]}`);

        let found = 0;
        // Если передан список ID, берем только их (игнорируя checkpoint, чтобы можно было перегенерировать)
        targetIds.forEach(id => {
            if (questionsMap.has(id)) {
                toProcess.push(questionsMap.get(id));
                found++;
            } else {
                if (found === 0) console.log(`❌ ID не найден в базе: ${id}`);
            }
        });
        console.log(`✅ Найдено совпадений: ${found}`);
    } else if (inputFileArg) {
        // Single file mode = FORCE PROCESS ALL (ignore checkpoint)
        console.log(`⚡ Режим одного файла: Игнорируем чекпоинт, обрабатываем всё`);
        toProcess = Array.from(questionsMap.values());
    } else {
        // Normal batch mode
        toProcess = Array.from(questionsMap.values()).filter(q => !checkpoint.processed.has(q.id));
    }

    // Применяем лимит
    if (limit < toProcess.length) {
        toProcess = toProcess.slice(0, limit);
        console.log(`📏 Лимит: обрабатываем только первые ${limit} вопросов`);
    }

    console.log(`📋 Всего уникальных вопросов в базе: ${questionsMap.size}`);
    console.log(`🎯 К обработке сейчас: ${toProcess.length}\n`);

    if (toProcess.length === 0) {
        console.log('🎉 Нечего обрабатывать!');
        return;
    }

    // Обрабатываем
    let processedCount = 0;
    let reviewQueue = []; // Очередь для проверки
    let totalCost = 0; // Примерная стоимость

    for (const question of toProcess) {
        processedCount++;
        const progress = `[${processedCount}/${toProcess.length}]`;
        const safeQ = (question.question?.es || 'Unknown').replace(/\n/g, ' ').substring(0, 40);
        console.log(`\n${'='.repeat(70)}`);
        // Single line log for UI visibility
        console.log(`${progress} 🚀 Processing [${question.id.substring(0, 8)}]: "${safeQ}..."`);

        const testId = question.testId || 'unknown';
        const testOutputDir = path.join(CONFIG.outputDir, testId);
        const testOriginalsDir = path.join(CONFIG.originalsDir, testId);

        // Создаем папки теста (recursive: true не падает, если папка есть)
        await fs.mkdir(testOutputDir, { recursive: true });
        await fs.mkdir(testOriginalsDir, { recursive: true });

        const timestamp = Date.now();
        const outputPath = path.join(testOutputDir, `${question.id}_${timestamp}.png`);
        const originalPath = path.join(testOriginalsDir, `${question.id}_original.jpg`);

        try {
            // Шаг 1: Vision анализ + скачивание оригинала
            console.log(`${progress} 🔍 Vision анализ...`);
            const visionResult = await analyzeOriginalImage(question.originalUrl);
            if (!visionResult) throw new Error('Не удалось проанализировать оригинал');

            console.log(`${progress} ✅ Анализ готов: ${visionResult.analysis.length} символов`);

            // Сохраняем оригинал
            await fs.writeFile(originalPath, visionResult.imageBuffer);
            const origSizeMB = (visionResult.imageBuffer.length / 1024 / 1024).toFixed(2);
            console.log(`${progress} 💾 Оригинал: ${origSizeMB} MB`);

            // Задержка между Vision и Imagen
            await new Promise(r => setTimeout(r, CONFIG.delayBetweenVisionAndImagen));

            // Шаг 2: Генерация нового изображения
            if (CONFIG.dryRun) {
                console.log(`${progress} 🔍 DRY RUN: Генерация пропущена`);
            } else {
                console.log(`${progress} 🎨 Drawing Scene: "${safeQ}..." (Gemini 3 Pro)`);
                const generationResult = await generateImage(question, visionResult.analysis);

                if (generationResult && generationResult.buffer) {
                    await fs.writeFile(outputPath, generationResult.buffer);
                    // Also save the prompt!
                    const promptPath = path.join(testOutputDir, `${question.id}_${timestamp}.prompt.txt`);
                    await fs.writeFile(promptPath, generationResult.prompt);

                    const genSizeMB = (generationResult.buffer.length / 1024 / 1024).toFixed(2);

                    const visionCost = visionResult.visionCost || 0;
                    const imagenCost = 0.04; // Imagen 3 standard pricing
                    const itemCost = visionCost + imagenCost;

                    totalCost += itemCost;
                    console.log(`${progress} ✅ Сохранено: ${genSizeMB} MB | Cost: $${itemCost.toFixed(4)} (Vision: $${visionCost.toFixed(4)} + Img: $${imagenCost})`);
                } else {
                    console.log(`${progress} ❌ Генерация не удалась после всех попыток`);
                }

                console.log(`${progress} 💰 Общая стоимость темы: ~$${totalCost.toFixed(2)}`);

                if (generationResult && generationResult.buffer) {
                    // Добавляем в очередь на проверку
                    reviewQueue.push({
                        id: question.id,
                        generatedPath: outputPath,
                        originalPath: originalPath,
                        question: question.question,
                        timestamp: Date.now()
                    });
                }
            }

            // Обновляем checkpoint
            checkpoint.processed.add(question.id);
            if (checkpoint.stats) {
                checkpoint.stats.success++;
            }

            // Проверка: нужна ли пауза для review?
            if (processedCount % CONFIG.batchSize === 0 && CONFIG.pauseForReview && !CONFIG.dryRun) {
                saveCheckpoint(checkpoint);

                // Сохраняем очередь на проверку
                await fs.writeFile(CONFIG.reviewQueueFile, JSON.stringify(reviewQueue, null, 2));

                console.log(`\n${'='.repeat(60)}`);
                console.log(`🎨 Пачка из ${CONFIG.batchSize} картинок сгенерирована!`);
                console.log(`📊 Всего готово к проверке: ${reviewQueue.length}`);
                console.log(`${'='.repeat(60)}`);
                console.log(`\n⏸️  ПАУЗА ДЛЯ ПРОВЕРКИ`);
                console.log(`\nВарианты:`);
                console.log(`  1. Открой Dashboard (http://localhost:3030)`);
                console.log(`  2. Перейди на таб "Валидация"`);
                console.log(`  3. Проверь новые картинки (${reviewQueue.length} шт.)`);
                console.log(`\nГенерация продолжится автоматически через 10 минут`);
                console.log(`или сразу после проверки.\n`);
                console.log(`Для пропуска паузы: Ctrl+C и перезапусти с --no-pause\n`);

                // Ожидание проверки или таймаута
                const startWait = Date.now();
                let continued = false;

                while (Date.now() - startWait < CONFIG.autoContinueAfter) {
                    // Проверяем файл-флаг продолжения
                    try {
                        const continueFlag = await fs.readFile('./data/continue-generation.flag', 'utf8');
                        if (continueFlag === 'true') {
                            await fs.unlink('./data/continue-generation.flag');
                            console.log(`\n✅ Проверка завершена! Продолжаем генерацию...\n`);
                            reviewQueue = []; // Очищаем очередь
                            continued = true;
                            break;
                        }
                    } catch (e) { }

                    await new Promise(r => setTimeout(r, 5000)); // Проверяем каждые 5 сек
                }

                if (!continued) {
                    console.log(`\n⏱️  Таймаут ожидания истек. Продолжаем генерацию...\n`);
                }
            } else if (processedCount % CONFIG.batchSize === 0) {
                // Просто сохраняем checkpoint без паузы
                saveCheckpoint(checkpoint);
                console.log(`\n💾 Checkpoint сохранен (${checkpoint.processed.size})\n`);
            }

            // Задержка между вопросами
            if (!CONFIG.dryRun && processedCount < toProcess.length) {
                await new Promise(r => setTimeout(r, CONFIG.delayBetweenImages));
            }

        } catch (error) {
            console.error(`  ❌ ОШИБКА: ${error.message}`);
            if (checkpoint.failed) {
                checkpoint.failed.push({ id: question.id, error: error.message });
            }
            if (checkpoint.stats) {
                checkpoint.stats.failed++;
            }
        }

        if (checkpoint.stats) {
            checkpoint.stats.total = processedCount;
        }
    }

    // Финальное сохранение
    saveCheckpoint(checkpoint);

    // Итоги
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ ГЕНЕРАЦИИ');
    console.log('='.repeat(60));
    const stats = checkpoint.stats || { total: 0, success: 0, failed: 0 };
    console.log(`Обработано: ${stats.total}`);
    console.log(`✅ Успешно: ${stats.success}`);
    console.log(`❌ Ошибок: ${stats.failed}`);
    console.log(`\n💾 Checkpoint: ${CONFIG.checkpointFile}`);
    console.log(`📁 Изображения: ${CONFIG.outputDir}`);
    console.log('='.repeat(60) + '\n');

    if (Array.isArray(checkpoint.failed) && checkpoint.failed.length > 0) {
        console.log('❌ Ошибки:');
        checkpoint.failed.slice(-10).forEach(f => {
            console.log(`  - ${f.id.substring(0, 12)}: ${f.error}`);
        });
    }
}

// ==========================================
// ЗАПУСК
// ==========================================
processAllQuestions().catch(err => {
    console.error('💥 Критическая ошибка:', err);
    process.exit(1);
});
