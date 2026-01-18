/**
 * ========================================
 * VALIDATOR SERVER - Backend для UI
 * ========================================
 * 
 * API для работы с генерированными изображениями:
 * - GET /api/images - получить список для валидации
 * - POST /api/decisions - сохранить решения
 * - POST /api/regenerate - отметить для перегенерации
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { processImageForUpload } from './scripts/utils/image-processor.js';

dotenv.config();

console.log('Loading .env...');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Supabase Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
    console.error('Available Environment Variables:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
}

const supabase = createClient(supabaseUrl, supabaseKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3030;

// ===========================================
// 🛡️ АБСОЛЮТНО ПЕРВЫЙ MIDDLEWARE: CORS + LOGGING
// ===========================================
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const method = req.method;
    const url = req.url;

    console.log(`[REQ] ${method} ${url} | Origin: ${origin || 'none'}`);

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, Cache-Control');
    // res.setHeader('Access-Control-Allow-Credentials', 'true'); // Temporarily disabled for simplicity
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Специальная обработка OPTIONS
    if (method === 'OPTIONS') {
        console.log(`[OPT] Responding 200 to Preflight`);
        return res.status(200).end();
    }

    next();
});

app.use(express.json());

// CRITICAL: Set MIME types BEFORE serving static files
app.use((req, res, next) => {
    if (req.path.endsWith('.ts') || req.path.endsWith('.tsx')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (req.path.endsWith('.txt')) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
    next();
});

// Route for the dashboard (BEFORE static files to prevent index.html override)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard-v2.html'));
});

// Serve static files AFTER routes and MIME middleware
app.use(express.static('.'));

// EXPLICIT: Serve generated images under /generated-images URL
app.use('/generated-images', express.static('data/generated-images'));

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================
const CONFIG = {
    generatedDir: './data/generated-images',
    originalsDir: './data/originals', // Fixed path
    parsedDir: './data/parsed',
    decisionsFile: './data/validation-decisions.json',
};

// Track active generation process for kill functionality
let activeGenerationProcess = null;

// ==========================================
// LOAD QUESTIONS DATA
// ==========================================
async function loadQuestionData() {
    const questionsMap = new Map(); // external_id -> question_data

    async function scanEnrichedFiles(dir) {
        try {
            const files = await fs.readdir(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory()) {
                    await scanEnrichedFiles(fullPath);
                } else if (file.endsWith('-enriched.json')) {
                    try {
                        const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
                        data.forEach(q => {
                            if (q.external_id) {
                                questionsMap.set(q.external_id, {
                                    question_es: q.question?.es || '',
                                    question_ru: q.question?.ru || '',
                                    question_en: q.question?.en || '',
                                    originalUrl: q.image_url || q.schema_url,
                                    sourceFile: file
                                });
                            }
                        });
                    } catch (e) {
                        console.error(`Error reading ${file}:`, e.message);
                    }
                }
            }
        } catch (e) {
            console.error(`Error scanning ${dir}:`, e.message);
        }
    }

    await scanEnrichedFiles(CONFIG.parsedDir);
    return questionsMap;
}

// ==========================================
// LOAD DECISIONS (Previous validations)
// ==========================================
async function loadDecisions() {
    try {
        const data = await fs.readFile(CONFIG.decisionsFile, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { approved: [], rejected: [], toRegenerate: [] };
    }
}

async function saveDecisions(decisions) {
    await fs.writeFile(CONFIG.decisionsFile, JSON.stringify(decisions, null, 2));
}

// ==========================================
// HELPER: Build File Tree
// ==========================================
async function buildFileTree() {
    const tree = {};

    // Load checkpoint to know what's generated
    let generatedIds = new Set();
    try {
        const checkpoint = JSON.parse(await fs.readFile('./data/image-gen-checkpoint.json', 'utf8'));
        generatedIds = new Set(checkpoint.processed || []);
    } catch (e) { }

    async function scanDirectory(dir, category) {
        try {
            const files = await fs.readdir(dir);
            const testsMap = new Map(); // Use map to deduplicate (enriched vs raw)

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory()) {
                    continue;
                }

                // Check for test files
                const isEnriched = file.endsWith('-enriched.json');
                const isRaw = !isEnriched && file.endsWith('.json') && file.includes('test-');

                if (isEnriched || isRaw) {
                    const testId = file.replace('-enriched.json', '').replace('.json', '');

                    // Prefer enriched if we already found this test
                    if (testsMap.has(testId) && !isEnriched) continue;

                    try {
                        const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));

                        // Check if all questions in this test are generated
                        // For raw files, we assume nothing is generated yet naturally, or need ID extraction
                        let allGenerated = false;
                        if (isEnriched) {
                            allGenerated = data.every(q => q.external_id && generatedIds.has(q.external_id));
                        }

                        testsMap.set(testId, {
                            id: testId,
                            name: testId.replace(/_/g, ' ').replace('test-', 'Test '),
                            questionCount: data.length,
                            generated: allGenerated,
                            filePath: fullPath,
                            isEnriched: isEnriched // Flag for frontend
                        });
                    } catch (e) {
                        console.error(`Error parsing ${file}:`, e.message);
                    }
                }
            }

            return Array.from(testsMap.values()).sort((a, b) => a.id.localeCompare(b.id));
        } catch (e) {
            return [];
        }
    }

    // Scan each category
    const categories = await fs.readdir(CONFIG.parsedDir);
    for (const category of categories) {
        const categoryPath = path.join(CONFIG.parsedDir, category);
        const stat = await fs.stat(categoryPath);
        if (stat.isDirectory()) {
            tree[category] = await scanDirectory(categoryPath, category);
        }
    }

    return tree;
}

// ==========================================
// API: GET FILE TREE
// ==========================================
app.get('/api/files/tree', async (req, res) => {
    try {
        const tree = await buildFileTree();
        res.json(tree);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API: GET IMAGES FOR VALIDATION
// ==========================================
app.get('/api/images', async (req, res) => {
    try {
        console.log('📡 API request: /api/images');

        // Load question data
        const questionsMap = await loadQuestionData();
        console.log(`✅ Loaded ${questionsMap.size} questions`);

        // Load previous decisions
        const decisions = await loadDecisions();
        const processedIds = new Set([
            ...decisions.approved,
            ...decisions.rejected,
            ...decisions.toRegenerate.map(r => r.id)
        ]);

        // Scan generated images RECURSIVELY
        async function scanImages(dir) {
            let results = [];
            const list = await fs.readdir(dir, { withFileTypes: true });

            for (const dirent of list) {
                const res = path.resolve(dir, dirent.name);
                if (dirent.isDirectory()) {
                    results = results.concat(await scanImages(res));
                } else if (res.endsWith('.png') || res.endsWith('.jpg')) {
                    // Сохраняем относительный путь для URL, например 'topic-01/123.png'
                    const relativePath = path.relative(CONFIG.generatedDir, res);
                    if (!relativePath.includes('originals')) { // Игнорируем папку originals если она там есть
                        results.push(relativePath);
                    }
                }
            }
            return results;
        }

        const imageFiles = await scanImages(CONFIG.generatedDir);
        console.log(`🖼️  Found ${imageFiles.length} generated images in subfolders`);

        // Build response array
        const images = [];

        for (const relativePath of imageFiles) {
            const filename = path.basename(relativePath);
            const externalId = filename.replace(/\.(png|jpg)$/, '');
            const subfolder = path.dirname(relativePath); // 'topic-01' or '.'

            // Skip already processed
            if (processedIds.has(externalId)) {
                continue;
            }

            const questionData = questionsMap.get(externalId);

            if (questionData) {
                // Construct original URL correctly
                // relativePath like "topic-01_test-001/abc123.png"
                const testFolder = subfolder === '.' ? '' : subfolder;

                images.push({
                    id: externalId,
                    folder: testFolder, // Add folder for filtering
                    generatedUrl: `/data/generated-images/${relativePath}`,
                    originalUrl: testFolder ? `/data/originals/${testFolder}/${externalId}_original.jpg` : null,
                    question: questionData.question_ru || questionData.question_es,
                    sourceFile: questionData.sourceFile
                });
            }
        }

        console.log(`✅ Prepared ${images.length} images for validation`);

        // Support filter by folder
        const folderFilter = req.query.folder;
        const filteredImages = folderFilter
            ? images.filter(img => img.folder === folderFilter)
            : images;

        res.json({
            images: filteredImages,
            stats: {
                total: imageFiles.length,
                pending: images.length,
                approved: decisions.approved.length,
                rejected: decisions.rejected.length,
                toRegenerate: decisions.toRegenerate.length
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API: SAVE SINGLE DECISION
// ==========================================
app.post('/api/decision', async (req, res) => {
    try {
        const { id, action, additionalPrompt } = req.body;

        if (!id || !action) {
            return res.status(400).json({ error: 'Missing id or action' });
        }

        const decisions = await loadDecisions();

        // Remove from all lists first
        decisions.approved = decisions.approved.filter(i => i !== id);
        decisions.rejected = decisions.rejected.filter(i => i !== id);
        decisions.toRegenerate = decisions.toRegenerate.filter(r => r.id !== id);

        // Add to appropriate list
        switch (action) {
            case 'approve':
                decisions.approved.push(id);
                console.log(`✅ Approved: ${id.substring(0, 12)}...`);
                break;
            case 'reject':
                decisions.rejected.push(id);
                console.log(`❌ Rejected: ${id.substring(0, 12)}...`);
                break;
            case 'regenerate':
                decisions.toRegenerate.push({ id, additionalPrompt: additionalPrompt || '' });
                console.log(`🔄 To Regenerate: ${id.substring(0, 12)}...`);
                break;
        }

        await saveDecisions(decisions);

        res.json({ success: true, decisions });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API: GET CURRENT STATS
// ==========================================
app.get('/api/stats', async (req, res) => {
    try {
        const decisions = await loadDecisions();

        res.json({
            approved: decisions.approved.length,
            rejected: decisions.rejected.length,
            toRegenerate: decisions.toRegenerate.length
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// GENERATION CONTROL STATE
// ==========================================

let generationProcess = null;
let generationStats = {
    isRunning: false,
    progress: { current: 0, total: 0 },
    latestLog: null
};

// ==========================================
// API: DASHBOARD STATS
// ==========================================
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        // Load question data
        const questionsMap = await loadQuestionData();

        // Load checkpoint for generated count
        let generatedCount = 0;
        try {
            const checkpoint = JSON.parse(await fs.readFile('./data/image-gen-checkpoint.json', 'utf8'));
            generatedCount = checkpoint.processed ? checkpoint.processed.length : 0;
        } catch (e) { }

        // Load decisions
        const decisions = await loadDecisions();
        const validatedCount = decisions.approved.length + decisions.rejected.length;

        res.json({
            totalQuestions: questionsMap.size,
            generatedImages: generatedCount,
            validatedImages: validatedCount,
            pendingImages: Math.max(0, questionsMap.size - generatedCount),
            validated: {
                approved: decisions.approved.length,
                rejected: decisions.rejected.length,
                toRegenerate: decisions.toRegenerate.length
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API: START GENERATION
// ==========================================
app.post('/api/generate/start', async (req, res) => {
    try {
        if (generationProcess) {
            return res.json({ success: false, error: 'Generation already running' });
        }

        const { limit } = req.body;

        const args = ['scripts/generate-images-batch.js'];
        if (limit && limit > 0) {
            args.push('--limit=' + limit);
        }

        generationProcess = spawn('node', args, {
            cwd: process.cwd()
        });

        generationStats.isRunning = true;
        generationStats.progress = { current: 0, total: limit || 0 };

        generationProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output);

            // Parse progress
            const match = output.match(/\[(\d+)\/(\d+)\]/);
            if (match) {
                generationStats.progress.current = parseInt(match[1]);
                generationStats.progress.total = parseInt(match[2]);
            }

            generationStats.latestLog = output.trim().split('\n').pop();
        });

        generationProcess.stderr.on('data', (data) => {
            console.error('ERR:', data.toString());
        });

        generationProcess.on('close', (code) => {
            console.log(`Generation process exited with code ${code}`);
            generationStats.isRunning = false;
            generationProcess = null;
        });

        res.json({ success: true, message: 'Generation started' });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// API: GET GENERATION STATUS
// ==========================================
// Get full details for a single question from local JSON data
app.get('/api/question/details/:id', async (req, res) => {
    try {
        const { id } = req.params; // e.g. topic-01_test-017_q-1
        const parts = id.split('_');
        if (parts.length < 2) throw new Error('Invalid ID format');

        const topic = parts[0];
        const testMatch = id.match(/test-\d+/);
        const test = testMatch ? testMatch[0] : null;

        if (!topic || !test) throw new Error('Could not parse topic/test from ID');

        const filePath = path.join(process.cwd(), 'data', 'parsed', topic, `${topic}_${test}-enriched.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Find the specific question
        const question = data.questions.find(q => q.external_id === id);
        if (!question) throw new Error('Question not found in local JSON');

        // Look for generated image in standard folder
        const generatedFileName = `${id}.png`;
        const generatedPath = `data/generated-images/${generatedFileName}`;
        let hasGenerated = false;
        try {
            await fs.access(path.join(process.cwd(), generatedPath));
            hasGenerated = true;
        } catch (e) { }

        res.json({
            id,
            prompt: question.ai_prompt || question.prompt_en || "",
            originalImage: question.image_path || question.image_url_original || null,
            generatedUrl: hasGenerated ? `http://localhost:3030/${generatedPath}` : null,
            localPath: generatedPath
        });

    } catch (error) {
        console.error('Error fetching question details:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/generate/status', (req, res) => {
    res.json(generationStats);
});

// ==========================================
// API: STOP GENERATION
// ==========================================
app.post('/api/generate/stop', (req, res) => {
    if (generationProcess) {
        generationProcess.kill();
        generationProcess = null;
        generationStats.isRunning = false;
        res.json({ success: true });
    } else {
        res.json({ success: false, error: 'No generation running' });
    }
});

// ==========================================
// API: CONTINUE GENERATION (after review)
// ==========================================
app.post('/api/generation/continue', async (req, res) => {
    try {
        // Create flag file to signal generator to continue
        await fs.writeFile('./data/continue-generation.flag', 'true');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// ==========================================
// API: GENERATE SPECIFIC TEST
// ==========================================
app.post('/api/generate/test', async (req, res) => {
    try {
        if (generationProcess) {
            return res.json({ success: false, error: 'Generation already running' });
        }

        const { category, testId } = req.body;
        const testPath = path.join(CONFIG.parsedDir, category, testId + '-enriched.json');

        // Read test file to get external_ids
        const testData = JSON.parse(await fs.readFile(testPath, 'utf8'));
        const externalIds = testData.filter(q => q.external_id).map(q => q.external_id);

        // Create temp file with IDs to generate
        const tempFile = './data/temp-generation-ids.json';
        await fs.writeFile(tempFile, JSON.stringify(externalIds));

        generationProcess = spawn('node', ['scripts/generate-images-batch.js', `--ids-file=${tempFile}`], {
            cwd: process.cwd()
        });

        generationStats.isRunning = true;
        generationStats.progress = { current: 0, total: externalIds.length };

        generationProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output);

            const match = output.match(/\[(\d+)\/(\d+)\]/);
            if (match) {
                generationStats.progress.current = parseInt(match[1]);
                generationStats.progress.total = parseInt(match[2]);
            }

            generationStats.latestLog = output.trim().split('\n').pop();
        });

        generationProcess.on('close', (code) => {
            generationStats.isRunning = false;
            generationProcess = null;
            // Cleanup temp file
            fs.unlink(tempFile).catch(() => { });
        });

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// API: GENERATE ENTIRE CATEGORY
// ==========================================
app.post('/api/generate/category', async (req, res) => {
    try {
        if (generationProcess) {
            return res.json({ success: false, error: 'Generation already running' });
        }

        const { category } = req.body;
        const categoryPath = path.join(CONFIG.parsedDir, category);

        // Collect all external_ids from category
        const files = await fs.readdir(categoryPath);
        const allIds = [];

        for (const file of files) {
            if (file.endsWith('-enriched.json')) {
                const data = JSON.parse(await fs.readFile(path.join(categoryPath, file), 'utf8'));
                data.forEach(q => {
                    if (q.external_id) allIds.push(q.external_id);
                });
            }
        }

        // Create temp file
        const tempFile = './data/temp-generation-ids.json';
        await fs.writeFile(tempFile, JSON.stringify([...new Set(allIds)])); // Deduplicate

        generationProcess = spawn('node', ['scripts/generate-images-batch.js', `--ids-file=${tempFile}`], {
            cwd: process.cwd()
        });

        generationStats.isRunning = true;
        generationStats.progress = { current: 0, total: allIds.length };

        generationProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output);

            const match = output.match(/\[(\d+)\/(\d+)\]/);
            if (match) {
                generationStats.progress.current = parseInt(match[1]);
                generationStats.progress.total = parseInt(match[2]);
            }

            generationStats.latestLog = output.trim().split('\n').pop();
        });

        generationProcess.on('close', (code) => {
            generationStats.isRunning = false;
            generationProcess = null;
            fs.unlink(tempFile).catch(() => { });
        });

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ==========================================
// API: RUN BATCH ENRICHMENT
// ==========================================
app.post('/api/enrich/all', async (req, res) => {
    try {
        console.log('[API] Starting Batch Enrichment...');

        const enrichProcess = spawn('node', ['scripts/run-enrichment-all.js'], {
            cwd: process.cwd(),
            stdio: 'inherit' // Pipe output to server console for now
        });

        enrichProcess.on('close', (code) => {
            console.log(`[Enrichment] Process finished with code ${code}`);
        });

        res.json({ success: true, message: "Enrichment started in background" });
    } catch (error) {
        console.error('[API] Enrichment Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// API: GENERATE SINGLE QUESTION IMAGE
// ==========================================
app.post('/api/generate/single', async (req, res) => {
    try {
        const { questionId, testId, category, customPrompt, userInstruction } = req.body;

        if (!questionId || !testId || !category) {
            return res.status(400).json({
                success: false,
                error: "Missing required parameters: questionId, testId, category"
            });
        }

        console.log(`[Generate Single] QuestionID: ${questionId}, Test: ${testId}`);
        if (customPrompt) console.log(`[Generate Single] Using custom prompt provided by user`);
        if (userInstruction) console.log(`[Generate Single] Providing user instruction: "${userInstruction}"`);

        // Extract UUID from questionId if it's in format topic-01_test-001_UUID
        const uuid = questionId.includes('_') ? questionId.split('_').pop() : questionId;

        // Path to enriched JSON
        const testPath = path.join(CONFIG.parsedDir, category, testId + '-enriched.json');

        // Read test file
        const testFileContent = await fs.readFile(testPath, 'utf8');
        const testData = JSON.parse(testFileContent);

        // Find question
        const question = testData.find(q => (q.external_id || q.id) === uuid);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: `Question ${uuid} not found in ${testId}`
            });
        }

        // Generate output directory for this test
        const outputDir = path.join('data', 'generated-images', testId);
        await fs.mkdir(outputDir, { recursive: true });

        // Check if image already exists and archive it
        const existingImagePath = path.join(outputDir, `${uuid}.png`);
        try {
            await fs.access(existingImagePath);
            // Image exists - move to rejected folder
            const rejectedDir = path.join('data', 'rejected-images', testId);
            await fs.mkdir(rejectedDir, { recursive: true });

            const timestamp = Date.now();
            const rejectedPath = path.join(rejectedDir, `${uuid}_rejected_${timestamp}.png`);

            await fs.rename(existingImagePath, rejectedPath);
            console.log(`[Generate Single] ♻️  Archived old image to: ${rejectedPath}`);
        } catch (e) {
            // Image doesn't exist - no need to archive
            console.log(`[Generate Single] No existing image to archive`);
        }

        // Create a temp JSON with just this question
        const tempQuestionFile = path.join(outputDir, `temp-${uuid}.json`);

        // Add testId AND custom_prompt/instruction to the question object
        const questionWithParams = {
            ...question,
            testId,
            custom_prompt: customPrompt,
            user_instruction: userInstruction // Pass instruction to script
        };

        await fs.writeFile(tempQuestionFile, JSON.stringify([questionWithParams], null, 2));

        console.log(`[Generate Single] Starting Gemini generation for ${uuid}...`);

        // Run generation script
        const genProcess = spawn('node', [
            'scripts/generate-images-batch.js',
            tempQuestionFile
        ], {
            cwd: process.cwd(),
            stdio: 'pipe'
        });

        // Track the active process for stop functionality
        activeGenerationProcess = genProcess;

        let output = '';
        let errorOutput = '';

        genProcess.stdout.on('data', (data) => {
            const chunk = data.toString();
            output += chunk;
            console.log(`[Gemini] ${chunk.trim()}`);
        });

        genProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error(`[Gemini Error] ${data.toString()}`);
        });

        genProcess.on('close', async (code) => {
            // Clear active process reference
            activeGenerationProcess = null;

            // Cleanup temp file
            try {
                await fs.unlink(tempQuestionFile);
            } catch (e) {
                // Ignore cleanup errors
            }

            if (code !== 0) {
                console.error(`[Generate Single] Process exited with code ${code}`);
            } else {
                console.log(`[Generate Single] ✅ Generation completed for ${uuid}`);
            }
        });

        // Don't wait for completion - return immediately so UI can poll
        res.json({
            success: true,
            message: 'Generation started in background',
            questionId: uuid
        });

    } catch (error) {
        console.error('[Generate Single] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================
// NEW: Get questions list for a test (from local JSON)
// ========================================
// ========================================
// NEW: Get questions list for a test (from local JSON)
// ========================================
app.get('/api/test/:testId/questions', async (req, res) => {
    try {
        const { testId } = req.params; // e.g. topic-01_test-017
        const parts = testId.split('_');
        if (parts.length < 2) throw new Error('Invalid test ID format');

        const topic = parts[0];
        const testMatch = testId.match(/test-\d+/);
        const test = testMatch ? testMatch[0] : null;

        if (!topic || !test) throw new Error('Could not parse topic/test from ID');

        const parsedTopicDir = path.join(process.cwd(), 'data', 'parsed', topic);
        const enrichedPath = path.join(parsedTopicDir, `${topic}_${test}-enriched.json`);
        const rawPath = path.join(parsedTopicDir, `${topic}_${test}.json`);

        let questions = [];
        let isEnriched = false;

        // Try enriched first
        try {
            const content = await fs.readFile(enrichedPath, 'utf-8');
            questions = JSON.parse(content);
            isEnriched = true;
        } catch (e) {
            // Fallback to raw
            try {
                const content = await fs.readFile(rawPath, 'utf-8');
                questions = JSON.parse(content);
                isEnriched = false;
            } catch (err) {
                throw new Error('Test file not found (checked enriched and raw)');
            }
        }

        if (!Array.isArray(questions)) {
            throw new Error('Invalid JSON structure - expected array');
        }

        // Return list of questions with status
        const questionsList = await Promise.all(questions.map(async (q, index) => {
            // Synthesize ID if missing (for raw files)
            let uuid = q.external_id || q.id;

            if (!uuid && q.image_url) {
                // Try to extract from URL: .../question/UUID-timestamp...
                const match = q.image_url.match(/\/question\/([a-f0-9-]{36})/);
                if (match) uuid = match[1];
            }

            // Fallback if regex fails
            if (!uuid) {
                uuid = `${testId}_q${index + 1}`;
            }

            // Check local file existence
            const localPath = path.join(process.cwd(), 'data', 'generated-images', testId, `${uuid}.png`);
            let isGenerated = false;
            let isPublished = false;

            // Check if ANY image exists (candidate or final)
            // But we specifically want to know if "Approved" (UUID.png) exists
            try {
                await fs.access(localPath);
                isPublished = true; // UUID.png exists = Approved & Deployed
                isGenerated = true;
            } catch (e) {
                // If checking for UUID.png failed, check for draft UUID_*.png
                try {
                    const dir = path.dirname(localPath);
                    const files = await fs.readdir(dir);
                    if (files.some(f => f.startsWith(uuid + '_') && f.endsWith('.png'))) {
                        isGenerated = true;
                    }
                } catch (err) { }
            }

            return {
                id: uuid,
                external_id: uuid,
                question_ru: q.question?.ru || q.question_ru || "",
                question_es: q.question?.es || q.question_es || "",
                has_image: !!q.image_path || !!q.image_url_original || !!q.image_url,
                is_generated: isGenerated,
                is_published: isPublished
            };
        }));

        // SUPPLEMENTAL DB CHECK (Optional, but good for sync)
        const validIds = questionsList.map(q => q.external_id).filter(id => id && id.length > 20);
        if (validIds.length > 0) {
            try {
                const { data: dbData } = await supabase
                    .from('questions_new')
                    .select('id, image_url')
                    .in('id', validIds);

                if (dbData) {
                    const dbMap = new Set(dbData.filter(row => row.image_url && row.image_url.includes('supabase')).map(r => r.id));
                    questionsList.forEach(q => {
                        if (dbMap.has(q.external_id)) q.is_published = true;
                    });
                }
            } catch (e) {
                console.error("DB check error (non-critical)", e.message);
            }
        }

        res.json({
            test_id: testId,
            questions: questionsList,
            total: questionsList.length,
            is_enriched: isEnriched
        });

    } catch (error) {
        console.error('Error fetching test questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to find and copy existing images from other tests for the same questions (Deduplication)
app.post('/api/test/:testId/sync-images', async (req, res) => {
    const { testId } = req.params;
    console.log(`[Sync] Starting sync for ${testId}...`);

    try {
        // 1. Load questions for the target test to get UUIDs
        let questions = [];
        // Try getting enriched first
        const enrichedPath = path.join(process.cwd(), 'data', 'parsed', testId.split('_')[0], `${testId}-enriched.json`);
        try {
            const data = await fs.readFile(enrichedPath, 'utf8');
            questions = JSON.parse(data);
        } catch (e) {
            // Fallback: try raw json if enriched fails, though external_id might be missing there.
            console.log("[Sync] Enriched file not found, trying raw...");
            try {
                const rawPath = path.join(process.cwd(), 'data', 'parsed', testId.split('_')[0], `${testId}.json`);
                const rawData = await fs.readFile(rawPath, 'utf8');
                const rawQuestions = JSON.parse(rawData);
                // If raw, we might only have 'id'? We need consistent UUIDs. 
                // Assuming raw might have ids that match.
                questions = rawQuestions;
            } catch (err) {
                return res.status(404).json({ error: "No question data found." });
            }
        }

        if (!questions || !questions.length) return res.json({ synced: 0, message: "No questions found" });

        // 2. Identify missing images
        const targetDir = path.join(process.cwd(), 'data', 'generated-images', testId);
        await fs.mkdir(targetDir, { recursive: true });

        const missingUuids = new Set();
        for (const q of questions) {
            const uuid = q.external_id || q.id;
            if (!uuid) continue;

            const imagePath = path.join(targetDir, `${uuid}.png`);
            try {
                await fs.access(imagePath);
                // Image exists, skip
            } catch (e) {
                missingUuids.add(uuid);
            }
        }

        console.log(`[Sync] Found ${missingUuids.size} missing images in ${testId}. Scanning other tests...`);

        if (missingUuids.size === 0) {
            return res.json({ synced: 0, message: "All images already exist." });
        }

        // 3. Scan ALL other test directories
        const imagesRoot = path.join(process.cwd(), 'data', 'generated-images');
        const testDirs = await fs.readdir(imagesRoot);

        let copiedCount = 0;

        for (const dir of testDirs) {
            if (dir === testId) continue; // Skip self
            if (dir.startsWith('.')) continue; // Skip .DS_Store
            if (missingUuids.size === 0) break; // All found

            const sourceDir = path.join(imagesRoot, dir);
            const stats = await fs.stat(sourceDir);
            if (!stats.isDirectory()) continue;

            const files = await fs.readdir(sourceDir);

            // Map files to UUIDs they belong to
            // We look for files starting with UUID + related extensions

            for (const uuid of missingUuids) {
                // We want to find best match for this UUID in sourceDir
                // 1. Exact match: UUID.png
                // 2. Candidate match: UUID_timestamp.png (pick latest)

                let bestMatch = null;
                let latestTime = 0;

                for (const file of files) {
                    if (!file.endsWith('.png')) continue;

                    if (file === `${uuid}.png`) {
                        bestMatch = file;
                        break; // Found perfect match, stop looking in this dir for this uuid
                    }

                    if (file.startsWith(`${uuid}_`)) {
                        // Check if it follows UUID_timestamp pattern
                        const parts = file.replace('.png', '').split('_');
                        const timestamp = parseInt(parts[parts.length - 1]);
                        if (!isNaN(timestamp) && timestamp > latestTime) {
                            latestTime = timestamp;
                            bestMatch = file;
                        }
                    }
                }

                if (bestMatch) {
                    const sourceFile = path.join(sourceDir, bestMatch);
                    // Copy as UUID.png (Approved) to target since we are restoring it
                    const targetFile = path.join(targetDir, `${uuid}.png`);

                    await fs.copyFile(sourceFile, targetFile);
                    console.log(`[Sync] Restored ${uuid} from ${dir}/${bestMatch}`);

                    missingUuids.delete(uuid); // Remove from search list
                    copiedCount++;
                }
            }
        }

        res.json({
            synced: copiedCount,
            message: `Successfully synced ${copiedCount} images from other tests.`
        });

    } catch (error) {
        console.error('Error syncing images:', error);
        res.status(500).json({ error: error.message });
    }
});



// ==========================================
// API: DB OPERATIONS (CONTROL CENTER)
// ==========================================

// Get question details from DB
app.get('/api/db/question/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // First try questions_new with proper answer_options JOIN
        const { data, error } = await supabase
            .from('questions_new')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            // Fetch answer_options separately (Supabase doesn't support nested joins in select)
            const { data: answers, error: answersError } = await supabase
                .from('answer_options')
                .select('*')
                .eq('question_id', id)
                .order('position', { ascending: true });

            if (answersError) {
                console.warn('Failed to fetch answers:', answersError);
            }

            // Format answers to match expected structure { text: { ru, es }, is_correct }
            const formattedAnswers = answers?.map(a => ({
                id: a.position,
                text: {
                    ru: a.text_ru,
                    es: a.text_es,
                    en: a.text_en
                },
                is_correct: a.is_correct
            })) || [];

            return res.json({
                question: {
                    ...data,
                    answer_options: formattedAnswers // Inject answers into question object
                },
                table: 'questions_new'
            });
        }

        // Fallback to old 'questions' table (legacy support)
        const { data: oldData, error: oldError } = await supabase
            .from('questions')
            .select('*')
            .eq('external_id', id)
            .maybeSingle();

        if (oldError) throw oldError;

        if (!oldData) {
            return res.status(404).json({ error: 'Question not found' });
        }

        return res.json({ question: oldData, table: 'questions' });

    } catch (error) {
        console.error('Error fetching from DB:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update text content
// Update text content (Syncs DB and Local File)
app.post('/api/db/update-text', async (req, res) => {
    try {
        const { id, testId, question_ru, question_es, question_en, explanation_ru, explanation_es, explanation_en, answer_options, table } = req.body;

        if (!id) throw new Error('No ID provided');

        // 1. Update Supabase (Main Table)
        const updateData = {
            question_ru,
            question_es,
            question_en, // Added support for EN
            explanation_ru,
            explanation_es, // Added support for ES/EN explanations
            explanation_en,
            updated_at: new Date().toISOString()
        };

        // Remove undefined keys
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const { error: questionError } = await supabase
            .from(table || 'questions_new')
            .update(updateData)
            .eq(table === 'questions' ? 'external_id' : 'id', id);

        if (questionError) throw questionError;

        // 2. Handle answer_options (DB)
        if ((table === 'questions_new' || !table) && answer_options && Array.isArray(answer_options)) {
            // ... (keep existing answer update logic if needed, or simplified) ...
            // For brevity, assuming DB update is fine. Implementing minimal efficient update or skip if complex.
            // Actually, let's keep it simple for now and rely on the frontend passing what it has.

            // Delete old
            await supabase.from('answer_options').delete().eq('question_id', id);

            // Insert new
            const answersToInsert = answer_options.map((opt, index) => ({
                question_id: id,
                text_ru: opt.text?.ru || '',
                text_es: opt.text?.es || '',
                text_en: opt.text?.en || '',
                is_correct: opt.is_correct || false,
                position: index + 1
            }));

            if (answersToInsert.length > 0) {
                await supabase.from('answer_options').insert(answersToInsert);
            }
        }

        // 3. Update Local JSON File (Crucial for Sync)
        if (testId) {
            try {
                // Parse testId: topic-01_test-001
                const parts = testId.split('_');
                const topic = parts[0];
                const testMatch = testId.match(/test-\d+/);
                const test = testMatch ? testMatch[0] : null;

                if (topic && test) {
                    const filePath = path.join(process.cwd(), 'data', 'parsed', topic, `${topic}_${test}-enriched.json`);

                    // Check if file exists
                    try {
                        await fs.access(filePath);
                        const fileContent = await fs.readFile(filePath, 'utf8');
                        const json = JSON.parse(fileContent);

                        // Find question
                        const qIndex = json.findIndex(q => (q.external_id || q.id) === id);
                        if (qIndex !== -1) {
                            // Update fields
                            const q = json[qIndex];

                            // Deep merge updates
                            if (question_ru !== undefined) q.question.ru = question_ru;
                            if (question_es !== undefined) q.question.es = question_es;
                            if (question_en !== undefined) q.question.en = question_en;

                            if (!q.explanation) q.explanation = {};
                            if (explanation_ru !== undefined) q.explanation.ru = explanation_ru;
                            if (explanation_es !== undefined) q.explanation.es = explanation_es;
                            if (explanation_en !== undefined) q.explanation.en = explanation_en;

                            // Update answers if provided
                            if (answer_options && Array.isArray(answer_options)) {
                                q.answers = answer_options.map((opt, idx) => ({
                                    id: opt.id || `opt_${idx}`,
                                    text: {
                                        ru: opt.text?.ru || "",
                                        es: opt.text?.es || "",
                                        en: opt.text?.en || ""
                                    },
                                    is_correct: opt.is_correct
                                }));
                            }

                            // Write back
                            await fs.writeFile(filePath, JSON.stringify(json, null, 2));
                            console.log(`[Update Text] ✅ Synced to local file: ${filePath}`);
                        } else {
                            console.warn(`[Update Text] Question ${id} not found in local file ${filePath}`);
                        }
                    } catch (e) {
                        console.warn(`[Update Text] Local file for ${testId} not accessible: ${e.message}`);
                    }
                }
            } catch (e) {
                console.error(`[Update Text] Failed to update local file: ${e.message}`);
                // Don't fail the request if local update fails, just warn
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating text:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// DEPLOY TEST TO SUPABASE (Batch UPSERT)
// ==========================================
app.post('/api/db/deploy-test', async (req, res) => {
    try {
        const { testId } = req.body;

        console.log(`[Deploy Test] Starting deployment for: ${testId}`);

        // Parse test ID to get file path
        const parts = testId.split('_');
        const topic = parts[0];
        const test = parts.slice(1).join('_');

        const enrichedPath = path.join(process.cwd(), 'data/parsed', topic, `${topic}_${test}-enriched.json`);

        // Read enriched JSON
        const content = await fs.readFile(enrichedPath, 'utf-8');
        const questions = JSON.parse(content);

        // Extract test number from testId (e.g., "topic-01_test-002" -> 2)
        const testNumberMatch = testId.match(/test-(\d+)/);
        const testNumber = testNumberMatch ? parseInt(testNumberMatch[1]) : null;

        if (!testNumber) {
            throw new Error('Could not extract test number from testId');
        }

        // Get topic_id from database (topic number from testId, e.g., "topic-01" -> 1)
        const topicNumberMatch = testId.match(/topic-(\d+)/);
        const topicNumber = topicNumberMatch ? parseInt(topicNumberMatch[1]) : null;

        const { data: topicData } = await supabase
            .from('topics')
            .select('id, title_ru')
            .eq('number', topicNumber)
            .single();

        if (!topicData) {
            throw new Error(`Topic ${topicNumber} not found in database`);
        }

        console.log(`[Deploy Test] Found topic: ${topicData.title_ru} (${topicData.id})`);

        // Check if test record exists in tests table
        const { data: existingTest } = await supabase
            .from('tests')
            .select('id, title_ru')
            .eq('topic_id', topicData.id)
            .eq('test_number', testNumber)
            .maybeSingle();

        if (existingTest) {
            console.log(`[Deploy Test] Test record exists: ${existingTest.title_ru}`);
        } else {
            // Create test record
            console.log(`[Deploy Test] Creating test record for test ${testNumber}...`);

            const { error: testError } = await supabase
                .from('tests')
                .insert({
                    topic_id: topicData.id,
                    test_number: testNumber,
                    title_ru: `Тест ${testNumber}: ${topicData.title_ru}`,
                    title_es: `Test ${testNumber}: ${topicData.title_ru}`,
                    title_en: `Test ${testNumber}: ${topicData.title_ru}`,
                    description_ru: `Тест ${testNumber} по теме "${topicData.title_ru}". 30 вопросов из PracticaVial.`,
                    description_es: `Test ${testNumber} sobre "${topicData.title_ru}". 30 preguntas de PracticaVial.`,
                    description_en: `Test ${testNumber}: "${topicData.title_ru}". 30 questions from PracticaVial.`,
                    source_id_prefix: null,
                    source_id_start: null,
                    source_id_end: null,
                    questions_count: questions.length,
                    min_pass_percent: 80,
                    order_index: testNumber,
                    required_test_id: testNumber > 1 ? null : null, // Can be improved later
                    is_unlocked_by_default: testNumber === 1
                });

            if (testError) {
                console.error('[Deploy Test] Error creating test record:', testError);
                throw testError;
            }

            console.log(`[Deploy Test] ✅ Test record created successfully`);
        }

        let deployed = 0;
        let errors = [];

        for (const q of questions) {
            try {
                const questionId = q.external_id || q.id;

                // 1. Upload Image (if exists locally)
                let finalImageUrl = q.image_url;
                try {
                    // Try to find local generated image
                    const generatedDir = path.join(process.cwd(), 'data/generated-images', testId);
                    const files = await fs.readdir(generatedDir).catch(() => []);
                    const localImage = files.find(f => f.startsWith(questionId) && (f.endsWith('.png') || f.endsWith('.jpg')));

                    if (localImage) {
                        console.log(`[Deploy Test] Found local image for ${questionId}: ${localImage}`);
                        const imageBuffer = await fs.readFile(path.join(generatedDir, localImage));

                        // ✨ PROCESS IMAGE (Watermark + Metadata + WebP)
                        console.log(`[Deploy Test] Processing image (Watermark + SEO)...`);
                        const processedBuffer = await processImageForUpload(imageBuffer, q, testId);

                        // Change extension to .webp
                        const webpFilename = localImage.replace(/\.(png|jpg|jpeg)$/i, '.webp');

                        // Upload to Supabase Storage with organized folder structure
                        const storagePath = `generated/${testId}/${webpFilename}`;
                        const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('dgt-images')
                            .upload(storagePath, processedBuffer, {
                                contentType: 'image/webp', // Now it's WebP!
                                upsert: true
                            });

                        if (uploadError) {
                            console.warn(`[Deploy Test] Upload warning for ${questionId}:`, uploadError.message);
                        } else {
                            // Get public URL using the same structured path
                            const { data: { publicUrl } } = supabase.storage
                                .from('dgt-images')
                                .getPublicUrl(storagePath);

                            finalImageUrl = publicUrl;
                            console.log(`[Deploy Test] Uploaded processed image: ${publicUrl}`);
                        }
                    } else {
                        console.log(`[Deploy Test] No local image found for ${questionId}, using original URL.`);
                    }
                } catch (imgErr) {
                    console.warn(`[Deploy Test] Image processing error for ${questionId}:`, imgErr.message);
                }

                // 2. Format Answer Options (Handle both array and legacy properties)
                let answerOptions = [];
                if (Array.isArray(q.answers)) {
                    // Correct structure: answers array
                    answerOptions = q.answers.map((a, idx) => ({
                        question_id: questionId,
                        position: idx,
                        text_ru: a.text?.ru || '',
                        text_es: a.text?.es || '',
                        text_en: a.text?.en || '',
                        is_correct: a.is_correct
                    }));
                } else {
                    // Legacy structure (flat properties)
                    answerOptions = [
                        {
                            question_id: questionId,
                            position: 0,
                            text_ru: q.answer_correct_ru || q.answers?.find(a => a.is_correct)?.text?.ru || '',
                            text_es: q.answer_correct_es || q.answers?.find(a => a.is_correct)?.text?.es || '',
                            text_en: q.answer_correct_en || q.answers?.find(a => a.is_correct)?.text?.en || '',
                            is_correct: true
                        },
                        ...Object.entries(q)
                            .filter(([key]) => key.startsWith('answer_wrong_'))
                            .map(([key, value], idx) => ({
                                question_id: questionId,
                                position: idx + 1,
                                text_ru: q[`answer_wrong_${idx + 1}_ru`] || '',
                                text_es: q[`answer_wrong_${idx + 1}_es`] || '',
                                text_en: q[`answer_wrong_${idx + 1}_en`] || '',
                                is_correct: false
                            }))
                    ];
                }

                // 3. Upsert Question
                const { error: qError } = await supabase
                    .from('questions_new')
                    .upsert({
                        id: questionId,
                        topic_id: q.topic_id || existingTest?.topic_id || topicData?.id || null, // Ensure topic_id is set
                        difficulty: 'easy',
                        type: 'single',
                        question_ru: q.question?.ru || q.question_ru || '',
                        question_es: q.question?.es || q.question_es || '',
                        question_en: q.question?.en || q.question_en || '',
                        explanation_ru: q.explanation?.ru || q.explanation_ru || '',
                        explanation_es: q.explanation?.es || q.explanation_es || '',
                        explanation_en: q.explanation?.en || q.explanation_en || '',
                        image_url: finalImageUrl, // Use the uploaded URL if available
                        source: 'practicavial',
                        metadata: {
                            test_id: testId,
                            original_image: q.image_url || q.schema_url || '',
                            question_number: q.question_number || 0
                        }
                    }, { onConflict: 'id' });

                if (qError) throw qError;

                // 4. Upsert Answer Options
                // First delete existing options to avoid duplicates if re-deploying
                await supabase.from('answer_options').delete().eq('question_id', questionId);

                const { error: aError } = await supabase
                    .from('answer_options')
                    .insert(answerOptions.filter(a => a.text_ru || a.text_es));

                if (aError) console.warn(`[Deploy Test] Answer options warning for ${questionId}:`, aError);

                deployed++;
                console.log(`[Deploy Test] ✅ Deployed question ${questionId}`);

            } catch (e) {
                console.error(`[Deploy Test] Error deploying ${q.external_id}:`, e);
                errors.push({ id: q.external_id, error: e.message });
            }
        }



        console.log(`[Deploy Test] Deployment complete: ${deployed}/${questions.length}`);

        res.json({
            success: true,
            deployed,
            total: questions.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('[Deploy Test] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload local generated image to Supabase and update record
app.post('/api/db/upload-image', async (req, res) => {
    try {
        const { id, generatedPath, table, questionData, testId } = req.body;

        if (!id || !generatedPath) throw new Error('Missing id or path');
        if (!questionData) throw new Error('Missing questionData for UPSERT');

        // Read original generated file
        const fullPath = path.resolve(process.cwd(), generatedPath);
        const originalBuffer = await fs.readFile(fullPath);

        console.log(`[Upload Image] Processing ${id}...`);

        // PROCESS IMAGE: Watermark + Compression + Metadata
        const optimizedBuffer = await processImageForUpload(originalBuffer, questionData, testId);
        console.log(`[Upload Image] ✅ Processed (${(originalBuffer.length / 1024 / 1024).toFixed(2)}MB -> ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)}MB)`);

        // Upload to Storage (as .webp)
        const fileName = `${id}_${Date.now()}.webp`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('dgt-images')
            .upload(fileName, optimizedBuffer, {
                contentType: 'image/webp',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('dgt-images')
            .getPublicUrl(fileName);

        // Check if question exists first
        const { data: existingQuestion } = await supabase
            .from(table || 'questions_new')
            .select('id, image_url')
            .eq('id', id)
            .single();

        if (!existingQuestion) {
            console.log(`[Upload Image] ⚠️ Question ${id} not found in DB. Skipping DB update (only storage upload).`);
            res.json({
                success: true,
                publicUrl,
                warning: 'Question not in DB yet. Image uploaded to storage only.'
            });
            return;
        }

        // CLEANUP: If existing image is different, delete it to save space
        const oldUrl = existingQuestion.image_url;
        if (oldUrl && oldUrl !== publicUrl && oldUrl.includes('dgt-images')) {
            try {
                const oldFileName = oldUrl.split('/').pop();
                if (oldFileName) {
                    console.log(`[Upload Image] 🧹 Removing old image: ${oldFileName}`);
                    await supabase.storage.from('dgt-images').remove([oldFileName]);
                }
            } catch (cleanupError) {
                console.warn(`[Upload Image] Cleanup warning: ${cleanupError.message}`);
            }
        }

        // Update image_url for existing question
        const { error: dbError } = await supabase
            .from(table || 'questions_new')
            .update({
                image_url: publicUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (dbError) {
            console.error('[Upload Image] DB Update Error:', dbError);
            throw dbError;
        }

        // UPDATE ANSWERS
        if ((table === 'questions_new' || !table) && questionData.answers && Array.isArray(questionData.answers)) {
            // Delete old answers
            await supabase.from('answer_options').delete().eq('question_id', id);

            // Insert new answers
            const answersToInsert = questionData.answers.map((ans, index) => ({
                question_id: id,
                text_ru: ans.text?.ru || ans.text_ru || ans.text || '',
                text_es: ans.text?.es || ans.text_es || ans.text || '',
                text_en: ans.text?.en || ans.text_en || '',
                is_correct: ans.is_correct || ans.isCorrect || false,
                position: ans.position || index + 1
            }));

            const { error: insertError } = await supabase.from('answer_options').insert(answersToInsert);
            if (insertError) console.error('[Upload Image] Answer insert failed:', insertError);
            else console.log(`[Upload Image] ✅ Updated ${answersToInsert.length} answers`);
        }

        // LOCAL PROMOTION: Save as UUID.png
        try {
            const approvedPath = path.join(path.dirname(fullPath), `${id}.png`);
            // We copy original buffer (PNG) to be the master source, NOT the webp
            await fs.copyFile(fullPath, approvedPath);
            console.log(`[Upload Image] 🏆 Local Promotion: Saved as ${id}.png`);
        } catch (promoError) {
            console.warn(`[Upload Image] Failed to create local confirmed copy: ${promoError.message}`);
        }

        console.log(`[Upload Image] ✅ PUBLISH COMPLETE for ${id}`);
        res.json({ success: true, publicUrl });

    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// PREVIEW PROCESSED IMAGE (with watermark)
// ==========================================
app.get('/api/preview-processed/:testId/:uuid', async (req, res) => {
    try {
        const { testId, uuid } = req.params;
        const imagePath = path.resolve(process.cwd(), `data/generated-images/${testId}/${uuid}.png`);

        // Read original image
        const originalBuffer = await fs.readFile(imagePath);

        // Process with watermark + compression
        const processedBuffer = await processImageForUpload(originalBuffer);

        // Return as WebP with proper headers
        res.set('Content-Type', 'image/webp');
        res.send(processedBuffer);

    } catch (error) {
        console.error('Error previewing image:', error);
        res.status(500).send('Error previewing image');
    }
});

// ==========================================
// API: MANAGE IMAGE CANDIDATES (VERSIONING)
// ==========================================

// 1. Get List of Candidates
app.get('/api/candidates/:testId/:uuid', async (req, res) => {
    try {
        const { testId, uuid } = req.params;
        const dir = path.join(CONFIG.generatedDir, testId);

        try {
            await fs.access(dir);
        } catch {
            return res.json({ candidates: [] });
        }

        const files = await fs.readdir(dir);

        // Find files matching pattern: {uuid}.png or {uuid}_123456789.png
        const candidates = [];

        for (const file of files) {
            // Check if file starts with uuid
            if (!file.startsWith(uuid)) continue;
            if (!file.endsWith('.png')) continue; // Only source pngs are candidates

            // Validate it's this question's file
            // pattern 1: exactly uuid.png (Default/Main)
            // pattern 2: uuid_timestamp.png (Version)

            const isExactMatch = file === `${uuid}.png`;
            const isVersionMatch = file.match(new RegExp(`^${uuid}_\\d+\\.png$`));

            if (isExactMatch || isVersionMatch) {
                const stat = await fs.stat(path.join(dir, file));
                candidates.push({
                    filename: file,
                    path: path.join('data/generated-images', testId, file), // Relative path for frontend
                    url: `http://localhost:${PORT}/data/generated-images/${testId}/${file}`,
                    timestamp: stat.mtimeMs,
                    size: stat.size,
                    isMain: isExactMatch
                });
            }
        }

        // Sort by timestamp desc (newest first)
        candidates.sort((a, b) => b.timestamp - a.timestamp);

        res.json({ candidates });
    } catch (e) {
        console.error('[Candidates] List Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// 2. Upload Manual Candidate
app.post('/api/candidates/upload', express.raw({ type: 'image/*', limit: '10mb' }), async (req, res) => {
    try {
        const { testId, uuid, filename } = req.query; // Send metadata in query for raw upload

        if (!testId || !uuid || !req.body) throw new Error("Missing params or body");

        const dir = path.join(CONFIG.generatedDir, testId);
        await fs.mkdir(dir, { recursive: true });

        // Generate timestamped name
        const timestamp = Date.now();
        const newFilename = `${uuid}_${timestamp}.png`;
        const filepath = path.join(dir, newFilename);

        // Convert input buffer (could be png/jpg/webp) to PNG for consistency
        // Using sharp to standardize
        const sharp = (await import('sharp')).default;
        await sharp(req.body).png().toFile(filepath);

        console.log(`[Candidate] Uploaded manual version: ${newFilename}`);

        res.json({
            success: true,
            candidate: {
                filename: newFilename,
                path: path.join('data/generated-images', testId, newFilename),
                url: `http://localhost:${PORT}/data/generated-images/${testId}/${newFilename}`,
                timestamp: timestamp,
                isMain: false
            }
        });

    } catch (e) {
        console.error('[Candidates] Upload Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// 3. Delete Candidate
app.delete('/api/candidates/:testId/:filename', async (req, res) => {
    try {
        const { testId, filename } = req.params;
        const filepath = path.resolve(CONFIG.generatedDir, testId, filename);

        // Security check: ensure path is inside generated dir
        if (!filepath.startsWith(path.resolve(CONFIG.generatedDir))) {
            throw new Error("Invalid path");
        }

        // Create rejected directory
        const rejectedDir = path.join(process.cwd(), 'data/rejected-images', testId);
        await fs.mkdir(rejectedDir, { recursive: true });

        const rejectedPath = path.join(rejectedDir, filename);

        // Move file to rejected folder (archive, don't delete permanently)
        await fs.rename(filepath, rejectedPath);

        console.log(`[Candidate] Moved to rejected: ${filename}`);

        // Also move prompt file if exists
        try {
            const promptFile = filename.replace('.png', '.prompt.txt');
            const sourcePromptPath = path.join(path.dirname(filepath), promptFile);
            const rejectedPromptPath = path.join(rejectedDir, promptFile);
            await fs.rename(sourcePromptPath, rejectedPromptPath);
        } catch (e) {
            // Prompt file might not exist, that's OK
        }

        res.json({ success: true, message: 'Candidate moved to rejected folder' });
    } catch (e) {
        console.error('[Candidates] Delete Error:', e);
        res.status(500).json({ error: e.message });
    }
});
// ========================================
// NEW: Get full question details by ID
// ========================================
app.get('/api/question/:questionId/full', async (req, res) => {
    try {
        const { questionId } = req.params; // e.g. topic-01_test-001_39121580-0eb6-4c5b-8349-433ace109cb4

        // Extract UUID part (last segment after underscore)
        const parts = questionId.split('_');
        const uuid = parts[parts.length - 1]; // Just the UUID

        console.log(`[API] Searching for question UUID: ${uuid} (from ${questionId})`);

        // Parse question ID to find file - find all enriched.json files and search
        const parsedDir = path.join(process.cwd(), 'data', 'parsed');
        const topics = await fs.readdir(parsedDir);

        for (const topic of topics) {
            if (!topic.startsWith('topic-')) continue;

            const topicPath = path.join(parsedDir, topic);
            const files = await fs.readdir(topicPath);

            for (const file of files) {
                if (!file.endsWith('-enriched.json')) continue;

                const filePath = path.join(topicPath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const questions = JSON.parse(content);

                if (!Array.isArray(questions)) continue;

                const question = questions.find(q => q.external_id === uuid || q.id === uuid);

                if (question) {
                    console.log(`[API] ✅ Found question in ${file}`);
                    return res.json({ question });
                }
            }
        }

        console.log(`[API] ❌ Question not found for UUID: ${uuid}`);
        return res.status(404).json({ error: 'Question not found' });

    } catch (error) {
        console.error('Error fetching question details:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// STOP GENERATION ENDPOINT
// ========================================
app.post('/api/generate/stop', (req, res) => {
    try {
        if (activeGenerationProcess) {
            console.log(`[Stop] Killing active generation process (PID: ${activeGenerationProcess.pid})`);

            // Kill the process and all its children
            activeGenerationProcess.kill('SIGTERM');

            // If it doesn't die gracefully, force kill after 2 seconds
            setTimeout(() => {
                if (activeGenerationProcess && !activeGenerationProcess.killed) {
                    console.log(`[Stop] Force killing process...`);
                    activeGenerationProcess.kill('SIGKILL');
                }
            }, 2000);

            activeGenerationProcess = null;

            res.json({
                success: true,
                message: 'Generation process stopped'
            });
        } else {
            res.json({
                success: false,
                message: 'No active generation process found'
            });
        }
    } catch (error) {
        console.error('[Stop] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// START SERVER
app.listen(PORT, async () => {
    console.log(`
============================================================
🚀 VALIDATOR SERVER STARTED
============================================================

📍 URL: http://localhost:${PORT}

🎨 Open in browser to start validating images

============================================================
    `);
});
