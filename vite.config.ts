import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const shouldAnalyze = Boolean(process.env.ANALYZE);

  const plugins = [
    react(),
    mode === "development" && componentTagger(),
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
      ],
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      minify: 'esbuild', // Используем esbuild (быстрее чем terser)
      target: 'es2015',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
          // Разделяем node_modules на отдельные chunks
          if (id.includes('node_modules')) {
            // React core (самые базовые библиотеки)
            if (id.includes('react/') && !id.includes('react-dom') && !id.includes('react-router')) {
              return 'react-core';
            }
            // React DOM
            if (id.includes('react-dom')) {
              return 'react-dom';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'react-router';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // TipTap редактор
            if (id.includes('@tiptap')) {
              return 'tiptap';
            }
            // Framer Motion (большая библиотека анимаций)
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // Radix UI компоненты
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // TanStack Query
            if (id.includes('@tanstack/react-query')) {
              return 'react-query';
            }
            // Recharts (графики)
            if (id.includes('recharts')) {
              return 'recharts';
            }
            // XLSX (Excel файлы) - используется только в админке
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            // Lucide icons (большая библиотека иконок)
            if (id.includes('lucide-react')) {
              return 'lucide-icons';
            }
            // Sonner (toast уведомления)
            if (id.includes('sonner')) {
              return 'sonner';
            }
            // Date библиотеки
            if (id.includes('date-fns')) {
              return 'date-libs';
            }
            // Form библиотеки
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-libs';
            }
            // Validation библиотеки
            if (id.includes('zod')) {
              return 'validation-libs';
            }
            // Markdown библиотеки
            if (id.includes('react-markdown') || id.includes('remark')) {
              return 'markdown-libs';
            }
            // Carousel библиотеки
            if (id.includes('embla-carousel')) {
              return 'carousel-libs';
            }
            // Resizable panels
            if (id.includes('react-resizable-panels')) {
              return 'resizable-libs';
            }
            // Utils библиотеки (классы, утилиты)
            if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
              return 'utils-libs';
            }
            // Theme библиотеки
            if (id.includes('next-themes')) {
              return 'theme-libs';
            }
            // Остальные vendor библиотеки (разделяем на мелкие группы)
            // Если библиотека большая (>50KB), выделяем отдельно
            const match = id.match(/node_modules\/([^/]+)/);
            if (match) {
              const pkgName = match[1];
              // Большие библиотеки выделяем отдельно
              if (pkgName.startsWith('@')) {
                return `vendor-${pkgName.replace('@', '').replace('/', '-')}`;
              }
            }
            return 'vendor';
          }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      esbuildOptions: {
        jsx: 'automatic',
      },
    },
  };
});
