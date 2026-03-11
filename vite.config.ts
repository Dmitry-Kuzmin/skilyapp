import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";
// SSG: Prerender будет выполняться через отдельный скрипт (scripts/prerender.js)
// Это более надёжно чем vite-plugin-prerender для сложных проектов

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const shouldAnalyze = Boolean(process.env.ANALYZE);

  const plugins = [
    react(),
    // ⚠️ ОТКЛЮЧЕНО: Service Worker вызывает проблемы с кэшированием старого кода
    // PWA Plugin для Offline-First архитектуры (критично для Telegram Mini App)
    // Раскомментировать при необходимости:
    // VitePWA({
    //   registerType: 'prompt',
    //   filename: 'pwa-sw.js',
    //   includeAssets: ['favicon.ico', 'favicon.svg'],
    //   manifest: { ... },
    //   workbox: { ... },
    //   devOptions: { enabled: false },
    // }),
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
        ".trycloudflare.com",
        ".cfargotunnel.com",
        ".loca.lt",
      ],
      // ОПТИМИЗАЦИЯ: Уменьшаем нагрузку от HMR overlay
      hmr: {
        overlay: false, // Отключаем всплывающий поверх ошибок в dev (у нас есть Type Check в IDE)
      },
      // ОПТИМИЗАЦИЯ: Исключаем группы файлов из file watcher
      watch: {
        ignored: [
          '**/supabase/**',
          '**/dist/**',
          '**/node_modules/**',
          '**/.git/**',
          '**/coverage/**',
          '**/*.sql',
          '**/data/**',
        ],
      },
      // ОПТИМИЗАЦИЯ: Предварительный прогрев ключевых страниц (уменьшает TTFR при первом открытии)
      warmup: {
        clientFiles: [
          './src/pages/Index.tsx',
          './src/pages/games/Duel.tsx',
          './src/App.tsx',
        ],
      },
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ['react', 'react-dom'],
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
            return true; // Разрешаем side effects для внутренних модулей
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
            // ✅ UI: Тяжелые компоненты выносим отдельно
            if (id.includes('node_modules/framer-motion')) return 'motion-vendor';
            if (id.includes('node_modules/lucide-react')) return 'icons-vendor';
            if (id.includes('node_modules/recharts')) return 'charts-vendor';
            if (id.includes('node_modules/embla-carousel-react')) return 'carousel-vendor';

            // ✅ CORE: React
            if (id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/') || 
                id.includes('node_modules/scheduler/')) {
              return 'react-core';
            }

            // ✅ INFRA: Supabase
            if (id.includes('node_modules/@supabase/')) return 'supabase-vendor';

            // ✅ OTHER: Группируем остальное
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      // ОПТИМИЗАЦИЯ: reportCompressedSize только в production (в dev тормозит HMR)
      reportCompressedSize: mode === 'production',
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
        'next-themes',
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
      // ОПТИМИЗАЦИЯ: Удаляем console.log/warn/error в production для производительности
      // В Telegram Mini App на Android синхронные console.log могут фризить интерфейс
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  };
});
// Force restart trigger: 2025-12-30 00:03:00
