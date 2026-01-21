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
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { processImageForUpload } from './scripts/utils/image-processor.js';
import { v5 as uuidv5 } from 'uuid';
import chokidar from 'chokidar';
import Fuse from 'fuse.js';

const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'; // Deterministic Namespace

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
// EXPLICIT: Serve generated images with fallback logic for IDs
// EXPLICIT: Serve generated images with fallback logic for IDs - ASYNC OPTIMIZED
// Helper for serving images with resize and fallback support
async function serveImageWithFallback(req, res, next) {
    const { testId, filename } = req.params;
    const { width } = req.query;
    const testDir = path.join(process.cwd(), 'data', 'generated-images', testId);
    let targetPath = path.join(testDir, filename);
    let fileFound = false;

    try {
        await fs.access(targetPath);
        fileFound = true;
    } catch {
        // Smart Fallback: Search for file starting with UUID in directory
        try {
            await fs.access(testDir);
            const files = await fs.readdir(testDir);
            const cleanId = filename.includes('.') ? filename.split('.')[0] : filename;
            const match = files.find(f => f.startsWith(cleanId) && f.endsWith('.png'));
            if (match) {
                targetPath = path.join(testDir, match);
                fileFound = true;
            }
        } catch (e) { }
    }

    if (!fileFound) {
        if (req.path.startsWith('/candidates/')) return res.status(404).send('Not Found');
        return next();
    }

    // Serve with resize if requested
    try {
        if (width) {
            const size = parseInt(width);
            if (!isNaN(size) && size > 0 && size <= 2000) {
                const sharp = (await import('sharp')).default;
                const buffer = await sharp(targetPath)
                    .resize(size)
                    .png({ quality: 80 })
                    .toBuffer();

                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=31536000');
                return res.send(buffer);
            }
        }
        res.sendFile(targetPath);
    } catch (e) {
        console.error('[Image Serve Error]', e);
        res.sendFile(targetPath, (err) => { if (err && !res.headersSent) next(); });
    }
}

app.get('/generated-images/:testId/:filename', serveImageWithFallback);
app.get('/candidates/:testId/:filename', serveImageWithFallback);


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
// SEARCH INDEX
// ==========================================
let GLOBAL_SEARCH_INDEX = [];
let GLOBAL_QUESTION_LOCATIONS = {}; // ID -> Set<TestID>

function normalizeText(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/ё/g, 'е')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?¿¡]/g, " ")
        .replace(/\s+/g, ' ')
        .trim();
}

async function buildSearchIndex() {
    console.log('🏗️ Building Global Search Index (Normalized) + Tracking Duplicates...');
    GLOBAL_QUESTION_LOCATIONS = {};
    const index = [];

    const visitedTests = new Set();

    async function scan(dir) {
        try {
            const ent = await fs.readdir(dir, { withFileTypes: true });
            // Sort to ensure enriched comes first ('-' < '.')
            ent.sort((a, b) => a.name.localeCompare(b.name));

            for (const dirent of ent) {
                const fullPath = path.join(dir, dirent.name);
                if (dirent.isDirectory()) {
                    await scan(fullPath);
                } else if (dirent.name.includes('test-') && dirent.name.endsWith('.json')) {
                    const testId = dirent.name.replace('-enriched.json', '').replace('.json', '');

                    // Skip if already processed (prioritize enriched)
                    if (visitedTests.has(testId)) continue;
                    visitedTests.add(testId);

                    try {
                        const content = await fs.readFile(fullPath, 'utf8');
                        const json = JSON.parse(content);
                        const data = Array.isArray(json) ? json : (json.questions || []);

                        data.forEach(q => {
                            let id = q.external_id || q.id;

                            // Generate ID if missing (Essential for JSONs without IDs)
                            if (!id && q.question_number) {
                                id = uuidv5(`${testId}_q-${q.question_number}`, NAMESPACE);
                                // q.id = id; // Optional: mutate object
                            }

                            if (!id) return;

                            // 1. Track Locations
                            if (!GLOBAL_QUESTION_LOCATIONS[id]) {
                                GLOBAL_QUESTION_LOCATIONS[id] = new Set();
                            }
                            GLOBAL_QUESTION_LOCATIONS[id].add(testId);

                            const ru = q.question?.ru || q.question_text_ru || '';
                            const es = q.question?.es || q.question_text || q.question || '';
                            const en = q.question?.en || '';

                            const textSource = [
                                es, ru, en, id, testId
                            ].filter(Boolean).join(' ');

                            index.push({
                                id: id,
                                testId: testId,
                                question_ru: ru,
                                question_es: es,
                                question_en: en,
                                searchText: normalizeText(textSource)
                            });
                        });
                    } catch (e) {
                        // ignore bad json
                    }
                }
            }
        } catch (e) {
            console.error('Search Index Scan Error:', e);
        }
    }

    await scan(CONFIG.parsedDir);

    // Enrich index with location counts and lists
    GLOBAL_SEARCH_INDEX = index.map(item => ({
        ...item,
        locationCount: GLOBAL_QUESTION_LOCATIONS[item.id]?.size || 1,
        locations: Array.from(GLOBAL_QUESTION_LOCATIONS[item.id] || [])
    }));

    console.log(`✅ Search Index Ready: ${index.length} questions. (Unique IDs tracked: ${Object.keys(GLOBAL_QUESTION_LOCATIONS).length})`);
}

