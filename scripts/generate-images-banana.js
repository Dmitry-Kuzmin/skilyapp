/**
 * ========================================
 * ГЕНЕРАТОР ИЗОБРАЖЕНИЙ ЧЕРЕЗ BANANA.DEV
 * (Премиум качество для DGT вопросов)
 * ========================================
 * Стиль: 3D изометрический топ-даун с правильными знаками DGT
 * 
 * АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ ПРОМПТОВ:
 * 1. Gemini Vision анализирует оригинальное изображение
 * 2. Создаёт детальный промпт БЕЗ подсказки ответа
 * 3. Banana.dev генерирует новое изображение в едином стиле
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSignDescription, generateSignPrompt, DGT_SIGNS } from './lib/dgt-signs.js';

// Загружаем .env.local с приоритетом
dotenv.config({ path: '.env.local' });
dotenv.config();

const BANANA_API_KEY = process.env.BANANA_API_KEY;
const BANANA_MODEL_KEY = process.env.BANANA_MODEL_KEY || 'flux';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!BANANA_API_KEY) {
    console.error('❌ Ошибка: Не задан BANANA_API_KEY в .env.local');
    console.error('💡 Получить ключ: https://banana.dev');
    process.exit(1);
}

if (!GEMINI_API_KEY) {
    console.error('❌ Ошибка: Не задан GEMINI_API_KEY в .env.local');
    console.error('💡 Получить ключ: https://aistudio.google.com/apikey');
    process.exit(1);
}

const gemini = new GoogleGenerativeAI(GEMINI_API_KEY);
const visionModel = gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const OUTPUT_DIR = path.resolve('data/generated-images');

// ========================================
// ПРОМПТ ДЛЯ GEMINI VISION
// (Анализ оригинального изображения)
// ========================================

const VISION_ANALYSIS_PROMPT = `You are an expert traffic safety educator analyzing a Spanish DGT driving test question image.

Your task: Create a DETAILED scene description for regenerating this image WITHOUT revealing the correct answer.

IMPORTANT: Do NOT mention which option is correct or give hints about the answer!

## ANALYZE AND DESCRIBE:

1. **View Angle**: Specify if it's:
   - Top-down isometric (bird's eye view)
   - Driver's perspective (dashboard view)
   - Side view
   - Other

2. **Vehicles**: For EACH vehicle visible:
   - Type (car, motorcycle, truck, bus, bicycle)
   - Approximate color
   - Position on road
   - Direction of travel
   - Speed indication (moving/stopped)

3. **Road Infrastructure**:
   - Road type (highway, urban street, rural road, intersection)
   - Number of lanes
   - Lane markings (yellow center line, white dashed, continuous, etc.)
   - Road surface condition
   - Special features (roundabout, bridge, slope, tunnel)

4. **Traffic Signs** (CRITICAL):
   - List ALL visible road signs with their exact codes if possible (P-1, R-1, S-17, etc.)
   - Position relative to vehicles
   - Visibility and clarity

5. **Road Markings**:
   - Center lines (yellow/white, continuous/dashed)
   - Lane dividers
   - Stop lines
   - Pedestrian crossings
   - Arrows or symbols on pavement

6. **Environment**:
   - Time of day (sunny, overcast, dusk)
   - Weather conditions
   - Surroundings (urban, rural, highway)
   - Vegetation
   - Buildings or landmarks

7. **Traffic Situation**:
   - Is it an overtaking scenario?
   - Merging situation?
   - Priority conflict?
   - Parking maneuver?
   - Railroad crossing?
   - Pedestrian interaction?
   - Describe the SITUATION without saying what the correct action is

8. **Special Elements**:
   - Trajectory arrows (if showing vehicle paths)
   - Distance indicators
   - Speed limit signs
   - Warning lights
   - Barriers or obstacles

## CRITICAL VALIDATION:
**Before describing any speed limit sign, verify the road type:**
- If highway (autopista/autovía): Speed limits should be 60, 80, 90, 100, or 120 km/h
- If urban street: Speed limits should be 20, 30, 40, or 50 km/h
- If rural road: Speed limits should be 50, 70, 80, or 90 km/h

**If you see a speed limit that doesn't match the road type (e.g., 20 km/h on highway), DO NOT include it in your description - it may be an error in the original image.**

## OUTPUT FORMAT:

Return ONLY a detailed scene description in this format:

PERSPECTIVE: [viewing angle]
VEHICLES: [detailed list]
ROAD: [road characteristics]
SIGNS: [all visible signs with codes]
MARKINGS: [road markings]
ENVIRONMENT: [surroundings]
SITUATION: [traffic scenario being depicted]
SPECIAL: [any unique elements]

Remember: DESCRIBE what you see, NOT what the driver should do!`;

// ========================================
// МАСТЕР-ПРОМПТ (GOLDEN STANDARD)
// ========================================

const STYLE_MASTER_PROMPT = `⚠️ STRICT RULE OF VISUAL REALISM:
The generated image must depict a 100% authentic real-world scene.
Any technical codes, catalog numbers (e.g., "R-301", "S-17", "P-23"), or internal labels mentioned in the prompt are strictly meant to define the *type* of object, not its visual appearance text.

**NEVER render these technical codes as visible text on the objects within the image.** Road signs and markings must look exactly as they do in reality, without any extra labels, identifiers, or catalog numbers printed on or above them.

---

Professional 3D isometric top-down view of Spanish DGT driving test scenario.

## VISUAL STYLE (MANDATORY):
- 3D isometric bird's eye view (45-60 degree angle)
- Clean educational diagram aesthetic
- Photorealistic but simplified geometry
- Bright daylight, soft shadows
- Professional driving school quality

## ROAD ELEMENTS:
- Asphalt: realistic gray texture (#404040)
- Road markings: precise Spanish DGT standard
  * Yellow continuous line (center): #FFD700, 12cm width
  * White dashed lines (lanes): #FFFFFF, 10cm segments
  * White continuous edge: #FFFFFF, 12cm
- Lane width: 3.5 meters standard

## VEHICLES (SPANISH FLEET):
- Modern European cars (Seat, Citroen, Renault style)
- Colors: orange (#FF8C00), white (#FFFFFF), blue (#4169E1)
- Realistic 3D models with visible details
- Proper scale and proportions
- Clear windshields, visible body panels

## ENVIRONMENT:
- Green grass verges: vibrant #228B22
- Trees: realistic Spanish landscape (pine, olive)
- Clear blue sky: #87CEEB
- Subtle depth of field (background slightly blurred)

## ROAD SIGNS (CRITICAL - NO CODE TEXT):
- MUST use exact Spanish DGT specifications
- Proper shapes: triangle (danger), octagon (STOP), circle (prohibition/obligation)
- Correct colors: red borders, white backgrounds, blue for obligation
- Mounted on standard gray poles (3.5m height)
- Readable symbols at viewing distance
- **IMPORTANT:** Signs show ONLY symbols/pictograms, NEVER technical codes like "R-301" or "S-17"
- Example: Speed limit sign shows "120" number, NOT "R-301 120"

## LOGICAL SIGN VALIDATION (CRITICAL):
🚦 **TRAFFIC LOGIC ENFORCEMENT (STRICT):**
Before describing any traffic sign, analyze Scene Context and apply these MANDATORY rules. NEVER violate them.

| Scene Context | Allowed Speed Signs (R-301) | FORBIDDEN Values |
|:--------------|:----------------------------|:-----------------|
| **Autovía / Autopista** (Highway) | **120** or **100** ONLY | 20, 30, 40, 50, 60, 80, 90 |
| **Carretera Convencional** (Rural Road) | **90** or **70** | 120, 20, 30 |
| **Vía Urbana** (City Street) | **30** or **50** | 90, 100, 120 |
| **Residential / School Zone** | **20** ONLY | > 30 |

**LOGIC CHECK (MANDATORY):**
- If scene shows Highway (multiple lanes, blue overhead signs, median barrier):
  → Speed limit sign MUST read "120" or "100"
  → NEVER "20", "30", "40", "50"
  
- If scene shows Urban Street (buildings, pedestrian crossings):
  → Speed limit sign MUST read "30" or "50"
  → NEVER "120", "100", "90"

**EXPLICIT SIGN GENERATION:**
When describing a speed limit sign, ALWAYS specify the exact number:
❌ WRONG: "a speed limit sign"
✅ CORRECT: "a circular R-301 speed limit sign explicitly reading '120' in black text"

**⚠️ VALIDATION RULE:**
If you cannot determine the correct speed for the road type → DO NOT include any speed limit sign.
Physical reality > visual creativity.

## LIGHTING:
- Natural sunlight from top-left (10-11am sun position)
- Soft ambient occlusion
- Subtle specular highlights on car paint
- No harsh shadows

## COMPOSITION:
- Centered on key action/decision point
- Clear spatial relationships
- All relevant elements visible
- No text/labels in image
- Educational clarity over artistic flair

## QUALITY:
- High resolution (1024x1024 minimum)
- Sharp edges on signs and markings
- Anti-aliased vehicles and objects
- Consistent perspective throughout`;

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

async function ensureOutputDir() {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (error) {
        console.error('❌ Не удалось создать папку:', error.message);
        throw error;
    }
}

/**
 * Анализирует оригинальное изображение через Gemini Vision
 * Возвращает детальное описание сцены БЕЗ подсказки ответа
 */
