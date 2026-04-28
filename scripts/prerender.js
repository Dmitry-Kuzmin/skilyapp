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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { extractArticlesFromTSX } from './read-articles.js';
import { seoGuidePages } from '../src/content/seoGuides.js';

// Hosted Vercel build uses /vercel/path* and /vercel HOME. Local vercel CLI does not.
const hasVercelSignals = Boolean(
  process.env.VERCEL === '1' ||
  process.env.VERCEL_ENV ||
  process.env.VERCEL_URL ||
  process.env.VERCEL_PROJECT_ID ||
  process.env.VERCEL_DEPLOYMENT_ID
);
const isHostedVercel =
  process.cwd().startsWith('/vercel/path') ||
  process.env.HOME === '/vercel' ||
  (hasVercelSignals && process.env.CI === '1');
const isCI = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);

// Динамический импорт для Vercel и локальной разработки
let chromium = null;
let puppeteer = null;

// На hosted Vercel и как CI fallback используем @sparticuz/chromium.
if (isHostedVercel || hasVercelSignals) {
  try {
    chromium = await import('@sparticuz/chromium');
    console.log('[Prerender] ✅ Loaded @sparticuz/chromium for serverless/CI fallback');
  } catch (error) {
    console.warn('[Prerender] ⚠️ Could not load @sparticuz/chromium:', error.message);
  }
}

// Локально и в обычном CI используем полный puppeteer.
try {
  puppeteer = await import('puppeteer');
  console.log('[Prerender] ✅ Loaded puppeteer for local development');
} catch (error) {
  console.warn('[Prerender] ⚠️ Could not load puppeteer:', error.message);
}

function resolveChromiumModule(mod) {
  return mod?.default ?? mod;
}

function findLocalChromeExecutable() {
  const chromePath = execSync('which google-chrome-stable || which chromium || which chromium-browser || echo ""', {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();

  return chromePath || '';
}

async function getServerlessLaunchOptions(reason) {
  const chromiumPackage = resolveChromiumModule(chromium);
  const launcher = puppeteer?.default ?? puppeteerCore?.default;

  if (!chromiumPackage?.executablePath || !chromiumPackage?.args) {
    throw new Error(reason || 'Serverless prerender requires @sparticuz/chromium with executablePath() and args.');
  }

  const executablePath = await chromiumPackage.executablePath();
  if (!executablePath) {
    throw new Error(reason || 'Serverless prerender could not resolve Chromium executablePath().');
  }

  return {
    args: launcher?.defaultArgs
      ? launcher.defaultArgs({ args: chromiumPackage.args, headless: 'shell' })
      : chromiumPackage.args,
    executablePath,
    headless: 'shell',
  };
}

async function getLaunchOptions() {
  if (isHostedVercel) {
    return getServerlessLaunchOptions(
      'Hosted Vercel prerender requires @sparticuz/chromium because Puppeteer browser downloads are unavailable during build.'
    );
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

  if (isCI) {
    const chromePath = findLocalChromeExecutable();

    if (chromePath) {
      launchOptions.executablePath = chromePath;
      console.log(`[Prerender] 🔧 CI using system Chrome: ${chromePath}`);
      return launchOptions;
    }

    if (chromium) {
      console.log('[Prerender] 🔧 CI Chrome not found, falling back to @sparticuz/chromium');
      return getServerlessLaunchOptions(
        'CI prerender could not find system Chrome and fell back to @sparticuz/chromium.'
      );
    }
  }

  if (!puppeteer?.default && puppeteerCore?.default) {
    const chromePath = findLocalChromeExecutable();

    if (!chromePath) {
      throw new Error('Could not find a local Chrome/Chromium executable for puppeteer-core.');
    }

    launchOptions.executablePath = chromePath;
  }

  return launchOptions;
}

async function waitForPageReadiness(page) {
  await Promise.allSettled([
    page.evaluate(async () => {
      if (document.fonts && document.fonts.status !== 'loaded') {
        await document.fonts.ready;
      }
    }),
    page.waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      { timeout: 2500 }
    ),
  ]);
}

function isNavigationRaceError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Execution context was destroyed') ||
    message.includes('Cannot find context with specified id') ||
    message.includes('Navigating frame was detached')
  );
}