// Start building on launch
buildSearchIndex();

// АРХИТЕКТУРА: File Watcher for Auto-Rebuild
let rebuildDebounceTimer = null;
const watcher = chokidar.watch(CONFIG.parsedDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
    }
});

watcher.on('add', (filePath) => {
    if (filePath.endsWith('.json') && filePath.includes('test-')) {
        console.log(`📂 New test file detected: ${path.basename(filePath)}`);
        debouncedRebuild();
    }
});

watcher.on('change', (filePath) => {
    if (filePath.endsWith('.json') && filePath.includes('test-')) {
        console.log(`📝 Test file changed: ${path.basename(filePath)}`);
        debouncedRebuild();
    }
});

function debouncedRebuild() {
    clearTimeout(rebuildDebounceTimer);
    rebuildDebounceTimer = setTimeout(() => {
        console.log('🔄 Auto-rebuilding search index...');
        buildSearchIndex();
    }, 3000); // Wait 3 seconds of inactivity before rebuilding
}

console.log('👁️  File watcher active on:', CONFIG.parsedDir);

// API Search Endpoint
// API Search Endpoint
app.get('/api/search', async (req, res) => {
    try {
        const rawQ = (req.query.q || '');
        const country = req.query.country || 'spain';
        if (!rawQ || rawQ.length < 2) return res.json([]);

        if (country === 'russia') {
            console.log(`[SEARCH RU] "${rawQ.substring(0, 30)}..."`);
            const { data: questions, error } = await supabase
                .from('pdd_russia_questions')
                .select('id, ticket_number, question_number, question_text, source_id')
                .or(`question_text.ilike.%${rawQ}%,explanation.ilike.%${rawQ}%`)
                .limit(50);

            if (error) throw error;

            return res.json(questions.map(q => ({
                id: q.source_id || String(q.id),
                testId: `ticket-${String(q.ticket_number).padStart(2, '0')}`,
                question_ru: q.question_text,
                locationCount: 1
            })));
        }

        // Spain Logic (existing index based)
        const normalizedQ = rawQ.toLowerCase()
            .replace(/ё/g, 'е')
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
            .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, " ")
            .replace(/\s+/g, ' ')
            .trim();

        const tokens = normalizedQ.split(' ').filter(t => t.length > 0);

        console.log(`[SEARCH ES] "${normalizedQ.substring(0, 30)}..." [${tokens.length} tokens]`);

        const results = GLOBAL_SEARCH_INDEX.filter(item => {
            return tokens.every(token => item.searchText.includes(token));
        }).slice(0, 50).map(item => ({
            ...item,
            imageUrl: `/data/generated-images/${item.testId}/${item.id}.png`
        }));

        res.json(results);
    } catch (e) {
        console.error('[SEARCH ERROR]', e);
        res.status(500).json([]);
    }
});

