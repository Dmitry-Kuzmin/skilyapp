const fs = require('fs');
const path = require('path');
const https = require('https');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ==========================================
// 🎨 DGT IMAGE GENERATOR (Batch Mode)
// ==========================================
// Генерирует уникальные изображения для всех вопросов
// используя Gemini Imagen 3, сохраняя external_id
// ==========================================

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Configuration
const CONFIG = {
    outputDir: './data/generated-images',
    checkpointFile: './data/image-gen-checkpoint.json',
    maxRetries: 3,
    delayBetweenImages: 2000, // 2 seconds between generations
    dryRun: process.argv.includes('--dry-run'),
    batchSize: 50, // Save checkpoint every 50 images
};

// Создаем выходные директории
if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}
if (!fs.existsSync(path.join(CONFIG.outputDir, 'originals'))) {
    fs.mkdirSync(path.join(CONFIG.outputDir, 'originals'), { recursive: true });
}

// ==========================================
// HELPER: Download Original Image
// ==========================================
function downloadImage(url, savePath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(savePath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(savePath, () => { });
            reject(err);
        });
    });
}

// ==========================================
// HELPER: Build Intelligent Prompt
// ==========================================
function buildPrompt(question) {
    const questionText = question.question.en || question.question.es;
    const explanation = question.explanation?.en || question.explanation?.es || '';

    // Advanced prompt engineering
    const basePrompt = `Create a highly realistic, photorealistic driving test scenario image from a driver's point of view (POV from inside the car).

SCENE DESCRIPTION:
${questionText}

CONTEXT:
${explanation}

STRICT REQUIREMENTS:
1. PERSPECTIVE: View MUST be from driver's seat looking forward through windshield
2. REALISM: Photo-realistic quality, as if taken with iPhone 15 Pro
3. LIGHTING: Natural daylight, clear visibility, realistic shadows
4. DETAILS: Spanish road infrastructure (EU standard road signs, markings)
5. COMPOSITION: Clean, clear scene that illustrates the question scenario
6. NO TEXT: Do not add any text, numbers or letters to traffic signs (they should be symbol-only or blank)
7. WEATHER: Clear day unless question specifically mentions rain/fog
8. FOCUS: Main subject (intersection, sign, vehicle) should be clearly visible
9. AUTHENTICITY: Real-world driving situation, not staged or artificial
10. SAFETY: Proper Spanish traffic environment (correct lane markings, realistic distances)

STYLE: Professional driving school photography, neutral, educational, clear.`;

    return basePrompt;
}

// ==========================================
// CORE: Generate Image with Gemini
// ==========================================
async function generateImage(question, attempt = 1) {
    const prompt = buildPrompt(question);

    try {
        // Using Gemini's image generation model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        console.log(`   🎨 Attempt ${attempt}: Sending to Gemini Imagen...`);

        const result = await model.generateContent([
            {
                text: `Generate an image based on this: ${prompt}`,
                inlineData: question.originalImageData ? {
                    mimeType: 'image/jpeg',
                    data: question.originalImageData
                } : undefined
            }
        ]);

        // Extract generated image
        const response = await result.response;
        const imageData = response.candidates[0]?.content?.parts[0];

        if (!imageData || !imageData.inlineData) {
            throw new Error('No image data in response');
        }

        return Buffer.from(imageData.inlineData.data, 'base64');

    } catch (error) {
        if (attempt < CONFIG.maxRetries) {
            console.log(`   ⚠️  Error on attempt ${attempt}, retrying...`);
            await new Promise(r => setTimeout(r, 3000 * attempt)); // Exponential backoff
            return generateImage(question, attempt + 1);
        }
        throw error;
    }
}

// ==========================================
// CHECKPOINT SYSTEM
// ==========================================
function loadCheckpoint() {
    if (fs.existsSync(CONFIG.checkpointFile)) {
        return JSON.parse(fs.readFileSync(CONFIG.checkpointFile, 'utf8'));
    }
    return { processed: new Set(), failed: [], stats: { total: 0, success: 0, failed: 0, skipped: 0 } };
}

function saveCheckpoint(checkpoint) {
    fs.writeFileSync(
        CONFIG.checkpointFile,
        JSON.stringify({
            ...checkpoint,
            processed: Array.from(checkpoint.processed)
        }, null, 2)
    );
}

