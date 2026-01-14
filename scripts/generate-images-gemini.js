/**
 * ========================================
 * ГЕНЕРАТОР ИЗОБРАЖЕНИЙ ЧЕРЕЗ GEMINI IMAGEN
 * (Премиум качество для DGT вопросов)
 * ========================================
 * 
 * АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ:
 * 1. Gemini Vision анализирует оригинальное изображение
 * 2. Анализирует текст вопроса (цвет авто, тип авто, детали)
 * 3. Создаёт детальный промпт БЕЗ подсказки ответа
 * 4. Gemini Imagen генерирует изображение в едином стиле
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { getSignDescription, generateSignPrompt } from './lib/dgt-signs.js';

// Загружаем .env.local с приоритетом
dotenv.config({ path: '.env.local' });
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ Ошибка: Не задан GEMINI_API_KEY в .env.local');
    console.error('💡 Получить ключ: https://aistudio.google.com/apikey');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
const imagenModel = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });

const OUTPUT_DIR = path.resolve('data/generated-images');

// ========================================
// ПРОМПТ ДЛЯ GEMINI VISION
// (Анализ оригинального изображения)
// ========================================

const VISION_ANALYSIS_PROMPT = `You are an expert traffic safety educator analyzing a Spanish DGT driving test question image.

Your task: Create a DETAILED scene description for regenerating this image WITHOUT revealing the correct answer.

IMPORTANT: Do NOT mention which option is correct or give hints about the answer!

## ANALYZE AND DESCRIBE:

1. **View Angle**: Specify exact perspective (isometric top-down 45°, driver's POV, side view)

2. **Vehicles** (CRITICAL DETAILS):
   - Type: car/turismo, motorcycle/motocicleta, truck/camión, bus, PMV/ciclomotor, bicycle
   - EXACT color (orange/naranja, white/blanco, blue/azul, red/rojo, yellow/amarillo)
   - Position on road (left lane, right lane, shoulder, center)
   - Direction (approaching, departing, turning, stopped)
   - Visible details (windshield, wheels, body panels)

3. **Road Infrastructure**:
   - Type (autopista, autovía, carretera convencional, urbana)
   - Lanes (número de carriles)
   - Surface quality
   - Features (rotonda, paso a nivel, pendiente, túnel)

4. **Traffic Signs** (LIST ALL with DGT codes):
   - P-series (warning triangles)
   - R-series (prohibition/obligation circles)
   - S-series (information squares)
   - Position and visibility

5. **Road Markings**:
   - Center: yellow continuous/dashed (#FFD700)
   - Lanes: white dashed (#FFFFFF)
   - Edges: white continuous
   - Arrows, crosswalks, stop lines

6. **Environment**:
   - Lighting (día soleado, nublado, atardecer)
   - Weather (seco, húmedo)
   - Setting (urbano, rural, montaña, autopista)
   - Trees, buildings, landscape

7. **Traffic Situation** (describe WITHOUT giving answer):
   - Overtaking scenario?
   - Merging?
   - Priority conflict?
   - Parking?
   - Railroad crossing?
   - Pedestrian?

8. **Trajectory Arrows**:
   - Color (usually orange #FF8C00)
   - Path showing vehicle movement
   - Starting and ending points

OUTPUT only structured description:

PERSPECTIVE: [exact angle]
VEHICLES: [list each with TYPE, COLOR, POSITION]
ROAD: [detailed infrastructure]
SIGNS: [all signs with codes if visible]
MARKINGS: [all road markings]
ENVIRONMENT: [complete setting]
SITUATION: [traffic scenario]
TRAJECTORIES: [if movement arrows present]

Remember: DESCRIBE the scene, NOT the correct action!`;

// ========================================
// МАСТЕР-ПРОМПТ (GOLDEN STANDARD)
// ========================================

const STYLE_MASTER_PROMPT = `Professional 3D isometric top-down view of Spanish DGT driving test scenario.

## VISUAL STYLE (MANDATORY):
- 3D isometric bird's eye view (45-60 degree angle)
- Clean educational diagram aesthetic
- Photorealistic but simplified geometry
- Bright daylight, soft shadows
- Professional driving school quality

## ROAD ELEMENTS:
- Asphalt: realistic gray texture (#404040)
- Road markings: precise Spanish DGT standard
  * Yellow continuous/dashed line (center): #FFD700, 12cm width
  * White dashed lines (lanes): #FFFFFF, 10cm segments, 6m spacing
  * White continuous edge: #FFFFFF, 12cm
- Lane width: 3.5 meters standard

## VEHICLES (SPANISH FLEET):
- Modern European cars (Seat, Citroën, Renault, Peugeot style)
- EXACT colors as specified in description
- Realistic 3D models with visible details
- Proper scale and proportions
- Clear windshields, body panels, wheels

## TRAJECTORY LINES:
- Orange curved arrows (#FF8C00) showing vehicle path
- Thickness: 8-10px
- Smooth bezier curves
- Clear arrowheads for direction

## ENVIRONMENT:
- Green grass verges: vibrant #228B22
- Trees: realistic Spanish landscape (pine, olive, cypress)
- Clear blue sky: #87CEEB
- Subtle depth of field

## ROAD SIGNS (CRITICAL):
- EXACT Spanish DGT specifications
- Correct shapes: triangle (danger), octagon (STOP), circle (prohibition/obligation)
- Proper colors: red borders, white backgrounds, blue for obligation
- Mounted on gray poles (3.5m height)
- Readable symbols

## LIGHTING:
- Natural sunlight from top-left
- Soft ambient occlusion
- Subtle highlights on vehicles
- No harsh shadows

## COMPOSITION:
- Centered on key decision point
- Clear spatial relationships
- All elements visible
- NO text/labels in image
- Educational clarity

## QUALITY:
- 1024x1024 resolution
- Sharp road signs
- Anti-aliased vehicles
- Consistent perspective`;

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

async function ensureOutputDir() {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (error) {
        console.error('❌ Не удалось создать папку:', error.message);
        throw error;
    }
}

/**
 * Анализирует оригинальное изображение через Gemini Vision
 */
