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
    // ШАГ 3: ОТПРАВКА НА СЕРВЕР АВТОМАТИЗАЦИИ
    // ========================================

    const testNumberEl = document.querySelector('.progress-left-content h3');
    let testNumber = null;
    if (testNumberEl) {
        const testMatch = testNumberEl.textContent.match(/Nº[:\s]*(\d+)/i);
        if (testMatch) testNumber = parseInt(testMatch[1]);
    }

    async function sendToServer(data, tNum, testNum) {
        console.log('📡 Отправка данных на локальный сервер (http://localhost:3001)...');

        try {
            const response = await fetch('http://localhost:3001/save-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questions: data,
                    topicNumber: tNum,
                    testNumber: testNum
                })
            });

            const result = await response.json();
            if (result.success) {
                showToast(`✅ Успех! Тест ${testNum} сохранен и импортирован.`, 'success');
                console.log('🚀 Сервер ответил:', result.message);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Ошибка связи с сервером:', error);
            console.log('ℹ️ Это нормально — браузер блокирует HTTP запросы с HTTPS сайтов.');
            console.log('📥 Скачиваю файл напрямую...');

            // Автоматически скачиваем файл
            downloadAsFile(data, tNum, testNum);
            showToast(`📥 Файл скачан! Запусти: node scripts/import-golden-dgt.js data/parsed/...`, 'info');
        }
    }

    function downloadAsFile(data, topicNum, testNum) {
        const fileName = `topic-${String(topicNum).padStart(2, '0')}_test-${String(testNum || 'unknown').padStart(3, '0')}.json`;
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`✅ Файл ${fileName} скачан в папку "Загрузки"`);
        console.log('📋 Перемести его в: data/parsed/topic-XX/');
        console.log('📤 Затем выполни: node scripts/enrich-batch.js data/parsed/topic-XX/test-XXX.json');
    }

    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.padding = '15px 25px';
        toast.style.borderRadius = '12px';
        toast.style.color = 'white';
        toast.style.zIndex = '10000';
        toast.style.fontWeight = 'bold';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.fontFamily = 'sans-serif';
        toast.style.transition = 'all 0.3s ease';

        if (type === 'success') toast.style.backgroundColor = '#10B981';
        else if (type === 'error') toast.style.backgroundColor = '#EF4444';
        else toast.style.backgroundColor = '#3B82F6'; // info

        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // Сохраняем в глобальную переменную
    window.parsedQuestions = questions;

    // Запускаем автоматическую отправку
    sendToServer(questions, topicNumber, testNumber);

    return questions;
})();