async function analyzeOriginalImage(imageUrl) {
    try {
        console.log(`  🔍 Анализ оригинального изображения через Gemini Vision...`);

        // Скачиваем изображение
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);
        const mimeType = response.headers['content-type'] || 'image/jpeg';

        // Конвертируем в base64 для Gemini
        const base64Image = imageBuffer.toString('base64');

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        // Отправляем в Gemini Vision
        const result = await visionModel.generateContent([VISION_ANALYSIS_PROMPT, imagePart]);
        const analysis = result.response.text();

        console.log(`  ✅ Анализ завершён (${analysis.length} символов)`);

        return analysis;

    } catch (error) {
        console.error(`  ⚠️  Ошибка анализа изображения: ${error.message}`);
        return null;
    }
}

/**
 * Извлекает ключевые элементы из вопроса для создания сцены
 */
function analyzeQuestion(question) {
    const questionText = (question.question?.es || question.question_es || '').toLowerCase();

    const analysis = {
        vehicles: [],
        signs: [],
        roadFeatures: [],
        situation: ''
    };

    // Типы транспорта
    if (questionText.includes('turismo') || questionText.includes('automóvil')) analysis.vehicles.push('car');
    if (questionText.includes('motocicleta') || questionText.includes('moto')) analysis.vehicles.push('motorcycle');
    if (questionText.includes('camión') || questionText.includes('vehículo pesado')) analysis.vehicles.push('truck');
    if (questionText.includes('bicicleta') || questionText.includes('ciclista')) analysis.vehicles.push('bicycle');

    // Дорожные знаки (по ключевым словам)
    if (questionText.includes('stop')) analysis.signs.push('R-1');
    if (questionText.includes('ceda') || questionText.includes('ceder')) analysis.signs.push('R-2');
    if (questionText.includes('rotonda') || questionText.includes('glorieta')) analysis.signs.push('P-4');
    if (questionText.includes('paso a nivel')) analysis.signs.push('P-7');
    if (questionText.includes('curva')) analysis.signs.push('P-10');
    if (questionText.includes('obras')) analysis.signs.push('P-16');
    if (questionText.includes('peatones')) analysis.signs.push('P-19');

    // Дорожная обстановка
    if (questionText.includes('adelantar') || questionText.includes('adelantamiento')) analysis.situation = 'overtaking';
    if (questionText.includes('incorporar') || questionText.includes('incorporación')) analysis.situation = 'merging';
    if (questionText.includes('prioridad')) analysis.situation = 'priority';
    if (questionText.includes('estacionar') || questionText.includes('aparcar')) analysis.situation = 'parking';
    if (questionText.includes('pendiente')) analysis.situation = 'slope';
    if (questionText.includes('intersección') || questionText.includes('cruce')) analysis.situation = 'intersection';

    // Дорожные элементы
    if (questionText.includes('arcén')) analysis.roadFeatures.push('shoulder');
    if (questionText.includes('carril')) analysis.roadFeatures.push('lane');
    if (questionText.includes('autopista') || questionText.includes('autovía')) analysis.roadFeatures.push('highway');

    return analysis;
}

