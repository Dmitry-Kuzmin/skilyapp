#!/usr/bin/env node

/**
 * AUTOMATION SERVER FOR DGT PARSING
 * 
 * Принимает JSON от браузерного парсера и:
 * 1. Сохраняет в data/parsed/topic-{ID}/test-{NUM}.json
 * 2. Автоматически запускает импорт в базу.
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { importFile } from './import-golden-dgt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/save-batch', async (req, res) => {
    try {
        const { questions, topicNumber, testNumber } = req.body;

        if (!questions || !topicNumber) {
            return res.status(400).json({ error: 'Missing data' });
        }

        console.log(`\n📥 Получен батч: Тема ${topicNumber}, Тест ${testNumber || 'N/A'}`);

        // 1. Создаем структуру папок
        const folderPath = path.join(__dirname, `../data/parsed/topic-${topicNumber.toString().padStart(2, '0')}`);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // 2. Генерируем имя файла
        const fileName = testNumber
            ? `test-${testNumber.toString().padStart(3, '0')}.json`
            : `batch-${Date.now()}.json`;

        const filePath = path.join(folderPath, fileName);

        // 3. Сохраняем файл
        fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
        console.log(`💾 Файл сохранен: ${filePath}`);

        // 4. Запускаем конвейер обработки
        console.log(`🚀 Запуск конвейера для ${questions.length} вопросов...`);

        // Запускаем асинхронно, чтобы не держать браузер
        (async () => {
            try {
                // ШАГ 1: AI-обогащение (Перевод + Объяснения)
                console.log(`🧠 Шаг 1: AI-обогащение (Gemini)...`);
                const { enrichQuestion } = await import('./enrich-batch.js');
                const enrichedQuestions = [];

                for (let i = 0; i < questions.length; i++) {
                    process.stdout.write(`   🔄 Обработка ${i + 1}/${questions.length}\r`);
                    const enriched = await enrichQuestion(questions[i]);
                    enrichedQuestions.push(enriched);
                    // Задержка для лимитов Gemini
                    await new Promise(r => setTimeout(r, 2000));
                }
                console.log(`\n✅ Шаг 1 завершен (AI)`);

                // ШАГ 2: Сохранение обогащенного файла
                const enrichedPath = filePath.replace('.json', '-enriched.json');
                fs.writeFileSync(enrichedPath, JSON.stringify(enrichedQuestions, null, 2));
                console.log(`💾 Шаг 2: Обогащенный файл сохранен: ${enrichedPath}`);

                // ШАГ 3: Импорт в базу данных
                console.log(`📤 Шаг 3: Импорт в Supabase...`);
                await importFile(enrichedPath);
                console.log(`✅ Шаг 3 завершен (Импорт)`);

                console.log(`\n🎉 ВСЁ ГОТОВО! Тема ${topicNumber}, Тест ${testNumber} в базе.`);
            } catch (err) {
                console.error(`❌ Ошибка конвейера:`, err);
            }
        })();

        res.json({
            success: true,
            message: `Батч получен. Запущен фоновый процесс AI-перевода и импорта (~2-3 мин).`,
            rawPath: filePath
        });

    } catch (error) {
        console.error('💥 Ошибка сервера:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Automation Server запущен на http://localhost:${PORT}`);
    console.log(`Ожидаю данные от браузерного парсера...`);
});
