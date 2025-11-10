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

// Извлечение текущего вопроса со страницы
async function extractCurrentQuestion(page, topicNumber, testNumber, questionNumber) {
  return await page.evaluate((topicNum, testNum, qNum) => {
    try {
      console.log(`Извлекаю вопрос ${qNum}...`);
      
      // Получаем весь текст страницы для поиска
      const bodyText = document.body.innerText || document.body.textContent || '';
      const bodyHTML = document.body.innerHTML || '';
      
      // ВАЖНО: Ищем номер вопроса, который виден на странице (большая цифра, например "9")
      let visibleQuestionNumber = null;
      
      // Ищем большую цифру в центре экрана (обычно это номер вопроса)
      const allElements = Array.from(document.querySelectorAll('*'));
      const largeNumbers = [];
      
      for (const el of allElements) {
        try {
          const style = window.getComputedStyle(el);
          const fontSize = parseInt(style.fontSize) || 0;
          const rect = el.getBoundingClientRect();
          const text = el.textContent.trim();
          
          // Ищем большие цифры в видимой области
          if (fontSize > 24 && 
              rect.width > 0 && rect.height > 0 &&
              rect.top >= 0 && rect.top < window.innerHeight &&
              /^\d+$/.test(text) &&
              parseInt(text) >= 1 && 
              parseInt(text) <= 50) {
            largeNumbers.push({
              element: el,
              number: parseInt(text),
              fontSize: fontSize,
              centerY: rect.top + rect.height / 2,
            });
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
      
      if (largeNumbers.length > 0) {
        // Берем число, которое ближе к центру экрана
        const centerY = window.innerHeight / 2;
        const closest = largeNumbers.reduce((closest, item) => {
          return Math.abs(item.centerY - centerY) < Math.abs(closest.centerY - centerY) ? item : closest;
        });
        visibleQuestionNumber = closest.number;
        console.log(`Найден номер вопроса (большая цифра): ${visibleQuestionNumber}`);
      }
      
      // Ищем текст вопроса
      let questionText = null;
      let questionElement = null;
      
      // Стратегия 1: Ищем вопрос с номером, который виден на странице
      if (visibleQuestionNumber) {
        const questionPattern = new RegExp(`${visibleQuestionNumber}\\s+[A-ZА-ЯЁ][^?\\n]*[?¿]`, 'i');
        const match = bodyText.match(questionPattern);
        if (match) {
          questionText = match[0].trim();
          console.log(`Найден вопрос по номеру ${visibleQuestionNumber}: ${questionText.substring(0, 50)}...`);
        }
      }
      
      // Стратегия 2: Ищем любой вопрос в тексте страницы
      if (!questionText) {
        const matches = bodyText.match(/(\d+\s+[A-ZА-ЯЁ][^?\n]{10,200}[?¿])/g);
        if (matches && matches.length > 0) {
          // Берем первый матч, который не содержит служебные слова
          for (const match of matches) {
            if (!match.includes('Test Tema') && 
                !match.includes('Reportar') &&
                !match.includes('Respondido') &&
                !match.includes('Ampliar') &&
                match.length > 20 &&
                match.length < 500) {
              questionText = match.trim();
              console.log(`Найден вопрос в тексте: ${questionText.substring(0, 50)}...`);
              break;
            }
          }
        }
      }
      
      // Стратегия 3: Ищем в видимых элементах
      if (!questionText) {
        const visibleElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, div, span, article, section, main'));
        for (const el of visibleElements) {
          try {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            
            if (style.display !== 'none' && 
                style.visibility !== 'hidden' &&
                rect.width > 0 && 
                rect.height > 0 &&
                rect.top >= 0 && 
                rect.top < window.innerHeight) {
              
              const text = el.textContent.trim();
              const match = text.match(/(\d+\s+[A-ZА-ЯЁ][^?\n]*[?¿])/);
              if (match && text.length > 20 && text.length < 500 && 
                  !text.includes('Test Tema') && 
                  !text.includes('Reportar')) {
                questionText = match[1].trim();
                questionElement = el;
                console.log(`Найден вопрос в видимом элементе: ${questionText.substring(0, 50)}...`);
                break;
              }
            }
          } catch (e) {
            // Игнорируем ошибки
          }
        }
      }
      
      if (!questionText) {
        console.log('Вопрос не найден');
        console.log(`Длина bodyText: ${bodyText.length}`);
        return null;
      }
      
      // Используем реальный номер вопроса, если нашли
      const actualQuestionNumber = visibleQuestionNumber || qNum;
      console.log(`Вопрос ${actualQuestionNumber}: ${questionText.substring(0, 50)}...`);
      
      // Ищем изображение (самое большое, не логотип, видимое)
      let imageUrl = null;
      try {
        const images = Array.from(document.querySelectorAll('img'));
      const style = window.getComputedStyle(img);
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
      return src && 
             !src.includes('logo') && 
             !src.includes('icon') && 
             !src.includes('avatar') &&
             style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             img.offsetWidth > 50 &&
             img.offsetHeight > 50;
    });
    
    if (images.length > 0) {
      // Берем самое большое видимое изображение
      const visibleImages = images.filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      
      if (visibleImages.length > 0) {
        const largestImg = visibleImages.reduce((largest, img) => {
          const largestSize = largest.offsetWidth * largest.offsetHeight;
          const currentSize = img.offsetWidth * img.offsetHeight;
          return currentSize > largestSize ? img : largest;
        });
        
        imageUrl = largestImg.src || largestImg.getAttribute('data-src') || largestImg.getAttribute('data-lazy-src') || '';
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https://teorica.practicavial.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        console.log(`Найдено изображение: ${imageUrl ? imageUrl.substring(0, 60) : 'нет'}...`);
      }
    }
    
    // Ищем ответы - через радио-кнопки (только видимые)
    const answers = [];
    const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]')).filter(radio => {
      const style = window.getComputedStyle(radio);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    
    console.log(`Найдено видимых радио-кнопок: ${radioInputs.length}`);
    
    radioInputs.forEach((radio, index) => {
      // Ищем связанный label
      let label = null;
      const labelId = radio.id;
      if (labelId) {
        label = document.querySelector(`label[for="${labelId}"]`);
      }
      if (!label) {
        label = radio.closest('label');
      }
      if (!label && radio.parentElement) {
        label = radio.parentElement.querySelector('label');
      }
      if (!label && radio.nextElementSibling) {
        label = radio.nextElementSibling;
      }
      // Если label не найден, ищем следующий текстовый элемент
      if (!label) {
        let nextEl = radio.nextElementSibling;
        while (nextEl && !label) {
          if (nextEl.tagName === 'LABEL' || nextEl.tagName === 'SPAN' || nextEl.tagName === 'DIV') {
            const text = nextEl.textContent.trim();
            if (text.length > 2 && text.length < 200) {
              label = nextEl;
            }
          }
          nextEl = nextEl.nextElementSibling;
        }
      }
      
      if (label) {
        let answerText = label.textContent.trim();
        
        // Удаляем префикс "A ", "B ", "C " и т.д.
        answerText = answerText.replace(/^[A-Z]\s*[.\-\s)]*\s*/, '').trim();
        
        // Если ответ начинается с цифры и единицы измерения (120 km/h), оставляем как есть
        if (!answerText.match(/^\d+\s*(km\/h|km|h|m|s)/)) {
          // Удаляем лишние пробелы
          answerText = answerText.replace(/\s+/g, ' ').trim();
        }
        
        if (answerText && answerText.length > 2 && answerText.length < 200) {
          // Определяем правильность ответа
          const isChecked = radio.checked;
          const hasCorrectClass = radio.classList.contains('correct') ||
                                 label.classList.contains('correct') ||
                                 radio.closest('.correct, .right, .success') !== null ||
                                 label.closest('.correct, .right, .success') !== null;
          const hasDataCorrect = radio.hasAttribute('data-correct') && radio.getAttribute('data-correct') === 'true';
          
          // Проверяем стили (подсветка правильного ответа)
          const labelStyle = window.getComputedStyle(label);
          const bgColor = labelStyle.backgroundColor;
          const isHighlighted = bgColor && 
                               bgColor !== 'rgba(0, 0, 0, 0)' && 
                               bgColor !== 'transparent' &&
                               bgColor !== 'rgb(255, 255, 255)' &&
                               bgColor !== 'rgb(255,255,255)';
          
          const isCorrect = isChecked || hasCorrectClass || hasDataCorrect || isHighlighted;
          
          answers.push({
            text: answerText,
            is_correct: isCorrect,
            order: answers.length + 1,
          });
          
          console.log(`Ответ ${answers.length}: ${answerText.substring(0, 30)}... (правильный: ${isCorrect})`);
        }
      }
    });
    
    // Если не нашли через радио-кнопки, ищем по тексту "A 120 km/h", "B 100 km/h"
    if (answers.length < 2) {
      console.log('Недостаточно ответов через радио-кнопки, ищу по тексту...');
      // Получаем текст из видимой области или из элемента вопроса
      const searchText = questionElement ? questionElement.textContent : (document.body.innerText || document.body.textContent || '');
      const lines = searchText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Ищем строки, которые выглядят как ответы
      for (const line of lines) {
        // Паттерн: "A 120 km/h" или "A. 120 km/h" или "A) 120 km/h"
        const match = line.match(/^([A-Z])\s*[.\-)]*\s*(.+)$/);
        if (match && match[2].trim().length > 2 && match[2].trim().length < 200) {
          const answerText = match[2].trim();
          
          // Проверяем, что это не вопрос и не другой контент
          if (!answerText.includes('?') && 
              !answerText.includes('Test') &&
              !answerText.includes('Tema') &&
              !answerText.includes('Reportar') &&
              !answerText.includes('Ampliar') &&
              !answers.find(a => a.text === answerText || a.text.includes(answerText) || answerText.includes(a.text))) {
            answers.push({
              text: answerText,
              is_correct: false, // Не знаем, какой правильный
              order: answers.length + 1,
            });
            console.log(`Ответ найден по тексту: ${answerText.substring(0, 30)}...`);
            if (answers.length >= 3) break; // Обычно 3 ответа
          }
        }
      }
    }
    
    console.log(`Итого найдено ответов: ${answers.length}`);
    
    if (answers.length < 2) {
      console.log('Недостаточно ответов для вопроса');
      return null;
    }
    
    const result = {
      topic_number: topicNum,
      test_number: testNum,
      question_number: actualQuestionNumber, // Используем реальный номер вопроса
      question_text: questionText.substring(0, 1000),
      image_url: imageUrl,
      answers: answers,
    };
    
    console.log(`✅ Вопрос ${actualQuestionNumber} извлечен: "${questionText.substring(0, 40)}..." с ${answers.length} ответами`);
    return result;
  }, topicNumber, testNumber, questionNumber);
}

