/**
 * ========================================
 * BROWSER TEST PARSER V2 (Golden Standard + Topic Auto-Detection)
 * ========================================
 * Парсит результаты теста с PracticaVial в формат Golden Standard
 * ВАЖНО: Автоматически определяет тему!
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Открой результаты теста на PracticaVial
 * 2. Скопируй весь код этого файла
 * 3. Вставь в консоль браузера (F12 → Console)
 * 4. Скопируй полученный JSON: copy(JSON.stringify(window.parsedQuestions, null, 2))
 */

(function () {
    console.log('🚀 Golden Standard Parser V2.0 (with Topic Auto-Detection)');
    console.log('📋 Извлечение данных с PracticaVial...');

    // ========================================
    // ШАГ 1: ОПРЕДЕЛЯЕМ ТЕМУ
    // ========================================

    /**
     * Извлекает номер темы из URL или заголовка страницы
     */
    function extractTopicNumber() {
        // Вариант 1: Из URL (например: /test?topic=10 или /tema/10)
        const urlParams = new URLSearchParams(window.location.search);
        const topicParam = urlParams.get('topic') || urlParams.get('tema');
        if (topicParam) {
            const num = parseInt(topicParam);
            console.log(`🔍 Тема найдена в URL: ${num}`);
            return num;
        }

        // Проверяем путь URL
        const pathMatch = window.location.pathname.match(/tema[\/\-](\d+)/i);
        if (pathMatch) {
            const num = parseInt(pathMatch[1]);
            console.log(`🔍 Тема найдена в пути URL: ${num}`);
            return num;
        }

        // Вариант 2: Из заголовка страницы
        const titleMatch = document.title.match(/tema[:\s]*(\d+)/i);
        if (titleMatch) {
            const num = parseInt(titleMatch[1]);
            console.log(`🔍 Тема найдена в заголовке: ${num}`);
            return num;
        }

        // Вариант 3: Из хлебных крошек, заголовков или навигации
        const selectors = [
            '.breadcrumb', 'nav a', '.nav-link', 'h1', 'h2', '.test-title',
            '[class*="topic"]', '[class*="tema"]'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                const match = el.textContent.match(/tema[:\s]*(\d+)/i);
                if (match) {
                    const num = parseInt(match[1]);
                    console.log(`🔍 Тема найдена в элементе ${selector}: ${num}`);
                    return num;
                }
            }
        }

        // Вариант 4: Ручной ввод
        console.warn('⚠️ Не удалось автоматически определить тему');
        const userInput = prompt('Введите номер темы (1-29, или оставьте пустым):');
        if (userInput && userInput.trim()) {
            const num = parseInt(userInput);
            if (!isNaN(num) && num >= 1 && num <= 29) {
                console.log(`✍️ Тема введена вручную: ${num}`);
                return num;
            }
        }

        console.warn('⚠️ Тема не определена, topic_id будет null');
        return null;
    }

    const topicNumber = extractTopicNumber();
    console.log(`📌 Номер темы: ${topicNumber}`);

    // ========================================
    // ШАГ 2: ПАРСИНГ ВОПРОСОВ
    // ========================================

    const questionElements = document.querySelectorAll('.fallos-color-wrapper');
    const questions = [];

    if (questionElements.length === 0) {
        console.error('❌ Вопросы не найдены на странице!');
        console.log('Попробуйте другой селектор или убедитесь что страница загружена');
        return;
    }

    console.log(`✅ Найдено ${questionElements.length} вопросов`);

    questionElements.forEach((el, index) => {
        try {
            // Извлекаем текст вопроса - ищем в блоке .fallos-blk p
            // В мобильной и десктопной версии текст дублируется, берем любой доступный непустой
            let questionText = '';
            const textElements = el.querySelectorAll('.fallos-blk p');

            for (const textEl of textElements) {
                // Убираем номер вопроса из начала (например "1\n")
                // Ищем span с номером и удаляем его из текста, но лучше брать textContent узла, следующего за span
                const clone = textEl.cloneNode(true);
                const span = clone.querySelector('span'); // Номер вопроса
                if (span) span.remove();
                const img = clone.querySelector('img'); // Картинка может быть внутри p
                if (img) img.remove();

                const rawText = clone.textContent.trim();
                if (rawText) {
                    questionText = rawText;
                    break;
                }
            }

            // Очистка текста от лишних переносов и пробелов
            questionText = questionText.replace(/\s+/g, ' ').trim();

            // Извлекаем номер вопроса
            let questionNumber = index + 1;
            const numberSpan = el.querySelector('.fallos-blk span');
            if (numberSpan) {
                const numMatch = numberSpan.textContent.match(/(\d+)/);
                if (numMatch) questionNumber = parseInt(numMatch[1]);
            }

            // Извлекаем картинку
            // Ищем img внутри .fallos-thumb или .fallos-mobile
            let imageEl = el.querySelector('.fallos-thumb img');
            if (!imageEl) {
                imageEl = el.querySelector('.fallos-mobile');
            }

            let imageUrl = null;
            if (imageEl && imageEl.src) {
                // Если src относительный, делаем абсолютным
                imageUrl = imageEl.src;
                // Убеждаемся что это не заглушка 0-20.png или подобное
                if (imageUrl.includes('faces/')) imageUrl = null;
            }

            // Извлекаем схему (если есть) - ищем .pop-src с data-type="img"
            const schemaEl = el.querySelector('.pop-src[data-type="img"]');
            let schemaUrl = null;
            if (schemaEl) {
                const schemaSrc = schemaEl.getAttribute('data-src');
                if (schemaSrc) {
                    schemaUrl = new URL(schemaSrc, window.location.origin).href;
                }
            }

            // Извлекаем варианты ответов
            const answerElements = el.querySelectorAll('.fallos-button a');
            const answers = [];

            answerElements.forEach((answerEl, i) => {
                const answerId = String.fromCharCode(97 + i); // a, b, c

                let answerText = answerEl.textContent.trim();
                // Убираем префикс "A ", "B ", "C " из начала
                // Обычно там span с буквой
                const letterSpan = answerEl.querySelector('span');
                if (letterSpan) {
                    // Текст ответа идет после span
                    // Можно просто вычесть текст спана из всего текста
                    answerText = answerText.substring(letterSpan.textContent.length).trim();
                } else if (answerText.match(/^[ABC]\s/)) {
                    answerText = answerText.substring(2).trim();
                }

                const isCorrect = answerEl.classList.contains('ok');

                if (answerText) {
                    answers.push({
                        id: answerId,
                        text: {
                            es: answerText,
                            en: null,
                            ru: null
                        },
                        is_correct: isCorrect
                    });
                }
            });

            if (questionText && answers.length > 0) {
                questions.push({
                    topic_number: topicNumber, // Номер темы (будет преобразован в UUID)
                    topic_id: null, // UUID темы (будет заполнен позже)
                    question_number: questionNumber,
                    category: "B", // По умолчанию B, можно изменить
                    question: {
                        es: questionText,
                        en: null,
                        ru: null
                    },
                    answers: answers,
                    explanation: {
                        es: null,
                        en: null,
                        ru: null
                    },
                    image_url: imageUrl,
                    schema_url: schemaUrl,
                    source: "practicavial"
                });
            }
        } catch (error) {
            console.error(`❌ Ошибка при парсинге вопроса #${index + 1}:`, error);
        }
    });

    // ========================================
    // ШАГ 3: РЕЗУЛЬТАТ
    // ========================================

    console.log(`✅ Успешно спаршено ${questions.length} вопросов`);
    console.log(`📌 Тема: ${topicNumber}`);
    console.log('');
    console.log('💾 Для сохранения JSON выполни:');
    console.log('   copy(JSON.stringify(window.parsedQuestions, null, 2))');
    console.log('');
    console.log('📋 Затем создай файл data/topic-' + (topicNumber || 'unknown') + '-batch.json');

    // Сохраняем в глобальную переменную
    window.parsedQuestions = questions;

    // Показываем превью первого вопроса
    if (questions.length > 0) {
        console.log('');
        console.log('📄 Превью первого вопроса:');
        console.log(JSON.stringify(questions[0], null, 2));
    }

    return questions;
})();
