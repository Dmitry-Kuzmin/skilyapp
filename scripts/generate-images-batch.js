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
import { v5 as uuidv5 } from 'uuid';
import { getCreativeScenario } from './creative-scenarios.js';

const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'; // Same as validator-server

dotenv.config({ path: '.env.local' });
dotenv.config();

const PRIMARY_KEY = process.env.GEMINI_API_KEY;
const BACKUP_KEY = process.env.GEMINI_API_KEY_BACKUP;

if (!PRIMARY_KEY) {
    console.error('❌ Ошибка: Не задан GEMINI_API_KEY в .env.local');
    process.exit(1);
}

// API Key Rotation
const API_KEYS = [PRIMARY_KEY, BACKUP_KEY].filter(Boolean);
let currentKeyIndex = 0;

let genAI;
let visionModel;
let imagenModel;
let imagenModelFlash;

function initializeAI() {
    const key = API_KEYS[currentKeyIndex];
    console.log(`🔑 [System] Initializing Gemini with Key #${currentKeyIndex + 1} (${key.slice(0, 10)}...)`);

    genAI = new GoogleGenerativeAI(key);
    // 🧠 Director / Vision
    visionModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
    // 🎨 Main Artist
    imagenModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
    // 🎨 Backup Artist
    imagenModelFlash = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
}

function rotateApiKey() {
    if (API_KEYS.length <= 1) return false;
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    console.log(`🔄 [System] Rotating API Key to Key #${currentKeyIndex + 1}...`);
    initializeAI();
    return true;
}

// Initial Sync
initializeAI();

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
   - **PERSPECTIVE**: State if the car icon on the sign is facing FORWARD (front view) or SIDE (profile).
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
10. IS_SIGN_ONLY: SET TO TRUE if the image is strictly an isolated traffic sign on a white or plain background without any road/traffic context.

ACCURACY IS PARAMOUNT. FLAG LOGICAL ERRORS.`;

const STYLE_MASTER_PROMPT = `
STYLE: High-End Photorealistic Automotive Simulation. 8k resolution, Unbiased Rendering (Octane/Redshift style), Global Illumination.
CAMERA: Cinematic, Dynamic, Professional. (Use Low-Angle for heroic urban shots, High-Angle/Drone for clear rural overviews, Over-Shoulder for interior). Avoid flat, boring angles.
LOCATION: {{DYNAMIC_LOCATION_PLACEHOLDER}}

### 🛑 VISUAL CONSTITUTION & CRITICAL DGT RULES

**RULE 1: NO TEXT HALLUCINATIONS (STRICT)**
* **FORBIDDEN:** Never write catalog codes (e.g., "S-34", "R-407a", "P-18") on signs OR on small plates below them.
* **NO SUPPLEMENTARY PLATES:** Do NOT draw small rectangular plates (White or Yellow) below the sign with text. The pole must be BARE.
* **CONSTRUCTION SIGNS (Obras)**: Draw ONLY the **Yellow Triangle with Worker Symbol**. ABOLISH the yellow square plate with "Obras" or "P-18".
* **VISUAL ONLY:** Render the *graphical symbol* only. The sign pole must be clean.
* **PURE GEOMETRY:** Signs must be geometrically perfect (Perfect Circles, Triangles, Rectangles).
* **PICTOGRAM ACCURACY:** Pay close attention to the vehicle orientation on signs:
    - **FRONT VIEW**: If the original sign shows a car facing the viewer (Front/Forward), the 3D recreation MUST use a front-facing car pictogram.
    - **SIDE VIEW**: If the original shows a car profile, use a side profile.
    - **R-120 (Emission Zone)**: MUST be a **front-facing car** with dots/smoke to its side.

