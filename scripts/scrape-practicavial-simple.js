import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const BASE_URL = 'https://teorica.practicavial.com';
const TESTS_URL = `${BASE_URL}/permiso/b/tests/tema/all`;

// Инициализация Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Пробуем разные варианты имени ключа
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                    process.env.VITE_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения Supabase');
  console.error('   Найдено:');
  console.error(`   - VITE_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}`);
  console.error(`   - VITE_SUPABASE_PUBLISHABLE_KEY: ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '✅' : '❌'}`);
  console.error(`   - VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '✅' : '❌'}`);
  console.error('');
  console.error('   Убедитесь, что файл .env существует и содержит переменные:');
  console.error('   VITE_SUPABASE_URL=...');
  console.error('   VITE_SUPABASE_PUBLISHABLE_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Парсинг аргументов
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    topics: [],
    headless: false,
    output: 'practicavial-questions.xlsx',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topics' && args[i + 1]) {
      config.topics = args[i + 1].split(',').map(n => parseInt(n.trim()));
    } else if (args[i] === '--headless') {
      config.headless = args[i + 1] !== 'false';
    } else if (args[i] === '--output' && args[i + 1]) {
      config.output = args[i + 1];
    }
  }

  if (config.topics.length === 0) {
    config.topics = [1]; // По умолчанию тема 1
  }

  return config;
}

// Проверка авторизации - простая и надежная
async function checkAuth(page) {
  try {
    const url = page.url();
    
    // Если на странице логина - не авторизованы
    if (url.includes('/login')) {
      return false;
    }
    
    // Проверяем наличие контента тестов
    const hasTests = await page.evaluate(() => {
      // Ищем ссылки на тесты
      const testLinks = document.querySelectorAll('a[href*="/test/tema/"]');
      // Ищем текст "Test Tema"
      const hasTestText = document.body.textContent.includes('Test Tema');
      // Проверяем, нет ли формы логина
      const hasLoginForm = document.querySelector('form input[type="password"]') !== null;
      
      return testLinks.length > 0 || (hasTestText && !hasLoginForm);
    });
    
    return hasTests;
  } catch (e) {
    return false;
  }
}

