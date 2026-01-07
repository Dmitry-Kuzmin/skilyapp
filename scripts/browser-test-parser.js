/**
 * ========================================
 * ПАРСЕР ТЕСТОВ PRACTICALVIAL (v3.0 - GOLDEN STANDARD)
 * ========================================
 * Парсит вопросы сразу в формат Golden Standard
 */

(function () {
    'use strict';

    console.log('🚀 Запуск Golden Standard парсера PracticaVial...');

    const CONFIG = {
        category: 'B',
        source: 'practicalvial',
        topicId: null // Заполнишь вручную или через UI
    };

    // --- Помощники ---
    const cleanText = (text) => text ? text.replace(/\s+/g, ' ').trim() : '';

    const extractFilename = (url) => {
        if (!url) return null;
        const path = url.split('?')[0];
        const parts = path.split('/');
        return parts[parts.length - 1];
    };

    const findImage = (container) => {
        const img = container.querySelector('.fallos-thumb img, .fallos-mobile.show-mobile');
        if (img && img.src) {
            return { url: img.src, filename: extractFilename(img.src) };
        }
        return null;
    };

    const parseOptions = (container) => {
        const options = [];
        const buttons = container.querySelectorAll('.fallos-button');
        buttons.forEach(btn => {
            const link = btn.querySelector('a');
            const span = link.querySelector('span');
            if (span) {
                const letter = span.textContent.trim().toLowerCase();
                let text = link.textContent.trim().replace(/^[ABC]\s*/i, '');
                options.push({
                    letter,
                    text,
                    isCorrect: link.classList.contains('ok')
                });
            }
        });
        return options.sort((a, b) => a.letter.localeCompare(b.letter));
    };

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => console.log('✅ Скопировано через Clipboard API!'))
                .catch(err => {
                    console.warn('⚠️ Clipboard API отклонен, пробуем Fallback...');
                    fallbackCopy(text);
                });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                console.log('✅ Скопировано через Fallback (textarea)!');
            } else {
                throw new Error('Fallback copy failed');
            }
        } catch (err) {
            console.error('❌ Не удалось скопировать автоматически.');
            console.log('👇 ВЫДЕЛИ JSON НИЖЕ И НАЖМИ CMD+C:');
        }
    }

    // --- Основной процесс ---
    function parseQuestion(container, index) {
        const questionNumberEl = container.querySelector('.fallos-blk span');
        const questionNumber = questionNumberEl ? parseInt(questionNumberEl.textContent.trim()) : (index + 1);

        const questionTextEl = container.querySelector('.fallos-blk p');
        if (!questionTextEl) return null;

        let questionText = questionTextEl.textContent.trim();
        if (questionNumber) {
            questionText = questionText.replace(new RegExp(`^${questionNumber}\\s*`), '').trim();
        }

        const options = parseOptions(container);
        const image = findImage(container);

        const schemaEl = container.querySelector('.pop-src[data-type="img"]');
        const schemaUrl = schemaEl ? schemaEl.dataset.src : null;
        const fullSchemaUrl = schemaUrl ? (schemaUrl.startsWith('http') ? schemaUrl : window.location.origin + schemaUrl) : null;

        // 🏆 GOLDEN STANDARD FORMAT
        return {
            topic_id: CONFIG.topicId,
            question_number: questionNumber,
            category: CONFIG.category,
            question: {
                es: cleanText(questionText),
                en: null, // AI заполнит
                ru: null  // AI заполнит
            },
            answers: options.map(opt => ({
                id: opt.letter,
                text: {
                    es: cleanText(opt.text),
                    en: null, // AI заполнит
                    ru: null  // AI заполнит
                },
                is_correct: opt.isCorrect
            })),
            explanation: {
                es: null, // AI заполнит
                en: null, // AI заполнит
                ru: null  // AI заполнит
            },
            image_url: image?.url || null,
            schema_url: fullSchemaUrl || null, // 🎯 Схема для объяснений
            source: CONFIG.source
        };
    }

    function main() {
        const results = [];
        const containers = document.querySelectorAll('.col-lg-12');

        containers.forEach((c, idx) => {
            const q = parseQuestion(c, idx);
            if (q && q.question.es) results.push(q);
        });

        if (results.length === 0) {
            console.error('❌ Вопросы не найдены. Ты точно на странице результатов?');
            return;
        }

        const json = JSON.stringify(results, null, 2);

        const PROMPT = `Привет! Ты — эксперт по ПДД Испании (DGT). 
Я дам тебе JSON с вопросами в формате Golden Standard. 
Твоя задача:
1. Переведи "question.es" на русский (question.ru) и английский (question.en).
2. Для каждого варианта в "answers" переведи "text.es" на русский (text.ru) и английский (text.en).
3. Составь подробное и понятное объяснение правильного ответа на ТРЕХ языках: испанском (explanation.es), русском (explanation.ru) и английском (explanation.en). Используй официальные правила DGT.
4. Верни мне ТОЛЬКО исправленный JSON, сохранив структуру Golden Standard. Не добавляй лишнего текста.

JSON для обработки:
${json}`;

        console.log('\n--- 🤖 ПРОМПТ ДЛЯ ИИ (КОПИРУЙ ВЕСЬ ТЕКСТ НИЖЕ) ---');
        console.log(PROMPT);
        console.log('--- КОНЕЦ ПРОМПТА ---\n');

        copyToClipboard(PROMPT);

        window.parsedQuestions = results;
        console.log(`✨ Спаршено вопросов: ${results.length}. Промпт скопирован в буфер обмена!`);
        console.log(`📋 Формат: Golden Standard (question + answers[])`);
        console.log(`💾 Данные доступны в: window.parsedQuestions`);
    }

    main();
})();
