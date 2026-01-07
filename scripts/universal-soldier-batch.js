import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import sharp from 'sharp';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.GEMINI_API_KEY;
const QUESTIONS_FILE = path.join(__dirname, '../data/topic-1-batch.json');
const OUTPUT_DIR = path.join(__dirname, '../data/generated-batch-01');
const TEMP_DIR = path.join(__dirname, '../data/temp-resized');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function compressAndResize(imageUrl, outputPath) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        await sharp(buffer)
            .resize({ width: 1024, withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toFile(outputPath);
        return outputPath;
    } catch (error) {
        console.error(`Ошибка сжатия ${imageUrl}:`, error.message);
        return null;
    }
}

async function getBase64FromFile(filePath) {
    try {
        return fs.readFileSync(filePath).toString('base64');
    } catch (error) {
        console.error(`Ошибка чтения ${filePath}:`, error.message);
        return null;
    }
}

// 🕵️ STEP 1: INSPECTOR (Graphic Description)
async function inspectImage(compressedImagePath) {
    const imageBase64 = await getBase64FromFile(compressedImagePath);
    if (!imageBase64) return null;

    const prompt = `
    TASK: Extract GEOMETRY FACTS ONLY from this DGT exam image.
    
    CRITICAL FOR TRAFFIC SIGNS:
    Describe signs GRAPHICALLY, not by name/number.
    
    EXAMPLE (CORRECT):
    - "Red circle with white background, number inside" (speed limit)
    - "Red triangle pointing up, exclamation mark inside" (other dangers)
    - "Red circle with white horizontal bar" (no entry)
    
    EXAMPLE (WRONG):
    - "R-301 sign"
    - "P-4 sign"
    - "Speed limit 50 sign"
    
    REPORT:
    1. **Road Layout:** Number of lanes, shoulder presence, curvature.
    2. **Road Markings:** White/yellow lines (solid/dashed patterns).
    3. **Traffic Signs:** SHAPE + COLOR + SYMBOL ONLY (e.g., "red triangle, exclamation mark").
    4. **Crossings/Infrastructure:** Pedestrian crossings, bike lanes (describe where they lead).
    5. **Vehicle Markings:** ONLY if official DGT V-codes visible (V-20, V-23, V-6, V-4). DO NOT describe random stickers/logos/courier markings.
    
    DO NOT count objects (cars, cyclists, people). We'll get that from the question text.
    
    OUTPUT: GEOMETRY FACTS:
    `;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

    let attempts = 0;
    while (attempts < 5) {
        try {
            const response = await axios.post(url, { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] }] });
            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            if (error.response && [429, 503].includes(error.response.status)) {
                const waitTime = 5000 + (attempts * 3000);
                await new Promise(r => setTimeout(r, waitTime));
                attempts++;
            } else {
                console.error("Ошибка Inspector:", error.message);
                return null;
            }
        }
    }
    return null;
}