// Интерактивная авторизация
async function waitForManualLogin(page) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔐 АВТОРИЗАЦИЯ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('💡 ИНСТРУКЦИЯ:');
  console.log('   1. В открывшемся браузере авторизуйтесь вручную');
  console.log('   2. Перейдите на страницу с тестами:');
  console.log(`      ${BASE_URL}/permiso/b/tests/tema/1`);
  console.log('   3. Убедитесь, что вы видите список тестов');
  console.log('   4. Вернитесь в терминал и нажмите Enter');
  console.log('');
  console.log('⏳ Открываю страницу логина...');
  
  // Открываем страницу логина
  await page.goto(`${BASE_URL}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  console.log('✅ Страница открыта в браузере');
  console.log('');
  console.log('👆 ТЕПЕРЬ:');
  console.log('   1. Авторизуйтесь в браузере');
  console.log('   2. Перейдите на страницу тестов');
  console.log('   3. Нажмите Enter в этом терминале, когда будете готовы');
  console.log('');
  console.log('⏳ Жду вашего Enter...');
  
  // Ждем Enter от пользователя
  await new Promise((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
  
  console.log('');
  console.log('🔍 Проверяю авторизацию...');
  
  // Проверяем текущую страницу
  const currentUrl = page.url();
  console.log(`   Текущий URL: ${currentUrl}`);
  
  // Если на странице логина, переходим на страницу тестов
  if (currentUrl.includes('/login')) {
    console.log('   ⚠️ Вы еще на странице логина');
    console.log('   💡 Перехожу на страницу тестов для проверки...');
    await page.goto(`${BASE_URL}/permiso/b/tests/tema/1`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
  }
  
  // Проверяем авторизацию
  const isAuth = await checkAuth(page);
  
  if (!isAuth) {
    console.log('   ❌ Авторизация не подтверждена');
    console.log('   💡 Убедитесь, что:');
    console.log('      1. Вы авторизовались в браузере');
    console.log('      2. Вы перешли на страницу с тестами');
    console.log('      3. Вы видите список тестов на странице');
    console.log('');
    console.log('   Попробуйте еще раз? (y/n)');
    
    const answer = await new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim().toLowerCase());
      });
    });
    
    if (answer === 'y' || answer === 'yes' || answer === 'да') {
      return await waitForManualLogin(page);
    } else {
      throw new Error('Авторизация не подтверждена. Завершаю работу.');
    }
  }
  
  console.log('   ✅ Авторизация подтверждена!');
  console.log('');
  return true;
}

// Получение тестов для темы
async function getTestsForTopic(page, topicNumber) {
  console.log(`\n📋 Получаю список тестов для темы ${topicNumber}...`);
  
  const topicUrl = `${BASE_URL}/permiso/b/tests/tema/${topicNumber}`;
  console.log(`   Открываю: ${topicUrl}`);
  
  await page.goto(topicUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(3000);
  
  // Извлекаем тесты
  const tests = await page.evaluate(() => {
    const testsList = [];
    const seenUrls = new Set();
    
    // Ищем все ссылки на тесты
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    
    allLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Проверяем, что это ссылка на тест (содержит UUID)
      if (href.includes('/test/tema/') && href.match(/[a-f0-9-]{36}/i)) {
        if (seenUrls.has(href)) return;
        seenUrls.add(href);
        
        // Извлекаем номер теста из текста
        const text = link.textContent.trim();
        const parentText = link.closest('div, li, article')?.textContent.trim() || '';
        const fullText = text + ' ' + parentText;
        
        const testMatch = fullText.match(/N[º°]?:\s*0?(\d+)/i) || 
                         fullText.match(/\b(\d{3})\b/);
        const testNumber = testMatch ? parseInt(testMatch[1]) : testsList.length + 1;
        
        // Формируем полный URL
        let fullUrl = href;
        if (!fullUrl.startsWith('http')) {
          fullUrl = `https://teorica.practicavial.com${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
        }
        
        testsList.push({
          number: testNumber,
          url: fullUrl,
          title: text || `Test ${testNumber}`,
        });
      }
    });
    
    // Сортируем по номеру
    testsList.sort((a, b) => a.number - b.number);
    
    return testsList;
  });
  
  console.log(`   ✅ Найдено тестов: ${tests.length}`);
  
  if (tests.length > 0) {
    console.log('   Первые 5 тестов:');
    tests.slice(0, 5).forEach(test => {
      console.log(`      - Тест ${test.number}: ${test.url.substring(0, 80)}...`);
    });
  }
  
  return tests;
}

