/**
 * ========================================
 * GOLDEN STANDARD AI GENERATOR (v3.0)
 * ========================================
 * Генерирует вопросы в универсальном формате с вложенными answers[]
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

// Загружаем .env.local с приоритетом
dotenv.config({ path: '.env.local' });
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IMAGES_DIR = "data/images";

if (!GEMINI_API_KEY) {
  console.error("❌ Ошибка: GEMINI_API_KEY не установлен в окружении.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: { responseMimeType: "application/json" }
});

async function fileToGenerativePart(filePath, mimeType) {
  const data = await fs.readFile(filePath);
  return {
    inlineData: {
      data: Buffer.from(data).toString("base64"),
      mimeType
    },
  };
}

async function processQuestion(question, imagePath = null) {
  const prompt = `# 🚗 SKILY "ULTIMATE TEACHER" ENGINE V4 (GOLDEN STANDARD)

Ты — **Легендарный Инструктор Автошколы DGT**, который объясняет ПДД так, что ученики сдают с первого раза.
Твоя цель: Не просто дать правильный ответ, а **"взломать" мозг ученика**, чтобы он запомнил правило НАВСЕГДА.

---

## 👨‍🏫 ПЕДАГОГИЧЕСКИЙ СТИЛЬ (ГЛАВНОЕ!):

1. **БЕЗ "канцелярита":** Забудь фразы "Согласно статье 12...". Говори живым языком.
2. **Аналогии и Метафоры:** Сравнивай дорогу с рекой, тормозной путь с прыжком в воду, инерцию с бегущим человеком.
3. **Эффект присутствия:** "Представь, что ты...", "Смотри на картинке...", "Если сделаешь так, то...".
4. **Эмоциональные якоря:** Не "это неправильно", а "это мгновенная авария" или "это eliminatoria на экзамене".
5. **Разбор ловушек:** Укажи, где 90% учеников ошибаются в этом конкретном вопросе.

---

## 📝 СТРУКТУРА ОБЪЯСНЕНИЯ (3 БЛОКА):

### 1️⃣ **👁️ Análisis Visual** (Только если есть изображение):
"Смотри на картинку. Видишь этот знак треугольника справа? А машину слева? Она уже выехала на круг..."

### 2️⃣ **🧠 La Lógica "Por qué"** (ОБЯЗАТЕЛЬНО):
Объясни суть правила через **безопасность** или **физику**, а не через "так в законе написано".

*Плохо:* "Запрещено обгонять из-за сплошной."
*Хорошо:* "Сплошная линия здесь нарисована кровью. Если ты начнешь обгон, ты окажешься на встречке в слепом повороте. Это мгновенная лобовая."

### 3️⃣ **💣 La Trampa / El Truco** (ОБЯЗАТЕЛЬНО):
Укажи типичную ошибку + мнемонику.
"90% путают знаки А и Б. Запомни: **Круг — приказ, Треугольник — предупреждение**."

---

## 🌍 LANGUAGE ISOLATION (СТРОЖАЙШИЙ КОНТРОЛЬ):

### 🇪🇸 ESPAÑOL (Основа):
- Живой, современный испанский (Castellano neutro).
- НИ ОДНОЙ буквы кириллицы или английского!

### 🇷🇺 РУССКИЙ (Тон: Опытный русский инструктор):
**Глоссарий (обновленный):**
- "Escape libre" → "выхлопная система без глушителя (прямоток)"
- "Salpicadero" → "дефлекторы обдува" (вентиляция) / "торпеда" (панель)"
- "Marchas" → "передачи" (НИКОГДА "скорости"!)
- "Distintivo ambiental" → "экологическая наклейка"
- "Ángulo muerto" → "слепая (мёртвая) зона"
- "Arcén" → "обочина"
- "Retención" → "затор / пробка"
- "Freno motor" → "торможение двигателем"
- **"Turismo"** → **"легковой автомобиль"** (НЕ "туризм"!)
- **"Ciclomotor"** → **"мопед"**
- **"Calzada"** → **"проезжая часть"**

### 🇬🇧 ENGLISH (UK English):
Tone: Professional driving coach.

---

## 🎯 ВХОДНЫЕ ДАННЫЕ:

**Вопрос (ES):** ${question.question_es || question.question?.es}

**Варианты:**
${question.option_a_es ? `A) ${question.option_a_es}
B) ${question.option_b_es}
C) ${question.option_c_es}` :
      `A) ${question.answers?.[0]?.text?.es || 'N/A'}
B) ${question.answers?.[1]?.text?.es || 'N/A'}
C) ${question.answers?.[2]?.text?.es || 'N/A'}`}

**Изображение:** ${imagePath ? 'Attached (анализируй!)' : 'None (объяснение без визуального блока)'}

---

## 🚀 ВЫХОД (JSON STRUCTURE - GOLDEN STANDARD):

Верни СТРОГО валидный JSON. Структура вариантов ответов должна быть **вложенным массивом answers**.

{
  "topic_id": ${question.topic_id || 10},
  "question_number": ${question.question_number || 1},
  "category": "${question.category || 'B'}",
  "question": {
    "es": "[Текст вопроса на испанском]",
    "en": "[English translation]",
    "ru": "[Русский перевод]"
  },
  "answers": [
    {
      "id": "a",
      "text": { 
        "es": "[Вариант A на испанском]", 
        "en": "[Option A in English]", 
        "ru": "[Вариант А на русском]" 
      },
      "is_correct": false
    },
    {
      "id": "b",
      "text": { 
        "es": "[Вариант B]", 
        "en": "[Option B]", 
        "ru": "[Вариант Б]" 
      },
      "is_correct": true
    },
    {
      "id": "c",
      "text": { 
        "es": "[Вариант C]", 
        "en": "[Option C]", 
        "ru": "[Вариант В]" 
      },
      "is_correct": false
    }
  ],
  "explanation": {
    "es": "[Твое крутое педагогическое объяснение с 3 блоками в Markdown]",
    "en": "[Полный адаптированный перевод]",
    "ru": "[Полный адаптированный перевод с глоссарием]"
  },
  "image_url": "${question.image_url || null}",
  "source": "${question.source || 'practicalvial'}"
}

Поехали! 🏁`;

  try {
    const parts = [prompt];
    if (imagePath) {
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      parts.push(await fileToGenerativePart(imagePath, mimeType));
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    // 🧹 ЗАЩИТА: Убираем markdown-обертки (```json ... ```)
    const cleanJson = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    return JSON.parse(cleanJson);
  } catch (error) {
    if (error.message.includes('429')) {
      throw new Error('RATE_LIMIT');
    }
    console.error(`  ❌ Ошибка для вопроса #${question.question_number}:`, error.message);
    return null;
  }
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("❌ Укажите путь к JSON файлу.");
    process.exit(1);
  }

  const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  const questions = Array.isArray(data) ? data : data.questions;

  console.log(`🚀 Начинаем генерацию в Golden Standard формате для ${questions.length} вопросов...`);

  for (const q of questions) {
    console.log(`🔄 Обработка #${q.question_number || q.metadata?.original_number}...`);

    // 🔍 ПРИОРИТЕТ: Схема > Обычное фото
    let imagePath = null;

    // Если есть schema_url прямо в JSON - используем её (приоритет!)
    if (q.schema_url) {
      console.log(`   🎯 Найдена схема: ${q.schema_url.substring(0, 50)}...`);
      // Схема передастся в AI как URL, не нужно скачивать
    }

    // Иначе ищем локальные файлы
    const potentialImages = [q.schema_filename, q.image_filename].filter(Boolean);

    for (const imgName of potentialImages) {
      const p = path.join(IMAGES_DIR, imgName);
      try {
        await fs.access(p);
        imagePath = p;
        console.log(`   📸 ${path.basename(imagePath)}`);
        break;
      } catch (e) { }
    }

    try {
      const goldenFormat = await processQuestion(q, imagePath);
      if (goldenFormat) {
        // Заменяем весь вопрос на Golden Standard формат
        Object.assign(q, goldenFormat);

        // Сохраняем после каждого вопроса
        await fs.writeFile(jsonPath, JSON.stringify(Array.isArray(data) ? data : { questions: data.questions }, null, 2));
        console.log(`  ✅ Готово! (Golden Standard формат: question + answers[])`);
      }

      // ⚡ УМНАЯ ЗАДЕРЖКА: Быстрее без изображения
      const delay = imagePath ? 6000 : 3000;
      await new Promise(r => setTimeout(r, delay));
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.warn("  ⏳ Лимит достигнут. Ждем 30 секунд...");
        await new Promise(r => setTimeout(r, 30000));
      } else {
        console.error("  ❌ Ошибка:", err.message);
      }
    }
  }

  console.log("✨ Вся база переведена в Golden Standard формат!");
}

main().catch(console.error);