// ==========================================
// LOAD QUESTIONS DATA (Legacy / Helper)
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
async function buildFileTree(country = 'spain') {
    const tree = {};

    try {
        // Load checkpoint to know what's generated
        let generatedIds = new Set();
        try {
            const checkpoint = JSON.parse(await fs.readFile('./data/image-gen-checkpoint.json', 'utf8'));
            generatedIds = new Set(checkpoint.processed || []);
        } catch (e) { }

        // Load Deployed Status from Supabase (Source of Truth: 'tests' table)
        let deployedTestIds = new Set();
        try {
            // 1. Get Topics Map (id -> number)
            const { data: topicsData } = await supabase.from('topics').select('id, number');
            const topicIdToNumber = {};
            if (topicsData) {
                topicsData.forEach(t => topicIdToNumber[t.id] = t.number);
            }

            // 2. Get All Deployed Tests
            if (country === 'russia') {
                const { data: deployedRussia } = await supabase.from('pdd_russia_questions').select('ticket_number');
                if (deployedRussia) {
                    deployedRussia.forEach(t => {
                        if (t.ticket_number) {
                            deployedTestIds.add(`ticket-${String(t.ticket_number).padStart(2, '0')}`);
                        }
                    });
                }
            } else { // Spain
                // Use 'tests' table as source of truth for Spain
                const { data: deployedSpain } = await supabase.from('tests').select('test_number, topic_id');
                if (deployedSpain) {
                    deployedSpain.forEach(t => {
                        const topicNum = topicIdToNumber[t.topic_id];
                        if (topicNum !== undefined) {
                            deployedTestIds.add(`topic-${String(topicNum).padStart(2, '0')}_test-${String(t.test_number).padStart(3, '0')}`);
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Error loading deployed status from Supabase:', e.message);
        }

        // Load Generated Status (check folders in data/generated-images)
        let generatedTestFolders = new Set();
        try {
            const subfolders = await fs.readdir(CONFIG.generatedDir, { withFileTypes: true });
            for (const dirent of subfolders) {
                if (dirent.isDirectory()) {
                    generatedTestFolders.add(dirent.name);
                }
            }
        } catch (e) { }

        async function scanDirectory(dir, category) {
            try {
                const files = await fs.readdir(dir);
                const testsMap = new Map();


                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const fullPath = path.join(dir, file);
                        const isEnriched = file.includes('-enriched.json');
                        const testId = file.replace('-enriched.json', '').replace('.json', '');

                        if (testsMap.has(testId) && !isEnriched) continue;

                        try {
                            const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
                            const questionsCount = Array.isArray(data) ? data.length : (data.questions ? data.questions.length : 0);

                            testsMap.set(testId, {
                                id: testId,
                                name: testId.replace(/_/g, ' ').replace('test-', 'Test '),
                                questionCount: questionsCount,
                                generated: generatedTestFolders.has(testId),
                                deployed: deployedTestIds.has(testId),
                                filePath: fullPath,
                                isEnriched: isEnriched
                            });
                        } catch (e) { }
                    }
                }
                return Array.from(testsMap.values()).sort((a, b) => a.id.localeCompare(b.id));
            } catch (e) {
                console.error(`Error scanning directory ${dir}:`, e);
                return [];
            }
        }

        // Russia logic
        if (country === 'russia') {
            const russiaDir = path.join(CONFIG.parsedDir, 'russia');
            const exists = await fs.access(russiaDir).then(() => true).catch(() => false);

            if (exists) {
                const categories = await fs.readdir(russiaDir);
                for (const category of categories) {
                    const categoryPath = path.join(russiaDir, category);
                    const stat = await fs.stat(categoryPath);
                    if (stat.isDirectory()) {
                        tree[category] = await scanDirectory(categoryPath, category);
                    }
                }
            } else {
                // Virtual tickets if no local files for Russia
                tree['Tickets'] = Array.from({ length: 40 }, (_, i) => ({
                    id: `ticket-${String(i + 1).padStart(2, '0')}`,
                    name: `Ticket ${i + 1}`,
                    questionCount: 20,
                    generated: false,
                    deployed: true,
                    isEnriched: true
                }));
            }
            return tree;
        }

        // Spain logic (default)
        const categories = await fs.readdir(CONFIG.parsedDir);
        for (const category of categories) {
            if (category === 'russia') continue;
            const categoryPath = path.join(CONFIG.parsedDir, category);
            const stat = await fs.stat(categoryPath);
            if (stat.isDirectory()) {
                tree[category] = await scanDirectory(categoryPath, category);
            }
        }

        return tree;
    } catch (error) {
        console.error('Error building file tree:', error);
        return {};
    }
}

// ==========================================
// API: GET FILE TREE
// ==========================================
app.get('/api/files/tree', async (req, res) => {
    try {
        const country = req.query.country || 'spain';
        const tree = await buildFileTree(country);
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


let enrichmentStats = {
    isRunning: false,
    latestLog: null
};
let activeEnrichProcess = null;

// ==========================================
// API: RUN BATCH ENRICHMENT
// ==========================================
app.post('/api/enrich/all', async (req, res) => {
    try {
        if (enrichmentStats.isRunning) {
            return res.json({ success: false, error: "Enrichment already running" });
        }

        const { filter } = req.body || {};
        console.log(`[API DEBUG] Received enrichment request. Body:`, req.body);
        console.log(`[API DEBUG] Filter extracted: "${filter}"`);

        console.log(`[API] Starting Enrichment... Filter: ${filter || 'ALL'}`);
        enrichmentStats.isRunning = true;
        enrichmentStats.latestLog = filter ? `Starting enrichment for ${filter}...` : "Starting batch process...";

        const args = ['scripts/run-enrichment-all.js'];
        if (filter) args.push(filter);

        console.log(`[API DEBUG] Spawning: node ${args.join(' ')}`);

        activeEnrichProcess = spawn('node', args, {
            cwd: process.cwd(),
        });

        activeEnrichProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log(`[Enrichment] ${output}`);
                enrichmentStats.latestLog = output;
            }
        });

        activeEnrichProcess.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.error(`[Enrichment ERR] ${output}`);
                enrichmentStats.latestLog = `ERROR: ${output}`;
            }
        });

        activeEnrichProcess.on('close', (code) => {
            console.log(`[Enrichment] Process finished with code ${code}`);
            enrichmentStats.isRunning = false;
            enrichmentStats.latestLog = code === 0 || code === null ? "✨ Process Finished" : "❌ Process Terminated/Failed";
            activeEnrichProcess = null;
        });

        res.json({ success: true, message: "Enrichment started" });
    } catch (error) {
        console.error('[API] Enrichment Error:', error);
        enrichmentStats.isRunning = false;
        activeEnrichProcess = null;
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/enrich/stop', (req, res) => {
    if (activeEnrichProcess) {
        activeEnrichProcess.kill();
        activeEnrichProcess = null;
        enrichmentStats.isRunning = false;
        enrichmentStats.latestLog = "🛑 Process stopped by user";
        console.log('[API] Enrichment process killed by user');
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "No process running" });
    }
});