// 🎬 STEP 2: DIRECTOR (V16 Context-Aware Mode)
async function createDirectorPrompt(question, geometryFacts) {
    const answersText = question.answers.map((a, idx) =>
        `${String.fromCharCode(65 + idx)}) ${a.text.es}`
    ).join('\n   ');

    const prompt = `
    ACT AS: DGT Test Image Scenario Analyst & Prompt Engineer.

    INPUT 1: GEOMETRY (from diagram):
    ${geometryFacts}

    INPUT 2: EXAM QUESTION:
    Question: "${question.question.es}"
    
    Answer Options:
   ${answersText}
    
    ═══════════════════════════════════════════════════════════════
    🧠 STEP 1: INFER THE SCENARIO CONTEXT
    ═══════════════════════════════════════════════════════════════
    
    Based on the question and answer options, determine:
    
    **WHAT is being tested?** (e.g., "Bicycle priority in pedestrian zones")
    **WHAT must the image show?** (e.g., "Cyclists crossing at a pedestrian area, cars yielding")
    **HOW should elements connect?** (e.g., "Bike lane LEADS TO the crossing, cyclists USE it")
    
    CRITICAL: Elements must have PURPOSE, not be random decorations.
    - If there's a bike lane → cyclists RIDE ON IT (not next to it).
    - If there's a crossing → it CONNECTS to the bike lane or road.
    - If the question is about priority/yielding → show the INTERACTION.
    
    ═══════════════════════════════════════════════════════════════
    🚨 STEP 2: TRAFFIC SIGNS (CRITICAL)
    ═══════════════════════════════════════════════════════════════
    
    If GEOMETRY mentions traffic signs:
    - Pass through the EXACT GRAPHICAL description (shape, color, symbol).
    - Example: "Red triangle with exclamation mark" → Include in prompt.
    - If description is unclear or missing → Write "OMIT signs" in the prompt.
    
    ❌ NEVER invent sign names/numbers (R-301, P-4, etc.).
    ❌ NEVER use text labels for signs.
    
    ═══════════════════════════════════════════════════════════════
    🚗 STEP 3: VEHICLE ORIENTATION & PERSPECTIVE
    ═══════════════════════════════════════════════════════════════
    
    Specify which VIEWPOINT to show for each vehicle based on camera perspective:
    
    IF camera is DRIVER'S POV (inside car looking forward):
      - Cars AHEAD in same direction → "show from REAR (taillights visible)"
      - Cars ONCOMING (opposite direction) → "show from FRONT (headlights visible)"
      - Cars CROSSING (perpendicular) → "show from SIDE"
    
    IF camera is EXTERNAL (roadside/aerial):
      - Show vehicles from angle matching their direction of travel
    
    CRITICAL: Always specify "show car from REAR/FRONT/SIDE" for each vehicle.
    
    ═══════════════════════════════════════════════════════════════
    🚨 STEP 4: OBJECT COUNTS FROM QUESTION TEXT
    ═══════════════════════════════════════════════════════════════
    
    Parse QUESTION TEXT for EXACT numbers:
    - "dos ciclistas" → "EXACTLY 2 cyclists"
    - "un vehículo" → "EXACTLY 1 vehicle"
    - "circulando" (general) → Use 3-5 vehicles for context
    
    IGNORE any object counts from the geometry description.
    The source diagram may show a VIOLATION scenario (too many objects = wrong).
    
    ═══════════════════════════════════════════════════════════════
    ✅ STEP 5: WRITE FINAL PROMPT
    ═══════════════════════════════════════════════════════════════
    
    Output a single-paragraph prompt that includes:
    1. **SCENARIO CONTEXT** (what the question tests, why elements exist).
    2. **GEOMETRY** from Input 1 (road layout, markings, CONNECTIONS).
    3. **TRAFFIC SIGNS** (exact graphical description OR "omit signs").
    4. **VEHICLE VIEWPOINTS** (REAR/FRONT/SIDE for each vehicle based on camera perspective).
    5. **OBJECT COUNTS** from Input 2 (question text).
    6. **LOGICAL CONNECTIONS** (bike lane leads to crossing, cyclists USE it).
    7. **NO TEXT/NUMBERS** rule (no symbols on road except standard markings).
    8. **Spanish DGT compliance**.
    
    OUTPUT: Just the PROMPT (no markdown, no bullet points, one cohesive paragraph).
    `;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

    let attempts = 0;
    while (attempts < 5) {
        try {
            const response = await axios.post(url, { contents: [{ parts: [{ text: prompt }] }] });
            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            if (error.response && [429, 503].includes(error.response.status)) {
                const waitTime = 5000 + (attempts * 3000);
                await new Promise(r => setTimeout(r, waitTime));
                attempts++;
            } else {
                console.error("Ошибка Director:", error.message);
                return null;
            }
        }
    }
    return null;
}