// ==========================================
// MAIN: Process All Questions
// ==========================================
async function processAllQuestions() {
    console.log('🚀 DGT Image Generator - Batch Mode\n');
    console.log(`📁 Output: ${CONFIG.outputDir}`);
    console.log(`💾 Checkpoint: ${CONFIG.checkpointFile}`);
    console.log(`🔄 Dry Run: ${CONFIG.dryRun ? 'YES (no actual generation)' : 'NO'}\n`);

    // Load checkpoint
    const checkpoint = loadCheckpoint();
    const processedSet = new Set(checkpoint.processed || []);

    console.log(`📊 Checkpoint loaded: ${processedSet.size} already processed\n`);

    // Collect all questions from enriched files
    const questions = [];
    const parsedDir = './data/parsed';

    function scanForEnriched(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                scanForEnriched(fullPath);
            } else if (file.endsWith('-enriched.json')) {
                try {
                    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    data.forEach(q => {
                        if (q.external_id && (q.image_url || q.schema_url)) {
                            questions.push({
                                id: q.external_id,
                                question: q.question,
                                explanation: q.explanation,
                                originalUrl: q.image_url || q.schema_url,
                                sourceFile: file
                            });
                        }
                    });
                } catch (e) {
                    console.error(`Error reading ${file}: ${e.message}`);
                }
            }
        }
    }

    scanForEnriched(parsedDir);

    // Filter out already processed
    const toProcess = questions.filter(q => !processedSet.has(q.id));

    console.log(`📋 Total questions found: ${questions.length}`);
    console.log(`✅ Already processed: ${processedSet.size}`);
    console.log(`🎯 To process: ${toProcess.length}\n`);

    if (toProcess.length === 0) {
        console.log('🎉 All images already generated!');
        return;
    }

    // Process each question
    let processedCount = 0;

    for (const question of toProcess) {
        processedCount++;
        const progress = `[${processedCount}/${toProcess.length}]`;

        console.log(`\n${progress} Processing: ${question.id.substring(0, 12)}...`);
        console.log(`   📄 Source: ${question.sourceFile}`);

        const outputPath = path.join(CONFIG.outputDir, `${question.id}.jpg`);
        const originalPath = path.join(CONFIG.outputDir, 'originals', `${question.id}_original.jpg`);

        try {
            // Step 1: Download original
            if (!fs.existsSync(originalPath)) {
                console.log(`   ⬇️  Downloading original...`);
                await downloadImage(question.originalUrl, originalPath);
            }

            // Step 2: Generate new image
            if (CONFIG.dryRun) {
                console.log(`   🔍 DRY RUN: Would generate image here`);
            } else {
                const imageBuffer = await generateImage(question);
                fs.writeFileSync(outputPath, imageBuffer);
                console.log(`   ✅ Generated and saved`);
            }

            // Update checkpoint
            processedSet.add(question.id);
            checkpoint.stats.success++;

            // Save checkpoint every N images
            if (processedCount % CONFIG.batchSize === 0) {
                checkpoint.processed = Array.from(processedSet);
                saveCheckpoint(checkpoint);
                console.log(`\n💾 Checkpoint saved (${processedSet.size} processed)\n`);
            }

            // Rate limiting
            if (!CONFIG.dryRun) {
                await new Promise(r => setTimeout(r, CONFIG.delayBetweenImages));
            }

        } catch (error) {
            console.error(`   ❌ ERROR: ${error.message}`);
            checkpoint.failed.push({ id: question.id, error: error.message });
            checkpoint.stats.failed++;
        }

        checkpoint.stats.total = processedCount;
    }

    // Final checkpoint save
    checkpoint.processed = Array.from(processedSet);
    saveCheckpoint(checkpoint);

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 GENERATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total processed: ${checkpoint.stats.total}`);
    console.log(`✅ Success: ${checkpoint.stats.success}`);
    console.log(`❌ Failed: ${checkpoint.stats.failed}`);
    console.log(`💾 Checkpoint: ${CONFIG.checkpointFile}`);
    console.log('='.repeat(50) + '\n');

    if (checkpoint.failed.length > 0) {
        console.log('Failed items:');
        checkpoint.failed.forEach(f => console.log(`  - ${f.id}: ${f.error}`));
    }
}

// ==========================================
// RUN
// ==========================================
processAllQuestions().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
