
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'gen-lang-client-0120490543';
const LOCATION = 'us-central1';

const vertexAI = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION,
    keyFilename: './google-services.json'
});

async function listModels() {
    try {
        // Vertex AI doesn't have a simple "list models" in the nodejs SDK high level client easily accessible (?)
        // Actually it's often done via model garden or REST. 
        // Let's try to just instantiate a known model and run a dummy prompt.

        const modelsToTry = [
            'gemini-1.5-flash-001',
            'gemini-1.5-pro-001',
            'gemini-1.0-pro-001',
            'gemini-1.0-pro',
            'gemini-pro',
            'publishers/google/models/gemini-1.5-flash-001'
        ];

        console.log(`Checking models in ${LOCATION}...`);

        for (const modelName of modelsToTry) {
            try {
                process.stdout.write(`Testing ${modelName}... `);
                const model = vertexAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: 'Hi' }] }]
                });
                const response = await result.response;
                console.log(`✅ SUCCESS!`);
                return; // Stop after first success
            } catch (e) {
                console.log(`❌ Fail: ${e.message.split(' ').slice(0, 10).join(' ')}...`);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

listModels();
