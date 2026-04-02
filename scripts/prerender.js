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
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { extractArticlesFromTSX } from './read-articles.js';
import { seoGuidePages } from '../src/content/seoGuides.js';

// Реальный Vercel build/runtime отличается от локального vercel CLI.
const isRealVercel = process.env.VERCEL === '1' && !process.env.HOME;
const isCI = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);

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

function resolveChromiumModule(mod) {
  return mod?.default ?? mod;
}

async function getLaunchOptions() {
  if (isRealVercel) {
    const chromiumPackage = resolveChromiumModule(chromium);
    if (!chromiumPackage?.executablePath || !chromiumPackage?.args) {
      throw new Error('Vercel prerender requires @sparticuz/chromium with executablePath() and args.');
    }

    return {
      args: chromiumPackage.args,
      executablePath: await chromiumPackage.executablePath(),
      headless: 'shell',
    };
  }

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

  if (!puppeteer?.default && puppeteerCore?.default) {
    const chromePath = execSync('which google-chrome-stable || which chromium || which chromium-browser || echo ""', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!chromePath) {
      throw new Error('Could not find a local Chrome/Chromium executable for puppeteer-core.');
    }

    launchOptions.executablePath = chromePath;
  }

  if (isCI) {
    console.log('[Prerender] 🔧 CI environment detected, launch options prepared');
  }

  return launchOptions;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:4173'; // Vite preview порт
const DIST_DIR = join(__dirname, '../dist');
const OUTPUT_DIR = DIST_DIR;

const articleRoutes = Object.keys(extractArticlesFromTSX()).map((slug) => `/article/${slug}`);
const guideRoutes = ['/guides', ...seoGuidePages.map((guide) => `/guides/${guide.slug}`)];

// Список публичных страниц для prerender
const PUBLIC_ROUTES = [
  '/',
  // Language-specific landing pages for SEO (Spanish, English, Russian)
  '/?lang=es',
  '/?lang=en',
  '/?lang=ru',
  // Основные публичные страницы
  '/about',
  '/pricing',
  '/help',
  '/features',
  '/partners',
  '/blog',
  // Контентные страницы (открыты без логина — ценный контент для Google)
  '/tests',
  '/games',
  '/road-signs',
  '/dictionary',
  '/learning-map',
  '/achievements',
  '/referrals',
  '/dgt-tests',
  // Лендинг курса (Google Ads)
  '/curso',
  ...guideRoutes,
  ...articleRoutes,
  // Legal pages
  '/legal/terms',
  '/legal/privacy',
  '/legal/cookies',
  '/legal/subscription',
  '/legal/refund',
];

const routesToRender = process.env.PRERENDER_ROUTES
  ? process.env.PRERENDER_ROUTES.split(',').map((route) => route.trim()).filter(Boolean)
  : PUBLIC_ROUTES;

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

  let browser;
  try {
    console.log('[Prerender] 🌐 Launching browser...');
    const launchOptions = await getLaunchOptions();

    if (puppeteer && puppeteer.default) {
      // Используем полный puppeteer (локально или GitHub Actions)
      browser = await puppeteer.default.launch(launchOptions);
    } else if (puppeteerCore && puppeteerCore.default) {
      // Используем puppeteer-core (если puppeteer не загрузился)
      browser = await puppeteerCore.default.launch(launchOptions);
    } else {
      throw new Error('Neither puppeteer nor puppeteer-core is available');
    }

    const page = await browser.newPage();
    
    // Устанавливаем viewport
    await page.setViewport({ width: 1920, height: 1080 });

    const renderFailures = [];

    // Prerender каждую страницу
    for (const route of routesToRender) {
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
          throw new Error(`Route ${route} rendered without meaningful content in #root`);
        }

        // Получаем HTML
        const html = await page.content();

        if (/<div id="root">\s*<\/div>/i.test(html)) {
          throw new Error(`Route ${route} produced an empty React root`);
        }

        // Определяем путь для сохранения
        let filePath;
        if (route === '/') {
          filePath = join(OUTPUT_DIR, 'index.html');
        } else if (route.startsWith('/?lang=')) {
          // Language-specific landing pages: /?lang=es -> lang/es.html
          const lang = route.replace('/?lang=', '');
          const langDir = join(OUTPUT_DIR, 'lang');
          if (!existsSync(langDir)) {
            mkdirSync(langDir, { recursive: true });
          }
          filePath = join(langDir, `${lang}.html`);
        } else if (route.startsWith('/article/')) {
          const slug = route.replace('/article/', '');
          const articleDir = join(OUTPUT_DIR, 'article');
          if (!existsSync(articleDir)) {
            mkdirSync(articleDir, { recursive: true });
          }
          filePath = join(articleDir, `${slug}.html`);
        } else if (route.startsWith('/blog/')) {
          const slug = route.replace('/blog/', '');
          const blogDir = join(OUTPUT_DIR, 'blog');
          if (!existsSync(blogDir)) {
            mkdirSync(blogDir, { recursive: true });
          }
          filePath = join(blogDir, `${slug}.html`);
        } else if (route.startsWith('/legal/')) {
          const tab = route.replace('/legal/', '');
          const legalDir = join(OUTPUT_DIR, 'legal');
          if (!existsSync(legalDir)) {
            mkdirSync(legalDir, { recursive: true });
          }
          filePath = join(legalDir, `${tab}.html`);
        } else if (route.startsWith('/guides/')) {
          const slug = route.replace('/guides/', '');
          const guidesDir = join(OUTPUT_DIR, 'guides');
          if (!existsSync(guidesDir)) {
            mkdirSync(guidesDir, { recursive: true });
          }
          filePath = join(guidesDir, `${slug}.html`);
        } else {
          // Для /blog создаём blog.html
          const fileName = route.replace('/', '') || 'index';
          filePath = join(OUTPUT_DIR, `${fileName}.html`);
        }

        // Сохраняем HTML
        writeFileSync(filePath, html);
        console.log(`[Prerender] ✅ Saved ${filePath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        renderFailures.push(`${route}: ${message}`);
        console.error(`[Prerender] ❌ Error rendering ${route}:`, message);
      }
    }

    if (renderFailures.length > 0) {
      throw new Error(`Failed to prerender ${renderFailures.length} route(s): ${renderFailures.join(' | ')}`);
    }

    await browser.close();
    browser = null;
    console.log('[Prerender] ✅ Prerender complete!');
  } catch (error) {
    console.error('[Prerender] ❌ Fatal error:', error);
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore close errors after fatal prerender failure
      }
    }
    process.exit(1);
  } finally {
    server.close();
  }
}

prerender().catch((error) => {
  console.error('[Prerender] ❌ Unhandled fatal error:', error);
  process.exit(1);
});
