
const { VertexAI } = require('@google-cloud/vertexai');
const project = 'gen-lang-client-0120490543';
const location = 'us-central1';
const keyFilename = './google-services.json';

async function list() {
    const vertexAI = new VertexAI({ project, location, keyFilename });
    const model = vertexAI.preview.getGenerativeModel({ model: 'gemini-1.5-flash-001' });
    console.log("Checking specific connection...");
    try {
        await model.generateContent("test");
        console.log("Connection OK.");
    } catch (e) {
        console.log("Connection Err:", e.message);
    }
}
list();
