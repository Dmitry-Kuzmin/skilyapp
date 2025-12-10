import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
// SSG: Prerender будет выполняться через отдельный скрипт (scripts/prerender.js)
// Это более надёжно чем vite-plugin-prerender для сложных проектов

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const shouldAnalyze = Boolean(process.env.ANALYZE);

  const plugins = [
    react(),
    mode === "development" && componentTagger(),
    // PWA Plugin для Offline-First архитектуры (критично для Telegram Mini App)
    VitePWA({
      // КРИТИЧНО: Используем 'prompt' вместо 'autoUpdate' для предотвращения спонтанных перезагрузок
      // 'autoUpdate' вызывает автоматическую перезагрузку при каждом деплое, что раздражает пользователей
      registerType: 'prompt', // ✅ СПРАШИВАТЬ, а не перезагружать автоматически
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
    // Отключаем автоматический modulepreload от Vite, чтобы не тянуть vendor на лендинге
    modulePreload: false,
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
          // КРИТИЧНО: Безопасное разделение - только изолированные библиотеки
          // НЕ трогаем Supabase/Query/Radix - они разделятся автоматически через lazy imports
          // Принудительное разделение вызывало ошибку "c is not a function" из-за race condition
          
          // ✅ Tiptap безопасен для выноса (используется только в админке, изолирован)
          if (id.includes('node_modules/@tiptap') || 
              id.includes('node_modules/prosemirror')) {
            return 'tiptap-vendor';
          }
          
          // ✅ XLSX безопасен (используется только при импорте, есть lazy loader)
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx-vendor';
          }
          
          // ✅ Recharts безопасен (используется только в админке)
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          
          // ✅ Иконки безопасны (можно загрузить параллельно)
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          
          // ✅ Framer Motion безопасен (используется не везде)
          if (id.includes('node_modules/framer-motion')) {
            return 'ui-vendor';
          }
          
          // ✅ Остальные библиотеки (date-fns, zustand, router, sonner, idb-keyval)
          // Можно выделить для параллельной загрузки, но не критично
          if (id.includes('node_modules/date-fns')) {
            return 'date-vendor';
          }
          
          if (id.includes('node_modules/zustand')) {
            return 'state-vendor';
          }
          
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
          
          if (id.includes('node_modules/sonner')) {
            return 'toast-vendor';
          }
          
          if (id.includes('node_modules/idb-keyval')) {
            return 'storage-vendor';
          }
          
          // ВАЖНО: Supabase, TanStack Query, Radix UI остаются в vendor
          // Vite автоматически создаст отдельные chunks для lazy-loaded модулей
          // Это безопаснее, чем принудительное разделение через manualChunks
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
      '@fingerprintjs/fingerprintjs', // Добавляем FingerprintJS для правильной обработки
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
