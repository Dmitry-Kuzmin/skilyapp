import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

// 1. Входной скриншот (Вопрос 8)
const INPUT_SCENARIO_PATH = "/Users/dimka/.gemini/antigravity/brain/82d71c89-0324-478c-97fa-e06d37e3f555/uploaded_image_1767700006271.png";

// 2. Референсы стиля (Те самые, что дали крутой результат)
const STYLE_REF_1_PATH = "/Users/dimka/.gemini/antigravity/brain/82d71c89-0324-478c-97fa-e06d37e3f555/uploaded_image_1_1767699559051.jpg";
const STYLE_REF_2_PATH = "/Users/dimka/.gemini/antigravity/brain/82d71c89-0324-478c-97fa-e06d37e3f555/uploaded_image_2_1767699559051.jpg";

const OUTPUT_PATH = "data/gemini3_cones_result.jpeg";

const PROMPT = `
STRICT RECONSTRUCTION OF TRAFFIC SCENARIO (Question 8: Additional Lane).

INPUT IMAGE: A screenshot of a driving test. FOCUS ONLY on the central visual illustration (the road scene). Ignore the UI buttons/text.

TASK: Recreate this specific "Additional Lane" (Carril Adicional) scenario in a Premium Photorealistic 3D Style.

CRITICAL OBJECTS & ORIENTATION:
1.  **YELLOW CAR (Left - THE KEY ACTOR):**
    *   **Position:** **MUST BE DRIVING ON THE SHOULDER ('ARCÉN').** This is critical. The car should be positioned to the far left, straddling or crossing the solid white line that marks the road edge. It utilizes the extra space provided by the shoulder.
    *   **Geometry:** 1 Lane + Shoulder allocated for this car.
    *   **Orinetation:** FACING THE CAMERA (Front view).
    *   **LIGHTS:** **HEADLIGHTS MUST BE OFF**. This is a **TRAFFIC VIOLATION SCENARIO**. The exam question asks if the car is correct, and the answer is "NO, because lights are off". Therefore, render the car with **NO VISIBLE BEAMS**, only simple daylight reflection.
2.  **CONES (The Line):**
    *   A distinct line of ORANGE TRAFFIC CONES separating the Yellow Car from the other traffic.
    *   The cones must be clearly visible, placed on the road surface.
3.  **DARK CARS (Center & Right):**
    *   **Position:** Two dark/black cars driving in the other lanes.
    *   **Orientation:** FACING AWAY from camera (Rear view).
    *   **LIGHTS:** **LIGHTS MUST BE ON (CORRECT BEHAVIOR)**.
        *   **Rear:** Distinct **RED TAILLIGHTS** must be glowing.
        *   **Front (Projected):** Show **VISIBLE HEADLIGHT BEAMS** casting yellow light on the asphalt *in front* of these cars (away from the camera). This serves as a visual cue that they are complying with the regulations.

STYLE TRANSFER:
*   Use the [STYLE_REFERENCE_IMAGES] to define the look.
*   **Asphalt:** Realistic grey textured asphalt (not cartoonish).
*   **Grass:** Lush, detailed green grass on the sides.
*   **Lighting:** Bright daylight, but make sure the Yellow Car's headlights are visible (e.g., reflections on the road or lens flare).

CONSTRAINTS:
*   Do not hallucinate opposing traffic in the wrong lanes.
*   Preserve the geometry of 1 lane going against 2 lanes, separated by cones.
`;

async function getBase64FromFile(path) {
    return fs.readFileSync(path).toString('base64');
}

async function main() {
    if (!API_KEY) {
        console.error("❌ GEMINI_API_KEY не найден");
        process.exit(1);
    }

    console.log("🚀 Gemini 3 Pro: Cones & Lights Scenario...");

    try {
        const scenarioBase64 = await getBase64FromFile(INPUT_SCENARIO_PATH);
        const style1Base64 = await getBase64FromFile(STYLE_REF_1_PATH);
        const style2Base64 = await getBase64FromFile(STYLE_REF_2_PATH);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${API_KEY}`;

        console.log("📤 Отправляем сложный запрос (Scenario + Style)...");

        const payload = {
            contents: [{
                parts: [
                    { text: PROMPT },
                    // 1. Сценарий (Скриншот)
                    { inline_data: { mime_type: "image/png", data: scenarioBase64 } },
                    { text: "[INPUT_SCENARIO] Recreate the road scene from this image." },

                    // 2. Стиль
                    { inline_data: { mime_type: "image/jpeg", data: style1Base64 } },
                    { text: "[STYLE_REF_1] Texture and lighting reference." },
                    { inline_data: { mime_type: "image/jpeg", data: style2Base64 } },
                    { text: "[STYLE_REF_2] Vehicle realism reference." }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "2K"
                }
            }
        };

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000
        });

        if (response.data.candidates && response.data.candidates.length > 0) {
            const part = response.data.candidates[0].content.parts[0];
            if (part && part.inlineData && part.inlineData.data) {
                const buffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync(OUTPUT_PATH, buffer);
                console.log(`✅ Изображение сохранено: ${OUTPUT_PATH}`);
            } else {
                console.log("⚠️ Нет данных изображения в ответе.");
                fs.writeFileSync('data/gemini3_cones_error.json', JSON.stringify(response.data, null, 2));
            }
        } else {
            console.error("❌ Пустой ответ API");
        }

    } catch (error) {
        console.error("❌ Ошибка:", error.message);
    }
}

main();