**RULE 2: HYPER-REALISTIC MATERIALS**
* **ASPHALT:** Texture must be visible—grainy, slight wear, tire skid marks, oil spots, and variances in roughness. NOT flat grey.
* **ROAD MARKINGS:** "Thermoplastic" painted look—slightly raised texture, matte white, showing minor wear/cracking from traffic.
* **TRAFFIC SIGNS:** 
    - **Face:** Retro-reflective vinyl texture (subtle honeycomb pattern if close).
    - **Structure:** Galvanized steel grey poles (matte metal), visible bolted clamps/brackets on the back if visible.
* **VEHICLES:** European-spec models. Real automotive paint with clear coat reflections. 

**RULE 3: DGT 2026 UPDATE - EMERGENCY SIGNALS**
* **USE ONLY IF SPECIFIED**: Apply V16 ONLY for breakdowns or accidents (vehicle stopped).
* **NO TRIANGLES:** Do NOT generate "Warning Triangles" on the road.
* **V16 BEACON:** For breakdowns/accidents, use the **V16 Orange Emergency Beacon**.
* **SCALE & FORM**: It must be a **small, flat, palm-sized disk** (approx. 10cm wide, 5cm tall). It is NOT a large siren or a tall police dome. 
* **VISUAL**: It sits magnetically on the roof. Emits a pulsing/flashing amber light. NO strobe lights for moving traffic.

**RULE 4: REALISTIC SIGN PLACEMENT (CRITICAL)**
* **PLACEMENT**: Every traffic sign MUST be placed realistically: on the right-hand SIDEWALK (Urban) or on the SHOULDER/ARCÉN (Rural/Highway).
* **FORBIDDEN**: NEVER place a sign pole on the asphalt road surface or in the middle of a lane.
* **INTEGRATION**: If the original image is a close-up of an isolated sign, you must place it alongside a road in the 3D scene, properly mounted on the right side.

{{DYNAMIC_BRANDING_PLACEHOLDER}}

## NEGATIVE PROMPT:
Cluttered scene, cartoon, low poly, ugly text, huge sci-fi buildings, flying cars, watermarks, signature, blurry, distorted, accident, crash, dead body, injury, blood, collision, smashed car, dented car, broken glass, violence, tragedy, gore, road warning triangle, red triangle on road, text labels, R-407a, P-18, Obras, sign code, white plate below sign, yellow plate below sign, sign caption, text on pole, American yellow center lines, floating cars.

## INFRASTRUCTURE & LOGIC (DGT STANDARDS):
1. **MARKINGS**: WHITE lines only (No yellow US lines).
2. **TRAFFIC LOGIC**: Vehicles centered in lanes.
3. **PRIORITY**: The DGT Question Logic (SCENE TO GENERATE below) is the ABSOLUTE MASTER. If Branding contradicts Traffic Rules, ignore Branding.

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
// RANDOMIZATION ASSETS (Dynamic Diversity)
// ==========================================
// ==========================================
// RANDOMIZATION ASSETS (Skily Branding)
// ==========================================
// ==========================================
// RANDOMIZATION ASSETS (Skily Branding & Atmosphere)
// ==========================================
const SPAIN_REGIONS = [
    { name: "Asturias (Green North)", desc: "Deep green valleys, limestone peaks, wet reflective asphalt", weather: "Dramatic Stormy/Clearing" },
    { name: "Galicia (Mystic)", desc: "Mist-covered eucalyptus forests, stone walls, soft diffuse light", weather: "Foggy/Cinematic Mist" },
    { name: "Basque Coast (Dramatic)", desc: "Cliffs dropping into ocean, winding roads, intense green grass", weather: "Overcast with bright spots" },
    { name: "Cantabria (Elements)", desc: "Rough sea, jagged rocks, wet road reflecting the sky", weather: "Moody Blue/Grey" },
    { name: "Pyrenees (Alpine)", desc: "High mountain pass, snow patches, crisp cold air", weather: "Crystal Clear Blue Sky" },
    { name: "Madrid (Modern Urban)", desc: "Wide avenues, golden hour sun, glass skyscrapers", weather: "Sunset/Golden Hour" }
];

