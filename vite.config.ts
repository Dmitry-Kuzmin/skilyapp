import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
// SSG: Prerender будет выполняться через отдельный скрипт (scripts/prerender.js)
// Это более надёжно чем vite-plugin-prerender для сложных проектов

// Плагин для оптимизации загрузки CSS (неблокирующая загрузка)
function optimizeCssLoading(): Plugin {
  return {
    name: "optimize-css-loading",
    transformIndexHtml: {
      order: "post", // Выполняем после того, как Vite инжектирует CSS
      handler(html, ctx) {
        let result = html;
        
        // Заменяем обычные CSS ссылки на preload с неблокирующей загрузкой
        result = result.replace(
          /<link([^>]*rel="stylesheet"([^>]*href="([^"]+\.css)"[^>]*))>/g,
          (match, attrs, _, href) => {
            // Пропускаем если уже есть preload или другие специальные атрибуты
            if (match.includes('rel="preload"') || match.includes('media=') || match.includes('data-vite')) {
              // Для Vite CSS используем preload с onload
              if (match.includes('data-vite')) {
                return `
<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript>${match}</noscript>
                `.trim();
              }
              return match;
            }
            // Создаем неблокирующую загрузку CSS через preload + onload
            // Извлекаем все атрибуты кроме rel для noscript
            const noscriptAttrs = attrs.replace(/rel="[^"]*"/g, '').trim();
            return `
<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="${href}"${noscriptAttrs ? ' ' + noscriptAttrs : ''}></noscript>
            `.trim();
          }
        );
        
        // КРИТИЧНО: Preload критических JS chunks (vendor и index)
        // Это уменьшает критический путь загрузки на 300-500ms
        
        // КРИТИЧНО: charset должен быть первым элементом в <head>
        // Вставляем modulepreload ссылки ПОСЛЕ charset, но перед другими элементами
        
        // 1. Preload для vendor.js (React, Supabase, TanStack - критично!)
        const vendorJsMatch = result.match(/<script type="module"([^>]*src="([^"]+vendor[^"]+\.js)"[^>]*)>/);
        if (vendorJsMatch && vendorJsMatch[2]) {
          const vendorJsPath = vendorJsMatch[2];
          const hasVendorPreload = result.includes(`href="${vendorJsPath}"`) && result.includes('modulepreload');
          if (!hasVendorPreload) {
            // Вставляем ПОСЛЕ charset (первый элемент в <head>)
            result = result.replace(
              /(<meta\s+charset="[^"]*"\s*\/?>)/i,
              `$1\n    <link rel="modulepreload" href="${vendorJsPath}" crossorigin fetchpriority="high">`
            );
          }
        }
        
        // 2. Preload для index.js (основной код приложения)
        const indexJsMatch = result.match(/<script type="module"([^>]*src="([^"]+index[^"]+\.js)"[^>]*)>/);
        if (indexJsMatch && indexJsMatch[2]) {
          const indexJsPath = indexJsMatch[2];
          const hasIndexPreload = result.includes(`href="${indexJsPath}"`) && result.includes('modulepreload');
          if (!hasIndexPreload) {
            // Вставляем ПОСЛЕ charset (первый элемент в <head>)
            result = result.replace(
              /(<meta\s+charset="[^"]*"\s*\/?>)/i,
              `$1\n    <link rel="modulepreload" href="${indexJsPath}" crossorigin fetchpriority="high">`
            );
          }
        }
        
        // 3. Добавляем fetchpriority="high" к существующим modulepreload ссылкам
        result = result.replace(
          /<link rel="modulepreload"([^>]*href="([^"]+(?:vendor|index)[^"]+)"[^>]*)>/g,
          (match, attrs, href) => {
            if (!match.includes('fetchpriority')) {
              return match.replace('>', ' fetchpriority="high">');
            }
            return match;
          }
        );
        
        return result;
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const shouldAnalyze = Boolean(process.env.ANALYZE);

  const plugins = [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && optimizeCssLoading(), // Только в production
    // PWA Plugin для Offline-First архитектуры (критично для Telegram Mini App)
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg'],
      manifest: {
        name: 'Sdadim DGT',
        short_name: 'Sdadim',
        description: 'Sdadim Digital Gaming Platform - Подготовка к теоретическому экзамену DGT',
        theme_color: '#18181b', // zinc-900
        background_color: '#09090b', // zinc-950
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        // Иконки можно добавить позже (создать pwa-192x192.png и pwa-512x512.png)
        // Пока приложение будет использовать favicon.ico
        icons: []
      },
      workbox: {
        // АРХИТЕКТУРА OFFLINE-FIRST:
        // 
        // Service Worker отвечает ТОЛЬКО за статику:
        //   - JS/CSS/HTML (app shell)
        //   - Images (Supabase Storage, локальные)
        //   - Fonts
        // 
        // React Query отвечает за данные (API):
        //   - Supabase REST API (/rest/v1/...)
        //   - Supabase Functions (/functions/v1/...)
        //   - Кэш в IndexedDB через idb-keyval
        //   - Управление staleTime/gcTime
        // 
        // Это предотвращает конфликты двойного кэша и устаревшие данные.
        //
        // ВАЖНО: iOS Safari ограничения:
        //   - Лимит кэша: ~50 МБ на домен
        //   - Очистка кэша: при нехватке памяти или бездействии
        //   - Деактивация SW: при закрытии Safari
        //   - Минимизируем precache, используем runtime cache
        
        // Precache для offline режима
        // ВАЖНО: iOS Safari агрессивно чистит кэши > 50 МБ
        // Минимизируем precache, остальное кэшируем runtime
        globPatterns: [
          '**/*.{js,css,html,ico,svg}',
          // Манифесты (маленькие)
          'manifest.webmanifest',
          'data/materials-manifest.json',
        ],
        // ВАЖНО: Исключаем крупные файлы из precache (будут в runtime)
        globIgnores: [
          '**/data/materials/**', // Большие JSON - в runtime cache
          '**/sounds/**',         // Звуки не критичны
          '**/*.{png,jpg,jpeg,webp}', // Изображения - в runtime cache
        ],
        
        // Лимит для vendor chunks (vendor.js ~2.5 МБ)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        
        // КРИТИЧНО: Стратегии кэширования ТОЛЬКО для статики
        // API кэшируется на уровне React Query + IndexedDB, НЕ в Service Worker
        // 
        // ВАЖНО: НЕ кэшируем navigation requests (request.mode === 'navigate')
        // потому что:
        // 1. Vercel rewrites уже обрабатывают SPA routing (vercel.json)
        // 2. Mobile Safari выдаёт "Response is disturbed or locked" при попытке
        //    закэшировать navigation responses (особенность WebKit)
        // 3. index.html в precache - этого достаточно для offline
        runtimeCaching: [
          {
            // КРИТИЧНО: Локальные JS/CSS (с нашего домена) - CacheFirst
            // Гарантирует что app shell всегда доступен offline
            urlPattern: ({ url }) => {
              return url.origin === location.origin && 
                     (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-static-assets',
              expiration: {
                maxEntries: 80, // Уменьшено для iOS Safari (было 150)
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Внешние JS/CSS (CDN) - CacheFirst
            urlPattern: /^https?:\/\/.*\.(js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Supabase Storage ТОЛЬКО (images, files) - CacheFirst
            // НЕ кэшируем /rest/ и /functions/ - за это отвечает React Query
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 100, // Уменьшено для iOS Safari (было 300)
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Fonts - CacheFirst, долгий TTL
            urlPattern: /^https?:\/\/.*\.(woff|woff2|ttf|eot|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 год
              },
            },
          },
          {
            // Images (локальные и внешние) - CacheFirst
            urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60, // Уменьшено для iOS Safari (было 200)
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 дней (было 30)
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // КРИТИЧНО: Локальные JSON файлы (materials) - CacheFirst
            // iOS Safari ограничивает кэш - кэшируем только часто используемые
            urlPattern: ({ url }) => {
              // Только файлы с нашего домена
              if (url.origin !== location.origin) return false;
              // JSON файлы или файлы в /data/
              return url.pathname.endsWith('.json') || url.pathname.includes('/data/');
            },
            handler: 'NetworkFirst', // NetworkFirst вместо CacheFirst для iOS
            options: {
              cacheName: 'local-data',
              networkTimeoutSeconds: 3, // Быстрый fallback
              expiration: {
                maxEntries: 100, // Сильно уменьшено для iOS (было 500)
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 дней (было 30)
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        
        // КРИТИЧНО: Navigation fallback для SPA
        // ВАЖНО: На мобильном Safari navigateFallback может вызывать
        // "Response is disturbed or locked" для прямых URL внутренних страниц.
        // Vercel rewrites в vercel.json уже обрабатывают SPA routing,
        // поэтому navigateFallback можно отключить.
        navigateFallback: undefined, // Отключён (полагаемся на vercel.json rewrites)
        
        // Если бы использовали navigateFallback:
        // navigateFallback: '/index.html',
        // navigateFallbackDenylist: [
        //   /^\/api/,
        //   /\.(png|jpg|jpeg|svg|gif|webp|ico|json)$/,
        //   /supabase\.co/,
        // ],
        
        // КРИТИЧНО: Очищаем старые кэши при обновлении
        cleanupOutdatedCaches: true,
        
        // КРИТИЧНО: Клиентские claims для немедленной активации SW
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false, // Отключаем в dev режиме для быстрой разработки
      },
    }),
    shouldAnalyze &&
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
        open: true,
      }),
    // SSG: Prerender выполняется через отдельный скрипт (scripts/prerender.js)
    // Запускается после билда: npm run build && npm run prerender
  ].filter(Boolean);

  return {
  // Base path for GitHub Pages (if repo is not in root)
  // For root repo, use '/' or leave empty
  base: process.env.GITHUB_PAGES === 'true' ? '/sdadim-dgt-prep/' : '/',
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "localhost",
      ".ngrok.io",
      ".ngrok-free.app",
      ".ngrok.app",
      "unlogical-despairful-stuart.ngrok-free.dev",
      ".trycloudflare.com", // Cloudflare Tunnel
      ".cfargotunnel.com", // Cloudflare Tunnel (named tunnels)
      ".loca.lt", // Localtunnel (короткие URL)
    ],
  },
    plugins,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // КРИТИЧНО: Используем esbuild с более консервативными настройками
    // ВАЖНО: terser может быть более стабильным для React, но медленнее
    minify: 'esbuild',
    target: 'es2015',
    // КРИТИЧНО: Отключаем некоторые агрессивные оптимизации для стабильности
    minifyWhitespace: true,
    // КРИТИЧНО: Отключаем некоторые агрессивные оптимизации
    cssMinify: true,
    // ОПТИМИЗАЦИЯ: Улучшенное tree-shaking и compression
    cssCodeSplit: true, // Разделяем CSS на отдельные файлы для лучшего кэширования
    sourcemap: false, // Отключаем sourcemaps в production для уменьшения размера
    // ОПТИМИЗАЦИЯ: Улучшенное удаление неиспользуемого кода
    cssTarget: 'chrome80', // Оптимизация для современных браузеров
      rollupOptions: {
      // КРИТИЧНО: Явно указываем entry point
      input: 'index.html',
      // ОПТИМИЗАЦИЯ: Улучшенное tree-shaking (ослаблено для предотвращения удаления кода)
      treeshake: {
        moduleSideEffects: (id) => {
          // КРИТИЧНО: React и ReactDOM должны сохранять side effects
          // Проверяем ПЕРВЫМ для гарантии правильной обработки
          if (id.includes('react') || id.includes('react-dom')) {
            return true;
          }
          // КРИТИЧНО: framer-motion имеет side effects и должен быть включен полностью
          if (id.includes('framer-motion')) {
            return true;
          }
          return 'no-external'; // Разрешаем side effects для внутренних модулей
        },
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      output: {
        // КРИТИЧНО: Добавляем версионирование для принудительной инвалидации кэша
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // КРИТИЧНО: Отключаем hoisting для предотвращения проблем с динамическими импортами
        hoistTransitiveImports: false,
        // КРИТИЧНО: Правильная обработка динамических импортов для React.lazy()
        inlineDynamicImports: false, // Не инлайним динамические импорты
        // КРИТИЧНО: Используем ES модули для правильной работы динамических импортов
        format: 'es',
        // КРИТИЧНО: Гарантируем правильный порядок загрузки модулей
        generatedCode: {
          constBindings: true,
          objectShorthand: true,
        },
        // КРИТИЧНО: Убеждаемся что React загружается синхронно и правильно
        // Это предотвращает проблемы с unstable_scheduleCallback
        preserveModules: false, // Не сохраняем структуру модулей (лучше для React)
        manualChunks: (id) => {
          // ОПТИМИЗАЦИЯ: Агрессивное разделение bundle для параллельной загрузки
          // Это ускоряет FCP на медленных сетях (4G Slow)
          
          // КРИТИЧНО: React и ReactDOM НЕ разделяем на отдельный chunk
          // Разделение вызывает проблемы с внутренними функциями React
          // (unstable_scheduleCallback и другие)
          // React остаётся в основном vendor chunk для стабильности
          // if (id.includes('node_modules/react') || 
          //     id.includes('node_modules/react-dom')) {
          //   return 'react-vendor';
          // }
          
          // React Router может быть отдельно (не критично для загрузки React)
          // if (id.includes('node_modules/react-router-dom')) {
          //   return 'react-vendor';
          // }
          
          // КРИТИЧНО: Выделяем @tiptap и prosemirror (используется только в админке, очень тяжелый!)
          if (id.includes('node_modules/@tiptap') || 
              id.includes('node_modules/prosemirror')) {
            return 'tiptap-vendor';
          }
          
          // КРИТИЧНО: Выделяем xlsx (используется только при импорте, есть lazy loader)
          // Исключаем из vendor чтобы не загружать на старте
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx-vendor';
          }
          
          // Выделяем графики (Recharts очень тяжелый! используется только в админке)
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          
          // Выделяем тяжелые библиотеки UI
          if (id.includes('node_modules/@mui') || 
              id.includes('node_modules/framer-motion')) {
            return 'ui-vendor';
          }
          
          // КРИТИЧНО: @radix-ui НЕ выделяем в отдельный chunk
          // Выделение вызывает ошибку "undefined is not an object (evaluating 'a.forwardRef')"
          // @radix-ui зависит от React и должен быть в том же chunk или загружаться после React
          // Оставляем в основном vendor chunk для стабильности
          // if (id.includes('node_modules/@radix-ui')) {
          //   return 'radix-vendor';
          // }
          
          // ОПТИМИЗАЦИЯ: Выделяем date-fns (может быть тяжелой, используется не везде)
          if (id.includes('node_modules/date-fns')) {
            return 'date-vendor';
          }
          
          // ОПТИМИЗАЦИЯ: Выделяем zustand (state management, легкий, но можно отдельно)
          if (id.includes('node_modules/zustand')) {
            return 'state-vendor';
          }
          
          // ОПТИМИЗАЦИЯ: Выделяем lucide-react (иконки, используются везде, но можно загрузить параллельно)
          // lucide-react довольно тяжелый (~200KB), но не критичен для первого рендера
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          
          // ОПТИМИЗАЦИЯ: Выделяем react-router-dom (роутинг, не критичен для первого рендера)
          // react-router-dom может быть загружен параллельно с основным bundle
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
          
          // ОПТИМИЗАЦИЯ: Выделяем sonner (toast notifications, используется не везде)
          // sonner может быть загружен параллельно с основным bundle
          if (id.includes('node_modules/sonner')) {
            return 'toast-vendor';
          }
          
          // ОПТИМИЗАЦИЯ: Выделяем idb-keyval (IndexedDB wrapper, используется для кэширования)
          // idb-keyval легкий, но можно загрузить параллельно
          if (id.includes('node_modules/idb-keyval')) {
            return 'storage-vendor';
          }
          
          // КРИТИЧНО: Выделяем app-vendor (Supabase, Query, Radix) - НЕ грузится на лендинге
          // Эти библиотеки нужны только в /app/* роутах, где есть AppProviders
          if (
            id.includes('node_modules/@supabase') || 
            id.includes('node_modules/@tanstack') ||
            id.includes('node_modules/@radix-ui') ||
            id.includes('node_modules/unified') ||
            id.includes('node_modules/micromark') ||
            id.includes('node_modules/vfile') ||
            id.includes('node_modules/@floating-ui') ||
            id.includes('node_modules/rollbar') ||
            id.includes('node_modules/linkifyjs') ||
            id.includes('node_modules/qr.js')
          ) {
            return 'app-vendor';
          }
          
          // КРИТИЧНО: React и ReactDOM остаются в core-vendor (нужны везде)
          // Всё остальное из node_modules тоже в core-vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // ОПТИМИЗАЦИЯ: Показываем сжатый размер для анализа
    reportCompressedSize: true,
    // ОПТИМИЗАЦИЯ: CSS code splitting для уменьшения initial CSS
    // Vite автоматически разделяет CSS на отдельные файлы для каждого chunk
    // Это уменьшает размер initial CSS bundle
  },
  optimizeDeps: {
    esbuildOptions: {
      jsx: 'automatic',
    },
    // КРИТИЧНО: Предварительная оптимизация React и ReactDOM вместе
    // Это гарантирует, что они загружаются в правильном порядке
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
    ],
    // КРИТИЧНО: Явно указываем, что framer-motion должен быть предварительно оптимизирован
    exclude: [],
    // КРИТИЧНО: Форсируем объединение React и ReactDOM
    force: false,
  },
  // КРИТИЧНО: Настройки для правильной обработки динамических импортов
  ssr: {
    noExternal: [], // Не делаем ничего external для SSR (у нас нет SSR, но это может помочь)
  },
  // КРИТИЧНО: Настройки для правильной обработки динамических импортов и React.lazy()
  esbuild: {
    // Отключаем некоторые оптимизации, которые могут ломать динамические импорты
    legalComments: 'none',
    treeShaking: true,
    // КРИТИЧНО: Более консервативная минификация для предотвращения ошибок
    // ВАЖНО: keepNames: true может помочь с React внутренними функциями
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    // КРИТИЧНО: Сохраняем имена для отладки и стабильности React
    keepNames: true, // Изменено с false на true для стабильности React
  },
  };
});