// 🇪🇸 SPANISH FLAVOR RANDOMIZER
function getSpanishFlavor(promptText) {
    const isUrban = /urban|city|street|town|building|sidewalk/i.test(promptText);

    const urbanAssets = [
        "BACKGROUND DETAIL: A yellow Correos (Spanish Post) delivery van is parked in the distance.",
        "BACKGROUND DETAIL: Green recycling glass bin (igloo shape) and yellow plastic bin on the sidewalk.",
        "BACKGROUND DETAIL: Residential building facade with red bricks and green fabric awnings (toldos) on windows.",
        "BACKGROUND DETAIL: A pharmacy with a flashing green neon cross sign in the background.",
        "BACKGROUND DETAIL: A white Madrid taxi with a red diagonal stripe on the front door in traffic.",
        "BACKGROUND DETAIL: Black metal anti-parking bollards along the sidewalk edge.",
        "BACKGROUND DETAIL: A 'Tabacos' shop sign with maroon and yellow colors in the background."
    ];

    const ruralAssets = [
        "BACKGROUND DETAIL: A Renfe train (white and purple) is passing on a bridge/track in the very far distance.",
        "BACKGROUND DETAIL: A Guardia Civil patrol car (green and white livery) is parked on the shoulder far ahead.",
        "BACKGROUND DETAIL: Landscape with dry yellow grass, olive trees, and umbrella pines (pino piñonero).",
        "BACKGROUND DETAIL: An Osborne Bull silhouette billboard on a distant hill (iconic Spanish symbol).",
        "BACKGROUND DETAIL: An old whitewashed stone house with a terracotta tiled roof in the field.",
        "BACKGROUND DETAIL: A tractor or agricultural vehicle moving slowly on a side path."
    ];

    const assets = isUrban ? urbanAssets : ruralAssets;
    const randomAsset = assets[Math.floor(Math.random() * assets.length)];

    return `* ${randomAsset}`;
}

