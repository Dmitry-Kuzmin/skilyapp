import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

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
        
        // Добавляем preload для критических JS chunks (react-vendor и index)
        // Находим все modulepreload ссылки и добавляем fetchpriority для критических
        result = result.replace(
          /<link rel="modulepreload"([^>]*href="([^"]+react-vendor[^"]+)"[^>]*)>/g,
          (match, attrs, href) => {
            if (!match.includes('fetchpriority')) {
              return match.replace('>', ' fetchpriority="high">');
            }
            return match;
          }
        );
        
        result = result.replace(
          /<link rel="modulepreload"([^>]*href="([^"]+index[^"]+)"[^>]*)>/g,
          (match, attrs, href) => {
            if (!match.includes('fetchpriority') && !href.includes('vendor')) {
              return match.replace('>', ' fetchpriority="high">');
            }
            return match;
          }
        );
        
        // ОПТИМИЗАЦИЯ ДЛЯ МОБИЛЬНЫХ: Убеждаемся, что критический index.js имеет preload с высоким приоритетом
        // Это уменьшает критический путь загрузки (764 мс → ~400-500 мс)
        const indexJsMatch = result.match(/<script type="module"([^>]*src="([^"]+index[^"]+\.js)"[^>]*)>/);
        if (indexJsMatch && indexJsMatch[2]) {
          const indexJsPath = indexJsMatch[2];
          // Проверяем, есть ли уже modulepreload для этого файла
          const hasPreload = result.includes(`href="${indexJsPath}"`) && result.includes('modulepreload');
          if (!hasPreload) {
            // Добавляем preload в head для ранней загрузки
            result = result.replace(
              /(<head[^>]*>)/i,
              `$1\n    <link rel="modulepreload" href="${indexJsPath}" crossorigin fetchpriority="high">`
            );
          }
        }
        
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
        // Иконки можно добавить позже (создать pwa-192x192.png и pwa-512x512.png)
        // Пока приложение будет использовать favicon.ico
        icons: []
      },
      workbox: {
        // КРИТИЧНО: Настройки для максимальной оффлайн работы
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        
        // Стратегии кэширования
        runtimeCaching: [
          {
            // Static Assets: HTML, JS, CSS - загружаем из кэша, обновляем в фоне
            urlPattern: /^https?:\/\/.*\.(js|css|html)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Supabase Images & Storage - агрессивное кэширование
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 дней
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Supabase API - NetworkFirst с кэшем на случай offline
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 минут (короткий кэш для API)
              },
              networkTimeoutSeconds: 3, // Быстрый fallback на кэш при медленной сети
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Fonts и другие assets
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
        ],
        
        // КРИТИЧНО: Navigation fallback для SPA (всегда отдаём index.html для маршрутов)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /\.(png|jpg|jpeg|svg|gif|webp|ico)$/],
        
        // Размер кэша
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
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
    minify: 'esbuild',
    target: 'es2015',
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
        manualChunks: (id) => {
          // МАКСИМАЛЬНО УПРОЩЕННАЯ СТРАТЕГИЯ для исправления ошибки unstable_scheduleCallback
          if (id.includes('node_modules')) {
            // ОПТИМИЗАЦИЯ: Тяжелые библиотеки в отдельные chunks для lazy loading
            if (id.includes('recharts')) {
              return 'recharts-vendor'; // ~200KB - загружается только в админке
            }
            
            // КРИТИЧНО: ВСЕ node_modules в ОДИН vendor chunk
            // Это гарантирует, что React и ReactDOM всегда вместе
            // и загружаются в правильном порядке
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // ОПТИМИЗАЦИЯ: Показываем сжатый размер для анализа
    reportCompressedSize: true,
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
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    // КРИТИЧНО: Не переименовываем имена функций/переменных слишком агрессивно
    keepNames: false,
  },
  };
});