// Поиск кнопки "следующий вопрос" (но не кнопки закрытия теста!)
async function findNextButton(page) {
  // Сначала исключаем кнопки, которые закрывают тест или ведут на другую страницу
  const excludeSelectors = [
    'button[aria-label*="close"]',
    'button[aria-label*="cerrar"]',
    'button[class*="close"]',
    'button[class*="exit"]',
    'a[href*="/tests/tema"]', // Ссылки на список тестов
    'a[href*="/test/tema"]',  // Ссылки на другие тесты (не навигация внутри теста)
  ];
  
  // Пробуем разные селекторы для кнопки "следующий"
  const selectors = [
    'button[aria-label*="next"]:not([aria-label*="close"]):not([aria-label*="cerrar"])',
    'button[aria-label*="siguiente"]:not([aria-label*="close"]):not([aria-label*="cerrar"])',
    'button[class*="next"]:not([class*="close"]):not([class*="exit"])',
    '.carousel-control-next:not([class*="close"])',
    '[class*="arrow-right"]:not([class*="close"])',
    '[class*="next"]:not([class*="close"]):not([class*="exit"])',
    '[data-slide="next"]:not([class*="close"])',
    'a[class*="next"]:not([href*="/tests"]):not([href*="/test/"])',
  ];
  
  for (const selector of selectors) {
    try {
      const buttons = await page.$$(selector);
      for (const button of buttons) {
        // Проверяем, что это не кнопка закрытия
        const buttonInfo = await page.evaluate((btn) => {
          const text = (btn.textContent || '').toLowerCase();
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          const href = btn.getAttribute('href') || '';
          const className = (btn.className || '').toLowerCase();
          
          // Исключаем кнопки закрытия
          if (text.includes('close') || 
              text.includes('cerrar') ||
              text.includes('exit') ||
              text.includes('salir') ||
              ariaLabel.includes('close') ||
              ariaLabel.includes('cerrar') ||
              className.includes('close') ||
              className.includes('exit') ||
              href.includes('/tests/tema') ||
              href.includes('/test/tema/')) {
            return { isNavigation: false, reason: 'close or exit button' };
          }
          
          // Проверяем, что это кнопка навигации
          if (text.includes('next') || 
              text.includes('siguiente') || 
              text.includes('>') ||
              text.includes('›') ||
              ariaLabel.includes('next') ||
              ariaLabel.includes('siguiente') ||
              className.includes('next') ||
              className.includes('arrow-right')) {
            const style = window.getComputedStyle(btn);
            return {
              isNavigation: style.display !== 'none' && style.visibility !== 'hidden',
              text: text,
              ariaLabel: ariaLabel,
            };
          }
          
          return { isNavigation: false, reason: 'unknown' };
        }, button);
        
        if (buttonInfo.isNavigation) {
          const isVisible = await button.isIntersectingViewport();
          if (isVisible) {
            console.log(`         Найдена кнопка навигации: "${buttonInfo.text || buttonInfo.ariaLabel}"`);
            return button;
          }
        }
      }
    } catch (e) {
      // Продолжаем поиск
    }
  }
  
  // Ищем по тексту через evaluate (более тщательно)
  try {
    const buttonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'));
      const candidates = [];
      
      for (const btn of buttons) {
        const text = (btn.textContent || '').toLowerCase().trim();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const className = (btn.className || '').toLowerCase();
        const onClick = btn.getAttribute('onclick') || '';
        const href = btn.getAttribute('href') || '';
        const id = btn.id || '';
        
        // ИСКЛЮЧАЕМ кнопки закрытия и выхода
        if (text.includes('close') || 
            text.includes('cerrar') ||
            text.includes('exit') ||
            text.includes('salir') ||
            text.includes('finish') ||
            text.includes('finalizar') ||
            ariaLabel.includes('close') ||
            ariaLabel.includes('cerrar') ||
            ariaLabel.includes('exit') ||
            className.includes('close') ||
            className.includes('exit') ||
            id.includes('close') ||
            id.includes('exit') ||
            href.includes('/tests/tema') ||
            href.includes('/test/tema/')) {
          continue; // Пропускаем эту кнопку
        }
        
        // ИЩЕМ кнопки навигации
        const isNextButton = text.includes('next') || 
                            text.includes('siguiente') || 
                            text.includes('>') ||
                            text.includes('›') ||
                            text === '>' ||
                            text === '›' ||
                            ariaLabel.includes('next') ||
                            ariaLabel.includes('siguiente') ||
                            className.includes('next') ||
                            className.includes('arrow-right') ||
                            className.includes('carousel-next') ||
                            onClick.includes('next') ||
                            id.includes('next');
        
        if (isNextButton) {
          const style = window.getComputedStyle(btn);
          const rect = btn.getBoundingClientRect();
          
          if (style.display !== 'none' && 
              style.visibility !== 'hidden' &&
              rect.width > 0 && 
              rect.height > 0) {
            candidates.push({
              element: btn,
              text: text,
              ariaLabel: ariaLabel,
              className: className,
              isVisible: rect.top >= 0 && rect.left >= 0,
            });
          }
        }
      }
      
      // Возвращаем первую подходящую кнопку
      return candidates.length > 0 ? candidates[0] : null;
    });
    
    if (buttonInfo) {
      console.log(`         Найдена кнопка навигации через evaluate: "${buttonInfo.text || buttonInfo.ariaLabel}"`);
      // Находим кнопку через селектор на основе её свойств
      const buttonHandle = await page.evaluateHandle((info) => {
        const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        for (const btn of buttons) {
          const text = (btn.textContent || '').toLowerCase().trim();
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          if (text === info.text || ariaLabel === info.ariaLabel) {
            return btn;
          }
        }
        return null;
      }, buttonInfo);
      
      if (buttonHandle) {
        const element = buttonHandle.asElement();
        if (element) {
          return element;
        }
      }
    }
  } catch (e) {
    console.log(`         Ошибка при поиске кнопки через evaluate: ${e.message}`);
  }
  
  return null;
}

