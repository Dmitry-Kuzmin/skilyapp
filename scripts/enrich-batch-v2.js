#!/usr/bin/env node

/**
 * ENRICH BATCH V2 - С ВАЛИДАЦИЕЙ
 * 
 * Берет JSON файл с вопросами (только на испанском),
 * переводит их на RU/EN и генерирует объяснения через Gemini AI.
 * Включает строгую валидацию и автоматические повторы при ошибках.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import dotenv from "dotenv";
import axios from "axios";
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("❌ Ошибка: GEMINI_API_KEY не установлен.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// JSON Schema для гарантированной структуры ответа
const responseSchema = {
    type: "object",
    properties: {
        question: {
            type: "object",
            properties: {
                es: { type: "string" },
                en: { type: "string" },
                ru: { type: "string" }
            },
            required: ["es", "en", "ru"]
        },
        answers: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        enum: ["a", "b", "c"]  // Строгое ограничение на ID
                    },
                    text: {
                        type: "object",
                        properties: {
                            es: { type: "string" },
                            en: { type: "string" },
                            ru: { type: "string" }
                        },
                        required: ["es", "en", "ru"]
                    },
                    is_correct: { type: "boolean" }
                },
                required: ["id", "text", "is_correct"]
            },
            minItems: 3,
            maxItems: 3
        },
        explanation: {
            type: "object",
            properties: {
                es: { type: "string" },
                en: { type: "string" },
                ru: { type: "string" }
            },
            required: ["es", "en", "ru"]
        }
    },
    required: ["question", "answers", "explanation"]
};

// Модели в порядке приоритета.
// User specific request with exact model names.
const MODELS_PRIORITY = [
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.0-flash-exp"
];

const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: responseSchema,
    temperature: 0.4 // Чуть повышаем для "живости" объяснений, но не сильно
};

async function generateWithFallback(parts) {
    let lastError = null;

    for (const modelName of MODELS_PRIORITY) {
        try {
            // console.log(`   👉 Trying model: ${modelName}...`); 
            const model = genAI.getGenerativeModel({ model: modelName, generationConfig });
            const result = await model.generateContent(parts);
            return result;
        } catch (error) {
            // 404/400/500 errors -> try next model
            lastError = error;
            // console.warn(`   ⚠️ Model ${modelName} failed: ${error.message.split(' ')[0]}... Trying next.`);
            continue;
        }
    }
    throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return {
            inlineData: {
                data: Buffer.from(response.data).toString("base64"),
                mimeType: "image/jpeg"
            }
        };
    } catch (e) {
        return null;
    }
}

async function validateData(data) {
    const errors = [];
    const cyrillicRegex = /[а-яё]/i;

    const checkLang = (obj, fieldPath) => {
        if (obj.es && cyrillicRegex.test(obj.es)) errors.push(`Cyrillic detected in ES field: ${fieldPath}`);
        if (obj.en && cyrillicRegex.test(obj.en)) errors.push(`Cyrillic detected in EN field: ${fieldPath}`);
        if (obj.ru && !cyrillicRegex.test(obj.ru) && obj.ru.length > 10) {
            // Предупреждение, если в русском тексте совсем нет кириллицы (кроме совсем коротких строк)
            // errors.push(`No Cyrillic detected in RU field: ${fieldPath}`);
        }
    };

    if (!data.question?.es || !data.question?.en || !data.question?.ru) {
        errors.push('Incomplete question translations');
    } else {
        checkLang(data.question, 'question');
    }

    if (!Array.isArray(data.answers) || data.answers.length !== 3) {
        errors.push('Must have exactly 3 answers');
    } else {
        data.answers.forEach((ans, i) => {
            if (!ans.text?.es || !ans.text?.en || !ans.text?.ru) {
                errors.push(`Answer ${i + 1} missing translations`);
            } else {
                checkLang(ans.text, `answer[${i}].text`);
            }
        });
    }

    if (!data.explanation?.es || !data.explanation?.en || !data.explanation?.ru) {
        errors.push('Incomplete explanation');
    } else {
        checkLang(data.explanation, 'explanation');
    }

    return errors;
}

async function enrichQuestion(q) {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const correctAnswer = q.answers.find(a => a.is_correct)?.text.es;
            const allOptions = q.answers.map(a => a.text.es).join(' | ');

            const prompt = `
Ты — Senior Driving Instructor (эксперт по ПДД Испании DGT и РФ). Твоя задача: обогатить тестовый вопрос профессиональными объяснениями.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 ОБЯЗАТЕЛЬНЫЙ СЛОВАРЬ ТЕРМИНОВ (RU):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Turismo → Легковой автомобиль
Vehículo mixto / Furgoneta → Грузопассажирский автомобиль / Фургон
MMA (Masa Máxima Autorizada) → Разрешенная максимальная масса (РММ)
Arcén → Обочина
Calzada → Проезжая часть
Carril → Полоса движения
Carril VAO → Полоса VAO (для ТС с высокой заполняемостью)
Adelantamiento → Обгон (с выездом на встречку) или Опережение (без выезда)
Autopista/Autovía → Автомагистраль / Скоростная дорога
Glorieta → Круговое движение / Кольцо
VMP → СИМ (Средства индивидуальной мобильности)

ИСПОЛЬЗУЙ ТОЛЬКО ЭТИ ТЕРМИНЫ. НЕ ПРИДУМЫВАЙ "автомобиль смешанного типа" или "полная масса".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 АРХИТЕКТУРА ОБЪЯСНЕНИЯ ПО ЯЗЫКАМ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🇪🇸 ES (Испанский) — ЮРИСТ
Сухой, профессиональный, юридически точный текст для апелляции на экзамене DGT.
  ✅ Официальная трактовка по регламенту
  ✅ Четкая логика без эмоций
  ❌ НИКАКИХ шуток, сравнений, лайфхаков

�� EN (Английский) — ТЕХНИЧЕСКИЙ ПИСАТЕЛЬ
Профессиональный технический перевод испанского объяснения.
  ✅ Точность терминологии
  ✅ Нейтральный тон
  ❌ Без адаптаций

🇷🇺 RU (Русский) — ОПЫТНЫЙ НАСТАВНИК
Твоя цель — подготовить ученика к экзамену на категорию B (Turismo — легковой автомобиль).

⛔ СТРОЖАЙШИЙ ЗАПРЕТ НА УПОМИНАНИЕ ВИЗУАЛЬНЫХ МАТЕРИАЛОВ:
Ученик НЕ ВИДИТ никаких схем, таблиц или изображений. Он видит ТОЛЬКО ТВОЙ ТЕКСТ.

КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ фразы:
  • "как указано на схеме"
  • "согласно таблице"
  • "(см. схему)"
  • "посмотрите на рисунок"
  • "на изображении мы видим"
  • "как показано на картинке"
  • "согласно инфографике"
  • "см. изображение А/Б"
  
🎯 ПРИНЦИП САМОДОСТАТОЧНОСТИ:
- Если берешь данные из schema_url (таблицу скоростей, знаки), вплетай их в текст как ФАКТЫ.
- Описывай ситуацию словами так, чтобы визуал не требовался.
- Вместо "как на схеме, лимит 90" пиши "Согласно ПДД Испании, лимит — 90 км/ч".

🇷🇺 СТРУКТУРА ОТВЕТА (RU) — БЕЗ ЗАГОЛОВКОВ!
Используй только эмодзи-маркеры. Сразу после смайлика идет текст.
Формат:

🎓 [Здесь текст объяснения правила с позиции водителя легкового автомобиля. Если касается других (грузовики), объясни: "Тебе не нужно, но ОНИ обязаны..."]. Извлеки всю теорию из schema/image, но не ссылайся на них.

🇷🇺 [Здесь текст ТОЛЬКО про КРИТИЧЕСКИЕ отличия от РФ, если они есть. Если отличий нет или они мелкие — ПРОПУСТИ ВСЮ ЭТУ СТРОКУ]. Запрещены фразы "В РФ нет аналога".

💡 [Здесь ЛОГИЧНАЯ и ЗВУЧНАЯ запоминалка. Лучше РИФМА или четкое правило. Пример: "Видимость на ноль — скорость на пятьдесят!". Избегай абстрактного юмора, делай упор на пользу и звучание].

ВАЖНО: НИКАКИХ СЛОВ "Правило", "Сравнение", "Шпаргалка", "Запоминалка" перед текстом. Только эмодзи.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ДАННЫЕ ВОПРОСА:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Вопрос (ES): ${q.question.es}
Правильный ответ: ${correctAnswer}
Все варианты: ${allOptions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ВАЖНО:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ПРИОРИТЕТ ВИЗУАЛА: Если на картинке (schema_url или image_url) есть:
  • Стрелки на асфальте
  • Сигналы светофора  
  • Дорожные знаки
  • Разметка
...которые НЕ упомянуты в тексте вопроса — они являются ПЕРВОСТЕПЕННЫМИ.  
Извлеки их ПЕРВЫМИ в блоке "🎓 Правило" как факты, но НЕ ССЫЛАЙСЯ на схему.

- Переведи вопрос и ответы корректно (используй словарь терминов!)
- Верни JSON структуру строго по схеме (IDs должны быть 'a', 'b', 'c')

⚠️ ФИНАЛЬНАЯ ПРОВЕРКА ПЕРЕД ВЫДАЧЕЙ JSON:
Перед тем как вернуть JSON, убедись что в русском тексте (explanation.ru) НЕТ ни одного упоминания:
  • слова "схема" / "схеме" / "схемы"
  • слова "таблиц" / "таблице" / "таблицы"  
  • слова "рисунок" / "картинк" / "изображени"
  • фраз "(см." или "как показано"
  
Если нашел — немедленно перефразируй в четкое утверждение ПЕРЕД выдачей результата.
`;

            const parts = [prompt];

            // Собираем все визуалы
            const imagesToFetch = [];
            if (q.schema_url) imagesToFetch.push(q.schema_url);
            if (q.image_url && !q.image_url.includes('faces/')) imagesToFetch.push(q.image_url);

            for (const url of imagesToFetch) {
                const imagePart = await downloadImageAsBase64(url);
                if (imagePart) parts.push(imagePart);
            }

            // ИСПОЛЬЗУЕМ ФУНКЦИЮ С FALLBACK
            const result = await generateWithFallback(parts);

            let responseText = result.response.text();

            // С JSON Schema не нужно чистить markdown блоки, но на всякий случай
            responseText = responseText.trim().replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '').replace(/\s*```$/gm, '');

            const data = JSON.parse(responseText);

            const errors = await validateData(data);
            if (errors.length > 0) throw new Error(`Validation failed: ${errors.join(', ')}`);

            // Извлекаем ID из URL если его нет
            const idFromUrl = (!q.id && !q.external_id && q.image_url)
                ? (q.image_url.match(/\/question\/([0-9a-f-]{36})[-]/) || [])[1]
                : undefined;

            return {
                ...q,
                id: q.id || idFromUrl,
                external_id: q.external_id || idFromUrl,
                question: data.question,
                answers: data.answers,
                explanation: data.explanation
            };

        } catch (error) {
            console.error(`  ⚠️ Попытка ${attempt}/${MAX_RETRIES}:`, error.message);
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    return q;
}

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("❌ Укажите путь к JSON файлу.");
        process.exit(1);
    }

    const rawData = await fs.readFile(filePath, 'utf8');
    const questions = JSON.parse(rawData);

    const enrichedPath = filePath.replace('.json', '-enriched.json');
    let finalQuestions = [];

    // 1. Пытаемся загрузить уже существующий прогресс (Resume/Repair mode)
    try {
        const existingData = await fs.readFile(enrichedPath, 'utf8');
        finalQuestions = JSON.parse(existingData);
        console.log(`📁 Нашел существующий файл: ${enrichedPath}. Проверяю пропуски...`);

        // Синхронизируем с исходником (если вопросов стало больше или порядок изменился)
        if (finalQuestions.length !== questions.length) {
            console.warn(`⚠️ Mismatch in length: Source ${questions.length} vs Enriched ${finalQuestions.length}. Merging by ID/Index...`);
            // Простая стратегия: берем исходный массив и подменяем обогащенными данными где есть
            finalQuestions = questions.map((srcQ, idx) => {
                const existing = finalQuestions[idx]; // Или поиск по ID если они есть
                // Если существующий выглядит обогащенным, берем его, иначе исходный
                return (existing && existing.explanation?.ru) ? existing : srcQ;
            });
        }
    } catch (e) {
        // Файла нет, начинаем с чистого листа (копии исходника)
        finalQuestions = JSON.parse(JSON.stringify(questions));
    }

    // Функция проверки: нужно ли обрабатывать вопрос?
    const needsProcessing = (q) => {
        // Проверяем наличие вопроса на 3 языках
        if (!q.question?.es || !q.question?.en || !q.question?.ru) return true;
        // Проверяем наличие объяснения на 3 языках
        if (!q.explanation?.es || !q.explanation?.en || !q.explanation?.ru) return true;
        // Проверяем ответы
        if (q.answers.some(a => !a.text?.es || !a.text?.en || !a.text?.ru)) return true;

        return false;
    };

    const pendingIndices = finalQuestions.map((q, i) => needsProcessing(q) ? i : -1).filter(i => i !== -1);

    if (pendingIndices.length === 0) {
        console.log(`✨ Файл полностью готов! Пропусков нет.`);
        return enrichedPath;
    }

    console.log(`🧠 Начинаем AI-обогащение. Осталось обработать: ${pendingIndices.length} из ${questions.length}`);

    const maxRetries = 3;

    for (let i = 0; i < pendingIndices.length; i++) {
        const idx = pendingIndices[i];
        const q = finalQuestions[idx];

        //console.log(`\nTARGET Q:`, JSON.stringify(q, null, 2));

        let enriched = null;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const shortName = filePath.split('/').pop().replace('.json', '');
                process.stdout.write(`   [${shortName}] 🔄 Q ${idx + 1} (${i + 1}/${pendingIndices.length})... (att ${attempt + 1})\r`);
                enriched = await enrichQuestion(q);

                // Валидация IDs: должны быть строго 'a', 'b', 'c'
                const ids = enriched.answers.map(a => a.id);
                const validIds = ids.every(id => ['a', 'b', 'c'].includes(id));

                if (!validIds) {
                    throw new Error(`Неверные IDs ответов: ${JSON.stringify(ids)}. Ожидаются: a, b, c`);
                }

                // УСПЕХ: Обновляем массив и СОХРАНЯЕМ ФАЙЛ СРАЗУ (Checkpoint)
                finalQuestions[idx] = enriched;
                await fs.writeFile(enrichedPath, JSON.stringify(finalQuestions, null, 2));

                break; // Успех, выходим из retry-loop

            } catch (error) {
                attempt++;
                console.error(`\n⚠️ Ошибка на вопросе ${idx + 1}: ${error.message}`);

                if (attempt >= maxRetries) {
                    console.error(`❌ Не удалось обработать вопрос ${idx + 1}. Оставляем как есть и идем дальше.`);
                    // Не выходим (process.exit), просто идем к следующему, чтобы добить остальные
                }

                if (error.message.includes('429') || error.message.includes('quota')) {
                    console.error(`⏳ Rate limit hit. Waiting 10s before retry...`);
                    await new Promise(r => setTimeout(r, 10000));
                } else {
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }

        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n✅ Обработка файла завершена: ${enrichedPath}`);
    return enrichedPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

export { enrichQuestion };
