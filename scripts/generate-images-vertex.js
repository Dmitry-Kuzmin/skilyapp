/**
 * ========================================
 * БАТЧ-ГЕНЕРАТОР ИЗОБРАЖЕНИЙ (HYBRID: API Key + Vertex Credits)
 * ========================================
 * 
 * Генерирует уникальные изображения для всех вопросов из enriched файлов.
 * 
 * Архитектура:
 * 1. Gemini Vision (via API Key/Free Tier) - анализирует оригинал (быстро и дешево).
 * 2. Imagen 3 (via Cloud Vertex) - генерирует изображение (за деньги/кредиты, без лимитов).
 */

import { GoogleGenerativeAI } from '@google/generative-ai'; // Old SDK for Vision
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Настройки Vertex AI (Generation)
const PROJECT_ID = 'gen-lang-client-0120490543';
const LOCATION = 'us-central1';
const IMAGEN_MODEL = 'imagen-3.0-generate-001'; // Reverting to Standard Imagen 3

dotenv.config();
dotenv.config({ path: '.env.local' });

// API Key for Vision
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY не найден! Vision анализ может не работать.');
}

// Service Account for Generation
const KEY_FILE = './google-services.json';
if (!fsSync.existsSync(KEY_FILE)) {
    console.error('❌ Ошибка: google-services.json не найден!');
    process.exit(1);
}

// Инициализация Vision (API Key)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }); // Experimental 2.0 Flash is available!

// Инициализация Auth (Vertex Generation)
const auth = new GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================
const CONFIG = {
    outputDir: './data/generated-images-vertex',
    originalsDir: './data/originals',
    checkpointFile: './data/vertex-image-checkpoint.json',
    reviewQueueFile: './data/vertex-review-queue.json',
    maxRetries: 3,
    delayBetweenImages: 10000, // 10 sec to avoid 429 Quota limits
    batchSize: 5,
    pauseForReview: !process.argv.includes('--no-pause'),
    dryRun: process.argv.includes('--dry-run'),
};