const SKILY_VARIANTS = [
    {
        id: 'MUPI',
        tags: ['urban', 'city', 'bus', 'parada', 'avenue', 'calle'],
        text: `**THE COOL ELEMENT:** A modern glass bus shelter (MUPI) on the sidewalk. Inside, a high-res OLED screen displays a witty Skily ad.
        **Ad Visual:** A split screen showing a sweating stressed driver vs. a chill Skily driver.
        **Text on Ad:** "Tu carnet. Modo Fácil." (Your license. Easy Mode).
        **Interaction:** The Skily car drives past in the lane.`
    },
    {
        id: 'ROBOT',
        tags: ['sidewalk', 'crosswalk', 'urban', 'pedestrian'],
        text: `**MODERN GADGET:** A friendly, six-wheeled autonomous delivery robot (White/Cyan with Skily logo) navigating the sidewalk safely. It adds a futuristic touch.`
    },
    {
        id: 'DRONE',
        tags: ['mountain', 'coast', 'scenic', 'highway', 'road'],
        text: `**MODERN GADGET:** A small professional camera drone hovering high in the sky (subtle), filming the Skily car driving through this epic landscape.`
    },
    {
        id: 'EV_STATION',
        tags: ['parking', 'station', 'rest', 'gas', 'service'],
        text: `**MODERN GADGET:** A futuristic "Skily Energy" EV Charging Station with glowing cyan LED rings, visible in the background.`
    }
];


function getSkilyBranding(text, isSafetyCritical = false) {
    // 1. Creative Scenario (Location & Weather)
    // Now biased heavily towards Northern Spain beauty
    const locationString = getCreativeScenario(text);

    // 🔴 SAFETY CRITICAL OVERRIDE:
    if (isSafetyCritical) {
        return {
            location: locationString,
            branding: `## BRANDING DISARMED (SAFETY CRITICAL):
**NEUTRALITY RULE**: This is an emergency/accident scenario.
1. DO NOT place any logos or branded vehicles.
2. All vehicles must be generic and neutral.
3. ABSOLUTELY NO ROBOTS or sci-fi elements.
4. Focus purely on the V16 Beacon and safety elements.`
        };
    }

    // 2. Branding Elements (Adequate Quantity & Cool Gadgets)
    let brandingText = "";

    // Check for matching context
    const candidates = SKILY_VARIANTS.filter(v => v.tags.some(t => text.includes(t)));

    // Fallback if no specific tag match (e.g. rural road) -> Drone or Robot valid? Drone yes.
    if (candidates.length === 0) {
        candidates.push(SKILY_VARIANTS.find(v => v.id === 'DRONE'));
    }

    const SAFETY_PROTOCOL = `
**BRAND SAFETY (CRITICAL):**
* Skily vehicles (marked with livery) must NEVER be involved in accidents, collisions, or illegal maneuvers.
* Skily vehicles must always be PARKED legally or DRIVING safely.`;

    // Probability 10% for gadgets (drones/robots) to avoid clutter, but 70% for car livery (minimal)
    if (candidates.length > 0 && Math.random() < 0.1) {
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        brandingText = `## SKILY BRANDING (MODERN & COOL):
${selected.text}
Also: One of the cars (preferable the main car) should have the Skily Livery (White/Blue/Cyan).
${SAFETY_PROTOCOL}`;
    } else {
        // Default: Just the car logo
        brandingText = `## SKILY BRANDING (MINIMAL):
One of the vehicles (the main car) should use the Skily Livery (White/Blue with Cyan accents).
${SAFETY_PROTOCOL}`;
    }

    return {
        location: locationString,
        branding: brandingText
    };
}