/**
 * Создаёт специфичный промпт на основе вопроса
 * Если есть анализ от Gemini Vision - использует его
 */
// ========================================
// DYNAMIC VIEWPORT SELECTOR
// ========================================
function detectSceneType(questionText, analysis) {
    const text = (questionText + ' ' + analysis).toLowerCase();

    // Keywords for Interior View
    const interiorOpeners = [
        'volante', 'steering wheel', 'salpicadero', 'dashboard', 'gps', 'navi',
        'cinturón', 'seatbelt', 'espejo', 'mirror', 'retrovisor',
        'conductor', 'driver', 'pasajero', 'passenger', 'asiento', 'seat',
        'testigo', 'warning light', 'indicador', 'gauge', 'aire acondicionado'
    ];

    // Keywords for Exterior Close-up
    const closeUpOpeners = [
        'rueda', 'tire', 'neumático', 'faro', 'headlight', 'intermitente', 'blinker',
        'matrícula', 'license plate', 'tubo de escape', 'exhaust',
        'limpiaparabrisas', 'wiper', 'maletero', 'trunk', 'capó', 'hood'
    ];

    if (interiorOpeners.some(kw => text.includes(kw))) return 'INTERIOR';
    if (closeUpOpeners.some(kw => text.includes(kw))) return 'CLOSEUP';
    return 'ISOMETRIC'; // Default
}

