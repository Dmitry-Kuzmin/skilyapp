/**
 * SSG Prerender Script
 * Генерирует статические HTML файлы для публичных страниц (SEO)
 * 
 * Использование: node scripts/prerender.js
 * Запускается автоматически после npm run build
 */

import puppeteer from 'puppeteer';
import { install } from '@puppeteer/browsers';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

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

        // Ждём события render-event (отправляется из main.tsx)
        await page.waitForFunction(
          () => window.document.querySelector('#root')?.children.length > 0,
          { timeout: 10000 }
        );

        // Дополнительная задержка для полной загрузки контента
        await new Promise(resolve => setTimeout(resolve, 2000));

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
    console.error('[Prerender] ❌ Fatal error:', error);
    process.exit(1);
  } finally {
    server.close();
  }
}

prerender().catch(console.error);

