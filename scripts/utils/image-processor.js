import sharp from 'sharp';

const TARGET_WIDTH = 1200;
const QUALITY = 75;
const WATERMARK_SCALE = 0.20;
const PADDING_PX = 40;

/**
 * 🌍 POLYGLOT SEO METADATA GENERATOR
 * Generates multi-language metadata for maximum international SEO reach
 */
function generatePolyglotMetadata(questionData, topicName) {
    // Safety check for questionData
    if (!questionData) return {};

    // Extract question texts (truncate if too long)
    const qES = (questionData.question?.es || '').substring(0, 150) || (questionData.question_es || '').substring(0, 150);
    const qEN = (questionData.question?.en || '').substring(0, 150) || (questionData.question_en || '').substring(0, 150);
    const qRU = (questionData.question?.ru || '').substring(0, 150) || (questionData.question_ru || '').substring(0, 150);

    const questionNum = questionData.question_number || questionData.id?.split('_').pop()?.substring(0, 4) || '001';

    // Parse topic name from ID if provided (e.g. topic-01)
    let safeTopic = topicName || 'DGT General';
    if (!topicName && questionData.id) {
        const match = questionData.id.match(/topic-\d+/);
        if (match) safeTopic = match[0];
    }

    // 1. TITLE (ES + EN split strategy)
    const title = `Test DGT 2026: Pregunta ${questionNum} | Driving License Spain - ${safeTopic}`;

    // 2. DESCRIPTION ("Layered Cake" with emoji flags)
    const description = `🇪🇸 Examen DGT 2026 - ${safeTopic}. Pregunta: ${qES}...
🇬🇧 Spanish Driving Test 2026 - ${safeTopic}. Question: ${qEN}...
🇷🇺 Экзамен DGT Испания 2026 - ${safeTopic}. Вопрос: ${qRU}...

👉 Practice now / Practica ahora / Практикуйся: https://skilyapp.com`;

    // 3. KEYWORDS ("Salad" strategy - mix all languages)
    const keywords = [
        "DGT 2026", "Examen Conducir", "Autoescuela", "SkilyApp",
        "Tráfico", "Permiso B", safeTopic,
        "driving license Spain", "traffic rules",
        "права в Испании", "ПДД Испании"
    ];

    return {
        title,
        description,
        keywords,
        questionNum,
        topicName: safeTopic
    };
}

function generateWatermarkSvg(width) {
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
          <text x="62" y="38" font-family="Inter, -apple-system, system-ui, sans-serif" font-weight="900" font-size="28" letter-spacing="-1" fill="white">Skily</text>
      </g>
    </svg>
    `);
}

/**
 * Optimize image: resize, add watermark, compress to WebP, add metadata
 */
export async function processImageForUpload(inputBuffer, questionData, testId) {
    try {
        const image = sharp(inputBuffer);
        const meta = generatePolyglotMetadata(questionData || {}, testId);
        const currentDate = new Date().toISOString();

        const wmWidth = Math.round(TARGET_WIDTH * WATERMARK_SCALE);
        const watermarkBuffer = await sharp(generateWatermarkSvg(wmWidth)).toBuffer();

        const wmPadded = await sharp(watermarkBuffer)
            .extend({
                top: 0, bottom: PADDING_PX,
                left: 0, right: PADDING_PX,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        // NOTE: Sharp's withMetadata applies standard EXIF/IPTC. 
        // For custom XMP we rely on Sharp translating these where possible.
        // We map the user's requested "XMP:Title" to standard standard Exif/IPTC fields which parsers read.

        const optimizedBuffer = await sharp(await image.resize({ width: TARGET_WIDTH }).toBuffer())
            .composite([
                { input: wmPadded, gravity: 'southeast' }
            ])
            .withMetadata({
                exif: {
                    IFD0: {
                        Copyright: '© 2026 SkilyApp.com - All Rights Reserved',
                        Artist: 'SkilyApp AI Platform',
                        // Map "XMP:Title" / "IPTC:ObjectName" to standard ImageDescription for broad compatibility
                        ImageDescription: meta.description || 'SkilyApp Educational Content',
                        Software: 'Skily DGT Pipeline Pro',
                        Make: 'SkilyApp',
                        Model: 'AI Generated Educational Content',
                        // XPTitle/XPComment are sometimes used by Windows, but uncommon in web.
                        // We rely on ImageDescription serving as the main field.
                    }
                },
                iptc: {
                    // IPTC:ObjectName -> Title
                    'object name': meta.title || 'DGT Test Question',
                    // IPTC:Caption-Abstract -> Description
                    'caption': meta.description || 'SkilyApp Educational Content',
                    // IPTC:Keywords
                    'keywords': meta.keywords || ['SkilyApp', 'DGT'],
                    'copyright notice': 'SkilyApp.com',
                    'creator': 'SkilyApp AI',
                    'credit': 'SkilyApp Educational Platform',
                    'date created': currentDate.split('T')[0], // YYYY-MM-DD
                    'time created': currentDate.split('T')[1].substring(0, 8) // HH:MM:SS
                }
            })
            .webp({ quality: QUALITY })
            .toBuffer();

        return optimizedBuffer;
    } catch (error) {
        console.error('[Image Processing] Error:', error);
        throw error;
    }
}
