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
const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }); // Vision analysis
const imagenModel = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' }); // Best quality + traffic signs!

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================
const CONFIG = {
    outputDir: './data/generated-images',
    originalsDir: './data/originals',
    checkpointFile: './data/image-gen-checkpoint.json',
    reviewQueueFile: './data/review-queue.json',
    maxRetries: 3,
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

const VISION_ANALYSIS_PROMPT = `You are an expert traffic safety educator analyzing a Spanish DGT driving test question image.

Your task: Create a DETAILED scene description for regenerating this image WITHOUT revealing the correct answer.

IMPORTANT: Do NOT mention which option is correct or give hints about the answer!

## ANALYZE AND DESCRIBE:

1. **View Angle**: Specify exact perspective (isometric top-down 45°, driver's POV, side view)

2. **Vehicles** (CRITICAL DETAILS):
   - Type: car/turismo, motorcycle/motocicleta, truck/camión, bus, PMV/ciclomotor, bicycle
   - EXACT color (orange/naranja, white/blanco, blue/azul, red/rojo, yellow/amarillo)
   - Position on road (left lane, right lane, shoulder, center)
   - Direction (approaching, departing, turning, stopped)
   - Visible details (windshield, wheels, body panels)

3. **Road Infrastructure**:
   - Type (autopista, autovía, carretera convencional, urbana)
   - Lanes (número de carriles) - COUNT CAREFULLY
   - Surface quality
   - Features (rotonda, paso a nivel, pendiente, túnel)

4. **Traffic Signs** (LIST ALL with DGT codes):
   - P-series (warning triangles)
   - R-series (prohibition/obligation circles)
   - S-series (information squares)
   - Position and visibility
   - VERIFY: Do signs match road layout? (e.g., 3-lane sign = 3 visible lanes)

5. **Road Markings** (Spanish DGT Standard):
   - Center: WHITE continuous/dashed (#FFFFFF) - NEVER YELLOW
   - Lanes: white dashed (#FFFFFF)
   - Edges: white continuous
   - Arrows, crosswalks, stop lines
   - NO dimension text or measurements visible
   - CRITICAL: Dashed center = TWO-WAY, Continuous = NO OVERTAKING

6. **Traffic Flow Direction** (CRITICAL - ANALYZE CAREFULLY):
   - For EACH vehicle, state EXPLICIT direction:
     * "Vehicle 1 (white sedan): traveling NORTH in right lane"
     * "Vehicle 2 (blue truck): traveling SOUTH in left lane"
   - Check if center markings match traffic flow:
     * Dashed center line = vehicles going OPPOSITE directions
     * No center line / white edges only = ALL vehicles SAME direction
   - Flag any contradictions: "WARNING: One-way markings but opposing traffic"

7. **Environment**:
   - Lighting (día soleado, nublado, atardecer)
   - Weather (seco, húmedo)
   - Setting (urbano, rural, montaña, autopista)
   - Trees, buildings, landscape
   - Spanish landmarks if visible (RENFE, Correos, Mercadona, DIA, Farmacias, Estancos)

8. **Traffic Situation** (describe WITHOUT giving answer):
   - Overtaking scenario?
   - Merging?
   - Priority conflict?
   - Parking?
   - Railroad crossing?
   - Pedestrian?

9. **Trajectory Arrows**:
   - Color (usually orange #FF8C00)
   - Path showing vehicle movement
   - START and END points with COMPASS directions
   - VERIFY: Do arrows show SAFE paths? (no collisions)

OUTPUT only structured description:

PERSPECTIVE: [exact angle]
VEHICLES: [each with TYPE, COLOR, POSITION, DIRECTION (N/S/E/W)]
ROAD: [lanes count, type, width]
SIGNS: [all signs with codes + verify match to road]
MARKINGS: [all markings + traffic flow type (one-way/two-way)]
TRAFFIC_FLOW: [explicit direction for each vehicle + contradictions if any]
ENVIRONMENT: [setting + Spanish brands/landmarks]
SITUATION: [traffic scenario]
TRAJECTORIES: [arrows with compass directions + collision check]

Remember: ACCURACY > BEAUTY! Flag logical errors!`;

const STYLE_MASTER_PROMPT = `Professional 3D isometric top-down view of Spanish DGT driving test scenario.

## VISUAL STYLE (MANDATORY):
- 3D isometric bird's eye view (45-60 degree angle)
- Clean educational diagram aesthetic
- Photorealistic but simplified geometry
- Bright daylight, soft shadows
- Professional driving school quality
- **COMPOSITION RULE**: Full-frame crop. Terrain MUST extend to all 4 edges. NO "floating island" look. NO empty background voids.

## ROAD ELEMENTS (SPANISH DGT STANDARD):
- Asphalt: realistic gray texture (#404040)
- Road markings: SPANISH STANDARD (NOT USA/YELLOW)
  * Center line: WHITE continuous/dashed (#FFFFFF) - NEVER YELLOW
  * Lane dividers: WHITE dashed (#FFFFFF)
  * Edge lines: WHITE continuous (#FFFFFF)
- Lane width: 3.5 meters standard
- NO dimension annotations, NO measurement text on road

## ROAD INFRASTRUCTURE (CRITICAL):
1. **Autopista/Autovía (DUAL CARRIAGEWAY)**:
   - MUST BE TWO SEPARATE ROADWAYS
   - Separated by PHYSICAL MEDIAN (concrete wall or grass strip)
   - Left roadway: traffic direction A
   - Right roadway: traffic direction B
   - High speed geometry (120 km/h)
   
2. **Carretera convencional (regular road)**:
   - TWO-WAY with dashed center line
   - Vehicles going opposite directions
   - No physical barrier
   
3. **Urban streets**:
   - May have painted center line or no markings
   - Lower speed, buildings nearby

## VEHICLES (SPANISH FLEET):
- Modern European cars (Seat, Citroën, Renault, Peugeot style)
- EXACT colors as specified in description
- Realistic 3D models with visible details
- Proper scale and proportions
- Clear windshields, body panels, wheels

## TRAJECTORY LINES:
- Orange curved arrows (#FF8C00) showing vehicle path
- Thickness: 8-10px
- Smooth bezier curves
- Clear arrowheads for direction
- **CRITICAL**: Show ONLY legal and safe maneuvers:
  * NO crossing solid center lines (illegal overtaking)
  * NO dangerous weaving between vehicles
  * Follow traffic rules (give way, lane discipline)
  * Arrows = what SHOULD happen, not collision path

## ENVIRONMENT (AUTHENTIC SPAIN):
- Green grass verges: vibrant #228B22
- Trees: realistic Spanish landscape (pine, olive, cypress)
- Composition: FILL FRAME completely. TERRAIN MUST TOUCH ALL EDGES.
- Horizon: Hills, city buildings, or trees (NEVER plain blue background)
- NO ISOLATED 3D MODEL look. This is a full scene.
- Subtle depth of field
- **Optional Spanish atmosphere** (add creatively, let AI decide details):
  * Urban: Mercadona, DIA, Farmacias, Estancos
  * Delivery: Correos, Amazon, Glovo
  * Highways: Repsol, Cepsa
  * Railways: RENFE trains (correct authentic branding)
  * Vary elements! Each image should feel unique

## ROAD SIGNS (CRITICAL - ONLY IF IN ORIGINAL):
- Generate ONLY signs that exist in the original image
- NEVER invent or add extra signs
- EXACT Spanish DGT specifications
- Correct shapes: triangle (danger), octagon (STOP), circle (prohibition/obligation)
- Proper colors: red borders, white backgrounds, blue for obligation
- Mounted on gray poles (3.5m height)
- Readable symbols
- **VERIFY**: 3-lane sign = draw 3 actual lanes

## TRAFFIC LOGIC (CRITICAL - MUST OBEY):
1. **Road Type Infrastructure**:
   - **Autopista (120km/h)** = MUST NO DOUBT have physical barrier/median. If missing -> INVALID IMAGE.
   - **Carretera (90km/h)** = dashed center line.
2. **Markings ↔ Flow**:
   - Dashed center = TWO-WAY (cars opposite directions) - regular roads only
   - Dual carriageway = ONE-WAY each side
   - Physical barrier visible = separate one-way sections
3. **Lane Count**: Match signs to actual road (3-lane sign = 3 visible lanes)
4. **Speed Limits (LOGICAL CHECK)**:
   - **Autopista**: Signs MUST be 80, 90, 100, or 120. NEVER < 60 on main road.
   - **Urban**: 30, 40, 50.
   - **Construction**: Yellow background signs if low speed.
   - **Context**: Don't put "20 km/h" on a 3-lane highway!
5. **No Collisions**: Trajectory arrows MUST show SAFE paths, not crashes
6. **Coherence**: If autopista, MUST have physical separator between opposing flows

## LIGHTING:
- Natural sunlight from top-left
- Soft ambient occlusion
- Subtle highlights on vehicles
- No harsh shadows

## COMPOSITION:
- Centered on key decision point
- Clear spatial relationships
- All elements visible
- NO text/labels in image
- Educational clarity

## QUALITY:
- 1024x1024 resolution
- Sharp road signs
- Anti-aliased vehicles
- Consistent perspective`;

// ==========================================
// CHECKPOINT SYSTEM
// ==========================================
function loadCheckpoint() {
    try {
        if (fs.existsSync(CONFIG.checkpointFile)) {
            const data = JSON.parse(fs.readFileSync(CONFIG.checkpointFile, 'utf8'));
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
    fs.writeFileSync(
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

        // Лог теперь в главном цикле
        return { analysis, imageBuffer }; // Возвращаем и анализ, и оригинал

    } catch (error) {
        console.error(`  ⚠️  Ошибка анализа: ${error.message}`);
        return null;
    }
}

// ==========================================
// ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ (Imagen)
// ==========================================
async function generateImage(question, visionAnalysis, attempt = 1) {
    const questionText = question.question?.es || '';

    const prompt = `${STYLE_MASTER_PROMPT}

## SCENE TO GENERATE:
Based on original DGT test image:

${visionAnalysis}

Recreate this EXACT scene with improvements:
- Professional 3D isometric style
- Premium educational quality
- Crystal clear DGT road signs (ONLY those from original, NO extras)

## CRITICAL CONSTRAINTS:
- Road markings: WHITE ONLY (Spanish standard, NOT yellow/USA)
- NO dimension text ("10cm", "6m", "3.5m") on the road
- NO measurement annotations
- NO invented traffic signs
- Clean visual without labels or text overlays

## TRAFFIC LOGIC (OBEY STRICTLY):
- **Autopista/Autovía** = MUST draw physical barrier (concrete/metal/median) between opposing flows
- **Carretera** = dashed center line for two-way traffic
- If analysis says "autopista" + "one-way section" = NO center line, only lane dividers
- **SPEED SIGNS**: MUST match road type (Autopista = 80-120, Urban = 30-50). NO "20km/h" on highways!
- Lane count in signs MUST match actual drawn lanes
- Trajectory arrows MUST show SAFE paths (no collisions)
- Vehicles stay in lanes, trucks on right lane

## QUESTION CONTEXT (for reference, do NOT show answer):
"${questionText.substring(0, 200)}${questionText.length > 200 ? '...' : ''}"

Generate precise, LOGICALLY CORRECT educational traffic scenario.`;

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

        return Buffer.from(imageData.data, 'base64');

    } catch (error) {
        if (attempt <= CONFIG.maxRetries) {
            console.log(`   ⚠️  [Попытка ${attempt}/${CONFIG.maxRetries}] Ошибка: ${error.message.substring(0, 100)}... Повтор через ${3 * attempt}с`);
            await new Promise(r => setTimeout(r, 3000 * attempt));
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

    // Обработка --ids-file (если передано из Dashboard)
    const args = process.argv.slice(2);
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
    } else {
        // Если списка нет, берем все необработанные
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
        const questionText = (question.question?.es || 'Без текста').substring(0, 50);

        console.log(`\n${'='.repeat(70)}`);
        console.log(`${progress} 📝 Вопрос: "${questionText}..."`);
        console.log(`${progress} 🆔 ID: ${question.id}`);

        const testId = question.testId || 'unknown';
        const testOutputDir = path.join(CONFIG.outputDir, testId);
        const testOriginalsDir = path.join(CONFIG.originalsDir, testId);

        // Создаем папки теста (recursive: true не падает, если папка есть)
        await fs.mkdir(testOutputDir, { recursive: true });
        await fs.mkdir(testOriginalsDir, { recursive: true });

        const outputPath = path.join(testOutputDir, `${question.id}.png`);
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
                console.log(`${progress} 🎨 Gemini 3 Pro → генерация 2K...`);
                const imageBuffer = await generateImage(question, visionResult.analysis);

                if (imageBuffer) {
                    await fs.writeFile(outputPath, imageBuffer);
                    const genSizeMB = (imageBuffer.length / 1024 / 1024).toFixed(2);
                    totalCost += 0.05;
                    console.log(`${progress} ✅ Сохранено: ${genSizeMB} MB | ~$0.05`);
                } else {
                    console.log(`${progress} ❌ Генерация не удалась после всех попыток`);
                }

                console.log(`${progress} 💰 Общая стоимость темы: ~$${totalCost.toFixed(2)}`);

                if (imageBuffer) {
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
            checkpoint.stats.success++;

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
            checkpoint.failed.push({ id: question.id, error: error.message });
            checkpoint.stats.failed++;
        }

        checkpoint.stats.total = processedCount;
    }

    // Финальное сохранение
    saveCheckpoint(checkpoint);

    // Итоги
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ ГЕНЕРАЦИИ');
    console.log('='.repeat(60));
    console.log(`Обработано: ${checkpoint.stats.total}`);
    console.log(`✅ Успешно: ${checkpoint.stats.success}`);
    console.log(`❌ Ошибок: ${checkpoint.stats.failed}`);
    console.log(`\n💾 Checkpoint: ${CONFIG.checkpointFile}`);
    console.log(`📁 Изображения: ${CONFIG.outputDir}`);
    console.log('='.repeat(60) + '\n');

    if (checkpoint.failed.length > 0) {
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
