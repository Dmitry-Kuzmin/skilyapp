import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const INPUT_DIR = path.resolve(__dirname, '../data/generated-images');
const OUTPUT_DIR = path.resolve(__dirname, '../data/optimized-images');

// SETTINGS (Mobile Optimized)
const TARGET_WIDTH = 1600;
const QUALITY = 88;
const WATERMARK_SCALE = 0.20; // 20% от ширины
const PADDING_PX = 40;

/**
 * PROFESSIONAL WATERMARK (Skily Only - 100% Opacity)
 * 
 * Design: Original blue gradient logo with full opacity
 * - Blue gradient background (brand recognition)
 * - 100% opacity (maximum visibility)
 * - "Skily" brand name
 * 
 * Source: public/logo/skily-logo-current.svg
 */
function generateWatermarkSvg(width) {
    // Aspect ratio needs to be maintained based on content
    // Original: 200x52 for "SkilyApp.com"
    // New: "Skily" is shorter, so we reduce the width to keep the icon:text ratio tight.
    // Icon takes ~52px width. Gap 10px. Text "Skily" ~60-70px. Total ~130.
    const viewBoxWidth = 140;
    const viewBoxHeight = 52;
    const height = Math.round(width * (viewBoxHeight / viewBoxWidth));

    return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg">
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
      
      <g filter="url(#shadow)" opacity="1.0">
          <!-- Blue rounded square -->
          <rect x="1" y="1" width="50" height="50" rx="14" fill="url(#blue_gradient)" />
          <rect x="1" y="1" width="50" height="50" rx="14" fill="url(#innerGlow)" />
          
          <!-- Car-front icon -->
          <g transform="translate(15, 15) scale(0.85)" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
             <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" />
             <path d="M7 14h.01" />
             <path d="M17 14h.01" />
             <rect width="18" height="8" x="3" y="10" rx="2" />
             <path d="M5 18v2" />
             <path d="M19 18v2" />
          </g>

          <!-- Text "Skily" -->
          <text x="62" y="38" 
                font-family="Inter, -apple-system, system-ui, sans-serif" 
                font-weight="900" 
                font-size="28" 
                letter-spacing="-1" 
                fill="white">Skily</text>
      </g>
    </svg>
    `);
}

async function optimizeImage(inputPath, outputPath) {
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

        // Multi-layer protection: Comprehensive metadata
        const currentDate = new Date().toISOString();

        await sharp(await image.resize({ width: TARGET_WIDTH }).toBuffer())
            .composite([
                { input: wmPadded, gravity: 'southeast' }
            ])
            .withMetadata({
                exif: {
                    IFD0: {
                        // Copyright & Ownership
                        Copyright: '© 2025 SkilyApp.com - All Rights Reserved',
                        Artist: 'SkilyApp AI Platform',
                        ImageDescription: 'Official SkilyApp Educational Content - Spanish DGT Driving Test',
                        Software: 'SkilyApp Image Engine v1.0',

                        // Contact & Source
                        Make: 'SkilyApp',
                        Model: 'AI Generated Educational Content',
                    }
                },
                // IPTC metadata for professional protection & SEO
                iptc: {
                    'copyright notice': 'SkilyApp.com',
                    'creator': 'SkilyApp AI',
                    'source': 'https://skilyapp.com',
                    'credit': 'SkilyApp Educational Platform',
                    'usage terms': 'Licensed for SkilyApp users only',
                    'date created': currentDate
                }
            })
            .webp({ quality: QUALITY, effort: 6 })
            .toFile(outputPath);

        return true;
    } catch (error) {
        console.error(`❌ ${path.basename(inputPath)}:`, error.message);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const filter = args.find(a => !a.startsWith('--'));

    console.log(`🚀 Image Pipeline: Professional Watermark (100% Opacity)`);
    console.log(`   - Original blue gradient logo`);
    console.log(`   - 100% opacity for maximum visibility`);
    console.log(`   - "Skily" brand name`);

    const entries = await fs.readdir(INPUT_DIR, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'Old' || entry.name === 'originals') continue;
        if (filter && !entry.name.includes(filter)) continue;

        const srcFolder = path.join(INPUT_DIR, entry.name);
        const destFolder = path.join(OUTPUT_DIR, entry.name);
        await fs.mkdir(destFolder, { recursive: true });

        const files = await fs.readdir(srcFolder);
        console.log(`\n📂 ${entry.name} (${files.length} images)`);

        for (const file of files) {
            if (!file.endsWith('.png') && !file.endsWith('.jpg')) continue;
            const srcPath = path.join(srcFolder, file);
            const destPath = path.join(destFolder, file.replace(/\.(png|jpg|jpeg)$/i, '.webp'));

            await optimizeImage(srcPath, destPath);
        }
    }
    console.log(`\n✅ Done! Professional watermarks applied.`);
}

main().catch(console.error);