// ==========================================
// ПРОМПТЫ (Идентичны оригинальным)
// ==========================================
const VISION_ANALYSIS_PROMPT = `ROLE: Traffic Safety Expert (Spanish DGT).
TASK: Analyze image components for precise 3D recreation.
CONSTRAINT: DESCRIBE SIGNS VISUALLY ONLY. DO NOT USE CODES (e.g. say "Red circle with 50", NOT "R-301").

OUTPUT FORMAT: Structured breakdown.

1. VIEWPOINT: Exact angle (top-down, driver POV).
2. VEHICLES:
   - List each: Type, Color, Lane/Shoulder position, Direction.
   - SHOULDER CHECK: If vehicle is on "Arcén", state explicitly.
3. INFRASTRUCTURE:
   - Type (Autopista, Conventional, Urban).
   - Lane count & Surface.
   - TEMPORARY: Cones? Yellow markings?
4. SIGNS: VISUAL DESCRIPTION ONLY. 
   - BAD: "P-18 present"
   - GOOD: "Yellow triangular warning sign with construction worker symbol".
   - NO TEXT CODES in description.
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

## SIGNAGE RULES (CRITICAL & STRICT):
- **NO TEXT CODES**: NEVER, EVER write the sign code (e.g. "R-500", "P-18", "S-28") on the sign or road.
- **NO SUPPLEMENTARY PLATES**: Do NOT draw small rectangular plates (White or Yellow) below the sign with text. The pole must be BARE.
- **CONSTRUCTION SIGNS (Obras)**: Draw ONLY the **Yellow Triangle with Worker Symbol**. ABOLISH the yellow square plate with "Obras" or "P-18".
- **VISUAL ONLY**: If prompt says "End of Restriction", draw a **White Circle with Black Diagonal Line**. DO NOT WRITE text.
- **PURE SYMBOLS**: 
    - "Stop" -> Red Octagon with "STOP" (Allowed).
    - "Yield" -> Red/White Inverted Triangle (No text).
    - "Speed Limit 50" -> Red Circle with "50". 
    - "Construction" -> Yellow Triangle with Worker Icon. NO TEXT.
- **FAIL CONDITION**: If the image contains text like "R-500", "P-18", "Obras", or a text plate, the generation is a FAILURE.

## NEGATIVE PROMPT (AVOID THESE AT ALL COSTS):
- **TEXT LABELS**: "R-500", "P-18", "Obras", "R-407a", "End", "Speed", "Limit", "Zona".
- **FLOATING UI**: White boxes with text, HUD elements, code identifiers.
- **SIGN CAPTIONS**: Rectangular plates (White/Yellow) attached to sign poles.
- **AMERICAN MARKINGS**: Double yellow lines (use White).
- **HALLUCINATED SIGNS**: Do not add random signs not requested.
- **Watermarks, Captions, Subtitles**.

## INFRASTRUCTURE:
1. AUTOPISTA: DUAL carriageway. MUST have PHYSICAL MEDIAN (concrete/grass).
2. CONVENTIONAL: Single carriageway. Dashed/Solid center line. Two-way traffic.
3. URBAN: Curbs, sidewalks, buildings.

## VEHICLES:
- MODELS: Modern 2024+ European & Electric (Tesla Model 3/Y, Cupra Formentor, Polestar, Audi Q4, Renault Megane E-Tech, Seat Leon).
- DETAIL: Realistic lights, glass, tires.
- PLACEMENT: Strictly centered in lanes (unless overtaking/parking).

## OVERLAYS:
- ARROWS: Orange (#FF8C00), 3D projected on road, smooth curves.
- LOGIC: Show SAFE, LEGAL paths only.

## LOGIC CHECKS:
- ONE-WAY vs TWO-WAY: Check center line consistency.
- SIGNS vs LANES: 3-lane sign requires 3 actual lanes.
- BARRIERS: High speed = Barrier required.

## SPANISH ATMOSPHERE & MODERN INFRASTRUCTURE (MANDATORY: INCLUDE AT LEAST 1 MODERN ELEMENT IF FITTING):
- **MODERN DGT & EU INFRASTRUCTURE (2025+)**:
   - **V-16 Warning Beacon**: **STRICTLY CONDITIONAL**: Draw ONLY if car is BROKEN DOWN, STOPPED on shoulder, or in ACCIDENT. Small orange magnetic light on roof. **NEVER** on moving traffic.
   - **Dragon Teeth & Broken Lines**: White triangles or zig-zag lines on lane edges ("Dientes de Dragón") to induce slowing down.
   - **Green Lines (Markings)**: Inner paint lines parallel to shoulder to visually narrow the road (Speed reduction).
   - **ZBE & Shared Zones**: "Zona Bajas Emisiones" signs or Blue "S-43" Shared Space signs (Pedestrian+Bike+Scooter).
   - **Smart Roads**: Digital Matrix Signs on gantries showing variable limits or "Cyclist Detected" warnings.
   - **EV Hubs**: Ultra-modern "Ionity/Tesla" style charging stations with green ambient lighting (Background).
   - **Blue/Green Lanes**: "Carril Bici" or "Ciclocalle" markings with red/terracotta paint.

- **STREET LIFE (Inject Life - Subtly)**:
   - "Bar" terraces with metal tables.
   - "Farmacia" (Green LED cross).
   - "Tabacos" (Yellow flag).
   - "Kiosco" (Newsstand).
   - **Robots (Unique to Urban)**: "Goggo" 6-wheeled rovers on sidewalk.
   - **Drones (Rare)**: High-altitude delivery drone (subtle).
   - **Traffic**: Modern electric buses (Irizar), VMP Scooters (in bike lanes only).

{{DYNAMIC_ATMOSPHERE_PLACEHOLDER}}

**IMPORTANT: BE SUBTLE. DO NOT CROWD THE ROAD, BUT MAKE THE HORIZON ALIVE. TRAFFIC LOGIC IS SACRED, BACKGROUND IS ART.**
**IMPORTANT: BE SUBTLE. DO NOT CROWD THE SCENE. LET THE AI CHOOSE THE BEST VIBE.**

GENERATE EXACT SCENE FROM DESCRIPTION.`;

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

function loadCheckpoint() {
    try {
        if (fsSync.existsSync(CONFIG.checkpointFile)) {
            const data = JSON.parse(fsSync.readFileSync(CONFIG.checkpointFile, 'utf8'));
            return { ...data, processed: new Set(data.processed || []) };
        }
    } catch (e) { }
    return { processed: new Set(), failed: [], stats: { total: 0, success: 0, failed: 0 } };
}