// PROMPTS DATABASE
const PROMPTS = {
    ISOMETRIC: `Professional 3D isometric top-down view of Spanish DGT driving test scenario.
    ## VISUAL STYLE:
    - Camera Angle: High isometric (45-60 degrees), sim-city style but photorealistic
    - Scale: 1:1 real world physics
    - Elements: Cars, road markings, and signs must be strictly proportional
    - Grounding: All objects (cones, cars) must cast accurate shadows contacting the ground
    
    ## TRAFFIC LOGIC (MANDATORY):
    - RIGHT-HAND TRAFFIC: Cars drive on the RIGHT side of the road.
    - NO HEAD-ON COLLISIONS: Vehicles in the same lane MUST travel in the same direction.
    - Lane Discipline: Vehicles stay centered in their lanes.
    - Road Markings: Standard white dashed lines separating lanes, solid lines at edges.
    - NO ABSTRACT ARROWS: Do NOT paint giant arrows on the road unless specifically requested for a lane turn.
    
    ## INTERSECTION LOGIC (CRITICAL):
    - ASYMMETRY RULE: One road is MAIN (Priority), the other is SIDE (Yield).
    - MAIN ROAD: No yield markings, continuous or dashed center line through intersection (if allowed).
    - SIDE ROAD: MUST have 'Give Way' (inverted triangle) or 'STOP' line markings.
    - DEADLOCK PREVENTION: NEVER place yield/stop markings on ALL 4 roads simultaneously.`,

    INTERIOR: `Photorealistic First-Person Point of View (POV) from driver's seat inside a modern European car.
    ## VISUAL STYLE:
    - Camera: Eye-level view from driver's position (camera at head height)
    - Lighting: Natural daylight entering through windows, soft interior shadows
    - Details: High detailed dashboard, steering wheel texture, readable instruments
    - Context: Road visible through windshield (depth of field applied to road)
    
    ## ANATOMY & REALISM:
    - If driver's hand is visible: It MUST be connected to a visible arm/shoulder (no floating hands).
    - Skin texture: Realistic, natural lighting on skin.
    - Better: Show only the steering wheel and dashboard without hands if adjusting GPS.` ,

    CLOSEUP: `Photorealistic Close-up Detail Shot of a vehicle part or specific road element.
    ## VISUAL STYLE:
    - Camera: Macro or close telephoto lens
    - Focus: Sharp focus on the subject (e.g., tire, light), bokeh background
    - Lighting: Studio-like outdoor lighting highlighting textures`
};

