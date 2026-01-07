import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

const PROMPT = `Transform this Spanish DGT driving exam image into a clean 3D educational simulator style.

CRITICAL: PRESERVE EXACTLY (do not change):
- All road marking positions and types
- All traffic sign positions and symbols  
- All traffic light positions and colors
- All arrow directions on road
- All vehicle positions
- Overall scene layout

ONLY IMPROVE:
- Visual style to clean 3D simulator
- Colors to vibrant and clear
- Textures to smooth and modern
- Lighting to bright Spanish daylight
- Remove noise and artifacts

Use WHITE road markings (Spanish DGT standard), European traffic signs, Mediterranean architecture.`;

async function main() {
    if (!API_KEY) {
        console.error("❌ GEMINI_API_KEY не найден");
        process.exit(1);
    }

    const INPUT_URL = "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/6e09acc30f92b9b0bb1955352b89fbf6.jpg";
    const OUTPUT_PATH = "data/gemini_restyle_result.png";

    console.log("🚀 Gemini 2.5 Flash Image (Restyle)...");

    try {
        // Скачиваем оригинал
        console.log("📥 Скачиваем оригинал...");
        const imageResponse = await axios.get(INPUT_URL, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        console.log("📤 Отправляем в gemini-2.5-flash-image...");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [{
                parts: [
                    { text: PROMPT },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }]
        });

        console.log("✨ Ответ получен!");

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                const buffer = Buffer.from(imageData, 'base64');
                fs.writeFileSync(OUTPUT_PATH, buffer);
                console.log(`✅ Рестайлинг завершен: ${OUTPUT_PATH}`);
            } else if (part.text) {
                console.log("📝 Текст от модели:", part.text);
            }
        }

    } catch (error) {
        console.error("❌ Ошибка:", error.message);
        if (error.response) {
            console.error("Детали:", error.response.data);
        }
    }
}

main();