function saveCheckpoint(checkpoint) {
    fsSync.writeFileSync(CONFIG.checkpointFile, JSON.stringify({ ...checkpoint, processed: Array.from(checkpoint.processed) }, null, 2));
}

// RANDOMIZATION ASSETS (Dynamic Diversity)
const NORTHERN_LOCATIONS = [
    { name: "Bilbao (Northern Spain)", desc: "Industrial chic, titanium Guggenheim curves in distance, green mountains, lush vegetation.", weather: "Overcast, Soft Mist, Rain-slicked streets" },
    { name: "Pyrenees (Mountain)", desc: "Dramatic limestone peaks, waterfalls, alpine winding roads.", weather: "Cloudy, Dramatic Sky" },
    { name: "Galicia (Rural)", desc: "Stone houses with slate roofs, eucalyptus forests, hydrangeas on roadside.", weather: "Foggy, Misty, Soft diffused light" },
    { name: "Asturias (Picos)", desc: "Limestone peaks (Picos de Europa), deep green valleys, grey stone architecture.", weather: "Dramatic Clouds, Post-Rain" },
    { name: "San Sebastian", desc: "Elegant Belle Epoque architecture, bay views, green hills.", weather: "Soft Sunlight, breezy" }
];

const OTHER_LOCATIONS = [
    { name: "Tenerife (Canary)", desc: "Volcanic black rock, Teide background, dry palms.", weather: "High Contrast Sun" },
    { name: "Ibiza (Balearic)", desc: "White cubic houses, pine trees, sunset vibe.", weather: "Golden Hour" },
    { name: "Valencia (Arts)", desc: "Futuristic white structures, palm boulevards.", weather: "Bright Blue Sky" },
    { name: "Toledo/Madrid", desc: "Medieval walled city on hill, dry golden plains.", weather: "Dry Golden Light" },
    { name: "Benidorm", desc: "High-rise hotels background, holiday vibe.", weather: "Bright Noon" }
];

const BACKGROUND_ELEMENTS = [
    "Hot Air Balloons (Colorful, drifting in distance)",
    "Futuristic White Zeppelin with 'Correos' branding",
    "Paragliders (Small, near mountains)",
    "Wind Turbines (White, on distant ridges)",
    "Flock of Storks (Cigüeñas) nesting on towers",
    "Distant Fireworks (Daytime smoke or evening celebration)",
    "Drone Swarm (subtle delivery drones in sky)"
];

function getRandomAtmosphere() {
    const topicPool = Math.random() < 0.75 ? NORTHERN_LOCATIONS : OTHER_LOCATIONS;
    const loc = topicPool[Math.floor(Math.random() * topicPool.length)];
    const elem = Math.random() < 0.3 ? BACKGROUND_ELEMENTS[Math.floor(Math.random() * BACKGROUND_ELEMENTS.length)] : "None (Clean Sky)";

    return `
## 🌍 LOCATION & ATMOSPHERE (STRICTLY ENFORCE):
- **REGION**: ${loc.name}
- **VISUAL STYLE**: ${loc.desc}
- **WEATHER**: ${loc.weather}

## 🎨 SCENIC ELEMENT (DIRECTOR'S TOUCH):
- **BACKGROUND**: Include ${elem} in the background/sky.
    `.trim();
}

// ==========================================
// VISION ANALYSIS (Legacy API Key)
// ==========================================
async function analyzeOriginalImage(imageUrl) {
    try {
        console.log(`  🔍 Gemini Vision (Std API) анализирует оригинал...`);

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
        const responseData = await result.response;
        const analysis = responseData.text();

        console.log(`  ✅ Analysis Complete.`);

        return {
            analysis: analysis,
            imageBuffer: imageBuffer,
            mimeType: mimeType,
            visionCost: 0 // Free tier mostly
        };

    } catch (error) {
        console.error(`  ⚠️  Ошибка Vision API: ${error.message}`);
        return null;
    }
}

