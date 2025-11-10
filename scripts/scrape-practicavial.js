#!/usr/bin/env node

/**
 * Скрипт для автоматического скрапинга тестов с сайта PracticaVial
 * Использует Puppeteer для работы как реальный браузер
 * 
 * Установка зависимостей:
 * npm install puppeteer @supabase/supabase-js xlsx dotenv
 * 
 * Использование:
 * node scripts/scrape-practicavial.js --username=your-username --password=your-password
 * или
 * node scripts/scrape-practicavial.js (будет запрошено интерактивно)
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path, { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переменные окружения из корня проекта
const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Конфигурация
const BASE_URL = 'https://teorica.practicavial.com';
const TESTS_URL = `${BASE_URL}/permiso/b/tests/tema/all`;

// Инициализация Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                    process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения SUPABASE_URL и SUPABASE_KEY');
  console.error('   Создайте файл .env в корне проекта со следующими переменными:');
  console.error('   VITE_SUPABASE_URL=your-supabase-url');
  console.error('   VITE_SUPABASE_ANON_KEY=your-supabase-key (или VITE_SUPABASE_PUBLISHABLE_KEY)');
  console.error('\n   Текущие переменные окружения:');
  console.error(`   VITE_SUPABASE_URL: ${supabaseUrl || 'не найдено'}`);
  console.error(`   VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY || 'не найдено'}`);
  console.error(`   VITE_SUPABASE_PUBLISHABLE_KEY: ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'не найдено'}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Парсинг аргументов командной строки
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    username: null,
    password: null,
    topics: null, // null = все темы
    headless: true,
    output: 'practicavial-scrape.xlsx',
  };

  for (const arg of args) {
    if (arg.startsWith('--username=')) {
      config.username = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      config.password = arg.split('=')[1];
    } else if (arg.startsWith('--topics=')) {
      config.topics = arg.split('=')[1].split(',').map(t => parseInt(t.trim()));
    } else if (arg === '--headless=false') {
      config.headless = false;
    } else if (arg.startsWith('--output=')) {
      config.output = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Использование: node scripts/scrape-practicavial.js [опции]

Опции:
  --username=USERNAME    Логин для PracticaVial
  --password=PASSWORD    Пароль для PracticaVial
  --topics=1,2,3         Номера тем для скрапинга (через запятую, по умолчанию все)
  --headless=false       Запустить браузер в видимом режиме (для отладки)
  --output=FILENAME      Имя выходного Excel файла (по умолчанию: practicavial-scrape.xlsx)
  --help, -h             Показать эту справку

Пример:
  node scripts/scrape-practicavial.js --username=user@example.com --password=pass123
      `);
      process.exit(0);
    }
  }

  return config;
}

// Интерактивный ввод данных
async function getCredentials() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  const username = await question('Логин/Email для PracticaVial: ');
  const password = await question('Пароль: ');
  rl.close();

  return { username, password };
}

// Проверка, авторизован ли пользователь (более надежная)
async function isLoggedIn(page) {
  try {
    const currentUrl = page.url();
    
    // Если мы на странице логина - точно не авторизованы
    if (currentUrl.includes('/login')) {
      return false;
    }
    
    // Проверяем, есть ли элементы, указывающие на авторизацию
    const loginStatus = await page.evaluate(() => {
      // Ищем элементы, которые появляются только после авторизации
      const userMenu = document.querySelector('[class*="user"], [class*="profile"], [id*="user"], [class*="account"]');
      const logoutButton = document.querySelector('[href*="logout"], [class*="logout"], button:has-text("Salir")');
      const premiumBadge = document.querySelector('[class*="premium"]');
      
      // Проверяем, есть ли форма логина
      const loginForm = document.querySelector('form[action*="login"], form input[type="password"][name*="password"]');
      const loginInputs = document.querySelectorAll('input[type="password"]');
      
      // Проверяем, можем ли мы видеть контент тестов (не видим блоки с требованием авторизации)
      const requiresAuth = document.querySelector('text=/Para acceder/i, text=/necesitas una cuenta/i, text=/Iniciar sesión/i');
      const hasTestContent = document.querySelector('text=/Test Tema/i, text=/Test/i, [href*="/test/tema/"]');
      
      // Если есть форма логина или требование авторизации - не авторизованы
      if (loginForm && loginInputs.length > 0) {
        return false;
      }
      
      if (requiresAuth && !hasTestContent) {
        return false;
      }
      
      // Если есть элементы авторизации или контент тестов - авторизованы
      return !!(userMenu || logoutButton || premiumBadge || hasTestContent);
    });
    
    return loginStatus;
  } catch (e) {
    console.log('   ⚠️ Ошибка при проверке авторизации:', e.message);
    return false;
  }
}

// Авторизация на сайте
async function login(page, username, password) {
  console.log('🔐 Авторизация на PracticaVial...');
  
  try {
    // Шаг 1: Открываем страницу логина
    console.log('   Шаг 1: Открываю страницу логина...');
    try {
      await page.goto(`${BASE_URL}/login`, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });
      await page.waitForTimeout(3000); // Ждем загрузки
    } catch (e) {
      console.log('   ⚠️ Таймаут при загрузке страницы логина, но продолжаю...');
    }
    
    // Проверяем текущий URL
    let currentUrl = page.url();
    console.log(`   Текущий URL: ${currentUrl}`);
    
    // Если мы не на странице логина, проверяем авторизацию
    if (!currentUrl.includes('/login')) {
      const isAuth = await isLoggedIn(page);
      if (isAuth) {
        console.log('✅ Вы уже авторизованы! Продолжаю работу...');
        return true;
      } else {
        console.log('   ⚠️ Не на странице логина, но авторизация не подтверждена, перехожу на страницу логина...');
        await page.goto(`${BASE_URL}/login`, { 
          waitUntil: 'domcontentloaded',
          timeout: 20000 
        });
        await page.waitForTimeout(2000);
      }
    }

    // Ждем загрузки формы логина - пробуем разные селекторы (с меньшим таймаутом)
    console.log('   Ожидаю загрузки формы...');
    let formFound = false;
    const formSelectors = ['form', 'input[type="text"]', 'input[type="email"]', 'input[name*="user"]', 'input[name*="login"]'];
    
    for (const selector of formSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        formFound = true;
        console.log(`   ✅ Форма найдена через селектор: ${selector}`);
        break;
      } catch (e) {
        // Пробуем следующий селектор
      }
    }
    
    if (!formFound) {
      console.log('   ⚠️ Форма не найдена через стандартные селекторы');
      console.log('   💡 Подсказка: Если вы уже авторизованы вручную, скрипт должен это обнаружить');
      await page.waitForTimeout(1000);
    }

    // Шаг 3: Находим и заполняем поля ввода
    console.log('   Шаг 3: Ищу поля ввода логина и пароля...');
    
    // Используем более надежный поиск полей
    const fields = await page.evaluate(() => {
      // Ищем все поля ввода
      const allInputs = Array.from(document.querySelectorAll('input'));
      
      // Находим поле пароля (оно точно есть в форме логина)
      const passwordField = allInputs.find(input => 
        input.type === 'password' && 
        !input.name.includes('register') &&
        !input.closest('form')?.action?.includes('register')
      );
      
      // Находим поле логина (может быть text или email)
      const usernameField = allInputs.find(input => 
        (input.type === 'text' || input.type === 'email') &&
        !input.name.includes('register') &&
        !input.closest('form')?.action?.includes('register') &&
        input !== passwordField
      );
      
      return {
        username: usernameField ? (usernameField.name || 'input[type="' + usernameField.type + '"]') : null,
        password: passwordField ? (passwordField.name || 'input[type="password"]') : null,
        usernameSelector: usernameField ? 
          (usernameField.name ? `input[name="${usernameField.name}"]` : 
           usernameField.id ? `input#${usernameField.id}` :
           `input[type="${usernameField.type}"]`) : null,
        passwordSelector: passwordField ?
          (passwordField.name ? `input[name="${passwordField.name}"]` :
           passwordField.id ? `input#${passwordField.id}` :
           'input[type="password"]') : null,
      };
    });
    
    if (!fields.usernameSelector || !fields.passwordSelector) {
      await page.screenshot({ path: 'login-page-debug.png' });
      console.log('   📸 Скриншот сохранен в login-page-debug.png');
      throw new Error('Не удалось найти поля ввода. Проверьте скриншот login-page-debug.png');
    }
    
    console.log(`   ✅ Найдено поле логина: ${fields.usernameSelector}`);
    console.log(`   ✅ Найдено поле пароля: ${fields.passwordSelector}`);
    
    // Заполняем форму
    console.log('   Шаг 4: Заполняю форму...');
    await page.waitForSelector(fields.usernameSelector, { timeout: 5000 });
    await page.waitForSelector(fields.passwordSelector, { timeout: 5000 });
    
    // Очищаем поля перед вводом
    await page.click(fields.usernameSelector, { clickCount: 3 });
    await page.type(fields.usernameSelector, username, { delay: 80 });
    await page.waitForTimeout(500);
    
    await page.click(fields.passwordSelector, { clickCount: 3 });
    await page.type(fields.passwordSelector, password, { delay: 80 });
    await page.waitForTimeout(500);
    
    console.log('   ✅ Форма заполнена');

    // Шаг 5: Нажимаем кнопку входа
    console.log('   Шаг 5: Нажимаю кнопку входа...');
    await page.waitForTimeout(1000);
    
    // Ищем кнопку входа
    const submitButtonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const loginButton = buttons.find(btn => {
        const text = btn.textContent.toLowerCase();
        return text.includes('iniciar') ||
               text.includes('login') ||
               text.includes('entrar') ||
               btn.type === 'submit';
      });
      
      if (loginButton) {
        return {
          found: true,
          selector: loginButton.tagName === 'BUTTON' ? 
            (loginButton.type === 'submit' ? 'button[type="submit"]' : 
             loginButton.textContent.includes('Iniciar') ? 'button:has-text("Iniciar")' : 'button') :
            'input[type="submit"]',
          text: loginButton.textContent,
        };
      }
      
      return { found: false };
    });
    
    if (submitButtonInfo.found) {
      console.log(`   ✅ Кнопка входа найдена: "${submitButtonInfo.text}"`);
      
      // Нажимаем кнопку и ждем навигации
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {
            // Если навигация не произошла, ждем загрузки страницы
            return page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
              console.log('   ⚠️ Навигация не произошла автоматически');
            });
          }),
          page.click('button[type="submit"], input[type="submit"], button').catch(async () => {
            // Пробуем через evaluate
            await page.evaluate(() => {
              const btn = document.querySelector('button[type="submit"], input[type="submit"]');
              if (btn) btn.click();
            });
          }),
        ]);
      } catch (e) {
        console.log('   ⚠️ Ошибка при нажатии кнопки, пробую Enter...');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('   ⚠️ Кнопка не найдена, пробую нажать Enter...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    
    // Шаг 6: Ждем загрузки после авторизации и проверяем результат
    console.log('   Шаг 6: Жду загрузки страницы после авторизации...');
    await page.waitForTimeout(3000);
    
    // Проверяем текущий URL
    currentUrl = page.url();
    console.log(`   Текущий URL после авторизации: ${currentUrl}`);
    
    // Шаг 7: Проверяем успешность авторизации
    console.log('   Шаг 7: Проверяю успешность авторизации...');
    
    // Ждем еще немного для редиректа
    await page.waitForTimeout(2000);
    
    currentUrl = page.url();
    console.log(`   Финальный URL: ${currentUrl}`);
    
    // Проверяем авторизацию
    const loggedIn = await isLoggedIn(page);
    console.log(`   Статус авторизации: ${loggedIn ? '✅ Авторизован' : '❌ Не авторизован'}`);
    
    if (currentUrl.includes('/login')) {
      // Все еще на странице логина - проверяем ошибки
      const errorMessage = await page.evaluate(() => {
        const error = document.querySelector('.error, .alert-danger, [class*="error"], .alert, .warning');
        return error ? error.textContent.trim() : null;
      });

      if (errorMessage) {
        console.log(`   ❌ Ошибка авторизации: ${errorMessage}`);
        await page.screenshot({ path: 'login-error.png' });
        console.log('   📸 Скриншот ошибки сохранен в login-error.png');
        throw new Error(`Ошибка авторизации: ${errorMessage}`);
      }
      
      // Если нет ошибки, но все еще на странице логина
      console.log('   ⚠️ Все еще на странице логина после попытки авторизации');
      await page.screenshot({ path: 'login-still-on-page.png' });
      console.log('   📸 Скриншот сохранен в login-still-on-page.png');
      
      if (!config.headless) {
        console.log('   💡 Если браузер открыт - авторизуйтесь вручную');
        console.log('   💡 Скрипт подождет 20 секунд...');
        await page.waitForTimeout(20000);
        
        // Проверяем снова
        const newUrl = page.url();
        const stillLoggedIn = await isLoggedIn(page);
        
        if (newUrl.includes('/login') && !stillLoggedIn) {
          await page.screenshot({ path: 'login-failed.png' });
          console.log('   📸 Скриншот сохранен в login-failed.png');
          throw new Error('Авторизация не удалась. Пожалуйста, проверьте логин и пароль.');
        }
      } else {
        throw new Error('Авторизация не удалась - остались на странице логина');
      }
    }
    
    // Финальная проверка авторизации - пробуем открыть страницу тестов
    if (!loggedIn) {
      console.log('   ⚠️ Авторизация не подтверждена, проверяю доступ к тестам...');
      
      // Пробуем открыть страницу тестов
      try {
        await page.goto(`${BASE_URL}/permiso/b/tests/tema/1`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        await page.waitForTimeout(2000);
        
        const testPageUrl = page.url();
        const testPageCheck = await isLoggedIn(page);
        
        if (testPageUrl.includes('/login') || !testPageCheck) {
          await page.screenshot({ path: 'no-access-to-tests.png' });
          console.log('   📸 Скриншот сохранен в no-access-to-tests.png');
          throw new Error('Авторизация не подтверждена - страница тестов недоступна');
        }
        
        console.log('   ✅ Доступ к тестам подтвержден!');
      } catch (e) {
        if (e.message.includes('Авторизация не подтверждена')) {
          throw e;
        }
        console.log(`   ⚠️ Ошибка при проверке доступа к тестам: ${e.message}`);
        throw new Error('Не удалось проверить доступ к тестам');
      }
    }
    
    console.log('✅ Авторизация успешна! Могу работать с тестами.');
    return true;
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.error('❌ Таймаут при загрузке страницы');
      console.log('💡 Решение:');
      console.log('   1. Проверьте подключение к интернету');
      console.log('   2. Авторизуйтесь вручную в браузере');
      console.log('   3. Затем перейдите на страницу: https://teorica.practicavial.com/permiso/b/tests/tema/all');
      console.log('   4. Запустите скрипт снова - он должен обнаружить, что вы уже авторизованы');
      
      // Пробуем проверить текущее состояние страницы
      try {
        const currentUrl = page.url();
        const loggedIn = await isLoggedIn(page);
        if (loggedIn && !currentUrl.includes('/login')) {
          console.log('✅ Обнаружено, что вы уже авторизованы! Продолжаю работу...');
          return true;
        }
      } catch (e) {
        // Игнорируем ошибки проверки
      }
    }
    console.error('❌ Ошибка при авторизации:', error.message);
    throw error;
  }
}

// Получение тестов для конкретной темы
async function getTestsForTopic(page, topicNumber) {
  console.log(`📋 Загрузка тестов для темы ${topicNumber}...`);
  
  const topicUrl = `${BASE_URL}/permiso/b/tests/tema/${topicNumber}`;
  
  try {
    console.log(`   Открываю страницу: ${topicUrl}`);
    await page.goto(topicUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Ждем загрузки контента
    await page.waitForTimeout(3000);
    
    console.log('   Ищу тесты на странице...');
    
    // Извлекаем список тестов со страницы
    const tests = await page.evaluate(() => {
      const testsList = [];
      const seenUrls = new Set(); // Чтобы избежать дубликатов
      
      console.log('Начинаю поиск тестов на странице...');
      
      // Ищем все ссылки на тесты - они могут содержать UUID или номера
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      console.log(`Найдено ссылок на странице: ${allLinks.length}`);
      
      allLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        const text = link.textContent.trim();
        const parentElement = link.closest('div, article, section, li');
        const parentText = parentElement?.textContent.trim() || '';
        
        // Проверяем, что это ссылка на тест
        // Тесты могут иметь формат: /test/tema/{uuid} или содержать "Test Tema X Nº: Y"
        const isTestLink = href.includes('/test/tema/') || 
                          (href.includes('/test/') && href.match(/[a-f0-9-]{36}/i)) || // UUID
                          (text.includes('Test') && text.includes('Tema') && (text.includes('Nº') || text.includes('N°') || text.match(/\d{3}/)));
        
        if (isTestLink && !seenUrls.has(href)) {
          seenUrls.add(href);
          
          // Извлекаем номер теста из текста
          let testNumber = null;
          // Пробуем разные форматы: "Nº: 001", "N°: 017", "001", "017"
          const testMatch = text.match(/N[º°]?:\s*0?(\d+)/i) || 
                          text.match(/N[º°]?\s*0?(\d+)/i) ||
                          text.match(/\b(\d{3})\b/) ||
                          parentText.match(/N[º°]?:\s*0?(\d+)/i);
          
          if (testMatch) {
            testNumber = parseInt(testMatch[1]);
          } else {
            // Если номер не найден, используем порядковый номер
            testNumber = testsList.length + 1;
          }
          
          // Формируем полный URL
          let fullUrl = href;
          if (!fullUrl.startsWith('http')) {
            fullUrl = `https://teorica.practicavial.com${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
          }
          
          // Проверяем, что это действительно ссылка на тест (не на тему)
          if (fullUrl.includes('/test/tema/') && !fullUrl.includes('/tests/tema/')) {
            testsList.push({
              number: testNumber,
              url: fullUrl,
              title: text || parentText || `Test ${testNumber}`,
            });
            
            console.log(`Найден тест ${testNumber}: ${fullUrl.substring(0, 80)}...`);
          }
        }
      });
      
      // Если не нашли тесты, ищем по структуре страницы более тщательно
      if (testsList.length === 0) {
        console.log('Не найдено тестов через прямые ссылки, ищу по структуре...');
        
        // Ищем все элементы, содержащие "Test Tema X Nº: Y"
        const allElements = Array.from(document.querySelectorAll('*'));
        const testElements = allElements.filter(el => {
          const text = el.textContent || '';
          return text.includes('Test') && 
                 text.includes('Tema') && 
                 (text.match(/N[º°]?:\s*\d+/i) || text.match(/\d{3}/));
        });
        
        console.log(`Найдено элементов с "Test Tema": ${testElements.length}`);
        
        testElements.forEach((element) => {
          // Ищем ссылку внутри или рядом с элементом
          const link = element.closest('a') || 
                      element.querySelector('a') || 
                      element.nextElementSibling?.querySelector('a');
          
          if (link) {
            const href = link.getAttribute('href');
            if (!href || seenUrls.has(href)) return;
            
            // Проверяем, что это ссылка на тест (с UUID)
            if (href.includes('/test/tema/') && href.match(/[a-f0-9-]{36}/i)) {
              seenUrls.add(href);
              const text = element.textContent.trim();
              
              // Извлекаем номер теста
              const testMatch = text.match(/N[º°]?:\s*0?(\d+)/i) || text.match(/\b(\d{3})\b/);
              const testNumber = testMatch ? parseInt(testMatch[1]) : testsList.length + 1;
              
              let fullUrl = href;
              if (!fullUrl.startsWith('http')) {
                fullUrl = `https://teorica.practicavial.com${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
              }
              
              testsList.push({
                number: testNumber,
                url: fullUrl,
                title: text.substring(0, 100),
              });
            }
          }
        });
      }
      
      // Сортируем по номеру теста
      testsList.sort((a, b) => a.number - b.number);
      
      console.log(`Итого найдено тестов: ${testsList.length}`);
      if (testsList.length > 0) {
        console.log('Примеры URL тестов:');
        testsList.slice(0, 3).forEach(test => {
          console.log(`  Тест ${test.number}: ${test.url.substring(0, 100)}...`);
        });
      }
      
      return testsList;
    });
    
    console.log(`   ✅ Найдено тестов: ${tests.length}`);
    return tests;
    
  } catch (error) {
    console.error(`   ❌ Ошибка при загрузке тестов для темы ${topicNumber}:`, error.message);
    return [];
  }
}

// Получение списка тем и тестов (старая функция - для всех тем)
async function getTopicsAndTests(page) {
  console.log('📋 Загрузка списка тем и тестов...');
  
  try {
    await page.goto(TESTS_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });

    // Ждем загрузки контента
    await page.waitForTimeout(3000);

    const topics = await page.evaluate(() => {
      const topicsList = [];
      
      // Ищем все ссылки на темы
      const allLinks = Array.from(document.querySelectorAll('a[href*="/tests/tema/"], a[href*="/tema/"]'));
      const topicMap = new Map();

      for (const link of allLinks) {
        const href = link.getAttribute('href');
        if (!href) continue;
        
        const match = href.match(/\/tests\/tema\/(\d+)/) || href.match(/\/tema\/(\d+)/);
        if (match) {
          const topicNum = parseInt(match[1]);
          if (!topicMap.has(topicNum)) {
            const title = link.textContent.trim() || link.closest('li')?.textContent.trim() || `Тема ${topicNum}`;
            topicMap.set(topicNum, {
              number: topicNum,
              title: title,
              testLinks: [],
            });
          }
        }
      }

      // Если нашли темы, возвращаем их
      if (topicMap.size > 0) {
        return Array.from(topicMap.values());
      }

      // Если не нашли, создаем список из известных тем (1-10)
      for (let i = 1; i <= 10; i++) {
        topicsList.push({
          number: i,
          title: `Тема ${i}`,
          testLinks: [],
        });
      }

      return topicsList;
    });

    console.log(`✅ Найдено тем: ${topics.length}`);
    return topics;
  } catch (error) {
    console.error('❌ Ошибка при загрузке списка тем:', error.message);
    // Если не удалось загрузить, создаем список из известных тем
    console.log('   Создаю список тем по умолчанию (1-10)...');
    const defaultTopics = [];
    for (let i = 1; i <= 10; i++) {
      defaultTopics.push({
        number: i,
        title: `Тема ${i}`,
        testLinks: [],
      });
    }
    return defaultTopics;
  }
}

// Скрапинг одного теста
async function scrapeTest(page, testUrl, topicNumber, testNumber) {
  try {
    await page.goto(testUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    await page.waitForTimeout(2000); // Ждем загрузки JavaScript

    const questions = await page.evaluate((topicNum, testNum) => {
      const questionsList = [];
      
      // Находим все вопросы
      const questionSelectors = [
        '.question',
        '[class*="question"]',
        '.pregunta',
        '[class*="pregunta"]',
        '.test-question',
      ];

      let questionElements = [];
      for (const selector of questionSelectors) {
        questionElements = Array.from(document.querySelectorAll(selector));
        if (questionElements.length > 0) break;
      }

      // Если не нашли через селекторы, ищем по структуре
      if (questionElements.length === 0) {
        // Ищем элементы, которые могут быть вопросами
        const allDivs = Array.from(document.querySelectorAll('div, article, section'));
        questionElements = allDivs.filter(el => {
          const text = el.textContent.trim();
          return text.length > 50 && text.length < 500 && 
                 (text.includes('?') || el.querySelector('img'));
        });
      }

      questionElements.forEach((element, index) => {
        try {
          // Извлекаем текст вопроса
          let questionText = element.textContent.trim();
          
          // Удаляем текст ответов из вопроса, если он там есть
          const answerTexts = element.querySelectorAll('.answer, [class*="answer"], label, input[type="radio"]');
          answerTexts.forEach(answerEl => {
            const answerText = answerEl.textContent.trim();
            if (answerText && answerText.length > 5) {
              questionText = questionText.replace(answerText, '').trim();
            }
          });
          
          // Извлекаем изображение
          const questionImg = element.querySelector('img');
          let imageUrl = null;
          if (questionImg) {
            imageUrl = questionImg.getAttribute('src') || questionImg.getAttribute('data-src');
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `https://teorica.practicavial.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            }
          }

          // Находим ответы - более тщательный поиск
          const answers = [];
          
          // Ищем ответы внутри элемента вопроса
          const answerContainers = element.querySelectorAll('.answers, [class*="answer"], .options, [class*="option"]');
          
          if (answerContainers.length > 0) {
            answerContainers.forEach(container => {
              const answerItems = container.querySelectorAll('label, .answer-item, [class*="answer"], input[type="radio"]');
              answerItems.forEach((answerEl, ansIndex) => {
                let answerText = '';
                
                // Пробуем получить текст ответа
                if (answerEl.tagName === 'LABEL') {
                  answerText = answerEl.textContent.trim();
                } else if (answerEl.querySelector('label')) {
                  answerText = answerEl.querySelector('label').textContent.trim();
                } else {
                  answerText = answerEl.textContent.trim();
                }
                
                // Проверяем, правильный ли ответ
                const isCorrect = answerEl.classList.contains('correct') || 
                                 answerEl.classList.contains('right') ||
                                 answerEl.classList.contains('true') ||
                                 answerEl.checked === true ||
                                 answerEl.getAttribute('data-correct') === 'true' ||
                                 answerEl.closest('.correct, .right') !== null;
                
                if (answerText && answerText.length > 0) {
                  answers.push({
                    text: answerText,
                    is_correct: isCorrect,
                    order: answers.length + 1,
                  });
                }
              });
            });
          } else {
            // Если контейнеров с ответами нет, ищем ответы рядом с вопросом
            const nextSibling = element.nextElementSibling;
            if (nextSibling) {
              const answerItems = nextSibling.querySelectorAll('label, input[type="radio"], .answer, [class*="answer"]');
              answerItems.forEach((answerEl, ansIndex) => {
                const answerText = answerEl.textContent.trim() || answerEl.nextSibling?.textContent.trim();
                const isCorrect = answerEl.classList.contains('correct') || 
                                 answerEl.checked === true;
                
                if (answerText && answerText.length > 0) {
                  answers.push({
                    text: answerText,
                    is_correct: isCorrect,
                    order: answers.length + 1,
                  });
                }
              });
            }
          }

          // Если нашли вопрос и хотя бы один ответ, добавляем его
          if (questionText && questionText.length > 10 && answers.length > 0) {
            questionsList.push({
              topic_number: topicNum,
              test_number: testNum,
              question_number: index + 1,
              question_es: questionText,
              image_url: imageUrl,
              answers: answers,
            });
          }
        } catch (e) {
          console.error(`Ошибка при обработке вопроса ${index + 1}:`, e);
        }
      });

      return questionsList;
    }, topicNumber, testNumber);

    return questions;
  } catch (error) {
    console.error(`   ❌ Ошибка при скрапинге теста ${testUrl}:`, error.message);
    return [];
  }
}

// Сохранение вопросов в базу данных
async function saveQuestionsToDatabase(questions, topicMap) {
  console.log('💾 Сохранение вопросов в базу данных...');
  
  let saved = 0;
  let errors = 0;

  for (const question of questions) {
    try {
      const topicId = topicMap.get(question.topic_number);
      if (!topicId) {
        console.warn(`   ⚠️ Тема ${question.topic_number} не найдена в базе данных`);
        continue;
      }

      // Создаем source_id
      const sourceId = `practicavial_t${question.topic_number}_test${question.test_number}_q${question.question_number}`;

      // Проверяем, существует ли вопрос
      const { data: existing } = await supabase
        .from('questions_new')
        .select('id')
        .eq('source_id', sourceId)
        .single();

      const questionData = {
        topic_id: topicId,
        source_id: sourceId,
        question_es: question.question_es,
        image_url: question.image_url,
        is_premium: true,
      };

      let questionId;

      if (existing) {
        // Обновляем существующий вопрос
        const { error: updateError } = await supabase
          .from('questions_new')
          .update(questionData)
          .eq('id', existing.id);

        if (updateError) throw updateError;
        questionId = existing.id;
      } else {
        // Создаем новый вопрос
        const { data: newQuestion, error: insertError } = await supabase
          .from('questions_new')
          .insert(questionData)
          .select('id')
          .single();

        if (insertError) throw insertError;
        questionId = newQuestion.id;
      }

      // Сохраняем ответы
      if (question.answers && question.answers.length > 0) {
        // Удаляем старые ответы
        await supabase
          .from('answer_options')
          .delete()
          .eq('question_id', questionId);

        // Вставляем новые ответы
        const answerData = question.answers.map((answer, index) => ({
          question_id: questionId,
          answer_text_es: answer.text,
          is_correct: answer.is_correct || false,
          order: answer.order || index + 1,
        }));

        const { error: answersError } = await supabase
          .from('answer_options')
          .insert(answerData);

        if (answersError) throw answersError;
      }

      saved++;
    } catch (error) {
      console.error(`   ❌ Ошибка при сохранении вопроса:`, error.message);
      errors++;
    }
  }

  console.log(`✅ Сохранено вопросов: ${saved}, ошибок: ${errors}`);
  return { saved, errors };
}

// Генерация Excel файла
function generateExcelFile(questions, outputPath) {
  console.log('📊 Генерация Excel файла...');

  // Подготовка данных для Excel
  const questionsData = questions.map(q => ({
    'Тема': q.topic_number,
    'Тест': q.test_number,
    'Вопрос №': q.question_number,
    'Текст вопроса (ES)': q.question_es,
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

  // Создание книги
  const workbook = XLSX.utils.book_new();
  const questionsSheet = XLSX.utils.json_to_sheet(questionsData);
  const answersSheet = XLSX.utils.json_to_sheet(answersData);

  XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Вопросы');
  XLSX.utils.book_append_sheet(workbook, answersSheet, 'Ответы');

  // Сохранение
  XLSX.writeFile(workbook, outputPath);
  console.log(`✅ Excel файл сохранен: ${outputPath}`);
}

// Основная функция
async function main() {
  console.log('🚀 Запуск скрапера PracticaVial с Puppeteer\n');

  const config = parseArgs();

  // Получаем учетные данные
  let { username, password } = config;
  if (!username || !password) {
    console.log('Введите учетные данные для PracticaVial:');
    const credentials = await getCredentials();
    username = credentials.username;
    password = credentials.password;
  }

  if (!username || !password) {
    console.error('❌ Ошибка: Не указаны логин и пароль');
    process.exit(1);
  }

  // Запускаем браузер
  console.log('🌐 Запуск браузера...');
  const browser = await puppeteer.launch({
    headless: config.headless ? 'new' : false, // Используем новый headless режим
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // Скрываем автоматизацию
      '--disable-dev-shm-usage',
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Скрываем признаки автоматизации
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });
  
  // Устанавливаем User-Agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    // ШАГ 1: Авторизация (обязательно!)
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔐 ШАГ 1: АВТОРИЗАЦИЯ НА PRACTICAVIAL');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Логин: ${username}`);
    console.log(`   Пароль: ${'*'.repeat(password.length)}`);
    console.log(`   Режим: ${config.headless ? 'Headless (без браузера)' : 'С браузером (видимый)'}`);
    console.log('');
    
    // Если браузер видимый, предупреждаем пользователя
    if (!config.headless) {
      console.log('💡 ВАЖНО: Следите за браузером!');
      console.log('   - Скрипт откроет страницу логина');
      console.log('   - Заполнит форму автоматически');
      console.log('   - Если авторизация не сработает, авторизуйтесь вручную');
      console.log('   - После авторизации скрипт продолжит работу');
      console.log('');
    }
    
    try {
      const loginStartTime = Date.now();
      await login(page, username, password);
      const loginDuration = ((Date.now() - loginStartTime) / 1000).toFixed(1);
      console.log(`✅ Авторизация завершена за ${loginDuration} секунд`);
      
      // Дополнительная проверка - пробуем открыть страницу тестов
      console.log('\n   🔍 Проверка доступа к тестам...');
      console.log(`   Открываю: ${BASE_URL}/permiso/b/tests/tema/1`);
      await page.goto(`${BASE_URL}/permiso/b/tests/tema/1`, {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      await page.waitForTimeout(3000);
      
      const currentTestPageUrl = page.url();
      console.log(`   Текущий URL: ${currentTestPageUrl}`);
      
      const canAccessTests = await isLoggedIn(page);
      console.log(`   Статус доступа: ${canAccessTests ? '✅ Есть доступ' : '❌ Нет доступа'}`);
      
      if (!canAccessTests) {
        await page.screenshot({ path: 'no-access-to-tests.png' });
        console.log('   📸 Скриншот сохранен в no-access-to-tests.png');
        throw new Error('Авторизация не подтверждена - нет доступа к тестам');
      }
      
      console.log('✅ Авторизация успешна! Доступ к тестам подтвержден.');
      console.log('');
    } catch (loginError) {
      console.error('\n❌ ОШИБКА АВТОРИЗАЦИИ:', loginError.message);
      console.error('   Детали:', loginError.stack?.split('\n').slice(0, 3).join('\n') || 'Нет деталей');
      
      if (!config.headless) {
        console.log('\n💡 РЕШЕНИЕ:');
        console.log('   1. Посмотрите в браузер - видите ли вы форму логина?');
        console.log('   2. Если да - авторизуйтесь вручную');
        console.log('   3. После авторизации скрипт должен продолжить работу');
        console.log('   4. Или проверьте правильность логина и пароля');
        console.log('\n⏳ Жду 25 секунд - авторизуйтесь вручную в браузере, если нужно...');
        console.log('   (Вы увидите в браузере, что происходит)');
        
        for (let i = 25; i > 0; i--) {
          await page.waitForTimeout(1000);
          if (i % 5 === 0) {
            console.log(`   Осталось: ${i} секунд...`);
          }
        }
        
        // Проверяем снова
        console.log('\n   Проверяю авторизацию после ожидания...');
        const currentUrl = page.url();
        console.log(`   Текущий URL: ${currentUrl}`);
        
        const isAuth = await isLoggedIn(page);
        console.log(`   Статус авторизации: ${isAuth ? '✅ Авторизован' : '❌ Не авторизован'}`);
        
        if (!currentUrl.includes('/login') && isAuth) {
          console.log('✅ Похоже, вы авторизовались! Продолжаю работу...');
        } else {
          await page.screenshot({ path: 'auth-check-failed.png' });
          console.log('   📸 Скриншот сохранен в auth-check-failed.png');
          throw new Error('Авторизация не удалась. Пожалуйста, проверьте логин и пароль.');
        }
      } else {
        throw loginError;
      }
    }

    // ШАГ 2: Определяем темы для скрапинга
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 ШАГ 2: ОПРЕДЕЛЕНИЕ ТЕМ ДЛЯ СКРАПИНГА');
    console.log('═══════════════════════════════════════════════════════════');
    let topicsToScrape = [];
    
    if (config.topics && config.topics.length > 0) {
      // Если указаны конкретные темы
      topicsToScrape = config.topics.map(num => ({ number: num, title: `Тема ${num}` }));
      console.log(`📌 Выбрано тем: ${topicsToScrape.map(t => t.number).join(', ')}`);
    } else {
      // По умолчанию начинаем с темы 1
      console.log('📌 Начинаем с темы 1 (можно указать другие через --topics=1,2,3)');
      topicsToScrape = [{ number: 1, title: 'Тема 1: Definiciones y la utilización de la vía' }];
    }
    console.log('');

    // Получаем маппинг тем из базы данных
    const { data: dbTopics } = await supabase
      .from('topics')
      .select('id, number');

    const topicMap = new Map(dbTopics?.map(t => [t.number, t.id]) || []);

    // Скрапим тесты
    const allQuestions = [];
    let topicsProcessed = 0;
    let testsProcessed = 0;

    for (const topic of topicsToScrape) {
      console.log(`\n📚 Обработка темы ${topic.number}: ${topic.title}`);
      topicsProcessed++;

      // Получаем список тестов для этой темы
      const tests = await getTestsForTopic(page, topic.number);
      
      if (tests.length === 0) {
        console.log(`   ⚠️ Не удалось найти тесты для темы ${topic.number}`);
        console.log(`   💡 Попробуйте открыть страницу вручную: https://teorica.practicavial.com/permiso/b/tests/tema/${topic.number}`);
        continue;
      }

      console.log(`   📋 Найдено тестов: ${tests.length}`);

      for (const test of tests) {
        console.log(`   📝 Скрапинг теста ${test.number}: ${test.title}`);
        const questions = await scrapeTest(page, test.url, topic.number, test.number);
        
        if (questions.length > 0) {
          allQuestions.push(...questions);
          testsProcessed++;
          console.log(`   ✅ Найдено вопросов: ${questions.length}`);
        } else {
          console.log(`   ⚠️ Вопросы не найдены в тесте ${test.number}`);
        }

        // Небольшая задержка между запросами
        await page.waitForTimeout(2000);
      }
    }

    console.log(`\n📊 Итого: ${allQuestions.length} вопросов из ${testsProcessed} тестов в ${topicsProcessed} темах`);

    // Сохраняем в базу данных
    if (allQuestions.length > 0) {
      const saveResult = await saveQuestionsToDatabase(allQuestions, topicMap);
      console.log(`\n💾 Результаты сохранения: ${saveResult.saved} сохранено, ${saveResult.errors} ошибок`);
    }

    // Генерируем Excel файл
    if (allQuestions.length > 0) {
      generateExcelFile(allQuestions, config.output);
    }

    console.log('\n✅ Скрапинг завершен успешно!');

  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    if (!config.headless) {
      console.log('Браузер остается открытым для отладки. Нажмите Ctrl+C для выхода.');
      await new Promise(() => {}); // Бесконечное ожидание
    }
    process.exit(1);
  } finally {
    if (config.headless) {
      await browser.close();
    }
  }
}

// Запуск
main().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});