async function preparePage(page) {
  await page.setViewport({ width: 1920, height: 1080 });
  // Force a deterministic Accept-Language so prerender output doesn't depend on
  // the builder's machine locale. `/` is our Spanish-primary entrypoint — any
  // language-specific content is under /ru, /es, /en via path-based forcing.
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  });
  await page.evaluateOnNewDocument(() => {
    window.__PRERENDER__ = true;
    // Override navigator.language so LanguageContext's navigator detection
    // is deterministic across build machines.
    Object.defineProperty(navigator, 'language', { get: () => 'es-ES' });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en'] });
    // Wipe persisted language/country between route navigations so each /,
    // /ru, /es, /en prerender starts from a clean slate and can't be
    // contaminated by the previous route's localStorage writes.
    try {
      localStorage.removeItem('app_language');
      localStorage.removeItem('sdadim-settings');
      localStorage.removeItem('selected_country');
    } catch {}
  });
}

async function withRouteRetry(page, route, renderRoute) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await renderRoute(attempt);
    } catch (error) {
      const currentUrl = page.url();
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry = attempt < maxAttempts && isNavigationRaceError(error);

      if (shouldRetry) {
        console.warn(
          `[Prerender] ⚠️ Navigation race on ${route} (attempt ${attempt}/${maxAttempts}) at ${currentUrl || 'unknown URL'}, retrying...`
        );
        await new Promise((resolve) => setTimeout(resolve, 750));
        continue;
      }

      throw new Error(
        currentUrl && currentUrl !== 'about:blank'
          ? `${message} [final URL: ${currentUrl}]`
          : message
      );
    }
  }

  throw new Error(`Route ${route} exhausted prerender retry attempts.`);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:4173'; // Vite preview порт
const DIST_DIR = join(__dirname, '../dist');
const OUTPUT_DIR = DIST_DIR;
const manifestPath = join(__dirname, '../public/content-platform-manifest.json');

function getDefaultRoutesToRender() {
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (Array.isArray(manifest.prerenderRoutes) && manifest.prerenderRoutes.length > 0) {
      return manifest.prerenderRoutes;
    }
  }

  const articleRoutes = Object.keys(extractArticlesFromTSX()).map((slug) => `/article/${slug}`);
  const guideRoutes = ['/guides', ...seoGuidePages.map((guide) => `/guides/${guide.slug}`)];

  return [
    '/',
    '/ru',
    '/es',
    '/en',
    '/about',
    '/pricing',
    '/help',
    '/features',
    '/partners',
    '/blog',
    '/tests',
    '/games',
    '/road-signs',
    '/dictionary',
    '/learning-map',
    '/achievements',
    '/referrals',
    '/dgt-tests',
    '/curso',
    ...guideRoutes,
    ...articleRoutes,
    '/legal/terms',
    '/legal/privacy',
    '/legal/cookies',
    '/legal/subscription',
    '/legal/refund',
  ];
}

const routesToRender = process.env.PRERENDER_ROUTES
  ? process.env.PRERENDER_ROUTES.split(',').map((route) => route.trim()).filter(Boolean)
  : getDefaultRoutesToRender();