/**
 * GENERATE SCENE DESCRIPTION
 */
function generateScenePrompt(question, visionAnalysis = null) {
    const questionText = question.question?.es || question.question_es || '';
    const sceneType = detectSceneType(questionText, visionAnalysis || '');

    console.log(`  🎥 Detected Scene Type: ${sceneType}`);

    let sceneDescription = '';
    const masterStyle = PROMPTS[sceneType];

    // ... Vision Analysis logic ...
    if (visionAnalysis) {
        console.log(`  🎯 Using Vision Analysis with ${sceneType} perspective`);
        sceneDescription = `⚠️ STRICT PERSPECTIVE RULE: GENERATE A ${sceneType} VIEW.\n\n`;
        sceneDescription += `${masterStyle}\n\n`;
        sceneDescription += `Based on analysis:\n${visionAnalysis}\n\n`;

        // Add specific fixes based on scene type
        if (sceneType === 'ISOMETRIC') {
            sceneDescription += `## PHYSICS & SCALE CORRECTION:
             - Traffic Cones: MUST be standard size (75cm tall), NOT tiny toys.
             - Road Markings: Painted ON the asphalt texture, not floating.
             - Shadows: Contact shadows are mandatory for all objects.\n\n`;
        }

        sceneDescription += `⚠️ CRITICAL SIGN RULE:
Include ONLY the road signs explicitly mentioned in the analysis above.
Do NOT add any additional signs, warning signs, or obligatory signs that are not listed.
If no signs are mentioned in the analysis, do NOT add any signs to the scene.\n`;
    } else {
        // ... Fallback logic ...
        sceneDescription = `${masterStyle}\n\nScanario based on: ${questionText}`;
    }

    return sceneDescription;
}
// Fallback: используем простой анализ по ключевым словам
console.log(`  📝 Генерация сцены на основе текста вопроса`);
const analysis = analyzeQuestion(question);

// Описание транспортных средств
if (analysis.vehicles.length > 0) {
    const vehicleDescriptions = {
        car: 'modern orange hatchback car',
        motorcycle: 'red motorcycle with rider',
        truck: 'blue semi-truck',
        bicycle: 'cyclist on road bike'
    };
    sceneDescription += 'Vehicles in scene: ' + analysis.vehicles.map(v => vehicleDescriptions[v]).join(', ') + '. ';
} else {
    sceneDescription += 'One orange car and one white car. ';
}

// Описание ситуации
const situationDescriptions = {
    overtaking: 'Car overtaking situation with curved trajectory arrow showing path',
    merging: 'Vehicle merging into main lane from entrance ramp',
    priority: 'Intersection with priority markings and vehicles approaching',
    parking: 'Car parking maneuver with angle or parallel positioning',
    slope: 'Road on hillside with visible incline',
    intersection: 'T-junction or crossroads with clear lane markings'
};

if (analysis.situation && situationDescriptions[analysis.situation]) {
    sceneDescription += situationDescriptions[analysis.situation] + '. ';
}

// Добавление знаков
if (analysis.signs.length > 0) {
    sceneDescription += 'Road signs visible: ';
    analysis.signs.forEach(signCode => {
        const signPrompt = generateSignPrompt(signCode);
        if (signPrompt) sceneDescription += signPrompt + '. ';
    });
}