// 🎨 STEP 3: ARTIST (V18 - RESTORED V16 GOLDEN STANDARD)
async function generateImageGemini(finalPrompt, compressedImagePath, questionId) {
    const layoutBase64 = await getBase64FromFile(compressedImagePath);
    if (!layoutBase64) return null;

    const fullPrompt = `
🥇 CRITICAL MISSION:
STRICT DGT EDUCATIONAL IMAGE. LEGAL ACCURACY REQUIRED.
CRITICAL: NO TEXT ON ROAD/SIGNS/VEHICLES. NO EMOJI SIGNS. NO INVENTED STICKERS.
GEOMETRY FROM INPUT IMAGE = LAW. COPY EXACT LAYOUT 1:1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🥈 GEOMETRY RULES (PRESERVE EXACTLY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAYOUT: ${finalPrompt}

MANDATORY PRESERVATION:
* Road layout: EXACT lane count, width, curvature from input image
* Vehicle positions: PRESERVE spatial relationships (which car is where)
* Road markings: COPY pattern EXACTLY (WHITE/YELLOW lines only - Spanish DGT standard)
* DO NOT invent new lanes. DO NOT move objects.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🥉 SCENE DETAILS (CRITICAL RULES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBJECT COUNT:
* Use EXACT number from layout above (e.g., "2 cyclists" = draw EXACTLY 2)
* NO crowds. NO creative additions.

VEHICLE VIEWPOINTS (PHYSICS):
* Follow viewpoint specified in layout above (REAR/FRONT/SIDE)
* Cars AHEAD in same direction → show REAR view (taillights visible)
* Cars ONCOMING (opposite direction) → show FRONT view (headlights visible)
* Cars CROSSING (perpendicular) → show SIDE view
* CRITICAL: NO cars facing backwards (front towards camera but moving away)

TRAFFIC SIGNS:
* IF layout has graphic description (e.g., "red triangle, exclamation mark") → draw EXACT graphic
* IF layout says "omit signs" → draw NO signs
* Spanish DGT signs = GRAPHICAL: circles, triangles, squares with SYMBOLS inside
* FORBIDDEN:
  - NO text labels (R-301, P-4, DGT, speed numbers as text)
  - NO emoji (thumbs down, smileys, fictional symbols)
* IF unclear → OMIT sign (better no sign than wrong sign)

ROAD SURFACE:
* WHITE lines: solid/dashed (center, edge)
* YELLOW lines: no-parking zones
* FORBIDDEN: NO text/letters/symbols on road surface (no "DGT", no "STOP", no bike symbols)

VEHICLE BODIES (ZERO TOLERANCE):
* CLEAN bodies (no stickers/logos/arrows/text on vans/trucks/buses)
* ALLOWED ONLY:
  - Manufacturer badges (Mercedes star, BMW logo, VW emblem) - subtle
  - License plates (generic European, blurred numbers)
  - Official DGT V-codes IF specified in layout (V-20/V-23/V-6/V-4)
* DEFAULT: CLEAN BODY if not specified
* FORBIDDEN: NO courier markings, NO fictional safety stickers, NO decorative arrows

LOGICAL CONNECTIONS:
* Bike lane → cyclists RIDE ON IT (not next to it)
* Crossing → CONNECTS to sidewalk/bike lane
* Elements have PURPOSE (not random decorations)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 VISUAL STYLE (APPLY LAST):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOCATION: Spain Mediterranean (Costa del Sol, Valencia)
ROAD: Pristine smooth asphalt. NO cracks.
VEGETATION: Green lawns, palm trees, orange groves.

VEHICLES (PREMIUM QUALITY):
* Modern European 2018-2024 (Audi A4/Q5, BMW 3/X3, VW Golf/Passat, Mercedes C, Seat Leon)
* Premium metallic paint with ray-traced reflections (sky/trees visible in paint)
* Realistic details: headlight lens, chrome trim, alloy wheels, tire texture
* Dynamic shadows under cars, lens flare on glass
* FORBIDDEN: NO toy models, NO flat plastic, NO 2010 graphics

RENDERING:
* Unreal Engine 5 / Forza Motorsport 8 quality
* HDRI lighting, volumetric god rays, soft shadows
* Subtle bloom, minimal film grain, warm Mediterranean color grading
* Slight bokeh on distant background (keep road/cars sharp)

CAMERA: Driver POV or external (as specified in layout). Sharp focus on vehicles/road.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🇪🇸 SPANISH CULTURAL CONTEXT (MANDATORY INJECTION):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ${getSpanishFlavor(finalPrompt)}
// (TEMPORARILY DISABLED TO RESTORE PREVIOUS BATCH STYLE)

* ATMOSPHERE: The image MUST scream "This is Spain, not California".
* LIGHTING: Warm, slightly harsh Iberian sunlight (midday or golden hour). High contrast.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ABSOLUTE PROHIBITIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NO text/letters/numbers on road surface.
NO text labels on traffic signs (R-301, P-4, DGT, etc.).
NO emoji/fictional signs (thumbs down, smileys).
NO vehicle stickers/logos/arrows on vans/trucks.
NO toy-like cars (need premium modern European).
NO cars facing wrong direction.
NO cartoon/sketch style.
NO collage/split panels.
NO American/German signs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ OUTPUT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SINGLE PHOTOREALISTIC IMAGE:
1. Matches input geometry 1:1
2. Uses ONLY Spanish DGT graphical elements
3. ZERO text/invented details
4. Modern premium European vehicles
5. Correct vehicle viewpoints (REAR/FRONT/SIDE as specified)
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${API_KEY}`;

    const payload = {
        contents: [{
            parts: [
                { text: fullPrompt },
                { inline_data: { mime_type: "image/jpeg", data: layoutBase64 } },
                { text: "COPY EXACT LAYOUT. NO TEXT ANYWHERE. NO EMOJI SIGNS. NO STICKERS. MODERN CARS ONLY." }
            ]
        }],
        generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
        }
    };

    console.log(`      🎨 Scenario: ${finalPrompt.substring(0, 60)}...`);

    let attempts = 0;
    while (attempts < 3) {
        try {
            const response = await axios.post(url, payload, { timeout: 120000 });

            if (response.data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                const buffer = Buffer.from(response.data.candidates[0].content.parts[0].inlineData.data, 'base64');
                const filename = `q${questionId}_v18.jpeg`;
                const filepath = path.join(OUTPUT_DIR, filename);
                fs.writeFileSync(filepath, buffer);
                console.log(`✅ Вопрос ${questionId}: Gemini создал -> ${filename}`);
                return filename;
            } else {
                console.warn(`⚠️ API ответ пустой (Попытка ${attempts + 1})...`);
                attempts++;
            }
        } catch (error) {
            if (error.response && [429, 503].includes(error.response.status)) {
                const waitTime = 15000 + (attempts * 10000);
                console.warn(`🚧 Gemini Rate Limit. Ждем ${waitTime / 1000} сек...`);
                await new Promise(r => setTimeout(r, waitTime));
                attempts++;
            } else {
                console.error(`❌ Вопрос ${questionId}: Ошибка Gemini:`, error.message);
                return null;
            }
        }
    }
    return null;
}