// Скрапинг одного теста с переключением между вопросами
async function scrapeTest(page, testUrl, topicNumber, testNumber) {
  try {
    console.log(`      📄 Загружаю тест ${testNumber}...`);
    console.log(`      URL: ${testUrl}`);
    
    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForTimeout(6000); // Ждем загрузки JavaScript и контента
    
    // Проверяем текущий URL - не закрылся ли тест
    const currentUrl = page.url();
    console.log(`      Текущий URL после загрузки: ${currentUrl}`);
    
    if (!currentUrl.includes('/test/tema/')) {
      console.log(`      ⚠️ Страница изменилась, возможно тест закрыт`);
      await page.screenshot({ path: `test-${testNumber}-wrong-page.png` });
      return [];
    }
    
    const allQuestions = [];
    
    // Извлекаем первый вопрос
    console.log(`      🔍 Извлекаю первый вопрос...`);
    const firstQuestion = await extractCurrentQuestion(page, topicNumber, testNumber, 1);
    
    if (firstQuestion && firstQuestion.question_text) {
      allQuestions.push(firstQuestion);
      console.log(`      ✅ Вопрос 1: ${firstQuestion.question_text.substring(0, 50)}...`);
      console.log(`         Ответов: ${firstQuestion.answers.length}`);
      console.log(`         Изображение: ${firstQuestion.image_url ? '✅' : '❌'}`);
      
      // ВАЖНО: Выбираем первый ответ на первом вопросе, чтобы разблокировать навигацию
      try {
        console.log(`      💡 Выбираю первый ответ на первом вопросе...`);
        const firstRadio = await page.$('input[type="radio"]:not(:checked)');
        if (firstRadio) {
          // Прокручиваем к радио-кнопке
          await firstRadio.scrollIntoView();
          await page.waitForTimeout(200);
          
          // Выбираем ответ
          await firstRadio.click({ delay: 50 });
          await page.waitForTimeout(1500); // Ждем обновления интерфейса
          
          // Проверяем, что ответ выбран
          const isChecked = await page.evaluate((radio) => {
            return radio.checked;
          }, firstRadio);
          
          if (isChecked) {
            console.log(`      ✅ Ответ выбран`);
          } else {
            console.log(`      ⚠️ Ответ не выбран через клик, пробую через JavaScript...`);
            // Пробуем через JavaScript
            await page.evaluate(() => {
              const firstRadio = document.querySelector('input[type="radio"]:not(:checked)');
              if (firstRadio) {
                firstRadio.checked = true;
                firstRadio.dispatchEvent(new Event('change', { bubbles: true }));
                firstRadio.dispatchEvent(new Event('click', { bubbles: true }));
              }
            });
            await page.waitForTimeout(1500);
            console.log(`      ✅ Ответ выбран через JavaScript`);
          }
        } else {
          // Проверяем, может ответ уже выбран
          const hasAnswer = await page.evaluate(() => {
            return document.querySelector('input[type="radio"]:checked') !== null;
          });
          
          if (hasAnswer) {
            console.log(`      ✅ Ответ уже выбран`);
          } else {
            console.log(`      ⚠️ Не найдено радио-кнопок`);
            // Пробуем через JavaScript напрямую
            await page.evaluate(() => {
              const radios = document.querySelectorAll('input[type="radio"]');
              if (radios.length > 0) {
                radios[0].checked = true;
                radios[0].dispatchEvent(new Event('change', { bubbles: true }));
                radios[0].dispatchEvent(new Event('click', { bubbles: true }));
              }
            });
            await page.waitForTimeout(1500);
          }
        }
      } catch (e) {
        console.log(`      ⚠️ Ошибка при выборе ответа на первом вопросе: ${e.message}`);
        // Пробуем через JavaScript как запасной вариант
        try {
          await page.evaluate(() => {
            const radios = document.querySelectorAll('input[type="radio"]');
            if (radios.length > 0) {
              radios[0].checked = true;
              radios[0].dispatchEvent(new Event('change', { bubbles: true }));
              radios[0].dispatchEvent(new Event('click', { bubbles: true }));
            }
          });
          await page.waitForTimeout(1500);
        } catch (e2) {
          console.log(`      ⚠️ Не удалось выбрать ответ через JavaScript: ${e2.message}`);
        }
      }
    } else {
      console.log(`      ⚠️ Первый вопрос не найден`);
      await page.screenshot({ path: `test-${testNumber}-no-first-question.png`, fullPage: true });
      return [];
    }
    
    // Ищем кнопку "следующий" и переключаемся между вопросами
    console.log(`      🔍 Ищу кнопку навигации для переключения между вопросами...`);
    let nextButton = await findNextButton(page);
    
    if (nextButton) {
      console.log(`      ✅ Кнопка навигации найдена!`);
      console.log(`      🔄 Начинаю переключение между вопросами...`);
      
      const maxQuestions = 50;
      let consecutiveFailures = 0;
      const maxFailures = 3;
      
      for (let i = 1; i < maxQuestions; i++) {
        try {
          // Проверяем, что мы все еще на странице теста
          const urlBeforeClick = page.url();
          if (!urlBeforeClick.includes('/test/tema/')) {
            console.log(`      ⚠️ Страница изменилась (не тест), останавливаюсь`);
            break;
          }
          
          // Проверяем доступность кнопки
          const buttonInfo = await page.evaluate((btn) => {
            if (!btn) return null;
            const rect = btn.getBoundingClientRect();
            const style = window.getComputedStyle(btn);
            return {
              visible: style.display !== 'none' && style.visibility !== 'hidden',
              inViewport: rect.top >= 0 && rect.left >= 0 && 
                         rect.bottom <= window.innerHeight && 
                         rect.right <= window.innerWidth,
              disabled: btn.disabled || btn.hasAttribute('disabled'),
              text: btn.textContent.trim(),
              className: btn.className,
            };
          }, nextButton);
          
          if (!buttonInfo || !buttonInfo.visible || buttonInfo.disabled) {
            console.log(`      ⚠️ Кнопка навигации недоступна (вопрос ${i + 1})`);
            break;
          }
          
          console.log(`      📍 Переключаюсь на вопрос ${i + 1}...`);
          
          // Сохраняем номер и текст текущего вопроса перед кликом
          const questionBeforeClick = await extractCurrentQuestion(page, topicNumber, testNumber, i);
          const questionNumberBefore = questionBeforeClick ? questionBeforeClick.question_number : null;
          const questionTextBefore = questionBeforeClick ? questionBeforeClick.question_text.substring(0, 100) : '';
          
          // ВАЖНО: На некоторых сайтах нужно ответить на вопрос перед переходом к следующему
          // Всегда выбираем первый ответ перед переключением
          try {
            console.log(`      💡 Выбираю первый ответ перед переходом...`);
            
            // Находим первую радио-кнопку
            const firstRadio = await page.$('input[type="radio"]:not(:checked)');
            if (firstRadio) {
              // Прокручиваем к радио-кнопке
              await firstRadio.scrollIntoView();
              await page.waitForTimeout(200);
              
              // Выбираем ответ
              await firstRadio.click({ delay: 50 });
              await page.waitForTimeout(1000); // Ждем обновления интерфейса
              
              // Проверяем, что ответ выбран
              const isChecked = await page.evaluate((radio) => {
                return radio.checked;
              }, firstRadio);
              
              if (isChecked) {
                console.log(`      ✅ Ответ выбран`);
              } else {
                console.log(`      ⚠️ Ответ не выбран, пробую через JavaScript...`);
                // Пробуем через JavaScript
                await page.evaluate(() => {
                  const firstRadio = document.querySelector('input[type="radio"]:not(:checked)');
                  if (firstRadio) {
                    firstRadio.checked = true;
                    firstRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    firstRadio.dispatchEvent(new Event('click', { bubbles: true }));
                  }
                });
                await page.waitForTimeout(1000);
              }
              
              // Дополнительное ожидание для активации кнопки навигации
              await page.waitForTimeout(1500);
            } else {
              // Проверяем, может ответ уже выбран
              const hasAnswer = await page.evaluate(() => {
                return document.querySelector('input[type="radio"]:checked') !== null;
              });
              
              if (hasAnswer) {
                console.log(`      ✅ Ответ уже выбран`);
              } else {
                console.log(`      ⚠️ Не найдено радио-кнопок для выбора`);
              }
            }
          } catch (e) {
            console.log(`      ⚠️ Ошибка при выборе ответа: ${e.message}`);
            // Пробуем через JavaScript как запасной вариант
            try {
              await page.evaluate(() => {
                const radios = document.querySelectorAll('input[type="radio"]');
                if (radios.length > 0 && !radios[0].checked) {
                  radios[0].checked = true;
                  radios[0].dispatchEvent(new Event('change', { bubbles: true }));
                  radios[0].dispatchEvent(new Event('click', { bubbles: true }));
                }
              });
              await page.waitForTimeout(1000);
            } catch (e2) {
              console.log(`      ⚠️ Не удалось выбрать ответ через JavaScript: ${e2.message}`);
            }
          }
          
          // Проверяем, активна ли кнопка навигации после выбора ответа
          const buttonState = await page.evaluate((btn) => {
            if (!btn) return { enabled: false, reason: 'no button' };
            const style = window.getComputedStyle(btn);
            const rect = btn.getBoundingClientRect();
            return {
              enabled: !btn.disabled && 
                      style.display !== 'none' && 
                      style.visibility !== 'hidden' &&
                      style.pointerEvents !== 'none' &&
                      rect.width > 0 &&
                      rect.height > 0,
              disabled: btn.disabled,
              opacity: style.opacity,
              cursor: style.cursor,
            };
          }, nextButton);
          
          let questionChanged = false;
          
          // Нажимаем кнопку "следующий"
          console.log(`      🔘 Нажимаю кнопку навигации...`);
          await nextButton.click({ delay: 200 });
          
          // Ждем изменения страницы или контента
          await page.waitForTimeout(4000); // Увеличиваем время ожидания
          
          // Пробуем также использовать JavaScript для переключения
          try {
            await page.evaluate(() => {
              // Ищем кнопку следующего вопроса и кликаем через JavaScript
              const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
              for (const btn of buttons) {
                const text = (btn.textContent || '').toLowerCase();
                const className = (btn.className || '').toLowerCase();
                if ((text.includes('next') || text.includes('siguiente') || text.includes('>') || 
                     className.includes('next') || className.includes('arrow-right')) &&
                    !text.includes('close') && !text.includes('cerrar')) {
                  btn.click();
                  break;
                }
              }
            });
            await page.waitForTimeout(2000);
          } catch (e) {
            // Игнорируем ошибки
          }
          
          // Если кнопка неактивна, пробуем клавиши стрелок
          if (!buttonState.enabled) {
            console.log(`      ⚠️ Кнопка навигации неактивна после выбора ответа (disabled: ${buttonState.disabled})`);
            console.log(`      💡 Пробую использовать клавиши стрелок для навигации...`);
            
            // Пробуем использовать клавиши стрелок
            try {
              await page.keyboard.press('ArrowRight');
              await page.waitForTimeout(2000);
              questionChanged = true; // Предполагаем, что это сработало
            } catch (e) {
              console.log(`      ⚠️ Навигация через клавиши не сработала: ${e.message}`);
            }
          }
          
          // Проверяем, что мы все еще на странице теста
          const urlAfterClick = page.url();
          if (!urlAfterClick.includes('/test/tema/')) {
            console.log(`      ⚠️ Страница изменилась после клика (не тест), возможно тест закрыт`);
            console.log(`      URL: ${urlAfterClick}`);
            break;
          }
          
          // Ждем еще немного для загрузки нового вопроса
          await page.waitForTimeout(2000);
          
          // Извлекаем текущий вопрос
          let question = await extractCurrentQuestion(page, topicNumber, testNumber, i + 1);
          
          // Если вопрос не изменился и мы использовали клавиши, проверяем еще раз
          if (!questionChanged && question && question.question_text) {
            const textAfter = question.question_text.substring(0, 100);
            const numberAfter = question.question_number;
            if (textAfter === questionTextBefore && numberAfter === questionNumberBefore && !buttonState.enabled) {
              // Пробуем клавиши еще раз
              console.log(`      ⌨️ Пробую навигацию через клавиши ArrowRight...`);
              await page.keyboard.press('ArrowRight');
              await page.waitForTimeout(3000);
              question = await extractCurrentQuestion(page, topicNumber, testNumber, i + 1);
            }
          }
          
          if (question && question.question_text) {
            // Проверяем, что вопрос действительно изменился (по номеру И тексту)
            const questionNumberAfter = question.question_number;
            const questionTextAfter = question.question_text.substring(0, 100);
            
            // Вопрос изменился, если изменился номер ИЛИ текст
            const numberChanged = questionNumberAfter !== questionNumberBefore;
            const textChanged = questionTextAfter !== questionTextBefore;
            
            if (!numberChanged && !textChanged && questionTextBefore !== '') {
              console.log(`      ⚠️ Вопрос не изменился после клика`);
              console.log(`      💡 Возможно, нужно ответить на вопрос перед переходом...`);
              
              // Пробуем выбрать ответ и переключиться еще раз
              try {
                const hasAnswer = await page.evaluate(() => {
                  return document.querySelector('input[type="radio"]:checked') !== null;
                });
                
                console.log(`      💡 Пробую выбрать ответ и переключиться через разные способы...`);
                
                // Способ 1: Выбираем первый ответ через клик
                try {
                  const firstRadio = await page.$('input[type="radio"]:not(:checked)');
                  if (firstRadio) {
                    await firstRadio.scrollIntoView();
                    await firstRadio.click({ delay: 50 });
                    await page.waitForTimeout(1500);
                  }
                } catch (e) {
                  // Игнорируем
                }
                
                // Способ 2: Выбираем через JavaScript
                await page.evaluate(() => {
                  const radios = document.querySelectorAll('input[type="radio"]');
                  if (radios.length > 0 && !radios[0].checked) {
                    radios[0].checked = true;
                    radios[0].dispatchEvent(new Event('change', { bubbles: true }));
                    radios[0].dispatchEvent(new Event('click', { bubbles: true }));
                  }
                });
                await page.waitForTimeout(1500);
                
                // Способ 3: Пробуем нажать кнопку еще раз
                const retryButton = await findNextButton(page);
                if (retryButton) {
                  console.log(`      🔘 Пробую нажать кнопку еще раз...`);
                  await retryButton.click({ delay: 200 });
                  await page.waitForTimeout(3000);
                }
                
                // Способ 4: Пробуем через клавиши стрелок
                console.log(`      ⌨️ Пробую навигацию через клавиши стрелок...`);
                await page.keyboard.press('ArrowRight');
                await page.waitForTimeout(2000);
                
                // Способ 5: Пробуем через JavaScript клик по кнопке
                await page.evaluate(() => {
                  const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
                  for (const btn of buttons) {
                    const text = (btn.textContent || '').toLowerCase();
                    const className = (btn.className || '').toLowerCase();
                    if ((text.includes('next') || text.includes('siguiente') || text.includes('>') || 
                         className.includes('next') || className.includes('arrow-right')) &&
                        !text.includes('close') && !text.includes('cerrar')) {
                      btn.click();
                      break;
                    }
                  }
                });
                await page.waitForTimeout(3000);
                
                // Проверяем вопрос еще раз
                const retryQuestion = await extractCurrentQuestion(page, topicNumber, testNumber, i + 1);
                if (retryQuestion && retryQuestion.question_text) {
                  const retryNumberAfter = retryQuestion.question_number;
                  const retryTextAfter = retryQuestion.question_text.substring(0, 100);
                  const retryNumberChanged = retryNumberAfter !== questionNumberBefore;
                  const retryTextChanged = retryTextAfter !== questionTextBefore;
                  
                  if (retryNumberChanged || retryTextChanged) {
                    // Вопрос изменился!
                    question = retryQuestion;
                    console.log(`      ✅ Вопрос изменился после повторной попытки! (номер: ${retryNumberAfter})`);
                  }
                }
              } catch (e) {
                console.log(`      ⚠️ Ошибка при попытке выбрать ответ: ${e.message}`);
              }
              
              // Если вопрос все еще не изменился
              const finalNumber = question.question_number;
              const finalText = question.question_text.substring(0, 100);
              const finalNumberChanged = finalNumber !== questionNumberBefore;
              const finalTextChanged = finalText !== questionTextBefore;
              
              if (!finalNumberChanged && !finalTextChanged) {
                console.log(`      ⚠️ Вопрос все еще не изменился, возможно достигнут конец`);
                consecutiveFailures++;
                if (consecutiveFailures >= maxFailures) {
                  console.log(`      ⚠️ Слишком много неудач подряд, останавливаюсь`);
                  break;
                }
                continue;
              }
            }
            
            // Проверяем на дубликат (по номеру И тексту)
            const isDuplicate = allQuestions.some(q => {
              // Дубликат, если номер совпадает ИЛИ текст совпадает
              const sameNumber = q.question_number === question.question_number;
              const q1 = q.question_text.substring(0, 100).trim();
              const q2 = question.question_text.substring(0, 100).trim();
              const sameText = q1 === q2;
              return sameNumber || sameText;
            });
            
            if (!isDuplicate) {
              allQuestions.push(question);
              consecutiveFailures = 0; // Сбрасываем счетчик неудач
              console.log(`      ✅ Вопрос ${allQuestions.length} (№${question.question_number}): ${question.question_text.substring(0, 40)}...`);
              console.log(`         Ответов: ${question.answers.length}, Изображение: ${question.image_url ? '✅' : '❌'}`);
            } else {
              console.log(`      ⚠️ Достигнут конец карусели (найден дубликат вопроса №${question.question_number})`);
              break;
            }
          } else {
            console.log(`      ⚠️ Не удалось извлечь вопрос ${i + 1}`);
            consecutiveFailures++;
            
            // Пробуем еще раз после дополнительного ожидания
            if (consecutiveFailures < maxFailures) {
              console.log(`      🔄 Пробую еще раз через 2 секунды...`);
              await page.waitForTimeout(2000);
              const retryQuestion = await extractCurrentQuestion(page, topicNumber, testNumber, i + 1);
              if (retryQuestion && retryQuestion.question_text) {
                const isDuplicate = allQuestions.some(q => 
                  q.question_text.substring(0, 50) === retryQuestion.question_text.substring(0, 50)
                );
                if (!isDuplicate) {
                  allQuestions.push(retryQuestion);
                  consecutiveFailures = 0;
                  console.log(`      ✅ Вопрос ${allQuestions.length} извлечен после повтора`);
                } else {
                  console.log(`      ⚠️ Достигнут конец (дубликат после повтора)`);
                  break;
                }
              } else {
                if (consecutiveFailures >= maxFailures) {
                  console.log(`      ⚠️ Слишком много неудач, останавливаюсь`);
                  break;
                }
              }
            } else {
              console.log(`      ⚠️ Слишком много неудач подряд, останавливаюсь`);
              break;
            }
          }
          
          // Обновляем ссылку на кнопку (она может измениться после клика)
          nextButton = await findNextButton(page);
          if (!nextButton) {
            console.log(`      ⚠️ Кнопка навигации больше не найдена после вопроса ${i + 1}`);
            break;
          }
        } catch (e) {
          console.log(`      ❌ Ошибка при переключении на вопрос ${i + 1}: ${e.message}`);
          console.log(`      Stack: ${e.stack?.split('\n').slice(0, 3).join('\n')}`);
          break;
        }
      }
    } else {
      console.log(`      ⚠️ Кнопка навигации не найдена, используем только первый вопрос`);
      console.log(`      💡 Возможно, в тесте только один вопрос, или структура страницы другая`);
    }
    
    console.log(`      ✅ Итого найдено вопросов: ${allQuestions.length}`);
    return allQuestions;
  } catch (error) {
    console.error(`      ❌ Ошибка при скрапинге теста ${testNumber}:`, error.message);
    console.error(`      Stack: ${error.stack?.split('\n').slice(0, 5).join('\n')}`);
    await page.screenshot({ path: `test-${testNumber}-error.png`, fullPage: true }).catch(() => {});
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
  
  console.log('🌐 Запускаю браузер...');
  const browser = await puppeteer.launch({
    headless: config.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Включаем перехват сетевых запросов ОДИН РАЗ для всей сессии
  const apiRequests = [];
  const apiResponses = [];
  
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    const url = request.url();
    
    // Перехватываем API запросы
    if (url.includes('/api/') || 
        url.includes('/questions') || 
        url.includes('/test/tema/') ||
        (url.includes('json') && !url.includes('.js')) ||
        url.includes('ajax')) {
      console.log(`      🔍 API запрос: ${url.substring(0, 100)}...`);
      apiRequests.push(url);
    }
    
    // ВАЖНО: Проверяем, не был ли запрос уже обработан
    try {
      request.continue();
    } catch (e) {
      // Игнорируем ошибку, если запрос уже обработан
      if (!e.message.includes('already handled')) {
        console.log(`      ⚠️ Ошибка при обработке запроса: ${e.message}`);
      }
    }
  });
  
  page.on('response', async (response) => {
    const url = response.url();
    
    // Перехватываем JSON ответы
    if (url.includes('/api/') || 
        url.includes('/questions') || 
        url.includes('/test/tema/') ||
        (url.includes('json') && !url.includes('.js')) ||
        url.includes('ajax')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json')) {
          const data = await response.json();
          console.log(`      📦 API ответ от ${url.substring(0, 80)}...`);
          console.log(`         Тип данных: ${Array.isArray(data) ? 'массив' : typeof data}`);
          if (Array.isArray(data)) {
            console.log(`         Количество элементов: ${data.length}`);
            if (data.length > 0 && (data[0].question_text || data[0].text || data[0].pregunta)) {
              console.log(`      ✅ НАЙДЕН API С ВОПРОСАМИ! Количество: ${data.length}`);
              apiResponses.push({ url, data });
            }
          } else if (data.questions || data.data || data.items) {
            const questions = data.questions || data.data || data.items;
            if (Array.isArray(questions) && questions.length > 0) {
              console.log(`      ✅ НАЙДЕН API С ВОПРОСАМИ! Количество: ${questions.length}`);
              apiResponses.push({ url, data: questions });
            }
          }
        }
      } catch (e) {
        // Не JSON ответ или ошибка парсинга
      }
    }
  });
  
  try {
    await waitForManualLogin(page);
    
    // Если нашли API с вопросами, выводим информацию
    if (apiResponses.length > 0) {
      console.log(`\n🎉 Найдено ${apiResponses.length} API эндпоинтов с вопросами!`);
      console.log(`💡 Можно использовать API вместо скрапинга страницы`);
      for (const api of apiResponses) {
        console.log(`   URL: ${api.url}`);
        console.log(`   Вопросов: ${api.data.length}`);
      }
    }
    
    const { data: dbTopics } = await supabase
      .from('topics')
      .select('id, number');
    
    const topicMap = new Map(dbTopics?.map(t => [t.number, t.id]) || []);
    
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
    
    if (allQuestions.length > 0) {
      const saveResult = await saveQuestionsToDatabase(allQuestions, topicMap);
      console.log(`💾 Сохранено в БД: ${saveResult.saved} вопросов, ${saveResult.errors} ошибок`);
    }
    
    if (allQuestions.length > 0) {
      generateExcelFile(allQuestions, config.output);
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