async function analyzeOriginalImage(imageUrl) {
    try {
        console.log(`  🔍 Gemini Vision анализирует оригинальное изображение...`);

        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        const base64Image = imageBuffer.toString('base64');

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        const result = await visionModel.generateContent([VISION_ANALYSIS_PROMPT, imagePart]);
        const analysis = result.response.text();

        console.log(`  ✅ Анализ готов (${analysis.length} символов)`);
        return analysis;

    } catch (error) {
        console.error(`  ⚠️  Ошибка анализа: ${error.message}`);
        return null;
    }
}

/**
 * Извлекает специфичные детали из текста вопроса
 * (цвет авто, тип транспорта, и т.д.)
 */
function extractQuestionDetails(question) {
    const questionText = (question.question?.es || question.question_es || '').toLowerCase();

    const details = {
        vehicleTypes: [],
        vehicleColors: [],
        roadType: null,
        specificSigns: [],
        situation: null
    };

    // Типы транспорта (СПЕЦИФИЧНЫЕ!)
    if (questionText.includes('turismo')) details.vehicleTypes.push('car');
    if (questionText.includes('motocicleta') || questionText.includes('moto ')) details.vehicleTypes.push('motorcycle');
    if (questionText.includes('ciclomotor') || questionText.includes('pmv')) details.vehicleTypes.push('moped');
    if (questionText.includes('camión') || questionText.includes('vehículo pesado')) details.vehicleTypes.push('truck');
    if (questionText.includes('autobús') || questionText.includes('autocar')) details.vehicleTypes.push('bus');
    if (questionText.includes('bicicleta') || questionText.includes('ciclista')) details.vehicleTypes.push('bicycle');

    // Цвета (ВАЖНО!)
    if (questionText.includes('naranja') || questionText.includes('amarillo')) details.vehicleColors.push('#FF8C00');
    if (questionText.includes('blanco') || questionText.includes('blanca')) details.vehicleColors.push('#FFFFFF');
    if (questionText.includes('azul')) details.vehicleColors.push('#4169E1');
    if (questionText.includes('rojo') || questionText.includes('roja')) details.vehicleColors.push('#DC143C');
    if (questionText.includes('verde')) details.vehicleColors.push('#228B22');

    // Тип дороги
    if (questionText.includes('autopista')) details.roadType = 'highway';
    if (questionText.includes('autovía')) details.roadType = 'expressway';
    if (questionText.includes('urbana') || questionText.includes('ciudad')) details.roadType = 'urban';
    if (questionText.includes('carretera convencional')) details.roadType = 'conventional road';

    // Знаки
    if (questionText.includes('stop')) details.specificSigns.push('R-1');
    if (questionText.includes('ceda') || questionText.includes('ceder')) details.specificSigns.push('R-2');
    if (questionText.includes('rotonda') || questionText.includes('glorieta')) details.specificSigns.push('P-4');
    if (questionText.includes('paso a nivel')) details.specificSigns.push('P-7');
    if (questionText.includes('obras')) details.specificSigns.push('P-16');
    if (questionText.includes('peatones')) details.specificSigns.push('P-19');

    // Ситуация
    if (questionText.includes('adelantar') || questionText.includes('adelantamiento')) details.situation = 'overtaking';
    if (questionText.includes('incorporar')) details.situation = 'merging';
    if (questionText.includes('prioridad')) details.situation = 'priority';
    if (questionText.includes('estacionar') || questionText.includes('aparcar')) details.situation = 'parking';
    if (questionText.includes('pendiente')) details.situation = 'slope';

    return details;
}

