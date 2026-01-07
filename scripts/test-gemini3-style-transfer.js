import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

// Пути к файлам (исходник + референсы стиля)
// Тот самый сложный перекресток DGT
const INPUT_LAYOUT_URL = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";

// Твои референсы стиля (из загруженных файлов)
const STYLE_REF_1_PATH = "/Users/dimka/.gemini/antigravity/brain/82d71c89-0324-478c-97fa-e06d37e3f555/uploaded_image_1_1767699559051.jpg";
const STYLE_REF_2_PATH = "/Users/dimka/.gemini/antigravity/brain/82d71c89-0324-478c-97fa-e06d37e3f555/uploaded_image_2_1767699559051.jpg";

const OUTPUT_PATH = "data/gemini3_style_result.jpeg";

const PROMPT = `
STRICT STYLE TRANSFER & RECONSTRUCTION for Driving Education.

TASK:
1.  **GEOMETRY SOURCE:** Use the [INPUT_LAYOUT_IMAGE] legally binding traffic diagram. PRESERVE its exact road layout, lane count, arrow directions, road marking positions, and traffic light states.
2.  **STYLE SOURCE:** Use the [STYLE_REFERENCE_IMAGES]. Adopt their visual aesthetic entirely:
    *   **Realism:** Photorealistic 3D rendering style (NOT cartoon, NOT vector).
    *   **Vehicles:** Replace the simple cars in the layout with HIGH-QUALITY, REALISTIC 3D MODELS matching the style of the references (modern European cars, metallic paint, realistic reflections, glass).
    *   **Environment:** Use the lush green grass, realistic asphalt textures, and lighting from the references.
    *   **Lighting:** Bright, sunny, high-contrast lighting with realistic shadows.

CRITICAL ORIENTATION RULES (MUST FOLLOW):
*   **PRESERVE VEHICLE FACING DIRECTION:** Do NOT rotate cars.
*   **CENTRAL BLUE CAR:** The blue car in the middle lane is STOPPED at a red light. It is facing AWAY from the camera. **YOU MUST GENERATE THE REAR VIEW OF THIS CAR (Taillights visible, NOT headlights).**
*   **RED & GREEN VANS (Bottom):** Facing AWAY from camera (Rear view).
*   **BUS & BROWN VAN (Right):** Moving left-to-right (Side profile).

CRITICAL CONSTRAINTS:
*   **DO NOT CHANGE THE ROAD LAYOUT.** The white arrows on the asphalt MUST point the same way as in the [INPUT_LAYOUT_IMAGE].
*   **DO NOT CHANGE THE TRAFFIC SITUATION.** Cars must be in the exact same positions. Traffic lights must show the same colors.
*   **SPANISH DGT STANDARDS:** Ensure road markings are WHITE. Traffic signs must be standard European/Spanish.

OUTPUT: A merger of the DGT layout with the high-end 3D style of the references.
`;

async function getBase64FromUrl(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data).toString('base64');
}

async function getBase64FromFile(path) {
    return fs.readFileSync(path).toString('base64');
}

async function main() {
    if (!API_KEY) {
        console.error("❌ GEMINI_API_KEY не найден");
        process.exit(1);
    }

    console.log("🚀 Gemini 3 Pro: Style Transfer Mode...");

    try {
        // 1. Подготовка изображений
        console.log("📥 Загружаем исходник DGT...");
        const layoutBase64 = await getBase64FromUrl(INPUT_LAYOUT_URL);

        console.log("🎨 Загружаем референсы стиля...");
        let style1Base64, style2Base64;
        try {
            style1Base64 = await getBase64FromFile(STYLE_REF_1_PATH);
            style2Base64 = await getBase64FromFile(STYLE_REF_2_PATH);
        } catch (e) {
            console.error("⚠️ Не удалось загрузить локальные файлы стиля. Проверьте пути.", e.message);
            // Фалбэк, если файлов нет (для теста используем URL или пропускаем)
            process.exit(1);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${API_KEY}`;

        console.log("📤 Отправляем запрос (Layout + 2 Style Refs)...");

        const payload = {
            contents: [{
                parts: [
                    { text: PROMPT },
                    // INPUT LAYOUT (Геометрия)
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: layoutBase64
                        }
                    },
                    { text: "[INPUT_LAYOUT_IMAGE] Above is the strict geometry source." },

                    // STYLE REFERENCE 1
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: style1Base64
                        }
                    },
                    { text: "[STYLE_REFERENCE_IMAGE 1] Use this visual style." },

                    // STYLE REFERENCE 2
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: style2Base64
                        }
                    },
                    { text: "[STYLE_REFERENCE_IMAGE 2] Use this for vehicle realism and environment." }
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

        console.log("✨ Ответ получен!");

        if (response.data.candidates && response.data.candidates.length > 0) {
            const part = response.data.candidates[0].content.parts[0];
            if (part && part.inlineData && part.inlineData.data) {
                const buffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync(OUTPUT_PATH, buffer);
                console.log(`✅ Изображение сохранено: ${OUTPUT_PATH}`);
            } else {
                // Если данные не в inlineData (иногда формат отличается), сохраним JSON
                fs.writeFileSync('data/gemini3_style_debug.json', JSON.stringify(response.data, null, 2));
                console.log("⚠️ Изображение не найдено в стандартном поле. JSON сохранен в data/gemini3_style_debug.json для анализа.");
            }
        } else {
            console.error("❌ Пустой ответ:", JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.error("❌ Ошибка:", error.message);
        if (error.response) console.error("Детали:", JSON.stringify(error.response.data, null, 2));
    }
}

main();