app.get('/api/enrich/status', (req, res) => {
    res.json(enrichmentStats);
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
        if (customPrompt) console.log(`[Generate Single] Custom Prompt length: ${customPrompt.length}`);
        if (userInstruction) console.log(`[Generate Single] 🧞‍♂️ User Wish: "${userInstruction}"`);

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
        const { testId } = req.params;
        const country = req.query.country || 'spain';

        if (country === 'russia') {
            const ticketMatch = testId.match(/ticket-(\d+)/);
            if (!ticketMatch) throw new Error('Invalid ticket format for Russia');
            const ticketNumber = parseInt(ticketMatch[1]);

            const { data: questions, error } = await supabase
                .from('pdd_russia_questions')
                .select('*, pdd_russia_answers(*)')
                .eq('ticket_number', ticketNumber)
                .order('question_number', { ascending: true });

            if (error) throw error;

            // Format to match Spain structure
            const formattedQuestions = questions.map(q => ({
                id: String(q.id),
                external_id: q.source_id,
                question_ru: q.question_text,
                explanation_ru: q.explanation,
                correct_answer: q.correct_answer_text,
                image_url: q.image_url,
                is_published: true, // They are already in DB
                is_generated: !!q.is_ai_image,
                answers: q.pdd_russia_answers?.map(a => ({
                    answer_text: a.answer_text,
                    is_correct: a.is_correct
                })) || []
            }));

            return res.json({
                success: true,
                questions: formattedQuestions,
                is_enriched: true
            });
        }

        // Spain Logic (existing)
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

            // Fallback if regex fails (Use stable UUIDv5 just like in single-fetch fallback)
            if (!uuid) {
                if (q.question_number) {
                    uuid = uuidv5(`${testId}_q-${q.question_number}`, NAMESPACE);
                } else {
                    uuid = `${testId}_q${index + 1}`;
                }
            }

            // CRITICAL FIX: Ensure ID contains test context for file fallback lookup
            // If the ID is just a UUID (no topic/test prefix) and we are browsing a file-based test,
            // we MUST prepend the testId so the detail endpoint can find the file.
            if (uuid && !uuid.startsWith(testId) && !uuid.includes('topic-')) {
                uuid = `${testId}_${uuid}`;
            }

            // Check local file existence
            // We need to check BOTH:
            // 1. Bare UUID: if we generated it before we started using composite IDs
            // 2. Composite ID: if we generated it now

            // Prioritize checking the ID we are returning to the frontend
            const checkPaths = [
                path.join(process.cwd(), 'data', 'generated-images', testId, `${uuid}.png`),
                path.join(process.cwd(), 'data', 'generated-images', testId, `${uuid.split('_').pop()}.png`) // Try bare UUID
            ];

            let isGenerated = false;
            let isPublished = false;

            for (const localPath of checkPaths) {
                try {
                    await fs.access(localPath);
                    isGenerated = true; // Local file exists
                    break;
                } catch (e) {
                    // Check for draft UUID_*.png
                    try {
                        const dir = path.dirname(localPath);
                        try { await fs.access(dir); } catch { continue; }

                        const files = await fs.readdir(dir);
                        const fileName = path.basename(localPath, '.png');

                        if (files.some(f => f.startsWith(fileName + '_') && f.endsWith('.png'))) {
                            isGenerated = true; // Draft exists
                        }
                    } catch (err) { }
                }
            }

            const hasRemoteImage = !!q.image_path || !!q.image_url_original || !!q.image_url;

            return {
                id: uuid,
                external_id: uuid,
                question_ru: q.question?.ru || q.question_ru || "",
                question_es: q.question?.es || q.question_es || "",
                has_image: hasRemoteImage,
                image_ready: isGenerated || hasRemoteImage, // Key metric for coverage
                is_generated: isGenerated,
                is_published: false // Default to false, will be set by DB check below
            };
        }));

        // SUPPLEMENTAL DB CHECK (Only source of truth for Production status)
        const validIds = questionsList.map(q => q.external_id).filter(id => id && id.length > 20);
        if (validIds.length > 0) {
            try {
                const { data: dbData } = await supabase
                    .from('questions_new')
                    .select('id, image_url')
                    .in('id', validIds);

                if (dbData) {
                    const dbMap = new Set(dbData.map(r => r.id)); // Just existence in DB is enough to be "Published"
                    console.log(`[DB Check] Found ${dbMap.size} questions in DB for test ${testId}`);

                    questionsList.forEach(q => {
                        // Check exact match
                        if (dbMap.has(q.external_id)) {
                            q.is_published = true;
                        }
                        // Check without prefix (if somehow stored differently)
                        else if (q.external_id && q.external_id.includes('_') && dbMap.has(q.external_id.split('_').pop())) {
                            q.is_published = true;
                        }
                    });
                } else {
                    console.log(`[DB Check] No data found in questions_new for IDs: ${validIds.slice(0, 3)}...`);
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

// DELETE or ARCHIVE Candidate Image
app.delete('/api/candidates/:testId/:filename', async (req, res) => {
    try {
        const { testId, filename } = req.params;
        const { action } = req.query; // 'trash' or 'archive'

        const imagePath = path.join(process.cwd(), 'data', 'generated-images', testId, filename);

        // Find associated prompt file (try both .prompt.txt and .txt)
        const promptPath = imagePath.replace('.png', '.prompt.txt');
        const txtPath = imagePath.replace('.png', '.txt');

        // Target Directories
        const trashDir = path.join(process.cwd(), '_DELETED_ITEMS');
        const poolDir = path.join(process.cwd(), 'data', 'rejected-pool');

        const targetDir = action === 'archive' ? poolDir : trashDir;
        await fs.mkdir(targetDir, { recursive: true });

        // Check if file exists
        try {
            await fs.access(imagePath);
        } catch (e) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Rename logic
        // We append timestamp to ensure uniqueness in the flat pool/trash
        const timestamp = Date.now();
        const baseName = path.basename(filename, '.png');
        const newImageName = `${baseName}_${testId}_${timestamp}.png`;

        await fs.rename(imagePath, path.join(targetDir, newImageName));

        // 2. Prompt (if exists)
        try {
            if (fs.existsSync(promptPath)) {
                await fs.rename(promptPath, path.join(targetDir, newImageName.replace('.png', '.prompt.txt')));
            } else if (fs.existsSync(txtPath)) {
                await fs.rename(txtPath, path.join(targetDir, newImageName.replace('.png', '.txt')));
            }
        } catch (e) { }

        res.json({ success: true, movedTo: targetDir });

    } catch (e) {
        console.error('Delete error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint to find and copy existing images from other tests for the same questions (Deduplication)
app.post('/api/test/:testId/sync-images', async (req, res) => {
    const { testId } = req.params;
    console.log(`[Sync] Starting sync for ${testId}...`);

    try {
        // АРХИТЕКТУРА: Skip rebuild search index here to avoid timeout (it is built on start)
        // console.log(`[Sync] 🔄 Rebuilding search index for accurate matching...`);
        // await buildSearchIndex();

        // 1. Load questions for the target test to get UUIDs
        let questions = [];
        // Try getting enriched first
        const enrichedPath = path.join(process.cwd(), 'data', 'parsed', testId.split('_')[0], `${testId}-enriched.json`);
        try {
            const data = await fs.readFile(enrichedPath, 'utf8');
            questions = JSON.parse(data);
        } catch (e) {
            // Fallback: try raw json
            console.log("[Sync] Enriched file not found/invalid, trying raw...");
            try {
                const rawPath = path.join(process.cwd(), 'data', 'parsed', testId.split('_')[0], `${testId}.json`);
                const rawData = await fs.readFile(rawPath, 'utf8');
                questions = JSON.parse(rawData);
            } catch (err) {
                console.error("[Sync] Failed to load questions:", err.message);
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
        const restoredIds = [];

        for (const dir of testDirs) {
            if (dir === testId) continue; // Skip self
            if (dir.startsWith('.')) continue; // Skip .DS_Store
            if (missingUuids.size === 0) break; // All found

            const sourceDir = path.join(imagesRoot, dir);
            const stats = await fs.stat(sourceDir);
            if (!stats.isDirectory()) continue;

            const files = await fs.readdir(sourceDir);

            // Create a Set of available files in this source dir for fast lookup
            const availableFiles = new Set(files);

            // Iterate through missing questions (UUIDs)
            for (const missingUuid of Array.from(missingUuids)) {

                // 1. Try EXACT ID Match (Legacy)
                let targetIdToSearch = missingUuid;

                // 2. Try TEXT CONTENT Match (Smart Deduplication with Fuzzy Matching)
                // Find the question data for the missing UUID
                const missingQ = questions.find(q => (q.external_id || q.id) === missingUuid);

                if (missingQ) {
                    const missingText = missingQ.question?.es || missingQ.question?.ru || '';

                    if (missingText.length > 10) {
                        // АРХИТЕКТУРА: Use Fuse.js for fuzzy matching
                        const fuse = new Fuse(GLOBAL_SEARCH_INDEX, {
                            keys: ['question_es', 'question_ru'],
                            threshold: 0.2, // 0.0 = exact, 1.0 = anything
                            ignoreLocation: true,
                            minMatchCharLength: 10
                        });

                        const fuzzyResults = fuse.search(missingText);

                        // Find first result that is NOT the same question
                        const duplicate = fuzzyResults.find(result => result.item.id !== missingUuid);

                        if (duplicate) {
                            targetIdToSearch = duplicate.item.id;
                            console.log(`[Sync] 🎯 Fuzzy match: "${missingText.substring(0, 50)}..." -> ${duplicate.item.id} (score: ${duplicate.score.toFixed(3)})`);
                        }
                    }
                }

                // Now look for image for strict ID match OR content match
                // We want to find best match for targetIdToSearch
                // 1. Exact match: UUID.png
                // 2. Candidate match: UUID_timestamp.png (pick latest)

                let bestMatch = null;
                let latestTime = 0;

                // Check specific files relevant to the ID we are looking for
                // Optimization: Iterate files only if we haven't found match
                for (const file of files) {
                    if (!file.endsWith('.png')) continue;

                    // Match strict ID
                    if (file === `${targetIdToSearch}.png`) {
                        bestMatch = file;
                        break;
                    }

                    // Match timestamped ID
                    if (file.startsWith(`${targetIdToSearch}_`)) {
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
                    // Copy to TARGET using the MISSING UUID (restore as the current question's image)
                    const targetFile = path.join(targetDir, `${missingUuid}.png`);

                    await fs.copyFile(sourceFile, targetFile);
                    console.log(`[Sync] Restored ${missingUuid} (via match ${targetIdToSearch}) from ${dir}/${bestMatch}`);

                    missingUuids.delete(missingUuid);
                    copiedCount++;
                    restoredIds.push(missingUuid);
                }
            }
        }

        res.json({
            synced: copiedCount,
            restoredIds,
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
    let queryId;
    let id;
    try {
        id = req.params.id;
        queryId = id;

        // Handle composite IDs from search (extract UUID from end)
        const uuidMatch = id.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/);
        if (uuidMatch) {
            queryId = uuidMatch[1];
        }

        let questionData = null;

        // Validate UUID to prevent DB type errors
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId);

        if (isUuid) {
            // First try questions_new with proper answer_options JOIN
            const { data, error } = await supabase
                .from('questions_new')
                .select('*')
                .eq('id', queryId) // In questions_new, ID is the UUID
                .maybeSingle();

            if (error) throw error;
            questionData = data;
        }

        // If not found by UUID in new table
        // let questionData = data; (Removed, already assigned)

        // Add fallback for integer ID lookups if needed, but for now we rely on UUID match

        if (questionData) {
            // Fetch answer_options separately
            const { data: answers, error: answersError } = await supabase
                .from('answer_options')
                .select('*')
                .eq('question_id', questionData.id)
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

            // NORMALIZE FLAT DB COLUMNS TO NESTED OBJECTS (For Frontend Compatibility)
            const normalizedQuestion = {
                ...questionData,
                question: questionData.question || {
                    ru: questionData.question_ru,
                    es: questionData.question_es,
                    en: questionData.question_en
                },
                explanation: questionData.explanation || {
                    ru: questionData.explanation_ru,
                    es: questionData.explanation_es,
                    en: questionData.explanation_en
                },
                answer_options: formattedAnswers
            };

            return res.json({
                question: normalizedQuestion,
                table: 'questions_new'
            });
        }

        // Fallback: Read from local JSON files if not in DB
        if (!questionData) {
            try {
                // Parse testId from identifier (e.g. topic-02_test-003_UUID)
                const testIdMatch = id.match(/(topic-[^_]+)_test-([^_]+)/);
                if (testIdMatch) {
                    const topic = testIdMatch[1];
                    const testName = `${topic}_test-${testIdMatch[2]}`;
                    const paths = [
                        path.join(process.cwd(), 'data', 'parsed', topic, `${testName}-enriched.json`),
                        path.join(process.cwd(), 'data', 'parsed', topic, `${testName}.json`),
                        // Try data/topic/file
                        path.join(process.cwd(), 'data', topic, `${testName}-enriched.json`),
                        path.join(process.cwd(), 'data', topic, `${testName}.json`),
                        // Try root data/file
                        path.join(process.cwd(), 'data', `${testName}-enriched.json`),
                        path.join(process.cwd(), 'data', `${testName}.json`)
                    ];

                    for (const p of paths) {
                        try {
                            const content = await fs.readFile(p, 'utf8');
                            const json = JSON.parse(content);
                            const questions = Array.isArray(json) ? json : json.questions;

                            // Find by UUID or ID (with generation if missing)
                            const q = questions?.find((item, index) => {
                                let itemId = item.external_id || item.id;

                                if (!itemId && item.image_url) {
                                    const match = item.image_url.match(/\/question\/([a-f0-9-]{36})/);
                                    if (match) itemId = match[1];
                                }

                                if (!itemId) {
                                    if (item.question_number) {
                                        itemId = uuidv5(`${testName}_q-${item.question_number}`, NAMESPACE);
                                    } else {
                                        itemId = `${testName}_q${index + 1}`;
                                    }
                                }

                                // 1. Direct match (UUID vs UUID)
                                if (String(itemId) === String(queryId)) return true;

                                // 2. Composite match (UUID in file vs Composite Query)
                                // If queryId includes the testName, we check if it ends with the itemId
                                if (queryId.includes(testName) && queryId.endsWith(itemId)) return true;

                                return false;
                            });

                            if (q) {
                                // CRITICAL FIX: Ensure the returned question has the Composite ID
                                // The frontend relies on parsing "topic-XX_test-YY_UUID" to know the test context.
                                // The raw 'q' object only has the bare UUID.
                                // We overwrite/set 'id' to the queryId (which is the Composite ID we successfully matched against).
                                const questionWithCompositeId = {
                                    ...q,
                                    id: queryId // This ensures MissionImageControl can split(testId_uuid) correctly
                                };

                                return res.json({
                                    question: questionWithCompositeId,
                                    source: 'file',
                                    sourceFile: p,
                                    // Mock answer_options structure for frontend compatibility
                                    answer_options: q.answers?.map((a, idx) => ({
                                        id: idx + 1,
                                        text: a.text,
                                        is_correct: a.is_correct
                                    }))
                                });
                            }
                        } catch (e) { } // Ignore file read errors
                    }
                }
            } catch (e) {
                console.warn('File fallback error:', e);
            }

            return res.status(404).json({ error: 'Question not found anywhere' });
        }

    } catch (error) {
        console.error('Error fetching from DB:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update text content
// Update text content (Syncs DB and Local File)
app.post('/api/db/update-text', async (req, res) => {
    try {
        const { id, testId, country = 'spain', question_ru, question_es, question_en, explanation_ru, explanation_es, explanation_en, answer_options, table } = req.body;

        if (!id) throw new Error('No ID provided');

        if (country === 'russia') {
            console.log(`[UPDATE RU] Question ID: ${id}`);

            // Update Main
            const { error: qErr } = await supabase
                .from('pdd_russia_questions')
                .update({
                    question_text: question_ru,
                    explanation: explanation_ru,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (qErr) throw qErr;

            // Update Answers
            if (answer_options && Array.isArray(answer_options)) {
                await supabase.from('pdd_russia_answers').delete().eq('question_id', id);
                const toInsert = answer_options.map((opt, idx) => ({
                    question_id: id,
                    answer_text: opt.text?.ru || '',
                    is_correct: opt.is_correct || false,
                    position: idx + 1
                }));
                await supabase.from('pdd_russia_answers').insert(toInsert);
            }

            return res.json({ success: true, message: 'Russia question updated in DB' });
        }

        // Spain Logic (existing)
        const updateData = {
            question_ru,
            question_es,
            question_en,
            explanation_ru,
            explanation_es,
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

        // Handle composite UUIDs (e.g. topic-02_test-002_560d...)
        const bareUuid = uuid.includes('_') ? uuid.split('_').pop() : uuid;
        const searchUuids = [uuid];
        if (bareUuid !== uuid) searchUuids.push(bareUuid);

        for (const file of files) {
            if (!file.endsWith('.png')) continue; // Only source pngs are candidates

            let isMatch = false;
            let matchedUuid = null;

            for (const searchId of searchUuids) {
                // Check if file match: either exact searchId.png OR searchId_timestamp...
                const isExact = file === `${searchId}.png`;
                const isVersion = file.startsWith(searchId + '_') && file.match(new RegExp(`^${searchId}_\\d+(?:_[a-zA-Z0-9]+)?\\.png$`));

                if (isExact || isVersion) {
                    isMatch = true;
                    matchedUuid = searchId;
                    break;
                }
            }

            if (isMatch) {
                const stat = await fs.stat(path.join(dir, file));

                let model = 'Gen AI'; // Default
                if (file.includes('_pro')) model = 'Gemini 3 Pro';
                if (file.includes('_flash')) model = 'Gemini Flash';
                if (file.includes('manual')) model = 'Manual';

                candidates.push({
                    filename: file,
                    path: path.join('data/generated-images', testId, file), // Relative path for frontend
                    url: `http://localhost:${PORT}/generated-images/${testId}/${file}`, // Use middleware URL
                    timestamp: stat.mtimeMs,
                    size: stat.size,
                    isMain: file === `${matchedUuid}.png` || file === `${uuid}.png`,
                    model: model
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

// Open file in Editor
app.post('/api/open-file', async (req, res) => {
    try {
        const { path: filePath, id } = req.body;
        if (!filePath) return res.status(400).json({ error: 'No path provided' });

        // Find line number
        let lineNumber = 1;
        if (id) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const lines = content.split('\n');
                const idx = lines.findIndex(line => line.includes(id));
                if (idx !== -1) lineNumber = idx + 1;
            } catch (readErr) {
                console.warn('[Open] Could not calculate line number:', readErr.message);
            }
        }

        console.log(`[Open] Opening ${filePath}:${lineNumber}`);

        // Use 'cursor://' URL scheme to open in Cursor at specific line
        // Command: open "cursor://file/FULL_PATH:LINE"
        const command = `open "cursor://file/${filePath}:${lineNumber}"`;

        require('child_process').exec(command, (error) => {
            if (error) {
                console.error('[Open] URL scheme failed, trying fallback:', error);
                // Fallback: default OS open
                require('child_process').exec(`open "${filePath}"`);
            }
        });

        res.json({ success: true });
    } catch (e) {
        console.error('[Open] Failed:', e);
        res.status(500).json({ error: e.message });
    }
});
// ========================================
// NEW: Get full question details by ID
// ========================================
app.get('/api/question/:questionId/full', async (req, res) => {
    try {
        const { questionId } = req.params;
        const country = req.query.country || 'spain';

        if (country === 'russia') {
            // questionId could be source_id or PK
            let query = supabase.from('pdd_russia_questions').select('*, pdd_russia_answers(*)');

            if (questionId.length > 30) { // source_id
                query = query.eq('source_id', questionId);
            } else {
                query = query.eq('id', questionId);
            }

            const { data: q, error } = await query.maybeSingle();
            if (error) throw error;
            if (!q) return res.status(404).json({ error: 'Russia question not found' });

            // Map to Mission Control layout
            const mapped = {
                id: String(q.id),
                external_id: q.source_id,
                question: { ru: q.question_text, es: '', en: '' },
                explanation: { ru: q.explanation || '', es: '', en: '' },
                answers: q.pdd_russia_answers?.map(a => ({
                    text: { ru: a.answer_text, es: '', en: '' },
                    is_correct: a.is_correct
                })) || []
            };

            return res.json({ question: mapped });
        }

        // Spain Logic (existing)
        const parts = questionId.split('_');
        const uuid = parts[parts.length - 1];

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

// ========================================
// DEBUG: Check Missing Questions
// ========================================
app.get('/api/debug/check-missing/:topic/:test', async (req, res) => {
    try {
        const { topic, test } = req.params;
        const jsonPath = path.join(process.cwd(), `data/parsed/${topic}/${topic}_${test}-enriched.json`);

        console.log(`[Debug] Checking missing questions for ${topic} / ${test}...`);

        // 1. Read JSON
        const content = await fs.readFile(jsonPath, 'utf8');
        const questions = JSON.parse(content);
        console.log(`[Debug] Found ${questions.length} questions in local file.`);

        // 2. Extract IDs
        const localIds = questions.map(q => q.external_id || q.id);

        // 3. Query Supabase (We need the topic UUID first)
        // Ideally we should know the topic UUID. Let's find it by order_index if possible, or just search questions by looking up topic first.
        const topicNumber = parseInt(topic.replace('topic-', ''), 10);

        const { data: topicData, error: topicError } = await supabase
            .from('topics')
            .select('id')
            .eq('order_index', topicNumber)
            .single();

        if (topicError) throw new Error(`Topic not found: ${topicError.message}`);

        const { data: dbQuestions, error: dbError } = await supabase
            .from('questions_new')
            .select('id')
            .eq('topic_id', topicData.id);

        if (dbError) throw new Error(`DB Error: ${dbError.message}`);

        const dbIds = new Set(dbQuestions.map(q => q.id));

        // 4. Compare
        const missing = questions
            .filter(q => !dbIds.has(q.external_id || q.id))
            .map(q => ({
                number: q.question_number,
                id: q.external_id || q.id,
                text: q.question.es.substring(0, 50) + '...'
            }));

        res.json({
            success: true,
            totalLocal: questions.length,
            totalInDbForTopic: dbQuestions.length,
            missingCount: missing.length,
            missing
        });

    } catch (e) {
        console.error('[Debug] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// IMAGE GALLERY API (for manual selection)
// ==========================================

// Get all images grouped by topic
// Cache for questions map
let _questionsMapCache = null;
async function getCachedQuestionsMap() {
    if (!_questionsMapCache) {
        console.log('🔄 Loading questions map for gallery...');
        _questionsMapCache = await loadQuestionData();
    }
    return _questionsMapCache;
}

// Get all images grouped by topic
app.get('/api/gallery/images', async (req, res) => {
    try {
        const imagesRoot = path.join(process.cwd(), 'data', 'generated-images');
        const testDirs = await fs.readdir(imagesRoot);

        // Preload questions for search
        const questionsMap = await getCachedQuestionsMap();

        const gallery = {};

        for (const dir of testDirs) {
            if (dir.startsWith('.')) continue;

            const topicMatch = dir.match(/^(topic-\d+|essential_test|dgt_test|rejected-pool)/);
            if (!topicMatch) continue;

            const topic = topicMatch[1];
            if (!gallery[topic]) {
                gallery[topic] = { tests: {} };
            }

            const testDir = path.join(imagesRoot, dir);
            const stats = await fs.stat(testDir);
            if (!stats.isDirectory()) continue;

            const files = await fs.readdir(testDir);
            const images = [];

            for (const file of files) {
                if (!file.endsWith('.png')) continue;

                // Extract UUID from filename (before timestamp if present)
                const uuidMatch = file.match(/^([a-f0-9-]{36})/);
                if (!uuidMatch) continue;

                const uuid = uuidMatch[1];
                const filePath = path.join(testDir, file);
                const fileStats = await fs.stat(filePath);

                const question = questionsMap.get(uuid);
                const text = question ?
                    (question.question_es || '') + ' ' + (question.question_ru || '') :
                    '';

                images.push({
                    uuid,
                    filename: file,
                    testId: dir,
                    url: `/generated-images/${dir}/${file}`,
                    size: fileStats.size,
                    modified: fileStats.mtime,
                    // Add text for search
                    text: normalizeText(text)
                });
            }

            if (images.length > 0) {
                gallery[topic].tests[dir] = images;
            }
        }

        res.json(gallery);
    } catch (e) {
        console.error('[Gallery] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Copy selected image to target question
app.post('/api/gallery/copy-image', async (req, res) => {
    try {
        const { sourceTestId, sourceFilename, targetTestId, targetUuid } = req.body;

        if (!sourceTestId || !sourceFilename || !targetTestId || !targetUuid) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const sourceFile = path.join(process.cwd(), 'data', 'generated-images', sourceTestId, sourceFilename);
        const targetDir = path.join(process.cwd(), 'data', 'generated-images', targetTestId);
        await fs.mkdir(targetDir, { recursive: true });

        const targetFile = path.join(targetDir, `${targetUuid}.png`);

        await fs.copyFile(sourceFile, targetFile);

        console.log(`[Gallery] Copied ${sourceTestId}/${sourceFilename} -> ${targetTestId}/${targetUuid}.png`);

        res.json({
            success: true,
            message: 'Image copied successfully',
            targetPath: `/generated-images/${targetTestId}/${targetUuid}.png`
        });
    } catch (e) {
        console.error('[Gallery] Copy error:', e);
        res.status(500).json({ error: e.message });
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