// 👮‍♂️ STEP 0: GATEKEEPER (Classify Image Type)
async function classifyImage(compressedImagePath) {
    const imageBase64 = await getBase64FromFile(compressedImagePath);
    if (!imageBase64) return "OTHER";

    const prompt = `
    CLASSIFY this image content.
    Return ONLY one of these two words:
    
    SCENE - if it shows a road, traffic, cars, pedestrians, or driving situation (photo or 3D render).
    OTHER - if it is a text table, chart, infographic, document, or abstract icon without a road scene.
    
    OUTPUT: SCENE or OTHER
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

    try {
        const response = await axios.post(url, { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] }] });
        const type = response.data.candidates[0].content.parts[0].text.trim().toUpperCase();
        return type.includes("SCENE") ? "SCENE" : "OTHER";
    } catch (error) {
        console.error("Ошибка Gatekeeper:", error.message);
        return "OTHER"; // Safe default
    }
}



// MAIN LOOP
async function main() {
    console.log("🚀 ЗАПУСК V19 (TOPIC 1: Q1-10) 👮‍♂️🎨...");

    const rawData = fs.readFileSync(QUESTIONS_FILE);
    // Handle potential nested arrays [[...]] from some JSON generators
    const allQuestions = JSON.parse(rawData).flat();
    // START BATCH 1-10
    const batch = allQuestions.slice(0, 10);

    for (const q of batch) {
        const outputFile = path.join(OUTPUT_DIR, `q${q.question_number}_v19.jpeg`);
        if (fs.existsSync(outputFile)) {
            console.log(`⏩ Вопрос #${q.question_number} уже готов. Пропуск.`);
            continue;
        }

        console.log(`\n🚦 Обработка вопроса #${q.question_number}...`);

        let sourceUrl = q.image_url;
        // ✅ RESTORE SCHEMA FALLBACK (But we will filter it below)
        if (!sourceUrl || sourceUrl === "null") sourceUrl = q.schema_url;

        if (!sourceUrl || sourceUrl === "null") {
            console.log(`⏩ Пропуск (совсем нет картинки).`);
            continue;
        }

        console.log(`   🔧 Сжимаем исходник...`);
        const compressedPath = path.join(TEMP_DIR, `q${q.question_number}_compressed.jpg`);
        const compressed = await compressAndResize(sourceUrl, compressedPath);
        if (!compressed) continue;

        // 👮‍♂️ GATEKEEPER CHECK
        process.stdout.write(`   👮‍♂️ Gatekeeper checking... `);
        const imageType = await classifyImage(compressed);
        console.log(`[ ${imageType} ]`);

        if (imageType !== "SCENE") {
            console.log(`   ⛔ Это таблица или схема. Пропускаем генерацию.`);
            continue;
        }

        console.log(`   🕵️  Inspector (Geometry + Graphic Signs)...`);
        const geometryFacts = await inspectImage(compressed);
        if (!geometryFacts) continue;

        console.log(`   🎬 Director (Context-Aware + Perspective)...`);
        const finalPrompt = await createDirectorPrompt(q, geometryFacts);
        if (!finalPrompt) continue;

        console.log(`   🎨 Artist (Engineering Prompt)...`);
        await generateImageGemini(finalPrompt, compressed, q.question_number);

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log("\n🏁 BATCH V19 (Q 11-20) ЗАВЕРШЕН! 🇪🇸");
}

main();