// ==========================================
// ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ (Imagen)
// ==========================================
async function generateImage(question, visionAnalysis, attempt = 1, useBackup = false) {
    if (attempt > CONFIG.maxRetries) {
        console.error(`   ❌ Все попытки (${CONFIG.maxRetries}) исчерпаны.`);
        return null;
    }

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

        const isInterior =
            textToScan.includes('interior') ||
            textToScan.includes('inside') ||
            textToScan.includes('dashboard') ||
            textToScan.includes('steering wheel') ||
            textToScan.includes('windshield') ||
            (typeof visionAnalysis === 'string' && (
                visionAnalysis.toLowerCase().includes('viewpoint: driver pov') ||
                visionAnalysis.toLowerCase().includes('viewpoint: interior') ||
                visionAnalysis.toLowerCase().includes('inside vehicle')
            ));

        // Detect Police / Authorities (Guardia Civil)
        const isPoliceScenario =
            textToScan.includes('policía') ||
            textToScan.includes('agente') ||
            textToScan.includes('autoridad') ||
            textToScan.includes('civil guard') ||
            textToScan.includes('police officer') ||
            (typeof visionAnalysis === 'string' && (
                visionAnalysis.toLowerCase().includes('police') ||
                visionAnalysis.toLowerCase().includes('officer') ||
                visionAnalysis.toLowerCase().includes('authority')
            ));

        // NEW: Detect Active Driving / Overtaking / Normal Traffic
        // If these keywords are present, we should be VERY SKEPTICAL about V16
        const isMovingTraffic =
            textToScan.includes('adelantar') ||
            textToScan.includes('overtake') ||
            textToScan.includes('circulando') ||
            textToScan.includes('conducir') ||
            textToScan.includes('rebasar') ||
            textToScan.includes('rebase') ||
            textToScan.includes('driving') ||
            textToScan.includes('at night') ||
            textToScan.includes('night') ||
            textToScan.includes('oblongar') || // user typo but frequent
            textToScan.includes('moving');

        // Detect Breakdown / Emergency / V16 Context
        // STRICTER LOGIC: Only trigger V16 if it's clearly an emergency/stopped vehicle scenario AND NOT inside the car
        // AND NOT moving traffic AND NOT just polyce immobilization
        const isEmergencyV16 =
            !isInterior && !isMovingTraffic && (
                textToScan.includes('avería') ||
                textToScan.includes('breakdown') ||
                textToScan.includes('emergencia') ||
                textToScan.includes('siniestro') || // accident
                (textToScan.includes('inmoviliz') && !isPoliceScenario && (textToScan.includes('arcén') || textToScan.includes('calzada'))) || // immobilized on road/shoulder
                textToScan.includes('v-16') ||
                textToScan.includes('v16') ||
                textToScan.includes('warning triangle') ||
                textToScan.includes('triángulo de preseñalización')
            );

        // Analyze vision analysis for presence of objects
        const hasVehiclesInOriginal = typeof visionAnalysis === 'string' &&
            !visionAnalysis.toLowerCase().includes('none present') &&
            !visionAnalysis.toLowerCase().includes('no vehicles') &&
            !visionAnalysis.toLowerCase().includes('vehicle: none');

        const hasPoliceInOriginal = typeof visionAnalysis === 'string' &&
            (visionAnalysis.toLowerCase().includes('police') || visionAnalysis.toLowerCase().includes('officer'));

        // INJECT SKILY BRANDING (SUBTLE MODE)
        // Pass isEmergencyV16 to disable branding in accidents
        const branding = getSkilyBranding(textToScan, isEmergencyV16);
        prompt = `${STYLE_MASTER_PROMPT.replace('{{DYNAMIC_LOCATION_PLACEHOLDER}}', branding.location).replace('{{DYNAMIC_BRANDING_PLACEHOLDER}}', branding.branding)}

## SCENE TO GENERATE:
Based on original DGT test image analysis:

${visionAnalysis}

${explanationText ? `
## CONTEXT FROM EXPERT EXPLANATION:
"${explanationText}"
` : ''}

## TRUTH SOURCE:
"${questionText}"
${answersContext}

${isEmergencyV16 ? `
## 🚨 CONDITIONAL MODIFICATION: V16 BEACON PROTOCOL
**CONTEXT CHECK:**
- **IF** the scene depicts a **STOPPED, BROKEN DOWN, or ACCIDENT** vehicle:
  1.  **MANDATORY**: Draw a **V16 ORANGE FLASHING BEACON** (small dome light) on the roof.
  2.  **ACTION**: The vehicle must be STATIONARY with HAZARD LIGHTS ON.
  3.  **NO TRIANGLES**: Do NOT place red warning triangles on the road.
- **IF** the vehicle is **MOVING** or in normal traffic flow:
  - **DO NOT** add the V16 Beacon.
  - **DO NOT** add triangles.
  - Ignore "avería" keywords if they refer to a theoretical question rather than the visual scene.
` : ''}

## MISSION:
Recreate the scene with high fidelity, BUT **APPLY THE V16 BEACON MODIFICATION if applicable above**.

## TRAFFIC DYNAMICS (CRITICAL):
${isMovingTraffic ? `
1. **ACTIVE MOTION**: The vehicles must be DRIVING STABLY in the middle of their lanes.
2. **NO EXITING / NO BRAKING**: Do not show brake lights or turn signals unless explicitly requested. The cars should look like they are in normal traffic flow at constant speed.
3. **WHEEL ACTION**: Subtle motion blur on wheels to indicate movement.
4. **NO EMERGENCY LIGHTS**: Do NOT add orange strobe lights, beacons, or hazard lights for moving cars.
` : (isEmergencyV16 && hasVehiclesInOriginal ? `
1. **STATIONARY**: The main vehicle should be STOPPED (usually on the shoulder or near the edge) as this is an emergency scenario.
` : (isPoliceScenario || hasPoliceInOriginal ? `
1. **AUTHORITY SCENE**: Incorporate Spanish Traffic Police (Guardia Civil) in professional uniforms. 
2. **POSITION**: They should be standing near a patrol vehicle or by the roadside, interacting with the scene.
3. **PATROL VEHICLE**: A distinctive white and green Spanish Guardia Civil patrol car with blue flashing lights (Siren) is highly recommended to illustrate the context.
` : (typeof visionAnalysis === 'string' && visionAnalysis.includes('IS_SIGN_ONLY: TRUE') ? `
1. **PURE SIGN CONTEXT**: The original is an isolated sign. Place it realistically on a pole on the right-hand SIDEWALK of a professional city street.
2. **NO OBSTRUCTIONS**: Ensure the sign is perfectly visible and readable, not blocked by any elements.
` : `
1. **SCENE STABILITY**: Recreate the elements exactly as described in analysis. If no vehicles are mentioned, focus on characters or infrastructure.
`)))}

- Professional 3D automotive style
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

${isEmergencyV16 ? `
## 🚨 RULESET: EMERGENCY / BREAKDOWN
**APPLY ONLY IF VEHICLE IS STOPPED:**
1. **NO WARNING TRIANGLES**: Obsolete. Do not draw.
2. **V16 BEACON**: Required ONLY for stopped/damaged vehicles on the roof.
3. **MOVING VEHICLES**: Do NOT show V16 beacon.
` : ''}

## CRITICAL CONSTRAINTS:
- Road markings: WHITE ONLY (Spanish standard, NOT yellow/USA)
- NO dimension text ("10cm", "6m", "3.5m") on the road
- NO measurement annotations
- **NO CATALOG CODES**: Do not include codes like "S-34", "R-1" in the prompt. Use visual descriptions (e.g. "Rectangular blue sign with train icon").
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
- Rain/Snow (unless specified)
- **GLOWING ARROWS ON ROAD**: Do NOT draw holographic, neon, or glowing navigation arrows on the road surface.
- **SCI-FI EFFECTS**: No futuristic HUD overlays, no glowing circles under cars, no laser projections.
- **GAMY FY ELEMENTS**: No "Need for Speed" style checkpoints or markers on the asphalt.
- Keep the road surface clean asphalt, only STANDARD WHITE DGT PAINT markings allowed.`;
    }

    // ==========================================
    // AI PROMPT REWRITER (Smart User Instructions)
    // ==========================================
    if (question.user_instruction || question.custom_prompt) {
        console.log(`\n   🧞‍♂️ AI DIRECTOR STATUS:`);
        if (question.user_instruction) console.log(`   - 🖊️  User Wish: "${question.user_instruction}"`);
        if (question.custom_prompt) console.log(`   - 📜  Custom Manual Prompt: ${question.custom_prompt.length} chars`);
    }

    if (question.user_instruction) {
        console.log(`   📝 Rewriting technical prompt to include wish...`);

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
6. **UNPACK SIGN CODES (CRITICAL)**: If you see DGT codes (e.g., "S-34", "R-301"), DO NOT include the text code in the result. Replace it with its VISUAL DESCRIPTION (e.g., "Blue rectangular sign with white P and train icon").
7. **NO HALLUCINATIONS**: Do not assume accidents, breakdowns, or strobe lights unless the USER INSTRUCTION specifically requests an emergency scenario.
8. **OUTPUT format**: Return ONLY the full, final, ready-to-use prompt text. NO markdown code blocks, NO "Here is the prompt". Just the raw text.`;

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
        const activeModel = useBackup ? imagenModelFlash : imagenModel;
        const modelName = useBackup ? "Gemini 2.5 Flash Image" : "Gemini 3 Pro";

        console.log(`   🎨 Генерируем через: ${modelName}...`);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Generation Timeout (120s)")), 120000)
        );

        const result = await Promise.race([
            activeModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    candidateCount: 1,
                    responseModalities: ['Image'],
                    imageConfig: {
                        aspectRatio: '16:9',
                        imageSize: '2K'
                    }
                }
            }),
            timeoutPromise
        ]);

        const response = await result.response;
        const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

        if (!imageData) {
            throw new Error('Gemini 3 Pro не вернул изображение');
        }

        return {
            buffer: Buffer.from(imageData.data, 'base64'),
            prompt: prompt,
            model: useBackup ? 'flash' : 'pro'
        };

    } catch (error) {
        if (attempt < CONFIG.maxRetries) {
            console.error(`   ⚠️  [Попытка ${attempt}/${CONFIG.maxRetries}] Ошибка (${useBackup ? 'Backup' : 'Primary'}):`, error.message);

            // Fallback logic
            const isLimitError = error.message.includes('429') || error.message.includes('Quota') || error.message.includes('503');
            const isTimeout = error.message.includes('Timeout');

            // 1. Try Key Rotation (if Limit Error)
            if (isLimitError) {
                if (rotateApiKey()) {
                    console.log(`   🔄 Key rotated successfully. Retrying immediately...`);
                    return generateImage(question, visionAnalysis, attempt + 1, useBackup);
                }
            }

            // 2. Switch to backup model on Limit (if key rotation failed/exhausted), Timeout, OR if attempt >= 2
            if (!useBackup && (isLimitError || isTimeout || attempt >= 2)) {
                console.log(`   🔀 Проблема с Primary (${error.message}). Переключаюсь на резерв (2.5 Flash)...`);
                return generateImage(question, visionAnalysis, 1, true);
            }

            console.log(`   ⏳ Повтор через ${5 * attempt}с...`);
            await new Promise(r => setTimeout(r, 5000 * attempt));
            return generateImage(question, visionAnalysis, attempt + 1, useBackup);
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
                        let id = q.external_id || q.id;

                        // Generative UUID if missing
                        if (!id && q.question_number) {
                            const testId = file.replace('-enriched.json', '');
                            id = uuidv5(`${testId}_q-${q.question_number}`, NAMESPACE);
                            q.id = id;
                        }

                        if (id && (q.image_url || q.schema_url)) {
                            // ✅ ДЕДУПЛИКАЦИЯ: сохраняем только первое вхождение
                            if (!questionsMap.has(id)) {
                                questionsMap.set(id, {
                                    id: id,
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
                let id = q.external_id || q.id;

                // Generative UUID if missing (Match validator-server logic)
                if (!id && q.question_number) {
                    const filename = path.basename(inputFileArg);
                    // Try to extract testId from filename or object
                    let testId = q.testId;
                    if (!testId) {
                        // topic-02_test-002-enriched.json -> topic-02_test-002
                        testId = filename.replace('-enriched.json', '').replace('.json', '');
                    }
                    id = uuidv5(`${testId}_q-${q.question_number}`, NAMESPACE);
                    // Save generated ID to object so it is used
                    q.id = id;
                }

                if (id) {
                    // Normalize ID
                    questionsMap.set(id, {
                        ...q, // CRITICAL FIX: Preserve all fields (answers, explanation, etc.)
                        id: id,
                        question: q.question,
                        // Fix URL loading - check both fields
                        originalUrl: q.image_url || q.schema_url || q.originalUrl,
                        sourceFile: inputFileArg,
                        testId: q.testId || 'single-gen',
                        // Valid for both format types
                        generation_prompt: q.generation_prompt,
                        // CRITICAL FIX: Pass user overrides
                        custom_prompt: q.custom_prompt,
                        user_instruction: q.user_instruction
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
        // outputPath will be defined after generation to include model suffix
        const originalPath = path.join(testOriginalsDir, `${question.id}_original.jpg`);

        // SKIP IF EXISTS CHECK
        try {
            const existingFiles = await fs.readdir(testOutputDir);
            const alreadyExists = existingFiles.some(f => f.startsWith(`${question.id}_`) && f.endsWith('.png'));

            // CRITICAL: If we have manual overrides (Magic/Director), DON'T skip!
            const isManualOverride = question.user_instruction || question.custom_prompt;

            if (alreadyExists && !isManualOverride) {
                console.log(`${progress} ⏭️ SKIP: Image already exists for ${question.id}`);
                continue;
            } else if (alreadyExists && isManualOverride) {
                console.log(`${progress} ♻️  Manual Override triggered: Re-generating despite existing image.`);
            }
        } catch (e) {
            // Directory might not exist yet, which is fine
        }

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
                    // Create path with model suffix
                    const modelSuffix = generationResult.model || 'pro';
                    const outputPath = path.join(testOutputDir, `${question.id}_${timestamp}_${modelSuffix}.png`);

                    await fs.writeFile(outputPath, generationResult.buffer);
                    // Also save the prompt!
                    const promptPath = path.join(testOutputDir, `${question.id}_${timestamp}_${modelSuffix}.prompt.txt`);
                    await fs.writeFile(promptPath, generationResult.prompt);

                    const genSizeMB = (generationResult.buffer.length / 1024 / 1024).toFixed(2);

                    const visionCost = visionResult.visionCost || 0;
                    const imagenCost = 0.04; // Imagen 3 standard pricing
                    const itemCost = visionCost + imagenCost;

                    totalCost += itemCost;
                    const modelName = generationResult.model === 'flash' ? '⚡ FLASH 2.5' : '💎 PRO 3.0';
                    console.log(`${progress} ✅ Сохранено [${modelName}]: ${genSizeMB} MB | Cost: $${itemCost.toFixed(4)} (Vision: $${visionCost.toFixed(4)} + Img: $${imagenCost})`);

                    // Queue logic...
                    reviewQueue.push({
                        id: question.id,
                        generatedPath: outputPath,
                        originalPath: originalPath,
                        question: question.question,
                        timestamp: Date.now()
                    });
                } else {
                    console.log(`${progress} ❌ Генерация не удалась после всех попыток`);
                }

                console.log(`${progress} 💰 Общая стоимость темы: ~$${totalCost.toFixed(2)}`);
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
