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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3030;

app.use(express.json());

// CRITICAL: Set MIME types BEFORE serving static files
app.use((req, res, next) => {
    if (req.path.endsWith('.ts') || req.path.endsWith('.tsx')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    next();
});

// Route for the dashboard (BEFORE static files to prevent index.html override)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard-v2.html'));
});

// Serve static files AFTER routes and MIME middleware
app.use(express.static('.'));

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================
const CONFIG = {
    generatedDir: './data/generated-images',
    originalsDir: './data/originals', // Fixed path
    parsedDir: './data/parsed',
    decisionsFile: './data/validation-decisions.json',
};

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
            const tests = [];

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory()) {
                    continue;
                } else if (file.endsWith('-enriched.json')) {
                    try {
                        const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
                        const testId = file.replace('-enriched.json', '');

                        // Check if all questions in this test are generated
                        const allGenerated = data.every(q =>
                            q.external_id && generatedIds.has(q.external_id)
                        );

                        tests.push({
                            id: testId,
                            name: testId.replace(/_/g, ' ').replace('test-', 'Test '),
                            questionCount: data.length,
                            generated: allGenerated,
                            filePath: fullPath
                        });
                    } catch (e) { }
                }
            }

            return tests.sort((a, b) => a.id.localeCompare(b.id));
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

// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 VALIDATOR SERVER STARTED');
    console.log('='.repeat(60));
    console.log(`\n📍 URL: http://localhost:${PORT}`);
    console.log(`\n🎨 Open in browser to start validating images\n`);
    console.log('='.repeat(60) + '\n');
});
