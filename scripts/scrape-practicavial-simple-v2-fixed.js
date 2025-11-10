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
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                    process.env.VITE_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения Supabase');
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

// Проверка авторизации
async function checkAuth(page) {
  try {
    const url = page.url();
    if (url.includes('/login')) {
      return false;
    }
    
    const hasTests = await page.evaluate(() => {
      const testLinks = document.querySelectorAll('a[href*="/test/tema/"]');
      const hasTestText = document.body.textContent.includes('Test Tema');
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
  
  await new Promise((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
  
  console.log('');
  console.log('🔍 Проверяю авторизацию...');
  
  const currentUrl = page.url();
  console.log(`   Текущий URL: ${currentUrl}`);
  
  if (currentUrl.includes('/login')) {
    console.log('   ⚠️ Вы еще на странице логина');
    console.log('   💡 Перехожу на страницу тестов для проверки...');
    await page.goto(`${BASE_URL}/permiso/b/tests/tema/1`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
  }
  
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
  
  const tests = await page.evaluate(() => {
    const testsList = [];
    const seenUrls = new Set();
    
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    
    allLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      if (href.includes('/test/tema/') && href.match(/[a-f0-9-]{36}/i)) {
        if (seenUrls.has(href)) return;
        seenUrls.add(href);
        
        const text = link.textContent.trim();
        const parentText = link.closest('div, li, article')?.textContent.trim() || '';
        const fullText = text + ' ' + parentText;
        
        const testMatch = fullText.match(/N[º°]?:\s*0?(\d+)/i) || 
                         fullText.match(/\b(\d{3})\b/);
        const testNumber = testMatch ? parseInt(testMatch[1]) : testsList.length + 1;
        
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

// Извлечение текущего вопроса со страницы (УПРОЩЕННАЯ ВЕРСИЯ)
async function extractCurrentQuestion(page, topicNumber, testNumber, questionNumber) {
  return await page.evaluate((topicNum, testNum, qNum) => {
    try {
      // Получаем весь текст страницы
      const bodyText = document.body.innerText || document.body.textContent || '';
      
      // Ищем номер вопроса (большая цифра в центре)
      let visibleQuestionNumber = null;
      const allElements = Array.from(document.querySelectorAll('*'));
      
      for (const el of allElements) {
        try {
          const style = window.getComputedStyle(el);
          const fontSize = parseInt(style.fontSize) || 0;
          const rect = el.getBoundingClientRect();
          const text = el.textContent.trim();
          
          if (fontSize > 24 && 
              rect.width > 0 && rect.height > 0 &&
              rect.top >= 0 && rect.top < window.innerHeight &&
              /^\d+$/.test(text) &&
              parseInt(text) >= 1 && parseInt(text) <= 50) {
            visibleQuestionNumber = parseInt(text);
            break;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
      
      // Ищем текст вопроса
      let questionText = null;
      
      // Стратегия 1: По номеру вопроса
      if (visibleQuestionNumber) {
        const pattern = new RegExp(`${visibleQuestionNumber}\\s+[A-ZА-ЯЁ][^?\\n]*[?¿]`, 'i');
        const match = bodyText.match(pattern);
        if (match) {
          questionText = match[0].trim();
        }
      }
      
      // Стратегия 2: Любой вопрос в тексте
      if (!questionText) {
        const matches = bodyText.match(/(\d+\s+[A-ZА-ЯЁ][^?\n]{10,200}[?¿])/g);
        if (matches && matches.length > 0) {
          for (const match of matches) {
            if (!match.includes('Test Tema') && 
                !match.includes('Reportar') &&
                !match.includes('Respondido') &&
                match.length > 20) {
              questionText = match.trim();
              break;
            }
          }
        }
      }
      
      if (!questionText) {
        return null;
      }
      
      const actualQuestionNumber = visibleQuestionNumber || qNum;
      
      // Ищем изображение
      let imageUrl = null;
      const images = Array.from(document.querySelectorAll('img')).filter(img => {
        const src = img.src || '';
        const rect = img.getBoundingClientRect();
        return src && 
               !src.includes('logo') && 
               !src.includes('icon') &&
               rect.width > 50 &&
               rect.height > 50;
      });
      
      if (images.length > 0) {
        const largest = images.reduce((largest, img) => {
          const size1 = largest.offsetWidth * largest.offsetHeight;
          const size2 = img.offsetWidth * img.offsetHeight;
          return size2 > size1 ? img : largest;
        });
        imageUrl = largest.src || '';
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https://teorica.practicavial.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
      }
      
      // Ищем ответы
      const answers = [];
      const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]'));
      
      radioInputs.forEach(radio => {
        let label = document.querySelector(`label[for="${radio.id}"]`) || radio.closest('label');
        if (!label && radio.nextElementSibling) {
          label = radio.nextElementSibling;
        }
        
        if (label) {
          let answerText = label.textContent.trim();
          answerText = answerText.replace(/^[A-Z]\s*[.\-\s)]*\s*/, '').trim();
          
          if (answerText && answerText.length > 2 && answerText.length < 200) {
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
      
      // Если не нашли ответы, ищем по тексту
      if (answers.length < 2) {
        const lines = bodyText.split('\n');
        for (const line of lines) {
          const match = line.match(/^([A-Z])\s*[.\-)]*\s*(.+)$/);
          if (match && match[2].trim().length > 2) {
            const answerText = match[2].trim();
            if (!answerText.includes('?') && !answerText.includes('Test')) {
              answers.push({
                text: answerText,
                is_correct: false,
                order: answers.length + 1,
              });
              if (answers.length >= 3) break;
            }
          }
        }
      }
      
      if (answers.length < 2) {
        return null;
      }
      
      return {
        topic_number: topicNum,
        test_number: testNum,
        question_number: actualQuestionNumber,
        question_text: questionText.substring(0, 1000),
        image_url: imageUrl,
        answers: answers,
      };
    } catch (error) {
      console.log(`Ошибка: ${error.message}`);
      return null;
    }
  }, topicNumber, testNumber, questionNumber);
}

// Поиск кнопки навигации
async function findNextButton(page) {
  const selectors = [
    'button[aria-label*="next"]',
    'button[aria-label*="siguiente"]',
    'button[class*="next"]',
    '.carousel-control-next',
    '[class*="arrow-right"]',
  ];
  
  for (const selector of selectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        const isVisible = await button.isIntersectingViewport();
        if (isVisible) {
          return button;
        }
      }
    } catch (e) {
      // Продолжаем
    }
  }
  
  return null;
}

// Скрапинг одного теста
async function scrapeTest(page, testUrl, topicNumber, testNumber) {
  try {
    console.log(`      📄 Загружаю тест ${testNumber}...`);
    
    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForTimeout(6000);
    
    const allQuestions = [];
    
    // Извлекаем первый вопрос
    const firstQuestion = await extractCurrentQuestion(page, topicNumber, testNumber, 1);
    if (firstQuestion) {
      allQuestions.push(firstQuestion);
      console.log(`      ✅ Вопрос 1 (№${firstQuestion.question_number}): ${firstQuestion.question_text.substring(0, 40)}...`);
      
      // Выбираем первый ответ
      try {
        const firstRadio = await page.$('input[type="radio"]:not(:checked)');
        if (firstRadio) {
          await firstRadio.click();
          await page.waitForTimeout(1500);
        }
      } catch (e) {
        // Игнорируем
      }
    } else {
      console.log(`      ⚠️ Первый вопрос не найден`);
      return [];
    }
    
    // Переключаемся между вопросами
    const maxQuestions = 50;
    for (let i = 1; i < maxQuestions; i++) {
      const nextButton = await findNextButton(page);
      if (!nextButton) {
        break;
      }
      
      // Выбираем ответ перед переходом
      try {
        const firstRadio = await page.$('input[type="radio"]:not(:checked)');
        if (firstRadio) {
          await firstRadio.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // Игнорируем
      }
      
      // Нажимаем кнопку "следующий"
      await nextButton.click({ delay: 100 });
      await page.waitForTimeout(4000);
      
      // Извлекаем вопрос
      const question = await extractCurrentQuestion(page, topicNumber, testNumber, i + 1);
      
      if (question) {
        // Проверяем на дубликат
        const isDuplicate = allQuestions.some(q => 
          q.question_number === question.question_number ||
          q.question_text.substring(0, 50) === question.question_text.substring(0, 50)
        );
        
        if (!isDuplicate) {
          allQuestions.push(question);
          console.log(`      ✅ Вопрос ${allQuestions.length} (№${question.question_number}): ${question.question_text.substring(0, 40)}...`);
        } else {
          console.log(`      ⚠️ Достигнут конец (дубликат)`);
          break;
        }
      } else {
        console.log(`      ⚠️ Не удалось извлечь вопрос ${i + 1}`);
        break;
      }
    }
    
    console.log(`      ✅ Итого найдено вопросов: ${allQuestions.length}`);
    return allQuestions;
  } catch (error) {
    console.error(`      ❌ Ошибка при скрапинге теста ${testNumber}:`, error.message);
    return [];
  }
}

// Сохранение в базу данных
async function saveQuestionsToDatabase(questions, topicMap) {
  console.log('\n💾 Сохранение в базу данных...');
  
  let saved = 0;
  let errors = 0;
  
  for (const q of questions) {
    try {
      let topicId = topicMap.get(q.topic_number);
      if (!topicId) {
        const { data: newTopic } = await supabase
          .from('topics')
          .insert({ number: q.topic_number, title: `Тема ${q.topic_number}` })
          .select()
          .single();
        
        topicId = newTopic?.id;
        if (topicId) {
          topicMap.set(q.topic_number, topicId);
        }
      }
      
      if (!topicId) continue;
      
      const { data: question } = await supabase
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
      
      if (question) {
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
  
  console.log('🌐 Запускаю браузер...');
  const browser = await puppeteer.launch({
    headless: config.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Перехват API запросов
  const apiResponses = [];
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    try {
      request.continue();
    } catch (e) {
      // Игнорируем ошибки
    }
  });
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/test/tema/') || url.includes('json')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json')) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            if (data[0].question_text || data[0].text || data[0].pregunta) {
              console.log(`      ✅ НАЙДЕН API С ВОПРОСАМИ! Количество: ${data.length}`);
              apiResponses.push({ url, data });
            }
          }
        }
      } catch (e) {
        // Не JSON
      }
    }
  });
  
  try {
    await waitForManualLogin(page);
    
    const { data: dbTopics } = await supabase
      .from('topics')
      .select('id, number');
    
    const topicMap = new Map(dbTopics?.map(t => [t.number, t.id]) || []);
    
    const allQuestions = [];
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📚 НАЧАЛО СКРАПИНГА');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    for (const topicNumber of config.topics) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📚 ТЕМА ${topicNumber}`);
      console.log(`${'='.repeat(60)}`);
      
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
        }
        
        if (i < tests.length - 1) {
          await page.waitForTimeout(2000);
        }
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ СКРАПИНГ ЗАВЕРШЕН');
    console.log(`${'='.repeat(60)}`);
    console.log(`   Найдено вопросов: ${allQuestions.length}`);
    console.log('');
    
    if (allQuestions.length > 0) {
      const saveResult = await saveQuestionsToDatabase(allQuestions, topicMap);
      console.log(`💾 Сохранено в БД: ${saveResult.saved} вопросов, ${saveResult.errors} ошибок`);
      generateExcelFile(allQuestions, config.output);
    }
    
    if (apiResponses.length > 0) {
      console.log(`\n🎉 Найдено ${apiResponses.length} API эндпоинтов с вопросами!`);
    }
    
    console.log('\n✅ Готово!');
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(console.error);


