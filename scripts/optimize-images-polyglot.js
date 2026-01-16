import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const PARSED_DIR = path.resolve(__dirname, '../data/parsed');
const GENERATED_IMAGES_DIR = path.resolve(__dirname, '../data/generated-images');
const OUTPUT_DIR = path.resolve(__dirname, '../data/optimized-images');

// SETTINGS (Optimized for Mobile Performance)
const TARGET_WIDTH = 1200; // Reduced from 1600 for faster loading
const QUALITY = 75; // Sweet spot: quality vs size (was 90)
const WATERMARK_SCALE = 0.08;
const PADDING_PX = 40;

/**
 * 🌍 POLYGLOT SEO METADATA GENERATOR
 * 
 * Generates multi-language metadata for maximum international SEO reach
 * Strategy: ES (locals) + EN (expats) + RU (niche)
 */
function generatePolyglotMetadata(questionData, topicName = 'DGT Test') {
    // Extract question texts (truncate if too long)
    const qES = (questionData.question?.es || '').substring(0, 150);
    const qEN = (questionData.question?.en || '').substring(0, 150);
    const qRU = (questionData.question?.ru || '').substring(0, 150);

    const questionNum = questionData.question_number || 1;
    const topicNum = questionData.topic_number || 1;

    // 1. TITLE (ES + EN split strategy)
    const title = `Test DGT 2026: Pregunta ${questionNum} | Driving License Spain - Topic ${topicNum}`;

    // 2. DESCRIPTION ("Layered Cake" with emoji flags)
    const description = `🇪🇸 Examen DGT 2026 - Tema ${topicNum}. Pregunta: ${qES}...

🇬🇧 Spanish Driving Test 2026 - Topic ${topicNum}. Question: ${qEN}...

🇷🇺 Экзамен DGT Испания 2026 - Тема ${topicNum}. Вопрос: ${qRU}...

👉 Practice now / Practica ahora / Практикуйся: https://skilyapp.com`;

    // 3. KEYWORDS ("Salad" strategy - mix all languages)
    const keywords = [
        // Brand
        'SkilyApp', 'Skily', '2026',
        // ES (locals)
        'DGT', 'permiso B', 'carnet conducir', 'examen coche', 'autoescuela', 'teorica',
        'normas trafico', 'seguridad vial', 'España',
        // EN (expats)
        'driving license Spain', 'traffic rules Spain', 'DGT test english',
        'driving theory', 'spanish road rules', 'driving in Spain',
        // RU (niche)
        'права в Испании', 'экзамен DGT', 'ПДД Испании', 'вождение Испания',
        'водительское удостоверение', 'теория вождения'
    ].join(', ');

    return {
        title,
        description,
        keywords,
        questionNumber: questionNum,
        topicNumber: topicNum
    };
}

/**
 * WATERMARK GENERATOR (75% Opacity Blue Logo)
 */