// Если анализ не дал результатов - generic сцена
if (!sceneDescription.trim()) {
    sceneDescription = 'Generic traffic situation with two cars (orange and white) on two-lane road with proper Spanish road markings.';
}
    }

return `${STYLE_MASTER_PROMPT}

## SCENE DESCRIPTION:
${sceneDescription}

## QUESTION CONTEXT (for reference, do NOT depict the answer):
"${questionText.substring(0, 200)}${questionText.length > 200 ? '...' : ''}"

Generate precise, educational traffic scenario.`;
}

/**
 * Вызывает Banana API для генерации изображения
 */
async function callBananaAPI(prompt) {
    const requestPayload = {
        modelInputs: {
            prompt: prompt,
            negative_prompt: `low quality, blurry, distorted, unrealistic, cartoon, anime, text, watermark, logo, 
signature, wrong perspective, incorrect road signs, american cars, left-hand traffic, 
dark lighting, night scene, rain, fog, pixelated, noise, artifacts,
arrows, trajectory arrows, orange arrows, yellow arrows, curved arrows, path indicators, 
direction arrows, motion arrows, overlay graphics, graphic overlays,
technical codes, catalog numbers, sign codes, R-301, S-17, P-23, label text on signs, 
identification codes, reference numbers, alphanumeric codes on objects,
illogical traffic signs, 20 km/h sign on highway, 30 km/h on freeway, low speed limit on autopista,
120 km/h in city, 100 km/h on urban street, contradictory signs, text glitch, distorted numbers on signs,
floating hands, severed limbs, disembodied body parts, anatomical errors, mutant hands,
head-on collision, cars driving on wrong side, chaotic traffic, cars merging into each other,
deadlock intersection, yield signs on all sides, stop signs on all 4 roads, symmetric road markings`,
            num_inference_steps: 30,
            guidance_scale: 7.5,
            width: 1024,
            height: 1024,
            seed: -1
        }
    };

    const response = await axios.post('https://api.banana.dev/v4/inference', {
        apiKey: BANANA_API_KEY,
        modelKey: BANANA_MODEL_KEY,
        modelInputs: requestPayload.modelInputs
    }, {
        timeout: 120000 // 2 минуты
    });

    if (response.data.error) {
        throw new Error(response.data.error);
    }

    ```javascript
    // Banana возвращает base64 или URL
    return response.data.modelOutputs[0]?.image_base64 || response.data.modelOutputs[0]?.image_url;
}

async function generateImage(question, questionNumber) {
    // Сначала анализируем оригинальное изображение если оно есть
    let visionAnalysis = null;
    if (question.image_url && !question.image_url.includes('supabase')) {
        visionAnalysis = await analyzeOriginalImage(question.image_url);
        // Небольшая задержка после Gemini Vision
        await new Promise(r => setTimeout(r, 1000));
    }
    
    const prompt = generateScenePrompt(question, visionAnalysis);
    
    console.log(`  🎨 Генерация изображения для вопроса #${ questionNumber }...`);
    console.log(`     Сцена: ${ prompt.substring(0, 150) }...`);

    try {
        const imageData = await callBananaAPI(prompt);

        // Если base64
        let imageBuffer;
        if (imageData.startsWith('data:') || !imageData.startsWith('http')) {
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
            // Если URL - скачиваем
            const response = await axios.get(imageData, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(response.data);
        }

        // Сохраняем
        const fileName = `dgt - ${ questionNumber } -${ crypto.randomBytes(4).toString('hex') }.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);
        await fs.writeFile(filePath, imageBuffer);

        console.log(`  ✅ Сохранено: ${ fileName } `);

        return {
            fileName,
            filePath,
            prompt: prompt.substring(0, 500)
        };

    } catch (error) {
        console.error(`  ❌ Ошибка генерации: ${ error.message } `);
        return null;
    }
}

// ========================================
// ГЛАВНАЯ ФУНКЦИЯ
// ========================================

async function processQuestions(jsonPath, options = {}) {
    const {
        onlyMissing = true,
        replaceExisting = false,
        maxImages = null
    } = options;

    console.log('📖 Читаем JSON...');
    const rawData = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(rawData);
    const questions = Array.isArray(data) ? data : data.questions;

    if (!questions || questions.length === 0) {
        throw new Error('JSON не содержит вопросов');
    }

    console.log(`✅ Найдено ${ questions.length } вопросов\n`);

    const questionsToGenerate = questions.filter(q => {
        if (!onlyMissing) return true;
        return !q.image_url || replaceExisting;
    });

    console.log(`🎨 Будет сгенерировано изображений: ${ Math.min(questionsToGenerate.length, maxImages || questionsToGenerate.length) } `);

    if (maxImages) {
        console.log(`⚠️  Установлен лимит: ${ maxImages } изображений`);
    }

    let generatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < questionsToGenerate.length; i++) {
        if (maxImages && generatedCount >= maxImages) {
            console.log(`\n⏹️  Достигнут лимит генераций: ${ maxImages } `);
            break;
        }

        const q = questionsToGenerate[i];
        const num = q.question_number || (i + 1);

        console.log(`\n🔄 Вопрос #${ num }...`);

        const result = await generateImage(q, num);

        if (result) {
            q.generated_image_path = result.filePath;
            q.generated_image_name = result.fileName;
            q.generation_prompt = result.prompt;

            generatedCount++;

            await fs.writeFile(jsonPath, JSON.stringify(Array.isArray(data) ? data : { questions }, null, 2));

            // Задержка между запросами
            await new Promise(r => setTimeout(r, 2000));
        } else {
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ ГЕНЕРАЦИИ');
    console.log('='.repeat(60));
    console.log(`✅ Сгенерировано изображений: ${ generatedCount } `);
    console.log(`❌ Ошибок: ${ errorCount } `);
    console.log('\n💰 Примерная стоимость: ~$${(generatedCount * 0.008).toFixed(2)}`);
    console.log('   (Banana.dev: ~$0.008 за изображение)');
    console.log('='.repeat(60) + '\n');

    return { generatedCount, errorCount };
}

async function main() {
    const args = process.argv.slice(2);
    const jsonPath = args.find(arg => !arg.startsWith('-'));

    if (!jsonPath) {
        console.error('❌ Укажите путь к JSON файлу');
        console.error('Использование: node scripts/generate-images-banana.js <file.json> [--all] [--limit=N]');
        process.exit(1);
    }

    const absolutePath = path.resolve(jsonPath);
    const onlyMissing = !args.includes('--all');
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const maxImages = limitArg ? parseInt(limitArg.split('=')[1]) : null;

    console.log('='.repeat(60));
    console.log('🎨 ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ ЧЕРЕЗ BANANA.DEV');
    console.log('='.repeat(60));
    console.log(`Файл: ${absolutePath}`);
    console.log(`Режим: ${onlyMissing ? 'Только без изображений' : 'Все вопросы'}`);
    if (maxImages) console.log(`Лимит: ${maxImages} изображений`);
    console.log('='.repeat(60) + '\n');

    console.log('⚠️  ВАЖНО:');
    console.log('   - Banana.dev: ~$0.008 за изображение (дешевле DALL-E в 5 раз)');
    console.log('   - Генерация: ~5-10 сек на изображение');
    console.log('   - Стиль: 3D изометрический топ-даун + точные знаки DGT\n');

    try {
        await ensureOutputDir();
        await processQuestions(absolutePath, { onlyMissing, maxImages });

        console.log('✨ Готово!');
        console.log('\n💡 Следующий шаг: Загрузите в Supabase Storage:');
        console.log('   node scripts/upload-images-golden.js ' + absolutePath);

    } catch (error) {
        console.error('\n❌ Критическая ошибка:', error.message);
        process.exit(1);
    }
}

main();