// ==========================================
// ГЕНЕРАЦИЯ IMAGEN 3 (Vertex REST API)
// ==========================================
async function generateImageVertex(prompt, attempt = 1) {
    console.log(`  🎨 Vertex Imagen generating...`);

    try {
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${IMAGEN_MODEL}:predict`;

        const response = await axios.post(url, {
            instances: [{ prompt: prompt }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9",
                safetySetting: "block_only_high",
                personGeneration: "allow_adult"
            }
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json; charset=utf-8'
            },
            timeout: 60000 // 60 sec timeout
        });

        if (response.data.predictions && response.data.predictions.length > 0) {
            const base64Image = response.data.predictions[0].bytesBase64Encoded;
            return {
                buffer: Buffer.from(base64Image, 'base64'),
                prompt: prompt
            };
        } else {
            throw new Error(`No predictions found: ${JSON.stringify(response.data)}`);
        }

    } catch (error) {
        if (attempt <= CONFIG.maxRetries) {
            console.error(`   ⚠️  [Попытка ${attempt}/${CONFIG.maxRetries}] (Processing retry) Ошибка Vertex:`, error.message);
            await new Promise(r => setTimeout(r, 10000));
            return generateImageVertex(prompt, attempt + 1);
        }
        console.error(`  ❌ Не удалось сгенерировать изображение (Vertex): ${error.message}`);
        return null;
    }
}

// ==========================================
// PREPARE PROMPT LOGIC
// ==========================================
function preparePrompt(question, visionAnalysis) {
    // ... copy logic from original
    let prompt;
    if (question.custom_prompt) {
        console.log(`   🎨 Используем кастомный промт пользователя`);
        return question.custom_prompt;
    }

    const questionText = question.question?.es || '';
    const answersContext = question.answers ? question.answers.map((ans, idx) => {
        const isCorrect = ans.is_correct !== undefined ? ans.is_correct : (idx === 0);
        let text = typeof ans.text === 'object' ? (ans.text.es || ans.text.ru || ans.text.en || JSON.stringify(ans.text)) : (ans.text || ans);
        return `- ${isCorrect ? '[CORRECT ANSWER] ' : ''}${text}`;
    }).join('\n') : 'No answers provided';

    const correctAnswerText = question.answers?.find(a => a.is_correct)?.text?.es?.toLowerCase() || "";
    const isPriorityRightContext = correctAnswerText.includes('derecha') && (correctAnswerText.includes('ceder') || correctAnswerText.includes('prioridad'));
    const textToScan = (questionText + ' ' + (typeof visionAnalysis === 'string' ? visionAnalysis : '')).toLowerCase();

    let explanationText = "";
    if (question.explanation) {
        explanationText = typeof question.explanation === 'string' ? question.explanation : (question.explanation.en || question.explanation.es || "");
    }
    explanationText = explanationText.replace(/\*\*/g, '').replace(/\*/g, '');

    const isUnregulated = textToScan.includes('sin señalizar') || (textToScan.includes('prioridad') && textToScan.includes('derecha')) || textToScan.includes('unregulated') || isPriorityRightContext;
    const isCarrilAdicional = textToScan.includes('carril adicional') || textToScan.includes('additional lane') || explanationText.toLowerCase().includes('carril adicional');
    const isBrokenTrafficLight = textToScan.includes('semáforo apagado') || textToScan.includes('no funciona') || textToScan.includes('intermitente') || questionText.toLowerCase().includes('amarillo intermitente');

    const dynamicAtmosphere = getRandomAtmosphere();
    prompt = `${STYLE_MASTER_PROMPT.replace('{{DYNAMIC_ATMOSPHERE_PLACEHOLDER}}', dynamicAtmosphere)}

## SCENE TO GENERATE:
Based on original DGT test image analysis:
${visionAnalysis}

${explanationText ? `## CONTEXT FROM EXPERT EXPLANATION:\n"${explanationText}"\n` : ''}

## QUESTION CONTEXT:
"${questionText}"

## ANSWERS CONTEXT:
${answersContext}

Recreate this EXACT scene with improvements.

${isUnregulated ? `## 🚫 SPECIAL RULES: UNREGULATED INTERSECTION\nNO YIELD MARKINGS, NO STOP LINES, clean asphalt center.` : ''}
${isCarrilAdicional ? `## 🚧 SPECIAL RULES: CARRIL ADICIONAL\nVehicles on SHOULDER, cones separating traffic, lights on.` : ''}
${isBrokenTrafficLight ? `## 🚦 SPECIAL RULES: BROKEN TRAFFIC LIGHT\nLights OFF or blinking yellow. NO RED/GREEN.` : ''}

## CRITICAL CONSTRAINTS:
- Road markings: WHITE ONLY
- NO text labels
- Trajectory arrows must show SAFE paths

GENERATE EXACT SCENE.`;

    return prompt;
}

// ==========================================
// ГЛАВНАЯ ФУНКЦИЯ
// ==========================================
async function processAllQuestions() {
    console.log('🚀 VERTEX AI GENERATOR (Cloud Credits Included)\n');
    console.log(`📁 Вывод: ${CONFIG.outputDir}`);
    console.log(`🌍 Регион: ${LOCATION} | Модель: ${IMAGEN_MODEL}`);

    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    await fs.mkdir(CONFIG.originalsDir, { recursive: true });

    const checkpoint = loadCheckpoint();
    const questionsMap = new Map();
    const parsedDir = './data/parsed';

    async function scanForEnriched(dir) {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) await scanForEnriched(fullPath);
            else if (file.endsWith('-enriched.json')) {
                try {
                    const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
                    data.forEach(q => {
                        if (q.external_id && (q.image_url || q.schema_url)) {
                            if (!questionsMap.has(q.external_id)) {
                                questionsMap.set(q.external_id, {
                                    id: q.external_id,
                                    question: q.question,
                                    originalUrl: q.image_url || q.schema_url,
                                    sourceFile: file,
                                    testId: file.replace('-enriched.json', ''),
                                    answers: q.answers,
                                    explanation: q.explanation,
                                    custom_prompt: q.custom_prompt // User override
                                });
                            }
                        }
                    });
                } catch (e) { }
            }
        }
    }

    await scanForEnriched(parsedDir);

    // Args processing
    const args = process.argv.slice(2);
    const limitArg = args.find(a => a.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

    // Manual ID file processing (optional)
    const inputFileArg = args.find(a => !a.startsWith('--') && a.endsWith('.json'));
    // Simplified for now, relying on enriched scan or limit

    let toProcess = Array.from(questionsMap.values()).filter(q => !checkpoint.processed.has(q.id));

    if (limit < toProcess.length) {
        toProcess = toProcess.slice(0, limit);
        console.log(`📏 Лимит: ${limit}`);
    }

    console.log(`🎯 К обработке: ${toProcess.length}`);

    let processedCount = 0;
    let reviewQueue = [];

    for (const question of toProcess) {
        processedCount++;
        const progress = `[${processedCount}/${toProcess.length}]`;
        console.log(`\n${'='.repeat(70)}`);
        console.log(`${progress} 🚀 Vertex Processing [${question.id}]`);

        const testOutputDir = path.join(CONFIG.outputDir, question.testId || 'misc');
        await fs.mkdir(testOutputDir, { recursive: true });

        const timestamp = Date.now();
        const outputPath = path.join(testOutputDir, `${question.id}_${timestamp}.png`);

        // Skip if exists
        const existing = await fs.readdir(testOutputDir);
        if (existing.some(f => f.startsWith(question.id) && f.endsWith('.png'))) {
            console.log(`⏭️  Already exists!`);
            checkpoint.processed.add(question.id); // Mark as done
            continue;
        }

        if (CONFIG.dryRun) {
            console.log(`Dry run complete for ${question.id}`);
            continue;
        }

        // 1. Vision Analysis
        const visionResult = await analyzeOriginalImage(question.originalUrl);
        if (!visionResult) continue;

        // 2. Prepare Prompt
        const prompt = preparePrompt(question, visionResult.analysis);

        // 3. Generate Image
        console.log(`${progress} 🎨 Vertex Imagen generating...`);
        const result = await generateImageVertex(prompt);

        if (result) {
            await fs.writeFile(outputPath, result.buffer);
            await fs.writeFile(path.join(testOutputDir, `${question.id}_vertex_prompt.txt`), prompt);

            console.log(`${progress} ✅ SUCCESS! Saved to ${outputPath}`);

            checkpoint.processed.add(question.id);
            checkpoint.stats.success++;
            saveCheckpoint(checkpoint);
        } else {
            console.log(`${progress} ❌ FAILED.`);
        }
    }
}

processAllQuestions().catch(console.error);
