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

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function compressAndResize(imageUrl, outputPath) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        await sharp(buffer).resize({ width: 1024, withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(outputPath);
        return outputPath;
    } catch (error) { return null; }
}

async function getBase64FromFile(filePath) {
    try { return fs.readFileSync(filePath).toString('base64'); } catch (error) { return null; }
}

async function inspectImage(compressedImagePath) {
    const imageBase64 = await getBase64FromFile(compressedImagePath);
    if (!imageBase64) return null;
    const prompt = `
    DETECT 3D OBJECTS ONLY. 
    - List any cars (color, position).
    - List any animals or people.
    - Describe the horizon (mountains, city, trees).
    STRICT: Categorically ignore any icons, bicycles, or text painted on the ground.
    `;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;
    try {
        const response = await axios.post(url, { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] }] });
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) { return "Vision failed."; }
}

async function createDirectorPrompt(evidence) {
    return `
    A hyper-realistic cinematic photograph of a vast, empty landscape. 
    Natural outdoor overcast lighting.
    
    GROUND:
    - A smooth, solid, uniform dark gray mineral surface with subtle realistic texture. 
    - The surface is slightly damp, showing faint reflections of the sky. 
    - It is COMPLETELY CLEAN and SOLID. No patterns, no drawings.
    - Only one thin, crisp, white dashed line is present in the center.
    
    COMPOSITION:
    ${evidence}
    
    STYLE:
    - National Geographic photography style. 
    - High-end camera lens (35mm), deep depth of field. 
    - NO man-made poles, NO signs, NO artificial markers.
    - Pure nature meeting a clean gray foundation.
    `;
}

async function generateImageImagen4(finalPrompt, questionId) {
    const { PredictionServiceClient } = await import('@google-cloud/aiplatform');
    const { helpers } = await import('@google-cloud/aiplatform');
    const client = new PredictionServiceClient({ apiEndpoint: 'us-central1-aiplatform.googleapis.com' });
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'erudite-stratum-483717-e4';
    const endpoint = `projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-002`;

    const instance = helpers.toValue({ prompt: finalPrompt });
    const parameters = helpers.toValue({
        sampleCount: 1,
        aspectRatio: "16:9",
        outputMimeType: "image/jpeg",
        // ГИПЕР-ЗАПРЕТ: вырезаем все упоминания велосипедов и дорожных штук
        negativePrompt: "bicycle, cycle, park, lane, sign, pole, arrow, text, symbol, icon, drawing, painting, graffiti, letters, numbers, logo, bike, bicycle lane, bicycle symbol, road infrastructure, urban elements"
    });

    try {
        const [response] = await client.predict({ endpoint, instances: [instance], parameters });
        if (!response.predictions || !response.predictions[0]) return null;
        const prediction = helpers.fromValue(response.predictions[0]);
        const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
        const outputPath = path.join(OUTPUT_DIR, `q${questionId}_v42.jpeg`);
        fs.writeFileSync(outputPath, imageBuffer);
        return outputPath;
    } catch (error) { return null; }
}

async function main() {
    const rawData = fs.readFileSync(QUESTIONS_FILE);
    const questions = JSON.parse(rawData).flat();

    // Новая порция из 5 картинок: Q21, Q22, Q23, Q24, Q25
    const targets = [21, 22, 23, 24, 25];

    for (const id of targets) {
        console.log(`\n🚦 МАГИЧЕСКАЯ ГЕНЕРАЦИЯ #${id} (V42 - Текстурная защита)...`);
        const q = questions.find(item => item.question_number === id);
        if (!q) continue;

        const srcPath = path.join(TEMP_DIR, `q${id}_v42_src.jpg`);
        const compressed = await compressAndResize(q.image_url || q.schema_url, srcPath);

        if (compressed) {
            const evidence = await inspectImage(compressed);
            const finalPrompt = await createDirectorPrompt(evidence);
            console.log(`   --- PROMPT for #${id} ---`);
            console.log(finalPrompt);
            const result = await generateImageImagen4(finalPrompt, id);
            if (result) console.log(`   ✅ Успешно: q${id}_v42.jpeg`);
        }

        console.log("   ⏳ Пауза 45с...");
        await new Promise(r => setTimeout(r, 45000));
    }
}
main();