/**
 * Создаёт финальный промпт для Gemini Imagen
 */
function generateImagenPrompt(question, visionAnalysis = null) {
    const questionText = question.question?.es || question.question_es || '';
    const details = extractQuestionDetails(question);

    let sceneDescription = '';

    // Если есть анализ оригинального изображения
    if (visionAnalysis) {
        console.log(`  🎯 Используется AI анализ оригинального изображения`);
        sceneDescription = `Based on original DGT test image:\n\n${visionAnalysis}\n\n`;
        sceneDescription += `Recreate this EXACT scene with improvements:\n`;
        sceneDescription += `- Professional 3D isometric style\n`;
        sceneDescription += `- Premium educational quality\n`;
        sceneDescription += `- Crystal clear DGT road signs\n`;
    } else {
        console.log(`  📝 Генерация сцены на основе текста вопроса`);
    }

    // Добавляем специфичные детали из вопроса
    if (details.vehicleTypes.length > 0) {
        const typeNames = {
            car: 'modern hatchback car',
            motorcycle: 'motorcycle with rider',
            moped: 'moped/ciclomotor',
            truck: 'commercial truck',
            bus: 'passenger bus',
            bicycle: 'cyclist'
        };
        sceneDescription += `\nVEHICLES: ` + details.vehicleTypes.map(t => typeNames[t]).join(', ');
    }

    if (details.vehicleColors.length > 0) {
        sceneDescription += `\nCOLORS: ${details.vehicleColors.join(', ')}`;
    }

    if (details.roadType) {
        const roadDescriptions = {
            'highway': 'Multi-lane autopista with barriers',
            'expressway': 'Autovía with separated lanes',
            'urban': 'Urban street with buildings',
            'conventional road': 'Two-lane rural road'
        };
        sceneDescription += `\nROAD TYPE: ${roadDescriptions[details.roadType]}`;
    }

    if (details.specificSigns.length > 0) {
        sceneDescription += `\nSIGNS: `;
        details.specificSigns.forEach(code => {
            const sign = generateSignPrompt(code);
            if (sign) sceneDescription += sign + '. ';
        });
    }

    if (details.situation) {
        const situations = {
            overtaking: 'Overtaking scenario with trajectory arrow',
            merging: 'Vehicle merging into traffic',
            priority: 'Priority conflict at intersection',
            parking: 'Parking maneuver',
            slope: 'Road on slope/hill'
        };
        sceneDescription += `\nSITUATION: ${situations[details.situation]}`;
    }

    // Если нет деталей - generic
    if (!sceneDescription.trim() && !visionAnalysis) {
        sceneDescription = 'Two modern cars (orange and white) on two-lane road with Spanish DGT markings';
    }

    return `${STYLE_MASTER_PROMPT}

## SCENE TO GENERATE:
${sceneDescription}

## QUESTION CONTEXT (for reference, do NOT show answer):
"${questionText.substring(0, 200)}${questionText.length > 200 ? '...' : ''}"

Generate precise educational traffic scenario.`;
}

/**
 * Генерирует изображение через Gemini Imagen
 */