// Скрапинг одного теста
async function scrapeTest(page, testUrl, topicNumber, testNumber) {
  try {
    console.log(`      📄 Загружаю тест ${testNumber}...`);
    await page.goto(testUrl, {
      waitUntil: 'networkidle2', // Ждем загрузки всех ресурсов
      timeout: 30000
    });
    
    // Ждем загрузки контента и JavaScript
    await page.waitForTimeout(6000);
    
    // Делаем скриншот для отладки (первый тест)
    if (testNumber === 1) {
      await page.screenshot({ path: `test-${testNumber}-debug.png`, fullPage: true });
      console.log(`      📸 Скриншот сохранен: test-${testNumber}-debug.png`);
    }
    
    // Сначала пробуем найти все вопросы сразу в DOM (могут быть скрыты)
    console.log(`      🔍 Ищу все вопросы на странице...`);
    
    // Извлекаем первый вопрос (текущий на странице)
    let allQuestions = [];
    const firstQuestion = await extractCurrentQuestion(page, topicNumber, testNumber, 1);
    if (firstQuestion) {
      allQuestions.push(firstQuestion);
      console.log(`      ✅ Найден вопрос 1: ${firstQuestion.question_text.substring(0, 50)}...`);
    }
    
    // Пробуем найти все вопросы в DOM (включая скрытые)
    const questionsInDOM = await page.evaluate((topicNum, testNum) => {
      const questionsList = [];
      
      console.log('Начинаю поиск вопросов на странице...');
      
      // Стратегия 1: Ищем по структуре страницы - вопрос обычно в заголовке или определенном блоке
      // На PracticaVial вопросы часто имеют структуру: вопрос -> изображение -> ответы
      
      // Ищем все возможные контейнеры вопросов
      const possibleQuestionSelectors = [
        'h1', 'h2', 'h3', 'h4',
        '.question', '[class*="question"]',
        '.pregunta', '[class*="pregunta"]',
        '.test-question', '[class*="test-question"]',
        'main', 'article', '.content', '[class*="content"]',
      ];
      
      let questionElements = [];
      
      // Пробуем найти через специфичные селекторы
      for (const selector of possibleQuestionSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        questionElements.push(...elements);
      }
      
      // Если не нашли, ищем все элементы с текстом вопроса
      if (questionElements.length === 0) {
        console.log('Не найдено через селекторы, ищу по тексту...');
        const allElements = Array.from(document.querySelectorAll('div, p, span, h1, h2, h3, h4, article, section'));
        questionElements = allElements.filter(el => {
          const text = (el.textContent || '').trim();
          // Вопрос обычно содержит знак вопроса и имеет разумную длину
          return (text.includes('?') || text.includes('¿')) && 
                 text.length > 20 && 
                 text.length < 500 &&
                 !text.includes('Reportar') &&
                 !text.includes('Ampliar');
        });
      }
      
      console.log(`Найдено потенциальных элементов: ${questionElements.length}`);
      
      // Стратегия 2: Извлекаем вопросы из каждого контейнера
      console.log('🔍 Стратегия 2: Извлекаю вопросы из контейнеров...');
      
      questionContainers.forEach((container, containerIndex) => {
        try {
          // Получаем текст контейнера
          const containerText = container.textContent || '';
          
          // Ищем текст вопроса в контейнере
          const questionMatches = containerText.match(/(\d+\s+[A-ZА-Я][^?\n]*[?¿])/g);
          if (!questionMatches || questionMatches.length === 0) {
            // Пробуем найти вопрос по-другому
            const questionElement = container.querySelector('h1, h2, h3, h4, p, div, span');
            if (questionElement) {
              const qText = questionElement.textContent.trim();
              if (qText.length > 20 && (qText.includes('?') || qText.includes('¿'))) {
                questionMatches = [qText];
              }
            }
          }
          
          if (!questionMatches) return;
          
          questionMatches.forEach((questionMatch, qIndex) => {
            const questionText = questionMatch.trim();
            if (questionText.length < 10) return;
            
            console.log(`Найден вопрос ${containerIndex}-${qIndex}: ${questionText.substring(0, 50)}...`);
            
            // Извлекаем изображение из этого контейнера
            let imageUrl = null;
            const img = container.querySelector('img');
            if (img) {
              imageUrl = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `https://teorica.practicavial.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
              }
            }
            
              // Ищем ответы в контейнере
              const radioInputs = container.querySelectorAll('input[type="radio"]');
              radioInputs.forEach(radio => {
                let label = container.querySelector(`label[for="${radio.id}"]`) || radio.closest('label');
                if (label) {
                  let answerText = label.textContent.trim();
                  answerText = answerText.replace(/^[A-Z]\s*[.\-\s]*/, '').trim();
                  if (answerText && answerText.length > 2) {
                    const isCorrect = radio.checked || 
                                     radio.classList.contains('correct') ||
                                     label.classList.contains('correct');
                    answers.push({
                      text: answerText,
                      is_correct: isCorrect,
                      order: answers.length + 1,
                    });
                  }
                }
              });
              
              if (answers.length >= 2) {
                questionsList.push({
                  topic_number: topicNum,
                  test_number: testNum,
                  question_number: questionsList.length + 1,
                  question_text: questionText.substring(0, 1000),
                  image_url: imageUrl,
                  answers: answers,
                });
              }
            }
          } catch (e) {
            // Игнорируем ошибки
          }
        });
      }
      
      // Ищем информацию о кнопках навигации
      const nextButtonInfo = [];
      const buttons = Array.from(document.querySelectorAll('button, a'));
      buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const className = btn.className || '';
        
        if (text.includes('next') || 
            text.includes('siguiente') || 
            text.includes('>') ||
            ariaLabel.includes('next') ||
            ariaLabel.includes('siguiente') ||
            className.includes('next') ||
            btn.getAttribute('data-slide') === 'next') {
          nextButtonInfo.push({
            tag: btn.tagName,
            className: className,
            id: btn.id || '',
            text: btn.textContent.trim(),
          });
        }
      });
      
      return {
        questionsFound: questionsList.length,
        nextButtonInfo: nextButtonInfo,
      };
    }, topicNumber, testNumber);
    
    console.log(`      📊 Найдено вопросов в DOM: ${questionsInDOM.questionsFound}`);
    console.log(`      🔘 Найдено кнопок навигации: ${questionsInDOM.nextButtonInfo.length}`);
    
    // Если нашли кнопки навигации и уже есть первый вопрос, переключаемся между вопросами
    if (questionsInDOM.nextButtonInfo.length > 0 && allQuestions.length > 0) {
      console.log(`      🔄 Переключаюсь между вопросами через карусель...`);
      
      // Ищем кнопку "следующий" через Puppeteer
      let nextButton = null;
      
      // Пробуем найти через разные способы
      const selectors = [
        'button[aria-label*="next"]',
        'button[aria-label*="siguiente"]',
        'button[class*="next"]',
        '.carousel-control-next',
        '[class*="arrow-right"]',
        '[class*="next"]',
        '[data-slide="next"]',
      ];
      
      for (const selector of selectors) {
        try {
          nextButton = await page.$(selector);
          if (nextButton) {
            console.log(`      ✅ Найдена кнопка: ${selector}`);
            break;
          }
        } catch (e) {
          // Продолжаем поиск
        }
      }
      
      // Если не нашли через селекторы, ищем через evaluate
      if (!nextButton) {
        const buttonHandle = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          for (const btn of buttons) {
            const text = (btn.textContent || '').toLowerCase();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            const className = (btn.className || '').toLowerCase();
            
            if (text.includes('next') || 
                text.includes('siguiente') || 
                text.includes('>') ||
                ariaLabel.includes('next') ||
                ariaLabel.includes('siguiente') ||
                className.includes('next')) {
              return btn;
            }
          }
          return null;
        });
        
        if (buttonHandle && buttonHandle.asElement()) {
          nextButton = buttonHandle.asElement();
        }
      }
      
      if (nextButton) {
        // Переключаемся между вопросами
        const maxQuestions = 50;
        for (let i = 1; i < maxQuestions; i++) {
          try {
            // Проверяем, доступна ли кнопка
            const isVisible = await nextButton.isIntersectingViewport();
            if (!isVisible) {
              console.log(`      ⚠️ Кнопка навигации недоступна, останавливаюсь`);
              break;
            }
            
            // Нажимаем кнопку "следующий"
            await nextButton.click({ delay: 100 });
            await page.waitForTimeout(2000); // Ждем загрузки следующего вопроса
            
            // Извлекаем текущий вопрос
            const question = await extractCurrentQuestion(page, topicNumber, testNumber, i + 1);
            
            if (question && question.question_text) {
              // Проверяем на дубликат
              const isDuplicate = allQuestions.some(q => {
                const q1 = q.question_text.substring(0, 50).trim();
                const q2 = question.question_text.substring(0, 50).trim();
                return q1 === q2;
              });
              
              if (!isDuplicate) {
                allQuestions.push(question);
                console.log(`      ✅ Вопрос ${allQuestions.length}: ${question.question_text.substring(0, 40)}...`);
              } else {
                console.log(`      ⚠️ Достигнут конец карусели (дубликат вопроса)`);
                break;
              }
            } else {
              console.log(`      ⚠️ Не удалось извлечь вопрос ${i + 1}`);
              // Пробуем еще раз после дополнительного ожидания
              await page.waitForTimeout(1000);
              const retryQuestion = await extractCurrentQuestion(page, topicNumber, testNumber, i + 1);
              if (retryQuestion && retryQuestion.question_text) {
                allQuestions.push(retryQuestion);
                console.log(`      ✅ Вопрос ${allQuestions.length} извлечен после повтора`);
              } else {
                break;
              }
            }
            
            // Обновляем ссылку на кнопку
            nextButton = await page.$(
              'button[aria-label*="next"], ' +
              'button[aria-label*="siguiente"], ' +
              '.carousel-control-next, ' +
              '[class*="next"]'
            );
            
            if (!nextButton) {
              console.log(`      ⚠️ Кнопка навигации не найдена, останавливаюсь`);
              break;
            }
          } catch (e) {
            console.log(`      ⚠️ Ошибка при переключении: ${e.message}`);
            break;
          }
        }
      } else {
        console.log(`      ⚠️ Кнопка навигации не найдена, используем только первый вопрос`);
      }
    }
    
    const questions = allQuestions;
    
    if (questions.length === 0) {
      console.log(`      ⚠️ Вопросы не найдены для теста ${testNumber}`);
      
      // Делаем скриншот для отладки
      try {
        await page.screenshot({ path: `test-${testNumber}-no-questions.png`, fullPage: true });
        console.log(`      📸 Скриншот сохранен: test-${testNumber}-no-questions.png`);
      } catch (e) {
        console.log(`      ⚠️ Не удалось создать скриншот: ${e.message}`);
      }
      
      // Получаем подробную информацию о странице
      const pageInfo = await page.evaluate(() => {
        const info = {
          url: window.location.href,
          title: document.title,
          bodyText: document.body.textContent.substring(0, 500),
          bodyInnerText: document.body.innerText.substring(0, 500),
          hasQuestionMark: document.body.textContent.includes('?'),
          hasRadioButtons: document.querySelectorAll('input[type="radio"]').length,
          hasImages: document.querySelectorAll('img').length,
          allText: document.body.innerText.split('\n').slice(0, 20), // Первые 20 строк
        };
        return info;
      });
      
      console.log(`      📊 Информация о странице:`);
      console.log(`         URL: ${pageInfo.url}`);
      console.log(`         Заголовок: ${pageInfo.title}`);
      console.log(`         Знак вопроса: ${pageInfo.hasQuestionMark ? '✅' : '❌'}`);
      console.log(`         Радио-кнопки: ${pageInfo.hasRadioButtons}`);
      console.log(`         Изображения: ${pageInfo.hasImages}`);
      console.log(`         Первые строки текста:`);
      pageInfo.allText.slice(0, 10).forEach((line, i) => {
        if (line.trim()) {
          console.log(`            ${i + 1}. ${line.substring(0, 80)}...`);
        }
      });
    }
    
    console.log(`      ✅ Найдено вопросов: ${questions.length}`);
    return questions;
  } catch (error) {
    console.error(`      ❌ Ошибка при скрапинге теста ${testNumber}:`, error.message);
    await page.screenshot({ path: `test-${testNumber}-error.png` });
    return [];
  }
}

// Вспомогательная функция для извлечения текущего вопроса со страницы
async function extractCurrentQuestion(page, topicNumber, testNumber, questionNumber) {
  return await page.evaluate((topicNum, testNum, qNum) => {
    // Ищем видимый текст вопроса
    const bodyText = document.body.innerText || '';
    const questionMatch = bodyText.match(/(\d+\s+[A-ZА-Я][^?\n]*[?¿])/);
    if (!questionMatch) return null;
    
    const questionText = questionMatch[1].trim();
    
    // Ищем изображение
    let imageUrl = null;
    const images = Array.from(document.querySelectorAll('img')).filter(img => {
      const style = window.getComputedStyle(img);
      return style.display !== 'none' && 
             img.offsetWidth > 50 && 
             !img.src.includes('logo') && 
             !img.src.includes('icon');
    });
    
    if (images.length > 0) {
      imageUrl = images[0].src || images[0].getAttribute('data-src') || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `https://teorica.practicavial.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }
    }
    
    // Ищем ответы
    const answers = [];
    const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]'));
    
    radioInputs.forEach(radio => {
      let label = document.querySelector(`label[for="${radio.id}"]`);
      if (!label) label = radio.closest('label');
      if (!label && radio.nextElementSibling) label = radio.nextElementSibling;
      
      if (label) {
        let answerText = label.textContent.trim();
        answerText = answerText.replace(/^[A-Z]\s*[.\-\s]*/, '').trim();
        
        if (answerText && answerText.length > 2 && answerText.length < 200) {
          const isCorrect = radio.checked || 
                           radio.classList.contains('correct') ||
                           radio.hasAttribute('data-correct') ||
                           label.classList.contains('correct') ||
                           radio.closest('.correct, .right') !== null;
          
          answers.push({
            text: answerText,
            is_correct: isCorrect,
            order: answers.length + 1,
          });
        }
      }
    });
    
    // Если не нашли через радио-кнопки, ищем по тексту
    if (answers.length < 2) {
      const lines = bodyText.split('\n');
      for (const line of lines) {
        const match = line.match(/^([A-Z])\s+(.+)$/);
        if (match && match[2].trim().length > 2 && match[2].trim().length < 200) {
          answers.push({
            text: match[2].trim(),
            is_correct: false,
            order: answers.length + 1,
          });
          if (answers.length >= 3) break;
        }
      }
    }
    
    if (answers.length < 2) return null;
    
    return {
      topic_number: topicNum,
      test_number: testNum,
      question_number: qNum,
      question_text: questionText.substring(0, 1000),
      image_url: imageUrl,
      answers: answers,
    };
  }, topicNumber, testNumber, questionNumber);
}

// Сохранение в базу данных
async function saveQuestionsToDatabase(questions, topicMap) {
  console.log('\n💾 Сохранение в базу данных...');
  
  let saved = 0;
  let errors = 0;
  
  for (const q of questions) {
    try {
      // Получаем ID темы
      let topicId = topicMap.get(q.topic_number);
      if (!topicId) {
        // Создаем тему, если ее нет
        const { data: newTopic, error: topicError } = await supabase
          .from('topics')
          .insert({ number: q.topic_number, title: `Тема ${q.topic_number}` })
          .select()
          .single();
        
        if (topicError && !topicError.message.includes('duplicate')) {
          console.error(`   Ошибка при создании темы ${q.topic_number}:`, topicError.message);
          errors++;
          continue;
        }
        
        topicId = newTopic?.id;
        if (topicId) {
          topicMap.set(q.topic_number, topicId);
        }
      }
      
      if (!topicId) {
        console.error(`   Не удалось получить ID темы ${q.topic_number}`);
        errors++;
        continue;
      }
      
      // Вставляем вопрос
      const { data: question, error: questionError } = await supabase
        .from('questions_new')
        .insert({
          topic_id: topicId,
          test_number: q.test_number,
          question_number: q.question_number,
          question_text: q.question_text,
          image_url: q.image_url,
        })
        .select()
        .single();
      
      if (questionError && !questionError.message.includes('duplicate')) {
        console.error(`   Ошибка при сохранении вопроса:`, questionError.message);
        errors++;
        continue;
      }
      
      if (question) {
        // Вставляем ответы
        for (const answer of q.answers) {
          await supabase
            .from('answer_options')
            .insert({
              question_id: question.id,
              answer_text: answer.text,
              is_correct: answer.is_correct,
              order: answer.order,
            });
        }
        saved++;
      }
    } catch (e) {
      console.error(`   Ошибка при сохранении вопроса:`, e.message);
      errors++;
    }
  }
  
  return { saved, errors };
}

// Генерация Excel файла
function generateExcelFile(questions, outputPath) {
  console.log('\n📊 Генерация Excel файла...');
  
  const questionsData = questions.map(q => ({
    'Тема': q.topic_number,
    'Тест': q.test_number,
    'Вопрос №': q.question_number,
    'Текст вопроса (ES)': q.question_text,
    'URL изображения': q.image_url || '',
    'Количество ответов': q.answers.length,
  }));
  
  const answersData = [];
  questions.forEach(q => {
    q.answers.forEach((answer, index) => {
      answersData.push({
        'Тема': q.topic_number,
        'Тест': q.test_number,
        'Вопрос №': q.question_number,
        'Ответ №': index + 1,
        'Текст ответа (ES)': answer.text,
        'Правильный': answer.is_correct ? 'Да' : 'Нет',
      });
    });
  });
  
  const workbook = XLSX.utils.book_new();
  const questionsSheet = XLSX.utils.json_to_sheet(questionsData);
  const answersSheet = XLSX.utils.json_to_sheet(answersData);
  
  XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Вопросы');
  XLSX.utils.book_append_sheet(workbook, answersSheet, 'Ответы');
  
  XLSX.writeFile(workbook, outputPath);
  console.log(`✅ Excel файл сохранен: ${outputPath}`);
}

// Главная функция
async function main() {
  const config = parseArgs();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🚀 СКРАПЕР PRACTICAVIAL');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Темы: ${config.topics.join(', ')}`);
  console.log(`   Режим: ${config.headless ? 'Headless' : 'С браузером'}`);
  console.log(`   Выходной файл: ${config.output}`);
  console.log('');
  
  // Запускаем браузер
  console.log('🌐 Запускаю браузер...');
  const browser = await puppeteer.launch({
    headless: config.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    // Интерактивная авторизация
    await waitForManualLogin(page);
    
    // Получаем маппинг тем
    const { data: dbTopics } = await supabase
      .from('topics')
      .select('id, number');
    
    const topicMap = new Map(dbTopics?.map(t => [t.number, t.id]) || []);
    
    // Скрапим тесты
    const allQuestions = [];
    let topicsProcessed = 0;
    let testsProcessed = 0;
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📚 НАЧАЛО СКРАПИНГА');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    for (const topicNumber of config.topics) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📚 ТЕМА ${topicNumber}`);
      console.log(`${'='.repeat(60)}`);
      topicsProcessed++;
      
      const tests = await getTestsForTopic(page, topicNumber);
      
      if (tests.length === 0) {
        console.log(`   ⚠️ Тесты не найдены для темы ${topicNumber}`);
        continue;
      }
      
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`\n   [${i + 1}/${tests.length}] Тест ${test.number}`);
        
        const questions = await scrapeTest(page, test.url, topicNumber, test.number);
        
        if (questions.length > 0) {
          allQuestions.push(...questions);
          testsProcessed++;
        }
        
        // Пауза между тестами
        if (i < tests.length - 1) {
          await page.waitForTimeout(2000);
        }
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ СКРАПИНГ ЗАВЕРШЕН');
    console.log(`${'='.repeat(60)}`);
    console.log(`   Обработано тем: ${topicsProcessed}`);
    console.log(`   Обработано тестов: ${testsProcessed}`);
    console.log(`   Найдено вопросов: ${allQuestions.length}`);
    console.log('');
    
    // Сохраняем в базу данных
    if (allQuestions.length > 0) {
      const saveResult = await saveQuestionsToDatabase(allQuestions, topicMap);
      console.log(`💾 Сохранено в БД: ${saveResult.saved} вопросов, ${saveResult.errors} ошибок`);
    }
    
    // Генерируем Excel
    if (allQuestions.length > 0) {
      generateExcelFile(allQuestions, config.output);
    }
    
    console.log('\n✅ Готово!');
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('📸 Скриншот сохранен в error-screenshot.png');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

