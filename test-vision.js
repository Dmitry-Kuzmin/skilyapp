
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(key);

async function testVision() {
    try {
        console.log("Testing vision with gemini-3.1-flash-lite-preview...");
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

        // We need a dummy image. I'll use a small one if it exists or just skip the image part and see if it errors on prompt.
        // Actually, let's use a real image from the project.
        const imagePath = './data/originals/topic-01_test-003/c4ddf3d8-197c-440d-a046-e1e56428c0e3_original.jpg';
        if (fs.existsSync(imagePath)) {
            const imageData = fs.readFileSync(imagePath);
            const result = await model.generateContent([
                "What is in this image?",
                {
                    inlineData: {
                        data: imageData.toString('base64'),
                        mimeType: 'image/jpeg'
                    }
                }
            ]);
            console.log("Response:", result.response.text());
        } else {
            console.log("No test image found at", imagePath);
        }
    } catch (e) {
        console.error("Lite Vision failed:", e.message);
    }
}

testVision();
