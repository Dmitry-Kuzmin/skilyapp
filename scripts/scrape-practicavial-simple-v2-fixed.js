import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const BASE_URL = 'https://teorica.practicavial.com';
const TESTS_URL = `${BASE_URL}/permiso/b/tests/tema/all`;
const DEBUG_NATIVE_DIR = join(__dirname, 'debug-native');

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

// Интерактивная авторизация - сразу открываем страницу с тестами
async function waitForManualLogin(page) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔐 АВТОРИЗАЦИЯ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('💡 ИНСТРУКЦИЯ:');
  console.log('   1. В открывшемся браузере авторизуйтесь вручную (если нужно)');
  console.log('   2. Убедитесь, что вы видите список тестов на странице');
  console.log('   3. Нажмите Enter в этом терминале, когда будете готовы');
  console.log('');
  console.log('⏳ Открываю страницу с тестами темы 1...');
  
  await page.goto(`${BASE_URL}/permiso/b/tests/tema/1`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(3000);
  
  console.log('✅ Страница открыта в браузере');
  console.log('');
  console.log('👆 ТЕПЕРЬ:');
  console.log('   1. Если нужно - авторизуйтесь в браузере');
  console.log('   2. Убедитесь, что видите список тестов (Test Tema 1 Nº: 001, 002, и т.д.)');
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
  
  const isAuth = await checkAuth(page);
  
  if (!isAuth) {
    console.log('   ❌ Авторизация не подтверждена');
    console.log('   💡 Убедитесь, что:');
    console.log('      1. Вы авторизовались в браузере');
    console.log('      2. Вы видите список тестов на странице');
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

// Извлекаем ВСЕ вопросы прямо из DOM (без переключения)
async function extractQuestionsFromDom(page, topicNumber, testNumber) {
  try {
    const result = await page.evaluate((topicNumber, testNumber) => {
      const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
      const cleanAnswerText = (text) => normalize(text).replace(/^[A-Z]\s*[.)\-\–]\s*/i, '').trim();
      const toAbsolute = (src) => {
        if (!src) return null;
        try {
          const url = new URL(src, window.location.href);
          return url.href;
        } catch (e) {
          return src;
        }
      };
      
      const seenKeys = new Set();
      const debugItems = [];
      const pruneClones = (items) => items.filter((item) => !item.classList || (!item.classList.contains('cloned') && !item.classList.contains('owl-cloned')));
      const root = document.querySelector('#mainTest') || document.body;
      if (!root) {
        return {
          questions: [],
          debug: {
            reason: 'no-root',
          },
        };
      }
      
      const stage = root.querySelector('.owl-stage') || root.querySelector('[class*="stage"]');
      const rawItems = stage ? Array.from(stage.querySelectorAll('.owl-item')) : [];
      const itemsSource = rawItems.length ? rawItems : Array.from(root.querySelectorAll('[data-question-id], .question'));
      const items = pruneClones(itemsSource.length ? itemsSource : [root]);
      const results = [];
      
      items.forEach((item, index) => {
        let container = item;
        if (item.querySelector && item.querySelector('[data-question-id]')) {
          container = item.querySelector('[data-question-id]');
        } else if (item.querySelector && item.querySelector('.question')) {
          container = item.querySelector('.question');
        } else if (item.firstElementChild) {
          container = item.firstElementChild;
        }
        
        if (!container || !container.querySelector) return;
        
        const questionId = container.getAttribute('data-question-id') ||
                           container.getAttribute('data-question') ||
                           container.getAttribute('id');
        
        const questionNumberEl = container.querySelector('[class*="question-number"], .question-number, .number, .num');
        let questionNumber = questionNumberEl ? parseInt(questionNumberEl.textContent.replace(/\D+/g, ''), 10) : null;
        
        const questionSelectors = [
          '.question-text',
          '.pregunta',
          '.question__text',
          '.question',
          '.question-title',
          '.enunciado',
          '[class*="enunciado"]',
          'h2',
          'h3',
          'p'
        ];
        
        let questionText = null;
        for (const selector of questionSelectors) {
          const el = container.querySelector(selector);
          if (!el) continue;
          const text = normalize(el.textContent);
          if (text && text.length > 8 && /[?¿]/.test(text)) {
            questionText = text;
            break;
          }
        }
        
        if (!questionText) {
          const bodyText = normalize(container.innerText);
          const match = bodyText.match(/.{10,200}[?¿]/);
          if (match) {
            questionText = match[0].trim();
          }
        }
        
        if (!questionText) {
          if (debugItems.length < 40) {
            debugItems.push({
              index,
              skipped: true,
              reason: 'no-question-text',
              rawText: normalize(container.innerText || ''),
              html: container.outerHTML ? container.outerHTML.slice(0, 500) : null,
              classList: container.classList ? Array.from(container.classList) : null,
            });
          }
          return;
        }
        
        if (!questionNumber) {
          const numMatch = questionText.match(/^(\d{1,2})\s*[-.)–]/);
          if (numMatch) {
            questionNumber = parseInt(numMatch[1], 10);
          }
        }
        if (!questionNumber) {
          questionNumber = index + 1;
        }
        
        const dedupeKey = `${questionNumber}-${questionText.slice(0, 120)}`;
        if (seenKeys.has(dedupeKey)) return;
        seenKeys.add(dedupeKey);
        
        const imageEl = container.querySelector('img');
        let imageUrl = null;
        if (imageEl) {
          const src = imageEl.getAttribute('data-src') || imageEl.getAttribute('src');
          imageUrl = toAbsolute(src);
        }
        
        const answers = [];
        const inputs = Array.from(container.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
        const usedLabels = new Set();
        
        if (inputs.length) {
          inputs.forEach((input) => {
            const label = container.querySelector(`label[for="${input.id}"]`) ||
                          input.closest('label') ||
                          input.parentElement;
            let rawText = '';
            if (label) {
              rawText = normalize(label.innerText);
              usedLabels.add(label);
            } else if (input.nextElementSibling) {
              rawText = normalize(input.nextElementSibling.innerText);
            } else {
              rawText = normalize(input.parentElement ? input.parentElement.innerText : '');
            }
            
            if (!rawText) return;
            
            const answerText = cleanAnswerText(rawText);
            if (!answerText) return;
            
            const isCorrect = input.classList.contains('correct') ||
                              input.getAttribute('data-correct') === 'true' ||
                              input.getAttribute('data-is-correct') === 'true' ||
                              (label && (label.classList.contains('correct') || label.getAttribute('data-correct') === 'true'));
            
            const letterEl = label ? label.querySelector('.letter, .answer-letter, .option-letter') : null;
            const letter = letterEl ? normalize(letterEl.textContent).charAt(0) : null;
            
            answers.push({
              text: answerText,
              is_correct: !!isCorrect,
              order: answers.length + 1,
              letter: letter || null,
              answer_id: input.value || input.getAttribute('data-answer-id') || null,
              name: input.name || null,
            });
          });
        }
        
        if (answers.length < 2) {
          const fallbackNodes = Array.from(container.querySelectorAll('label, .answer, .respuesta, li, .option')).filter((node) => !usedLabels.has(node));
          fallbackNodes.forEach((node) => {
            const rawText = normalize(node.innerText);
            const answerText = cleanAnswerText(rawText);
            if (!answerText) return;
            const isCorrect = node.classList.contains('correct') || node.getAttribute('data-correct') === 'true';
            answers.push({
              text: answerText,
              is_correct: !!isCorrect,
              order: answers.length + 1,
              letter: null,
              answer_id: node.getAttribute('data-answer-id') || null,
              name: null,
            });
          });
        }
        
        if (answers.length < 2) {
          if (debugItems.length < 40) {
            debugItems.push({
              index,
              skipped: true,
              reason: 'not-enough-answers',
              answersFound: answers.length,
              containerText: normalize(container.innerText || '').slice(0, 200),
            });
          }
          return;
        }
        
        if (debugItems.length < 40) {
          debugItems.push({
            index,
            question_id: questionId || null,
            question_number: questionNumber,
            question_text: questionText.slice(0, 200),
            answers_count: answers.length,
            first_answer: answers[0]?.text || null,
            html: container.outerHTML ? container.outerHTML.slice(0, 800) : null,
            classList: container.classList ? Array.from(container.classList) : null,
            hasImage: !!imageUrl,
          });
        }
        
        results.push({
          topic_number: topicNumber,
          test_number: testNumber,
          question_number: questionNumber,
          question_id: questionId,
          question_text: questionText,
          image_url: imageUrl,
          answers,
        });
      });
      
      return {
        questions: results,
        debug: {
          itemsAnalyzed: items.length,
          rawItemsCount: rawItems.length,
          stagePresent: !!stage,
          reason: results.length ? 'ok' : 'no-questions-found',
          debugItems,
        },
      };
    }, topicNumber, testNumber);
    
    const questions = Array.isArray(result?.questions) ? result.questions : [];
    const debugInfo = result?.debug;
    
    if (debugInfo) {
      try {
        await fs.mkdir(DEBUG_NATIVE_DIR, { recursive: true });
        const debugPath = join(
          DEBUG_NATIVE_DIR,
          `dom-debug-topic${topicNumber}-test${testNumber}-${Date.now()}.json`
        );
        await fs.writeFile(
          debugPath,
          JSON.stringify({
            topicNumber,
            testNumber,
            ...debugInfo,
          }, null, 2),
          'utf-8'
        );
        console.log(`      ↳ Debug DOM сохранен: ${debugPath}`);
      } catch (fsError) {
        console.log(`      ⚠️ Не удалось сохранить DOM debug: ${fsError.message}`);
      }
    }
    
    if (questions.length) {
      console.log(`      ✅ Извлечено из DOM без навигации: ${questions.length} вопросов`);
      return questions;
    }
    
    return [];
  } catch (error) {
    console.log(`      ⚠️ Ошибка DOM-выгрузки: ${error.message}`);
    return [];
  }
}

// Поиск заранее загруженных данных (без нажатий)
async function findNativeTestData(page, { topicNumber, testNumber } = {}) {
  try {
    const report = await page.evaluate(() => {
      const results = {
        rootsScanned: [],
        candidates: [],
        scriptCandidates: [],
      };
      
      const safeStringify = (value) => {
        const cache = new Set();
        try {
          return JSON.stringify(
            value,
            (key, val) => {
              if (typeof val === 'object' && val !== null) {
                if (cache.has(val)) {
                  return undefined;
                }
                cache.add(val);
              }
              if (typeof val === 'function') {
                return undefined;
              }
              return val;
            }
          );
        } catch (error) {
          return null;
        }
      };
      
      const questionKeywords = ['question', 'pregunta', 'enunciado', 'texto', 'title', 'titulo'];
      const answerKeywords = ['answer', 'respuesta', 'respuestas', 'options', 'opciones', 'solucion'];
      const visited = new WeakSet();
      const candidatesLimit = 20;
      
      const registerCandidate = (path, arr) => {
        if (!Array.isArray(arr) || arr.length === 0) {
          return;
        }
        
        const sampleObj = arr.find((item) => item && typeof item === 'object');
        if (!sampleObj) {
          return;
        }
        
        const lowerKeys = Object.keys(sampleObj).map((k) => k.toLowerCase());
        const hasQuestion = lowerKeys.some((k) => questionKeywords.some((token) => k.includes(token)));
        const hasAnswer = lowerKeys.some((k) => answerKeywords.some((token) => k.includes(token)));
        
        if (!hasQuestion && !hasAnswer) {
          return;
        }
        
        let sample = safeStringify(sampleObj);
        if (sample && sample.length > 1000) {
          sample = `${sample.slice(0, 1000)}...`;
        }
        
        results.candidates.push({
          path,
          length: arr.length,
          keys: Object.keys(sampleObj).slice(0, 10),
          sample,
        });
      };
      
      const scan = (value, pathParts, depth) => {
        if (!value || typeof value !== 'object') {
          return;
        }
        if (visited.has(value)) {
          return;
        }
        visited.add(value);
        
        if (depth > 5 || results.candidates.length >= candidatesLimit) {
          return;
        }
        
        if (Array.isArray(value)) {
          registerCandidate(pathParts.join('.'), value);
          const slice = value.slice(0, 3);
          slice.forEach((item, index) => {
            scan(item, pathParts.concat(`[${index}]`), depth + 1);
          });
          return;
        }
        
        Object.entries(value).forEach(([key, val]) => {
          if (key === '__proto__') {
            return;
          }
          scan(val, pathParts.concat(key), depth + 1);
        });
      };
      
      const rootCandidates = [
        ['__NUXT__', window.__NUXT__],
        ['__NUXT_DEVTOOLS__', window.__NUXT_DEVTOOLS__],
        ['__INITIAL_STATE__', window.__INITIAL_STATE__],
        ['__INITIAL_DATA__', window.__INITIAL_DATA__],
        ['__DATA__', window.__DATA__],
        ['APP_INITIAL_STATE', window.APP_INITIAL_STATE],
        ['__NEXT_DATA__', window.__NEXT_DATA__],
      ];
      
      if (window.__NUXT__ && typeof window.__NUXT__ === 'object') {
        const nuxt = window.__NUXT__;
        if (nuxt.data && Array.isArray(nuxt.data)) {
          nuxt.data.forEach((entry, index) => {
            rootCandidates.push([`__NUXT__.data[${index}]`, entry]);
          });
        }
        if (nuxt.state && typeof nuxt.state === 'object') {
          rootCandidates.push(['__NUXT__.state', nuxt.state]);
        }
        if (nuxt.payload && typeof nuxt.payload === 'object') {
          rootCandidates.push(['__NUXT__.payload', nuxt.payload]);
        }
      }
      
      rootCandidates.forEach(([name, value]) => {
        if (!value || typeof value !== 'object') {
          return;
        }
        results.rootsScanned.push(name);
        scan(value, [name], 0);
      });
      
      const scriptNodes = Array.from(document.querySelectorAll('script'));
      scriptNodes.forEach((script, index) => {
        const type = script.type || 'text/javascript';
        const textContent = script.textContent || '';
        const normalized = textContent.trim();
        if (!normalized) {
          return;
        }
        
        const looksInteresting = type.includes('json') ||
          /question|pregunta|respuest|test|tema/i.test(normalized);
        
        if (!looksInteresting) {
          return;
        }
        
        const snippet = normalized.slice(0, 600);
        results.scriptCandidates.push({
          index,
          type,
          snippet,
          full: normalized.slice(0, 4000),
        });
      });
      
      // Собираем JSON-скрипты отдельно
      const jsonScripts = Array.from(document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"], script[data-json="true"]'));
      const jsonScriptSnapshots = jsonScripts.map((script, index) => ({
        index,
        id: script.id || null,
        type: script.type,
        snippet: (script.textContent || '').trim().slice(0, 4000),
      }));
      results.jsonScripts = jsonScriptSnapshots;
      
      // Ищем глобальные объекты с ключевыми словами
      const globalCandidates = [];
      const maxGlobals = 50;
      Object.keys(window).forEach((key) => {
        if (globalCandidates.length >= maxGlobals) return;
        const lower = key.toLowerCase();
        const hasKeyword = questionKeywords.concat(answerKeywords).some((token) => lower.includes(token));
        if (!hasKeyword) return;
        try {
          const value = window[key];
          const type = typeof value;
          if (value == null) return;
          
          let preview = null;
          if (type === 'string') {
            preview = value.length > 200 ? `${value.slice(0, 200)}…` : value;
          } else if (Array.isArray(value)) {
            preview = `[Array(${value.length})]`;
          } else if (type === 'object') {
            preview = `{${Object.keys(value).slice(0, 10).join(', ')}}`;
          } else {
            preview = String(value).slice(0, 200);
          }
          
          globalCandidates.push({
            key,
            type,
            preview,
          });
        } catch (_) {
          // ignore
        }
      });
      results.globalCandidates = globalCandidates;
      
      if (results.candidates.length > candidatesLimit) {
        results.candidates = results.candidates.slice(0, candidatesLimit);
      }
      if (results.scriptCandidates.length > 10) {
        results.scriptCandidates = results.scriptCandidates.slice(0, 10);
      }
      
      // Дополнительно пытаемся вытащить данные из jQuery (#mainTest)
      let jqueryData = null;
      try {
        const hasJQuery = typeof window.jQuery === 'function';
        if (hasJQuery) {
          const $ = window.jQuery;
          const $main = $('#mainTest');
          if ($main && $main.length > 0) {
            const rawData = $main.data() || {};
            const rawCarousel = rawData['owl.carousel'] || rawData.owlCarousel;
            const carousel = rawCarousel || $main.data('owl.carousel') || $main.data('carousel');
            const entries = Object.entries(rawData).map(([key, value]) => {
              let preview = value;
              if (typeof value === 'string') {
                preview = value.length > 200 ? `${value.slice(0, 200)}…` : value;
              } else if (Array.isArray(value)) {
                preview = `[Array(${value.length})]`;
              } else if (typeof value === 'object' && value !== null) {
                preview = `{${Object.keys(value).slice(0, 5).join(', ')}}`;
              }
              return {
                key,
                type: typeof value,
                preview,
              };
            });
            
            const parseValue = (val) => {
              if (val == null) return null;
              if (Array.isArray(val)) return val;
              if (typeof val === 'object') return val;
              if (typeof val === 'string') {
                try {
                  return JSON.parse(val);
                } catch (e) {
                  return val;
                }
              }
              return val;
            };
            
            const possibleQuestionKeys = ['questions', 'preguntas', 'questionList', 'questionsList', 'listQuestions', 'questionsData'];
            const possibleAnswerKeys = ['answers', 'respuestas', 'answerOptions', 'options', 'answerList'];
            
            let parsedQuestions = null;
            let parsedAnswers = null;
            let carouselInfo = null;
            
            possibleQuestionKeys.some((key) => {
              if (rawData.hasOwnProperty(key)) {
                parsedQuestions = parseValue(rawData[key]);
                return true;
              }
              return false;
            });
            possibleAnswerKeys.some((key) => {
              if (rawData.hasOwnProperty(key)) {
                parsedAnswers = parseValue(rawData[key]);
                return true;
              }
              return false;
            });

            if (carousel && typeof carousel === 'object') {
              try {
                const items = carousel._items || carousel._clones || carousel.items || carousel._items;
                if (items && items.length) {
                  const samples = Array.from(items).slice(0, 5).map((item, idx) => {
                    const el = item?.nodeType ? item : (item?.$element ? item.$element[0] : item?.el ? item.el[0] : null);
                    const text = el ? el.innerText || el.textContent || '' : '';
                    return {
                      index: idx,
                      text: text.trim().slice(0, 300),
                      hasImage: !!(el && el.querySelector && el.querySelector('img')),
                      htmlSnippet: el ? (el.innerHTML || '').trim().slice(0, 500) : null,
                    };
                  });
                  
                  carouselInfo = {
                    type: carousel.constructor?.name || 'owlCarousel',
                    keys: Object.keys(carousel).slice(0, 10),
                    itemsCount: items.length,
                    samples,
                  };
                }
              } catch (carouselError) {
                carouselInfo = {
                  error: carouselError?.message || String(carouselError),
                };
              }
            }
            
            jqueryData = {
              hasJQuery,
              elementFound: true,
              dataKeys: Object.keys(rawData),
              entries,
              parsed: {
                questions: parsedQuestions,
                answers: parsedAnswers,
              },
              hasCarousel: !!carousel,
              carousel: carouselInfo,
              preview: {
                questionsSample: Array.isArray(parsedQuestions) ? parsedQuestions.slice(0, 3) : null,
                answersSample: Array.isArray(parsedAnswers) ? parsedAnswers.slice(0, 3) : null,
              },
            };
          } else {
            jqueryData = {
              hasJQuery,
              elementFound: false,
            };
          }
        } else {
          jqueryData = {
            hasJQuery: false,
          };
        }
      } catch (jqueryError) {
        jqueryData = {
          error: jqueryError?.message || String(jqueryError),
        };
      }
      
      // Информация об объекте Questionary
      let questionaryData = null;
      try {
        const Q = window.Questionary;
        if (Q && typeof Q === 'object') {
          const possibleContainers = [
            Q.questions,
            Q.questionList,
            Q.questionsList,
            Q.questionsData,
            Q._questions,
            Q.state?.questions,
            Q.state?.questionList,
            Q.test?.questions,
            Q.data?.questions,
            Q.settings?.questions,
          ].filter(Boolean);
          
          let extracted = null;
          for (const container of possibleContainers) {
            if (Array.isArray(container) && container.length) {
              extracted = container;
              break;
            }
          }
          
          questionaryData = {
            keys: Object.keys(Q),
            hasQuestionsArray: Array.isArray(extracted),
            questionsLength: Array.isArray(extracted) ? extracted.length : undefined,
            questionsSample: Array.isArray(extracted) ? extracted.slice(0, 3) : null,
            stateKeys: Q.state ? Object.keys(Q.state) : null,
            dataKeys: Q.data ? Object.keys(Q.data) : null,
            settingsKeys: Q.settings ? Object.keys(Q.settings) : null,
          };
        }
      } catch (qError) {
        questionaryData = {
          error: qError?.message || String(qError),
        };
      }
      
      return {
        ...results,
        jqueryData,
        questionaryData,
      };
    });
    
    if (!report) {
      return null;
    }
    
    return {
      ...report,
      topicNumber: topicNumber ?? null,
      testNumber: testNumber ?? null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.log(`      ⚠️ Ошибка анализа нативных данных: ${error.message}`);
    return null;
  }
}

// Извлечение текущего вопроса со страницы (УПРОЩЕННАЯ ВЕРСИЯ)
async function extractCurrentQuestion(page, topicNumber, testNumber, questionNumber) {
  return await page.evaluate((topicNum, testNum, qNum) => {
    try {
      // КРИТИЧЕСКИ ВАЖНО: Ищем только АКТИВНЫЙ слайд карусели!
      let activeSlide = null;
      
      // Пробуем найти активный слайд по разным селекторам
      const possibleSelectors = [
        '.owl-item.active',
        '.carousel-item.active',
        '[class*="active"][class*="slide"]',
        '[class*="current"][class*="slide"]',
        '.owl-item:not(.cloned)',
        '.slide.active'
      ];
      
      for (const selector of possibleSelectors) {
        const slides = Array.from(document.querySelectorAll(selector));
        for (const slide of slides) {
          const rect = slide.getBoundingClientRect();
          // Проверяем, что слайд виден и находится в центре экрана
          if (rect.width > 0 && rect.height > 0 &&
              rect.left >= -100 && rect.left < window.innerWidth &&
              rect.top >= -100 && rect.top < window.innerHeight) {
            activeSlide = slide;
            console.log(`✓ Найден активный слайд по селектору: ${selector}`);
            break;
          }
        }
        if (activeSlide) break;
      }
      
      // Если не нашли активный слайд, используем весь body (fallback)
      const searchArea = activeSlide || document.body;
      const bodyText = searchArea.innerText || searchArea.textContent || '';
      
      console.log(`Ищу вопрос в: ${activeSlide ? 'активном слайде' : 'всем body'}`);
      console.log(`Текст области поиска (первые 200 символов): ${bodyText.substring(0, 200)}`);
      
      // Ищем номер вопроса (большая цифра)
      let visibleQuestionNumber = null;
      const allElements = Array.from(searchArea.querySelectorAll('*'));
      
      for (const el of allElements) {
        try {
          const style = window.getComputedStyle(el);
          const fontSize = parseInt(style.fontSize) || 0;
          const rect = el.getBoundingClientRect();
          const text = el.textContent.trim();
          
          if (fontSize > 24 && 
              rect.width > 0 && rect.height > 0 &&
              rect.top >= -100 && rect.top < window.innerHeight + 100 &&
              /^\d+$/.test(text) &&
              parseInt(text) >= 1 && parseInt(text) <= 50) {
            visibleQuestionNumber = parseInt(text);
            console.log(`Найден номер вопроса: ${visibleQuestionNumber}`);
            break;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
      
      // Ищем текст вопроса ТОЛЬКО в активном слайде
      let questionText = null;
      
      // Стратегия 1: По номеру вопроса
      if (visibleQuestionNumber) {
        const pattern = new RegExp(`${visibleQuestionNumber}\\s+[A-ZА-ЯЁ][^?\\n]*[?¿]`, 'i');
        const match = bodyText.match(pattern);
        if (match) {
          questionText = match[0].trim();
        }
      }
      
      // Стратегия 2: Любой вопрос в тексте активного слайда
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
      
      // Ищем изображение ТОЛЬКО в активном слайде
      let imageUrl = null;
      const images = Array.from(searchArea.querySelectorAll('img')).filter(img => {
        const src = img.src || '';
        const rect = img.getBoundingClientRect();
        return src && 
               !src.includes('logo') && 
               !src.includes('icon') &&
               rect.width > 50 &&
               rect.height > 50 &&
               rect.top >= -100 && rect.top < window.innerHeight + 100;
      });
      
      console.log(`Найдено изображений в активном слайде: ${images.length}`);
      
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
      
      // Ищем ответы - здесь ищем по всему документу, так как радио-кнопки могут быть вне слайда
      const answers = [];
      const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]')).filter(radio => {
        const rect = radio.getBoundingClientRect();
        // Берем только видимые радио-кнопки
        return rect.width > 0 && rect.height > 0 &&
               rect.top >= -100 && rect.top < window.innerHeight + 100;
      });
      
      console.log(`Найдено видимых радио-кнопок: ${radioInputs.length}`);
      
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

// Поиск кнопки навигации "следующий вопрос" - возвращает селектор или координаты
async function findNextButtonSelector(page) {
  // Сначала пробуем найти через evaluate и получить селектор
  const buttonInfo = await page.evaluate(() => {
    // Ищем все кнопки и элементы с кликами
    const allButtons = Array.from(document.querySelectorAll('button, [role="button"], a[href*="#"], [onclick], div[onclick]'));
    
    for (const btn of allButtons) {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      const className = btn.className?.toLowerCase() || '';
      const rect = btn.getBoundingClientRect();
      
      // Исключаем кнопки закрытия
      if (text.includes('cerrar') || text.includes('close') || 
          ariaLabel.includes('cerrar') || ariaLabel.includes('close') ||
          className.includes('close') || className.includes('cerrar')) {
        continue;
      }
      
      // Ищем кнопки со стрелками вправо или "следующий"
      if ((text.includes('siguiente') || text.includes('next') ||
           ariaLabel.includes('siguiente') || ariaLabel.includes('next') ||
           className.includes('next') || className.includes('siguiente') ||
           btn.querySelector('svg[class*="arrow-right"]') ||
           btn.querySelector('svg[class*="chevron-right"]')) &&
          rect.width > 0 && rect.height > 0 &&
          rect.top >= 0 && rect.top < window.innerHeight) {
        // Генерируем уникальный селектор
        let selector = '';
        if (btn.id) {
          selector = `#${btn.id}`;
        } else if (btn.className) {
          const classes = Array.from(btn.classList).filter(c => !c.includes(' ')).join('.');
          if (classes) {
            selector = `${btn.tagName.toLowerCase()}.${classes}`;
          }
        }
        
        if (!selector) {
          // Используем позицию среди элементов того же типа
          const siblings = Array.from(btn.parentElement?.children || []);
          const index = siblings.indexOf(btn);
          selector = `${btn.tagName.toLowerCase()}:nth-child(${index + 1})`;
        }
        
        return {
          selector: selector,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          tagName: btn.tagName,
        };
      }
    }
    
    // Если не нашли, ищем любую кнопку со стрелкой вправо
    const arrows = Array.from(document.querySelectorAll('svg[class*="arrow-right"], svg[class*="chevron-right"]'));
    for (const arrow of arrows) {
      const btn = arrow.closest('button, [role="button"], div, span');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return {
            selector: btn.id ? `#${btn.id}` : `${btn.tagName.toLowerCase()}`,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            tagName: btn.tagName,
          };
        }
      }
    }
    
    return null;
  });
  
  if (buttonInfo) {
    return buttonInfo;
  }
  
  // Fallback: пробуем стандартные селекторы
  const selectors = [
    'button[aria-label*="next"]',
    'button[aria-label*="siguiente"]',
    'button[class*="next"]',
    '.carousel-control-next',
    '[class*="arrow-right"]',
  ];
  
  for (const selector of selectors) {
    try {
      const btn = await page.$(selector);
      if (btn) {
        const isVisible = await btn.isIntersectingViewport();
        if (isVisible) {
          const rect = await btn.boundingBox();
          return {
            selector: selector,
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
            tagName: 'button',
          };
        }
      }
    } catch (e) {
      // Продолжаем
    }
  }
  
  return null;
}

// Клик по кнопке "следующий" - используем несколько способов
async function clickNextButton(page) {
  const buttonInfo = await findNextButtonSelector(page);
  
  if (!buttonInfo) {
    console.log(`      ⚠️ Кнопка "следующий" не найдена, пробую клавиатуру...`);
    // Пробуем использовать клавиатуру
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(2000);
    return true;
  }
  
  console.log(`      Найдена кнопка: ${buttonInfo.selector || buttonInfo.tagName}`);
  
  // Способ 1: Клик через селектор
  if (buttonInfo.selector) {
    try {
      const btn = await page.$(buttonInfo.selector);
      if (btn) {
        await btn.click({ delay: 200 });
        await page.waitForTimeout(2000);
        console.log(`      ✓ Клик через селектор`);
        return true;
      }
    } catch (e) {
      console.log(`      ⚠️ Ошибка клика через селектор: ${e.message}`);
    }
  }
  
  // Способ 2: Клик через координаты
  try {
    await page.mouse.click(buttonInfo.x, buttonInfo.y, { delay: 200 });
    await page.waitForTimeout(2000);
    console.log(`      ✓ Клик через координаты (${Math.round(buttonInfo.x)}, ${Math.round(buttonInfo.y)})`);
    return true;
  } catch (e) {
    console.log(`      ⚠️ Ошибка клика через координаты: ${e.message}`);
  }
  
  // Способ 3: Клик через JavaScript
  try {
    await page.evaluate((selector, x, y) => {
      let btn = null;
      if (selector) {
        try {
          btn = document.querySelector(selector);
        } catch (e) {
          // Игнорируем
        }
      }
      
      if (!btn) {
        // Ищем элемент по координатам
        btn = document.elementFromPoint(x, y);
      }
      
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, buttonInfo.selector, buttonInfo.x, buttonInfo.y);
    
    await page.waitForTimeout(2000);
    console.log(`      ✓ Клик через JavaScript`);
    return true;
  } catch (e) {
    console.log(`      ⚠️ Ошибка клика через JavaScript: ${e.message}`);
  }
  
  // Способ 4: Клавиатура как последний вариант
  console.log(`      ⚠️ Все способы не сработали, пробую клавиатуру...`);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(2000);
  return true;
}

// Ожидание появления радио-кнопок
async function waitForRadioButtons(page, timeout = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const hasRadios = await page.evaluate(() => {
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      return radios.some(radio => {
        const style = window.getComputedStyle(radio);
        const rect = radio.getBoundingClientRect();
        return style.display !== 'none' && 
               style.visibility !== 'hidden' &&
               rect.width > 0 && rect.height > 0;
      });
    });
    
    if (hasRadios) {
      return true;
    }
    
    await page.waitForTimeout(200);
  }
  
  return false;
}

// Выбор ответа на текущий вопрос - используем несколько способов
async function selectAnswer(page) {
  try {
    // Сначала ждем появления радио-кнопок
    console.log(`      Жду появления радио-кнопок...`);
    const radiosAppeared = await waitForRadioButtons(page, 5000);
    
    if (!radiosAppeared) {
      console.log(`      ⚠️ Радио-кнопки не появились за 5 секунд`);
      // Пробуем прокрутить страницу вниз - возможно кнопки вне видимости
      await page.evaluate(() => {
        window.scrollBy(0, 300);
      });
      await page.waitForTimeout(1000);
    }
    
    // Проверяем, может уже выбран ответ
    const hasSelected = await page.evaluate(() => {
      return document.querySelector('input[type="radio"]:checked') !== null;
    });
    
    if (hasSelected) {
      console.log(`      ✓ Ответ уже выбран`);
      return true;
    }
    
    // Ищем информацию о радио-кнопках с несколькими попытками
    let radioInfo = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      radioInfo = await page.evaluate(() => {
        const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
        for (const radio of radios) {
          const style = window.getComputedStyle(radio);
          const rect = radio.getBoundingClientRect();
          
          if (style.display !== 'none' && 
              style.visibility !== 'hidden' &&
              rect.width > 0 && rect.height > 0 &&
              !radio.checked) {
            // Генерируем селектор
            let selector = '';
            if (radio.id) {
              selector = `#${radio.id}`;
            } else if (radio.name) {
              // Берем первую невыбранную кнопку с этим name
              const nameRadios = Array.from(document.querySelectorAll(`input[type="radio"][name="${radio.name}"]`));
              const uncheckedIndex = nameRadios.findIndex(r => !r.checked);
              if (uncheckedIndex >= 0) {
                selector = `input[type="radio"][name="${radio.name}"]:nth-of-type(${uncheckedIndex + 1})`;
              } else {
                selector = `input[type="radio"][name="${radio.name}"]`;
              }
            } else {
              selector = 'input[type="radio"]:not(:checked)';
            }
            
            return {
              selector: selector,
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              index: radios.indexOf(radio),
              name: radio.name || '',
            };
          }
        }
        return null;
      });
      
      if (radioInfo) {
        break;
      }
      
      // Если не нашли, ждем и пробуем еще раз
      await page.waitForTimeout(500);
    }
    
    if (!radioInfo) {
      console.log(`      ⚠️ Не найдено радио-кнопок для выбора после ${3} попыток`);
      // Пробуем найти через label или другие элементы
      const foundViaLabel = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        for (const label of labels) {
          const radio = label.querySelector('input[type="radio"]') || 
                       document.querySelector(`input[type="radio"][id="${label.getAttribute('for')}"]`);
          if (radio && !radio.checked) {
            const rect = label.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
          }
        }
        return null;
      });
      
      if (foundViaLabel) {
        try {
          await page.mouse.click(foundViaLabel.x, foundViaLabel.y, { delay: 100 });
          await page.waitForTimeout(500);
          console.log(`      ✓ Ответ выбран (через label)`);
          return true;
        } catch (e) {
          // Продолжаем
        }
      }
      
      return false;
    }
    
    console.log(`      Найдено радио-кнопок, выбираю ответ...`);
    
    // Способ 1: Клик через селектор Puppeteer
    try {
      if (radioInfo.name) {
        // Пробуем кликнуть по первой невыбранной кнопке с этим name
        await page.evaluate((name) => {
          const radios = Array.from(document.querySelectorAll(`input[type="radio"][name="${name}"]:not(:checked)`));
          if (radios.length > 0) {
            radios[0].click();
            return true;
          }
          return false;
        }, radioInfo.name);
      } else {
        await page.click('input[type="radio"]:not(:checked)', { delay: 100 });
      }
      await page.waitForTimeout(500);
      
      // Проверяем, что ответ выбран
      const isSelected = await page.evaluate(() => {
        return document.querySelector('input[type="radio"]:checked') !== null;
      });
      
      if (isSelected) {
        console.log(`      ✓ Ответ выбран (через селектор)`);
        return true;
      }
    } catch (e) {
      // Продолжаем
    }
    
    // Способ 2: Клик через координаты
    try {
      await page.mouse.click(radioInfo.x, radioInfo.y, { delay: 100 });
      await page.waitForTimeout(500);
      
      const isSelected = await page.evaluate(() => {
        return document.querySelector('input[type="radio"]:checked') !== null;
      });
      
      if (isSelected) {
        console.log(`      ✓ Ответ выбран (через координаты)`);
        return true;
      }
    } catch (e) {
      // Продолжаем
    }
    
    // Способ 3: Клик через JavaScript (более надежный)
    try {
      const clicked = await page.evaluate((selector, x, y) => {
        // Пробуем через селектор
        if (selector) {
          try {
            const radios = Array.from(document.querySelectorAll('input[type="radio"]:not(:checked)'));
            if (radios.length > 0) {
              radios[0].click();
              return true;
            }
          } catch (e) {
            // Игнорируем
          }
        }
        
        // Пробуем через координаты
        const element = document.elementFromPoint(x, y);
        if (element) {
          const radio = element.closest('input[type="radio"]') || 
                       element.querySelector('input[type="radio"]');
          if (radio && !radio.checked) {
            radio.click();
            return true;
          }
        }
        
        return false;
      }, radioInfo.selector, radioInfo.x, radioInfo.y);
      
      await page.waitForTimeout(500);
      
      const isSelected = await page.evaluate(() => {
        return document.querySelector('input[type="radio"]:checked') !== null;
      });
      
      if (clicked && isSelected) {
        console.log(`      ✓ Ответ выбран (через JS)`);
        return true;
      }
    } catch (e) {
      console.log(`      ⚠️ Ошибка при выборе ответа через JS: ${e.message}`);
    }
    
    console.log(`      ⚠️ Не удалось выбрать ответ ни одним способом`);
    return false;
  } catch (error) {
    console.log(`      ⚠️ Ошибка при выборе ответа: ${error.message}`);
    return false;
  }
}

// Простой выбор ответа
async function selectAnswerSimple(page) {
  try {
    // Просто кликаем первую доступную радио-кнопку через JavaScript
    const clicked = await page.evaluate(() => {
      const radios = Array.from(document.querySelectorAll('input[type="radio"]:not(:checked)'));
      if (radios.length > 0) {
        radios[0].click();
        return true;
      }
      return false;
    });
    
    if (clicked) {
      await page.waitForTimeout(500);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Ожидание изменения вопроса на странице
async function waitForQuestionChange(page, previousText, maxWaitTime = 10000) {
  const startTime = Date.now();
  let attempts = 0;
  
  while (Date.now() - startTime < maxWaitTime) {
    attempts++;
    
    const currentText = await page.evaluate(() => {
      // Ищем текст вопроса на странице
      const bodyText = document.body.innerText || '';
      
      // Ищем вопрос с вопросительным знаком
      const lines = bodyText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 30 && (trimmed.includes('?') || trimmed.includes('¿'))) {
          return trimmed;
        }
      }
      
      return '';
    });
    
    // Проверяем, изменился ли текст (сравниваем первые 80 символов)
    const currentKey = currentText.substring(0, 80).trim();
    const previousKey = previousText.substring(0, 80).trim();
    
    if (currentKey && currentKey !== previousKey && currentText.length > 20) {
      console.log(`         ✓ Вопрос изменился (попытка ${attempts})`);
      return true;
    }
    
    await page.waitForTimeout(500);
  }
  
  console.log(`         ⚠️ Вопрос не изменился за ${maxWaitTime/1000} секунд`);
  return false;
}

// Простой переход к следующему вопросу
async function goToNextQuestion(page, currentQuestionText) {
  try {
    console.log(`         Ищу кнопку перехода...`);
    
    // Способ 1: Ищем кнопку со стрелкой вправо
    const clicked = await page.evaluate(() => {
      // Ищем кнопку с классом owl-next или со стрелкой вправо
      const nextBtn = document.querySelector('button.owl-next, button[class*="next"], .carousel-control-next');
      if (nextBtn) {
        console.log('Найдена кнопка next');
        nextBtn.click();
        return 'button';
      }
      
      // Ищем SVG со стрелкой вправо и кликаем его родителя
      const arrow = document.querySelector('svg[class*="arrow-right"], svg[class*="chevron-right"]');
      if (arrow) {
        const btn = arrow.closest('button, div, span');
        if (btn) {
          console.log('Найдена стрелка вправо');
          btn.click();
          return 'arrow';
        }
      }
      
      return null;
    });
    
    if (clicked) {
      console.log(`         ✓ Клик через ${clicked}`);
    } else {
      // Способ 2: Клавиатура
      console.log(`         ⚠️ Кнопка не найдена, использую клавиатуру`);
      await page.keyboard.press('ArrowRight');
    }
    
    // Ждем немного
    await page.waitForTimeout(2000);
    
    // ВАЖНО: Ждем, пока вопрос действительно изменится
    const changed = await waitForQuestionChange(page, currentQuestionText, 8000);
    
    return changed;
  } catch (e) {
    console.log(`         ⚠️ Ошибка перехода: ${e.message}`);
    return false;
  }
}

// Скрапинг одного теста - ПРОСТАЯ ЛОГИКА
async function scrapeTest(page, testUrl, topicNumber, testNumber) {
  try {
    console.log(`      📄 Загружаю тест ${testNumber}...`);
    
    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForTimeout(5000);
    
    // Пытаемся найти заранее загруженные данные (без пролистывания)
    const nativeDataReport = await findNativeTestData(page, { topicNumber, testNumber });
    if (nativeDataReport) {
      console.log(`\n      🔍 Нативный анализ:`);
      console.log(`         Корневые объекты: ${nativeDataReport.rootsScanned.length ? nativeDataReport.rootsScanned.join(', ') : 'не найдены'}`);
      console.log(`         Массивов-кандидатов: ${nativeDataReport.candidates.length}`);
      
      const sampleCandidates = nativeDataReport.candidates.slice(0, 5);
      sampleCandidates.forEach((candidate, idx) => {
        console.log(`         [${idx + 1}] ${candidate.path} (длина: ${candidate.length})`);
        if (candidate.keys && candidate.keys.length) {
          console.log(`             ключи: ${candidate.keys.join(', ')}`);
        }
        if (candidate.sample) {
          console.log(`             пример: ${candidate.sample}`);
        }
      });
      
      if (nativeDataReport.scriptCandidates && nativeDataReport.scriptCandidates.length) {
        console.log(`         Скриптов с потенциальными данными: ${nativeDataReport.scriptCandidates.length}`);
        nativeDataReport.scriptCandidates.slice(0, 3).forEach((script) => {
          console.log(`             script[${script.index}] type=${script.type} snippet="${script.snippet}"`);
        });
      }
      if (nativeDataReport.jsonScripts && nativeDataReport.jsonScripts.length) {
        console.log(`         script[type="application/json"]: ${nativeDataReport.jsonScripts.length}`);
        nativeDataReport.jsonScripts.slice(0, 3).forEach((script) => {
          console.log(`             json[${script.index}] id=${script.id || '—'} snippet="${script.snippet}"`);
        });
      }
      if (nativeDataReport.globalCandidates && nativeDataReport.globalCandidates.length) {
        console.log(`         Глобальные объекты с ключевыми словами: ${nativeDataReport.globalCandidates.length}`);
        nativeDataReport.globalCandidates.slice(0, 5).forEach((global) => {
          console.log(`             window.${global.key} → (${global.type}) ${global.preview}`);
        });
      }
      if (nativeDataReport.questionaryData) {
        const qd = nativeDataReport.questionaryData;
        if (qd.error) {
          console.log(`         Questionary: ошибка доступа (${qd.error})`);
        } else {
          console.log(`         Questionary: ключи=${qd.keys?.join(', ') || '—'}, state=${qd.stateKeys ? qd.stateKeys.join(', ') : '—'}`);
          if (qd.hasQuestionsArray) {
            console.log(`             найден массив вопросов: ${qd.questionsLength}`);
            qd.questionsSample?.forEach((item, idx) => {
              console.log(`             [${idx + 1}] ${JSON.stringify(item).slice(0, 200)}`);
            });
          }
        }
      }
      
      if (nativeDataReport.jqueryData) {
        const jq = nativeDataReport.jqueryData;
        console.log(`         jQuery найден: ${jq.hasJQuery ? 'да' : 'нет'}, элемент #mainTest: ${jq.elementFound ? 'найден' : 'нет'}`);
        if (jq.entries) {
          jq.entries.forEach((entry) => {
            console.log(`             data('${entry.key}') → (${entry.type}) ${entry.preview}`);
          });
        }
        if (jq.preview?.questionsSample) {
          console.log(`         Пример вопросов (из data):`);
          jq.preview.questionsSample.forEach((qSample, idx) => {
            console.log(`             [${idx + 1}] ${JSON.stringify(qSample).slice(0, 200)}`);
          });
        }
        if (jq.carousel) {
          console.log(`         Carousel: тип=${jq.carousel.type}, элементов=${jq.carousel.itemsCount}`);
          if (jq.carousel.samples) {
            jq.carousel.samples.forEach((sample) => {
              console.log(`             item[${sample.index}] text="${sample.text}" img=${sample.hasImage ? 'да' : 'нет'}`);
            });
          }
        }
      }
      
      try {
        await fs.mkdir(DEBUG_NATIVE_DIR, { recursive: true });
        const debugPath = join(
          DEBUG_NATIVE_DIR,
          `native-report-topic${topicNumber}-test${testNumber}-${Date.now()}.json`
        );
        await fs.writeFile(debugPath, JSON.stringify(nativeDataReport, null, 2), 'utf-8');
        console.log(`         ↳ Подробный отчет сохранен: ${debugPath}`);
      } catch (fsError) {
        console.log(`         ⚠️ Не удалось сохранить отчет: ${fsError.message}`);
      }
    }
    
    // Пробуем извлечь все вопросы напрямую из DOM (без переключений)
    const domQuestions = await extractQuestionsFromDom(page, topicNumber, testNumber);
    if (domQuestions && domQuestions.length >= 10) {
      console.log(`\n      ✅ Использую вопросы из DOM (${domQuestions.length} шт.)`);
      return domQuestions;
    } else if (domQuestions && domQuestions.length > 0) {
      console.log(`\n      ⚠️ Из DOM удалось получить только ${domQuestions.length} вопросов, продолжаю по одному...`);
    } else {
      console.log(`\n      ⚠️ Не удалось получить вопросы напрямую из DOM, продолжаю по одному...`);
    }
    
    const allQuestions = [];
    const seenQuestions = new Set(); // Для отслеживания дубликатов
    
    // Простой цикл: извлекаем вопрос → выбираем ответ → переходим дальше
    for (let questionIndex = 1; questionIndex <= 30; questionIndex++) {
      console.log(`\n      [${questionIndex}/30] Извлекаю вопрос...`);
      
      // Прокручиваем вверх перед извлечением
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      
      // Извлекаем текущий вопрос
      const question = await extractCurrentQuestion(page, topicNumber, testNumber, questionIndex);
      
      if (!question) {
        console.log(`      ⚠️ Вопрос ${questionIndex} не найден`);
        
        // Даем еще одну попытку с задержкой
        await page.waitForTimeout(2000);
        const retryQuestion = await extractCurrentQuestion(page, topicNumber, testNumber, questionIndex);
        
        if (!retryQuestion) {
          console.log(`      ⚠️ Вопрос ${questionIndex} не найден после повтора, останавливаюсь`);
          break;
        }
        
        question = retryQuestion;
      }
      
      // Создаем уникальный ключ для проверки дубликатов (ТОЛЬКО ПО ТЕКСТУ!)
      const questionKey = question.question_text.substring(0, 150).trim();
      
      // Логируем информацию для отладки
      console.log(`      Извлечено: №${question.question_number}, текст: "${question.question_text.substring(0, 60)}..."`);
      
      if (seenQuestions.has(questionKey)) {
        console.log(`      ⚠️ Дубликат вопроса! Уже видели этот вопрос. Означает, что достигнут конец теста.`);
        console.log(`      Всего уникальных вопросов собрано: ${allQuestions.length}`);
        break;
      }
      
      seenQuestions.add(questionKey);
      allQuestions.push(question);
      
      console.log(`      ✅ Вопрос ${allQuestions.length} сохранен`);
      console.log(`         Ответов: ${question.answers.length}, Изображение: ${question.image_url ? '✅' : '❌'}`);
      
      // Выбираем ответ
      console.log(`      Выбираю ответ...`);
      const answerSelected = await selectAnswerSimple(page);
      if (answerSelected) {
        console.log(`      ✓ Ответ выбран`);
      } else {
        console.log(`      ⚠️ Не удалось выбрать ответ`);
      }
      
      await page.waitForTimeout(1000);
      
      // Если это не последний вопрос, переходим дальше
      if (questionIndex < 30) {
        console.log(`      Переход к следующему вопросу...`);
        const moved = await goToNextQuestion(page, question.question_text);
        
        if (!moved) {
          console.log(`      ⚠️ Не удалось перейти к следующему вопросу (контент не изменился), останавливаюсь`);
          break;
        }
      }
    }
    
    console.log(`\n      ✅ Итого найдено вопросов: ${allQuestions.length}`);
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











