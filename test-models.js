
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(key);

async function test() {
    try {
        console.log("Testing gemini-3.1-flash-lite-preview...");
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
        const result = await model.generateContent("Say hello");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Lite failed:", e.message);
    }

    try {
        console.log("Testing gemini-3.1-flash-image-preview...");
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: "A simple red triangle" }] }],
            generationConfig: {
                responseModalities: ['Image']
            }
        });
        const imageData = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (imageData) {
            console.log("Image data received!");
        } else {
            console.log("No image data in response.");
        }
    } catch (e) {
        console.error("Image failed:", e.message);
    }
}

test();
