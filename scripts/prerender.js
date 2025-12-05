/**
 * SSG Prerender Script
 * Генерирует статические HTML файлы для публичных страниц (SEO)
 * 
 * Использование: node scripts/prerender.js
 * Запускается автоматически после npm run build
 */

import puppeteerCore from 'puppeteer-core';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

// КРИТИЧНО: Определяем реальное окружение
// vercel build локально устанавливает VERCEL=true, но это не реальный Vercel сервер
// Реальный Vercel сервер имеет VERCEL=1 и нет HOME переменной
const isRealVercel = process.env.VERCEL === '1' && !process.env.HOME;

// Динамический импорт для Vercel и локальной разработки
let chromium = null;
let puppeteer = null;

// На реальном Vercel используем @sparticuz/chromium
if (isRealVercel) {
  try {
    chromium = await import('@sparticuz/chromium');
    console.log('[Prerender] ✅ Loaded @sparticuz/chromium for Vercel');
  } catch (error) {
    console.warn('[Prerender] ⚠️ Could not load @sparticuz/chromium:', error.message);
  }
} else {
  // Локально (включая vercel build локально) используем полный puppeteer
  try {
    puppeteer = await import('puppeteer');
    console.log('[Prerender] ✅ Loaded puppeteer for local development');
  } catch (error) {
    console.warn('[Prerender] ⚠️ Could not load puppeteer:', error.message);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:4173'; // Vite preview порт
const DIST_DIR = join(__dirname, '../dist');
const OUTPUT_DIR = DIST_DIR;

// Список публичных страниц для prerender
const PUBLIC_ROUTES = [
  '/',
  '/blog',
  // Статьи
  '/article/novye-voprosy-dgt-2025',
  '/article/analitika-dgt-progress',
  '/article/ispanskie-znaki-kotorye-pytayut',
  '/article/podgotovka-na-russkom-i-ispanskom',
  '/article/motivaciya-dgt-gamifikaciya',
  '/article/tehnologii-skilyapp',
  '/article/kak-gotovitsya-dgt-pri-plotnom-grafike',
  '/article/kak-trenirovat-vospriyatie-riska-dgt',
  '/article/mikrotreningi-dgt-na-telefone',
  '/article/kak-sdat-ekzamen-dgt-s-pervogo-raza',
  '/article/top-10-oshibok-na-ekzamene-dgt',
];

async function prerender() {
  console.log('[Prerender] 🚀 Starting prerender process...');
  
  // Проверяем, что dist директория существует
  if (!existsSync(DIST_DIR)) {
    console.error('[Prerender] ❌ dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Запускаем локальный сервер для prerender
  console.log('[Prerender] 📦 Starting local server...');
  const express = (await import('express')).default;
  const pathModule = (await import('path')).default;
  
  const app = express();
  app.use(express.static(DIST_DIR));
  
  // SPA fallback для всех роутов (используем use вместо get для catch-all)
  app.use((req, res) => {
    res.sendFile(pathModule.join(DIST_DIR, 'index.html'));
  });

  const server = app.listen(4173, () => {
    console.log('[Prerender] ✅ Server started on http://localhost:4173');
  });

  try {
    // КРИТИЧНО: На Vercel нужно установить Chrome перед запуском
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      console.log('[Prerender] 🔧 Vercel environment detected, installing Chrome...');
      try {
        const cacheDir = '/tmp/.cache/puppeteer';
        // Создаем директорию для кэша, если её нет
        if (!existsSync(cacheDir)) {
          mkdirSync(cacheDir, { recursive: true });
        }
        
        // Пробуем установить Chrome с явным указанием версии
        // Если не указать версию, может быть 404 из-за проблем с определением последней версии
        try {
          await install({
            browser: 'chrome',
            cacheDir: cacheDir,
            // Не указываем версию - используем latest, но с fallback
          });
          console.log('[Prerender] ✅ Chrome installed successfully');
        } catch (installError) {
          // Если получили 404, пробуем установить конкретную версию
          if (installError.message?.includes('404') || installError.message?.includes('status code 404')) {
            console.warn('[Prerender] ⚠️ Got 404, trying to install specific Chrome version...');
            try {
              // Пробуем установить стабильную версию Chrome
              await install({
                browser: 'chrome',
                cacheDir: cacheDir,
                buildId: '131.0.6778.85', // Стабильная версия Chrome
              });
              console.log('[Prerender] ✅ Chrome installed successfully (specific version)');
            } catch (versionError) {
              console.warn('[Prerender] ⚠️ Could not install Chrome (specific version):', versionError.message);
              throw installError; // Пробрасываем оригинальную ошибку
            }
          } else {
            throw installError;
          }
        }
      } catch (error) {
        console.warn('[Prerender] ⚠️ Could not install Chrome:', error.message);
        console.warn('[Prerender] ⚠️ Will try to use system Chrome or bundled Chrome');
        console.warn('[Prerender] ⚠️ SSG will be skipped if Chrome is not found');
      }
    }
    
    // Запускаем браузер
    console.log('[Prerender] 🌐 Launching browser...');
    
    // КРИТИЧНО: Для Vercel нужно использовать правильные аргументы и executablePath
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
      ],
    };
    
    // На Vercel пробуем найти Chrome в стандартных местах
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      console.log('[Prerender] 🔧 Vercel environment detected, searching for Chrome...');
      try {
        // Пробуем найти Chrome в стандартных местах Vercel
        const chromePaths = [
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/usr/bin/google-chrome',
          '/opt/google/chrome/chrome',
        ];
        
        for (const chromePath of chromePaths) {
          try {
            // Проверяем существование файла
            if (existsSync(chromePath)) {
              launchOptions.executablePath = chromePath;
              console.log(`[Prerender] ✅ Found Chrome at: ${chromePath}`);
              break;
            }
          } catch {
            // Продолжаем поиск
          }
        }
        
        // Если не нашли через проверку файлов, пробуем через which
        if (!launchOptions.executablePath) {
          try {
            const chromePath = execSync('which google-chrome-stable || which chromium || which chromium-browser || echo ""', { 
              encoding: 'utf-8',
              stdio: ['ignore', 'pipe', 'ignore']
            }).trim();
            if (chromePath && chromePath.length > 0) {
              launchOptions.executablePath = chromePath;
              console.log(`[Prerender] ✅ Found Chrome via which: ${chromePath}`);
            }
          } catch (error) {
            console.warn('[Prerender] ⚠️ Could not find Chrome via which:', error.message);
          }
        }
        
        // Если установили через @puppeteer/browsers, используем его
        if (!launchOptions.executablePath && (process.env.VERCEL || process.env.VERCEL_ENV)) {
          const cacheDir = '/tmp/.cache/puppeteer';
          const chromeDir = join(cacheDir, 'chrome');
          if (existsSync(chromeDir)) {
            try {
              const versions = readdirSync(chromeDir);
              for (const version of versions) {
                const chromePath = join(chromeDir, version, 'chrome-linux64', 'chrome');
                if (existsSync(chromePath)) {
                  launchOptions.executablePath = chromePath;
                  console.log(`[Prerender] ✅ Using installed Chrome at: ${chromePath}`);
                  break;
                }
              }
            } catch (error) {
              console.warn('[Prerender] ⚠️ Could not read Chrome directory:', error.message);
            }
          }
        }
        
        if (!launchOptions.executablePath) {
          console.warn('[Prerender] ⚠️ Chrome not found in standard locations, Puppeteer will try to use bundled Chrome');
        }
      } catch (error) {
        console.warn('[Prerender] ⚠️ Error searching for Chrome:', error.message);
      }
    }
    
    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    
    // Устанавливаем viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Prerender каждую страницу
    for (const route of PUBLIC_ROUTES) {
      try {
        console.log(`[Prerender] 📄 Rendering ${route}...`);
        
        const url = `${BASE_URL}${route}`;
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        // КРИТИЧНО: Ждём полного рендера React
        // Вариант 1: Ждём события render-event (отправляется из main.tsx)
        try {
          await page.waitForFunction(
            () => {
              const root = window.document.querySelector('#root');
              return root && root.children.length > 0 && root.textContent && root.textContent.trim().length > 0;
            },
            { timeout: 15000 }
          );
          console.log('[Prerender] ✅ React content detected in #root');
        } catch (error) {
          console.warn('[Prerender] ⚠️ Timeout waiting for React content, trying alternative check...');
          // Альтернативная проверка: ждём хотя бы появления любого контента
          await page.waitForFunction(
            () => {
              const root = window.document.querySelector('#root');
              return root && (root.children.length > 0 || root.innerHTML.trim().length > 0);
            },
            { timeout: 10000 }
          );
        }

        // КРИТИЧНО: Исправляем ошибку next-themes "Can't find variable: a"
        // Обёртываем inline скрипт в try-catch, чтобы он не падал при выполнении
        await page.evaluate(() => {
          const scripts = document.querySelectorAll('script[nonce=""]');
          scripts.forEach(script => {
            const originalContent = script.innerHTML;
            // Проверяем, является ли это скриптом next-themes (содержит вызовы a())
            if (originalContent.includes('a(d') || originalContent.includes('a(f') || originalContent.includes('a(h')) {
              // Обёртываем в try-catch для предотвращения ошибок
              script.innerHTML = `try{${originalContent}}catch(e){console.warn('[next-themes] Script error (expected in SSG):',e.message)}`;
            }
          });
        });

        // КРИТИЧНО: Дополнительная задержка для полной загрузки контента и всех ресурсов
        // Это гарантирует, что все изображения, стили и данные загружены
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Финальная проверка: убеждаемся, что контент действительно есть
        const hasContent = await page.evaluate(() => {
          const root = document.querySelector('#root');
          return root && root.children.length > 0 && root.textContent && root.textContent.trim().length > 50;
        });
        
        if (!hasContent) {
          console.warn(`[Prerender] ⚠️ Route ${route} might not have content in #root`);
          console.warn(`[Prerender] ⚠️ This might be a client-only route or an error occurred`);
        }

        // Получаем HTML
        const html = await page.content();

        // Определяем путь для сохранения
        let filePath;
        if (route === '/') {
          filePath = join(OUTPUT_DIR, 'index.html');
        } else if (route.startsWith('/article/')) {
          const slug = route.replace('/article/', '');
          const articleDir = join(OUTPUT_DIR, 'article');
          if (!existsSync(articleDir)) {
            mkdirSync(articleDir, { recursive: true });
          }
          filePath = join(articleDir, `${slug}.html`);
        } else {
          // Для /blog создаём blog.html
          const fileName = route.replace('/', '') || 'index';
          filePath = join(OUTPUT_DIR, `${fileName}.html`);
        }

        // Сохраняем HTML
        writeFileSync(filePath, html);
        console.log(`[Prerender] ✅ Saved ${filePath}`);
      } catch (error) {
        console.error(`[Prerender] ❌ Error rendering ${route}:`, error.message);
      }
    }

    await browser.close();
    console.log('[Prerender] ✅ Prerender complete!');
  } catch (error) {
    // КРИТИЧНО: На Vercel если Chrome не найден, не падаем полностью
    // Это позволит деплою пройти, но SSG не будет работать (нужно будет исправить позже)
    if ((process.env.VERCEL || process.env.VERCEL_ENV) && 
        (error.message?.includes('Could not find Chrome') || 
         error.message?.includes('ChromeLauncher') ||
         error.message?.includes('404'))) {
      console.error('[Prerender] ❌ Chrome not found on Vercel. SSG will not work.');
      console.error('[Prerender] ⚠️ This is a known issue. Consider:');
      console.error('[Prerender]   1. Installing Chrome via @puppeteer/browsers');
      console.error('[Prerender]   2. Using alternative SSG approach');
      console.error('[Prerender]   3. Running prerender locally before deploy');
      // НЕ падаем - позволяем деплою пройти без SSG
      console.warn('[Prerender] ⚠️ Continuing without prerender...');
    } else {
      console.error('[Prerender] ❌ Fatal error:', error);
      // На локальной машине падаем, чтобы знать о проблеме
      if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
        process.exit(1);
      }
      // На Vercel тоже падаем, но с более понятным сообщением
      console.error('[Prerender] ❌ Build will fail. Please fix Chrome installation.');
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

prerender().catch(console.error);