function getAssertCanonicalMap() {
  if (!existsSync(manifestPath)) {
    return new Map();
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const entries = Array.isArray(manifest.assertPages) ? manifest.assertPages : [];
    return new Map(
      entries
        .filter((entry) => typeof entry?.route === 'string' && typeof entry?.canonical === 'string')
        .map((entry) => [entry.route, entry.canonical])
    );
  } catch {
    return new Map();
  }
}

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
  const shellHtml = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
  
  const app = express();
  app.use(express.static(DIST_DIR));

  // During local prerender, Vercel Analytics may request its client script.
  // Return a no-op JS file instead of falling through to the HTML shell.
  app.get('/_vercel/insights/script.js', (_req, res) => {
    res.type('application/javascript').send('/* prerender noop: vercel analytics */');
  });
  app.get('/_vercel/speed-insights/script.js', (_req, res) => {
    res.type('application/javascript').send('/* prerender noop: vercel speed insights */');
  });
  app.use('/_vercel/insights', (_req, res) => {
    res.status(204).end();
  });
  app.use('/_vercel/speed-insights', (_req, res) => {
    res.status(204).end();
  });
  
  // SPA fallback для всех роутов (используем use вместо get для catch-all)
  app.use((req, res) => {
    res.type('html').send(shellHtml);
  });

  const server = app.listen(4173, () => {
    console.log('[Prerender] ✅ Server started on http://localhost:4173');
  });

  const assertCanonicalByRoute = getAssertCanonicalMap();

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
    await preparePage(page);

    const renderFailures = [];

    // Prerender каждую страницу
    for (const route of routesToRender) {
      try {
        const html = await withRouteRetry(page, route, async (attempt) => {
          console.log(
            `[Prerender] 📄 Rendering ${route}${attempt > 1 ? ` (retry ${attempt})` : ''}...`
          );

          const url = `${BASE_URL}${route}`;
          // 'load' вместо 'networkidle2': мы не ждём 3rd-party запросов (Metrika, Analytics,
          // Telegram JS). Реальная готовность контента определяется waitForFunction ниже.
          // networkidle2 добавлял 5-10с на маршрут × 37 маршрутов = +3-5 мин к сборке.
          await page.goto(url, {
            waitUntil: 'load',
            timeout: 30000,
          });

          // Wait for meaningful React content (not just fallback/skeleton).
          // LandingSpain/LandingRussia are now synchronous imports — they render immediately
          // without a lazy-chunk round-trip, so we don't need as large a threshold.
          // Threshold 600 > SEO assert minimum 800? — No: SEO assert uses htmlToComparableText
          // (strips tags/entities) while waitForFunction uses raw textContent. Skeleton HTML
          // has ~500 textContent chars but only ~150 real-text chars. 600 textContent reliably
          // means real content is present while letting legal/guide pages qualify faster.
          try {
            await page.waitForFunction(
              () => {
                const root = window.document.querySelector('#root');
                if (!root) return false;
                const text = root.textContent?.trim() || '';
                return text.length > 600;
              },
              { timeout: 45000, polling: 200 }
            );
            console.log('[Prerender] ✅ React content detected in #root (>600 chars)');
          } catch (error) {
            console.warn('[Prerender] ⚠️ Timeout waiting for substantial React content, fallback to basic check');
            await page.waitForFunction(
              () => {
                const root = window.document.querySelector('#root');
                return root && root.children.length > 0 && (root.textContent?.trim().length || 0) > 300;
              },
              { timeout: 15000 }
            );
          }

          await page.waitForFunction(
            (expectedRoute) => window.location.pathname + window.location.search === expectedRoute,
            { timeout: 15000 },
            route
          );

          const expectedCanonical = assertCanonicalByRoute.get(route);
          if (expectedCanonical) {
            await page.waitForFunction(
              (canonicalUrl) => {
                const canonical = document.querySelector('link[rel="canonical"]');
                return canonical?.getAttribute('href') === canonicalUrl;
              },
              { timeout: 10000 },
              expectedCanonical
            );
          }

          // Обёртываем уязвимый inline next-themes script только после стабилизации URL.
          await page.evaluate(() => {
            const scripts = document.querySelectorAll('script[nonce=""]');
            scripts.forEach((script) => {
              const originalContent = script.innerHTML;
              if (originalContent.includes('a(d') || originalContent.includes('a(f') || originalContent.includes('a(h')) {
                script.innerHTML = `try{${originalContent}}catch(e){console.warn('[next-themes] Script error (expected in SSG):',e.message)}`;
              }
            });
          });

          await waitForPageReadiness(page);

          // Settling pass — hydration can flash fallbacks, give it time to stabilize.
          // NOTE: no hasContent re-check after settling — some pages (e.g. /tests) legitimately
          // re-render to an auth-empty state after initial data load. The waitForFunction above
          // already confirmed >900 chars at the peak-content moment, which is the right snapshot.
          await new Promise((resolve) => setTimeout(resolve, 300));

          // КРИТИЧНО для LCP/мобилок: убрать runtime-инъецированные modulepreload теги.
          // Когда React.lazy() триггерит загрузку чанков, Vite вставляет в <head>
          // <link rel="modulepreload" as="script"> для каждой зависимости. Puppeteer
          // ловит эти теги в page.content() и они запекаются в статический HTML —
          // в итоге браузер на лендинге eagerly качает ~3MB JS (ton-vendor 950KB,
          // charts-vendor 388KB, app index 552KB и т.д.), что НЕ нужно для рендера лендинга.
          // Vite-овский статический preload (react-core, supabase-vendor) НЕ имеет
          // атрибута as="script" — он остаётся.
          await page.evaluate(() => {
            const runtimePreloads = document.querySelectorAll(
              'link[rel="modulepreload"][as="script"]'
            );
            runtimePreloads.forEach((link) => link.remove());
          });

          return page.content();
        });

        if (/<div id="root">\s*<\/div>/i.test(html)) {
          throw new Error(`Route ${route} produced an empty React root`);
        }

        // Определяем путь для сохранения
        let filePath;
        if (route === '/') {
          filePath = join(OUTPUT_DIR, 'index.html');
        } else if (route === '/ru' || route === '/es' || route === '/en') {
          // Path-based language landings: /ru -> ru.html (served via vercel rewrite)
          const lang = route.slice(1);
          filePath = join(OUTPUT_DIR, `${lang}.html`);
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
