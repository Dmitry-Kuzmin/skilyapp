import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";

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
    // КРИТИЧНО: Временно отключаем минификацию для диагностики проблемы с Nn is not a function
    minify: false, // Временно отключаем для диагностики
    target: 'es2015',
    // ОПТИМИЗАЦИЯ: Улучшенное tree-shaking и compression
    cssCodeSplit: true, // Разделяем CSS на отдельные файлы для лучшего кэширования
    cssMinify: true, // Минифицируем CSS
    sourcemap: false, // Отключаем sourcemaps в production для уменьшения размера
    // ОПТИМИЗАЦИЯ: Улучшенное удаление неиспользуемого кода
    cssTarget: 'chrome80', // Оптимизация для современных браузеров
    // ОПТИМИЗАЦИЯ ДЛЯ МОБИЛЬНЫХ: Улучшенная компрессия
    minifySyntax: true, // Минификация синтаксиса
    minifyWhitespace: true, // Удаление пробелов
      rollupOptions: {
      // КРИТИЧНО: Явно указываем entry point
      input: 'index.html',
      // ОПТИМИЗАЦИЯ: Улучшенное tree-shaking (ослаблено для предотвращения удаления кода)
      treeshake: {
        moduleSideEffects: (id) => {
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
        manualChunks: (id) => {
          // Разделяем node_modules на отдельные chunks
          if (id.includes('node_modules')) {
            // КРИТИЧНО: ВСЕ React-зависимые библиотеки в ОДНОМ chunk
            // Проверяем ПЕРВЫМ, чтобы гарантировать правильный порядок загрузки
            // Это предотвращает ошибки forwardRef/useLayoutEffect на Vercel
            
            // ОПТИМИЗАЦИЯ: Тяжелые библиотеки в отдельные chunks для lazy loading
            if (id.includes('recharts')) {
              return 'recharts-vendor'; // ~200KB - загружается только в админке
            }
            
            // Широкий паттерн для всех библиотек с "react" в пути
            if (id.includes('/react') || id.includes('\\react')) {
              return 'react-vendor';
            }
            
            // КРИТИЧНО: framer-motion в отдельный chunk для предотвращения проблем с минификацией
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            
            // Специфичные проверки для известных React-зависимых библиотек
            if (
              id.includes('@radix-ui') ||
              id.includes('@tanstack/react-query') ||
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('embla-carousel-react') ||
              id.includes('react-confetti') ||
              id.includes('react-day-picker') ||
              id.includes('react-markdown') ||
              id.includes('react-resizable-panels') ||
              id.includes('@tiptap/react') ||
              id.includes('@uidotdev/usehooks') ||
              id.includes('cmdk') ||
              id.includes('vaul') ||
              id.includes('next-themes') ||
              id.includes('lucide-react') ||
              id.includes('use-sync-external-store') ||
              id.includes('useSyncExternalStore') ||
              id.includes('use-callback-ref') ||
              id.includes('use-sidecar')
            ) {
              return 'react-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // TipTap (только extensions, без react - @tiptap/react уже в react-vendor)
            if (id.includes('@tiptap') && !id.includes('@tiptap/react')) {
              return 'tiptap';
            }
            // XLSX (Excel файлы) - используется только в админке
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            // Sonner (toast уведомления)
            if (id.includes('sonner')) {
              return 'sonner';
            }
            // Date библиотеки
            if (id.includes('date-fns')) {
              return 'date-libs';
            }
            // Validation библиотеки
            if (id.includes('zod')) {
              return 'validation-libs';
            }
            // Markdown библиотеки (remark только, react-markdown уже в react-vendor)
            if (id.includes('remark') && !id.includes('react-markdown')) {
              return 'markdown-libs';
            }
            // Utils библиотеки (классы, утилиты)
            if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
              return 'utils-libs';
            }
            // Остальные vendor библиотеки - создаем отдельные chunks для каждой
            // Это предотвращает попадание React-зависимых библиотек в общий vendor chunk
            const match = id.match(/node_modules\/([^/]+)/);
            if (match) {
              const pkgName = match[1];
              // Для scoped packages (@scope/package) создаем отдельный chunk
              if (pkgName.startsWith('@')) {
                return `vendor-${pkgName.replace('@', '').replace('/', '-')}`;
              }
              // Для обычных packages тоже создаем отдельный chunk
              // Это гарантирует, что ничего не попадет в общий vendor
              return `vendor-${pkgName}`;
            }
            // Если не удалось определить пакет - добавляем в react-vendor на всякий случай
            // Это безопаснее, чем создавать общий vendor chunk
            return 'react-vendor';
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
    // ОПТИМИЗАЦИЯ: Предварительная оптимизация зависимостей
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
    ],
    // КРИТИЧНО: Явно указываем, что framer-motion должен быть предварительно оптимизирован
    exclude: [],
  },
  // КРИТИЧНО: Настройки для правильной обработки динамических импортов
  ssr: {
    noExternal: [], // Не делаем ничего external для SSR (у нас нет SSR, но это может помочь)
  },
  };
});