async function generateImage(question, questionNumber) {
    // Анализируем оригинальное изображение если есть
    let visionAnalysis = null;
    if (question.image_url && !question.image_url.includes('supabase')) {
        visionAnalysis = await analyzeOriginalImage(question.image_url);
        await new Promise(r => setTimeout(r, 1500));
    }

    const prompt = generateImagenPrompt(question, visionAnalysis);

    console.log(`  🎨 Gemini Imagen генерирует изображение #${questionNumber}...`);
    console.log(`     Промпт: ${prompt.substring(0, 120)}...`);

    try {
        const result = await imagenModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.4,
                candidateCount: 1
            }
        });

        const response = await result.response;
        const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

        if (!imageData) {
            throw new Error('Imagen не вернул изображение');
        }

        // Сохраняем
        const imageBuffer = Buffer.from(imageData.data, 'base64');
        const fileName = `dgt-${questionNumber}-${crypto.randomBytes(4).toString('hex')}.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);
        await fs.writeFile(filePath, imageBuffer);

        console.log(`  ✅ Сохранено: ${fileName}`);

        return {
            fileName,
            filePath,
            prompt: prompt.substring(0, 500)
        };

    } catch (error) {
        console.error(`  ❌ Ошибка генерации: ${error.message}`);
        return null;
    }
}

// ========================================
// ГЛАВНАЯ ФУНКЦИЯ
// ========================================

async function processQuestions(jsonPath, options = {}) {
    const { onlyMissing = true, replaceExisting = false, maxImages = null } = options;

    console.log('📖 Читаем JSON...');
    const rawData = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(rawData);
    const questions = Array.isArray(data) ? data : data.questions;

    if (!questions || questions.length === 0) {
        throw new Error('JSON не содержит вопросов');
    }

    console.log(`✅ Найдено ${questions.length} вопросов\n`);

    const questionsToGenerate = questions.filter(q => {
        if (!onlyMissing) return true;
        return !q.generated_image_name || replaceExisting;
    });

    const limit = maxImages || questionsToGenerate.length;
    console.log(`🎨 Будет сгенерировано: ${limit} изображений`);
    if (maxImages) console.log(`⚠️  Лимит: ${maxImages}`);

    let generated = 0;
    let errors = 0;

    for (let i = 0; i < Math.min(questionsToGenerate.length, limit); i++) {
        const q = questionsToGenerate[i];
        const num = q.question_number || (i + 1);

        console.log(`\n🔄 Вопрос #${num}...`);

        const result = await generateImage(q, num);

        if (result) {
            q.generated_image_path = result.filePath;
            q.generated_image_name = result.fileName;
            q.generation_prompt = result.prompt;
            generated++;

            await fs.writeFile(jsonPath, JSON.stringify(Array.isArray(data) ? data : { questions }, null, 2));

            // Задержка между генерациями
            await new Promise(r => setTimeout(r, 3000));
        } else {
            errors++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ');
    console.log('='.repeat(60));
    console.log(`✅ Сгенерировано: ${generated}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log('\n💰 Стоимость: БЕСПЛАТНО (Gemini Free Tier)');
    console.log('='.repeat(60) + '\n');
}

async function main() {
    const args = process.argv.slice(2);
    const jsonPath = args.find(arg => !arg.startsWith('-'));

    if (!jsonPath) {
        console.error('❌ Укажите путь к JSON файлу');
        console.error('Использование: node scripts/generate-images-gemini.js <file.json> [--all] [--limit=N]');
        process.exit(1);
    }

    const absolutePath = path.resolve(jsonPath);
    const onlyMissing = !args.includes('--all');
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const maxImages = limitArg ? parseInt(limitArg.split('=')[1]) : null;

    console.log('='.repeat(60));
    console.log('🎨 ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ ЧЕРЕЗ GEMINI IMAGEN');
    console.log('='.repeat(60));
    console.log(`Файл: ${absolutePath}`);
    console.log(`Режим: ${onlyMissing ? 'Только без изображений' : 'Все'}`);
    if (maxImages) console.log(`Лимит: ${maxImages}`);
    console.log('='.repeat(60) + '\n');

    try {
        await ensureOutputDir();
        await processQuestions(absolutePath, { onlyMissing, maxImages });

        console.log('✨ Готово!');
        console.log('\n💡 Следующий шаг: Загрузите в Supabase Storage:');
        console.log('   node scripts/upload-images-golden.js ' + absolutePath);

    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    }
}

main();
