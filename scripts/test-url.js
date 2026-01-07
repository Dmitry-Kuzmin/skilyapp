
import axios from "axios";
import dotenv from "dotenv";
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash-exp";
const TEST_URL = "https://teorica.practicavial.com/question/65645c68-586d-4de6-9216-a3e6dda3bdba-1650648930-i.jpg";

async function testUrlInput() {
    console.log("🧪 Testing Direct URL Input to Gemini API...");
    console.log("🔗 URL:", TEST_URL);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    const payload = {
        contents: [{
            parts: [
                { text: `What exactly do you see in this image? Describe it in detail. URL: ${TEST_URL}` }
            ]
        }]
    };

    try {
        const response = await axios.post(url, payload);
        const answer = response.data.candidates[0].content.parts[0].text;

        console.log("\n🤖 Response:");
        console.log(answer);

        if (answer.toLowerCase().includes("cannot") || answer.toLowerCase().includes("cant") || answer.toLowerCase().includes("sorry")) {
            console.log("\n❌ FAIL: Model cannot access URL directly.");
        } else if (answer.toLowerCase().includes("road") || answer.toLowerCase().includes("car") || answer.toLowerCase().includes("traffic")) {
            console.log("\n✅ SUCCESS: Model CAN see the image!");
        } else {
            console.log("\n❓ UNKNOWN: Need manual verification.");
        }

    } catch (error) {
        console.error("❌ API Error:", error.response ? error.response.data : error.message);
    }
}

testUrlInput();
