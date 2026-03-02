import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      // Supabase Edge Functions — Deno-окружение, типизация через any допустима
      "supabase/functions/**",
      // Скрипты — Node.js утилиты, не часть production-кода
      "scripts/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Fast-refresh предупреждение — не блокирует сборку
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Неиспользуемые переменные — выключены намеренно (legacy код)
      "@typescript-eslint/no-unused-vars": "off",

      // any-типы — предупреждение вместо ошибки.
      // Критичные места нужно типизировать явно, но legacy код не должен блокировать CI.
      "@typescript-eslint/no-explicit-any": "warn",

      // @ts-ignore → @ts-expect-error — предупреждение (уже активно исправляем)
      "@typescript-eslint/ban-ts-comment": "warn",

      // exhaustive-deps — предупреждение (не нарушает runtime, исправляется постепенно)
      "react-hooks/exhaustive-deps": "warn",

      // Пустые объектные типы ({}) — предупреждение
      "@typescript-eslint/no-empty-object-type": "warn",

      // require() в TypeScript — предупреждение (2 места в tailwind.config)
      "@typescript-eslint/no-require-imports": "warn",

      // no-async-promise-executor — оставляем ошибкой (реальная проблема)
      "no-async-promise-executor": "error",

      // no-case-declarations — оставляем ошибкой (реальная проблема)
      "no-case-declarations": "error",
    },
  },
);
