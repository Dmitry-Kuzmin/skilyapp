import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function main() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    try {
        const response = await axios.get(url);
        const models = response.data.models;
        console.log("Available Models:");
        models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
