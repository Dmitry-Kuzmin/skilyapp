import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoPath = process.argv[2] || '/tmp/pdd_russia';
const SOURCE_DIR = path.join(repoPath, 'questions/A_B/tickets');
const TARGET_DIR = path.join(__dirname, '../data/parsed/pdd_russia');
const IMAGE_BASE_URL = '/images/pdd_russia'; // Relative to public folder

if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ SOURCE_DIR not found: ${SOURCE_DIR}`);
    console.error('Use: node scripts/convert-pdd-russia.js /path/to/pdd_russia');
    process.exit(1);
}

function generateDeterministicUUID(input) {
    const hash = crypto.createHash('md5').update(String(input)).digest('hex');
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32)
    ].join('-');
}

const files = fs.readdirSync(SOURCE_DIR);

files.forEach(file => {
    if (!file.endsWith('.json')) return;

    const sourcePath = path.join(SOURCE_DIR, file);
    const content = fs.readFileSync(sourcePath, 'utf8');
    try {
        const rawQuestions = JSON.parse(content);
        const enrichedQuestions = rawQuestions.map(q => {
            // Fix image path
            let imageUrl = '';
            if (q.image && q.image !== './images/no_image.jpg') {
                // q.image example: "./images/A_B/xyz.jpg"
                // relative => "A_B/xyz.jpg"
                const relative = q.image.replace('./images/', '');
                imageUrl = path.join(IMAGE_BASE_URL, relative);
            }

            // Generate ID if missing or convert hash to UUID
            let qId = q.id;
            if (!qId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qId)) {
                qId = generateDeterministicUUID(qId || q.question);
            }

            return {
                id: qId,
                topic_id: null,
                topic_number: 999, // Special
                question: {
                    ru: q.question,
                    es: "",
                    en: ""
                },
                text_ru: q.question,
                answers: q.answers.map((a, idx) => ({
                    id: generateDeterministicUUID(`${qId}_${idx}`),
                    text: {
                        ru: a.answer_text,
                        es: "",
                        en: ""
                    },
                    is_correct: a.is_correct
                })),
                explanation: {
                    ru: q.answer_tip,
                    es: "",
                    en: ""
                },
                explanation_ru: q.answer_tip,
                image_url: imageUrl,
                source: 'pdd_russia_github',
                metadata: {
                    ticket_number: q.ticket_number,
                    original_topic: q.topic ? q.topic[0] : null
                }
            };
        });

        const targetFilename = file.replace('.json', '-enriched.json');
        fs.writeFileSync(path.join(TARGET_DIR, targetFilename), JSON.stringify(enrichedQuestions, null, 2));
        console.log(`Converted ${file} -> ${targetFilename} (${enrichedQuestions.length} Qs)`);

    } catch (e) {
        console.error(`Error parsing ${file}:`, e);
    }
});