function generateWatermarkSvg(width) {
    const height = Math.round(width * 0.32);

    return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 200 52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blue_gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#3b82f6" />
            <stop offset="50%" stop-color="#2563eb" />
            <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
        <linearGradient id="innerGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="0.1" />
            <stop offset="100%" stop-color="white" stop-opacity="0" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="black" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <g filter="url(#shadow)" opacity="0.6">
          <rect x="1" y="1" width="50" height="50" rx="14" fill="url(#blue_gradient)" />
          <rect x="1" y="1" width="50" height="50" rx="14" fill="url(#innerGlow)" />
          
          <g transform="translate(15, 15) scale(0.85)" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
             <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" />
             <path d="M7 14h.01" />
             <path d="M17 14h.01" />
             <rect width="18" height="8" x="3" y="10" rx="2" />
             <path d="M5 18v2" />
             <path d="M19 18v2" />
          </g>

          <text x="62" y="38" 
                font-family="Inter, -apple-system, system-ui, sans-serif" 
                font-weight="900" 
                font-size="28" 
                letter-spacing="-1" 
                fill="white">SkilyApp.com</text>
      </g>
    </svg>
    `);
}

/**
 * OPTIMIZE IMAGE with Polyglot Metadata
 */
async function optimizeImage(inputPath, outputPath, questionData) {
    try {
        const image = sharp(inputPath);

        const wmWidth = Math.round(TARGET_WIDTH * WATERMARK_SCALE);
        const watermarkBuffer = await sharp(generateWatermarkSvg(wmWidth)).toBuffer();

        const wmPadded = await sharp(watermarkBuffer)
            .extend({
                top: 0, bottom: PADDING_PX,
                left: 0, right: PADDING_PX,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        // Generate Polyglot Metadata
        const meta = generatePolyglotMetadata(questionData);
        const currentDate = new Date().toISOString();

        await sharp(await image.resize({ width: TARGET_WIDTH }).toBuffer())
            .composite([
                { input: wmPadded, gravity: 'southeast' }
            ])
            .withMetadata({
                exif: {
                    IFD0: {
                        // Copyright & Ownership
                        Copyright: `© 2025 SkilyApp.com - All Rights Reserved - Q${meta.questionNumber}`,
                        Artist: 'SkilyApp AI Platform',
                        ImageDescription: meta.description,
                        Software: 'SkilyApp Polyglot Engine v1.0',

                        // SEO Power
                        Make: 'SkilyApp',
                        Model: `DGT Topic ${meta.topicNumber} - Question ${meta.questionNumber}`,
                        DocumentName: meta.title,
                    }
                },
                // IPTC metadata (Polyglot SEO)
                iptc: {
                    'headline': meta.title,
                    'caption': meta.description,
                    'keywords': meta.keywords,
                    'copyright notice': 'SkilyApp.com',
                    'creator': 'SkilyApp AI',
                    'source': 'https://skilyapp.com',
                    'credit': 'SkilyApp Educational Platform',
                    'usage terms': 'Licensed for SkilyApp users only',
                    'date created': currentDate,
                    'category': 'Education',
                    'supplemental category': 'Traffic Rules, Driving License, DGT Spain'
                }
            })
            .webp({
                quality: QUALITY,
                effort: 6, // Max compression effort (0-6)
                smartSubsample: true // Better compression for photos
            })
            .toFile(outputPath);

        return true;
    } catch (error) {
        console.error(`❌ ${path.basename(inputPath)}:`, error.message);
        return false;
    }
}

/**
 * MAIN PROCESSING FUNCTION
 */
async function main() {
    const args = process.argv.slice(2);
    const testFilter = args.find(a => !a.startsWith('--'));

    console.log(`🌍 SkilyApp Polyglot SEO Image Pipeline`);
    console.log(`   Strategy: ES (locals) + EN (expats) + RU (niche)`);
    console.log(`   Watermark: 75% opacity blue logo`);
    console.log(`   Metadata: Multi-language title, description, keywords\n`);

    // Find all enriched JSON files
    const topics = await fs.readdir(PARSED_DIR, { withFileTypes: true });

    for (const topicDir of topics) {
        if (!topicDir.isDirectory()) continue;

        const topicPath = path.join(PARSED_DIR, topicDir.name);
        const files = await fs.readdir(topicPath);

        for (const file of files) {
            if (!file.endsWith('-enriched.json')) continue;
            if (testFilter && !file.includes(testFilter)) continue;

            const testName = file.replace('-enriched.json', '');
            console.log(`\n📚 Processing: ${testName}`);

            // Read question data
            const jsonPath = path.join(topicPath, file);
            const jsonContent = await fs.readFile(jsonPath, 'utf-8');
            const questions = JSON.parse(jsonContent);

            // Process each question's image
            const srcFolder = path.join(GENERATED_IMAGES_DIR, testName);
            const destFolder = path.join(OUTPUT_DIR, testName);

            try {
                await fs.mkdir(destFolder, { recursive: true });
            } catch (e) {
                // Folder exists
            }

            let processedCount = 0;

            for (const question of questions) {
                const questionNum = question.question_number;
                const externalId = question.external_id;

                if (!externalId) {
                    continue; // Skip questions without external_id
                }

                const imageFileName = `${externalId}.png`;
                const srcPath = path.join(srcFolder, imageFileName);
                const destPath = path.join(destFolder, imageFileName.replace('.png', '.webp'));

                try {
                    await fs.access(srcPath);
                    await optimizeImage(srcPath, destPath, question);
                    processedCount++;
                    process.stdout.write(`\r   📸 Processing: ${processedCount}/${questions.length} images...`);
                } catch (err) {
                    // Image doesn't exist, skip silently
                }
            }

            console.log(`✅ Processed ${processedCount} images with polyglot metadata`);
        }
    }

    console.log(`\n🎉 Polyglot SEO pipeline complete!`);
    console.log(`📊 Your images are now optimized for international search!`);
}

main().catch(console.error);
