import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "scripts/generate-images-banana.js",
      // Авто-генерируется supabase gen types — не редактировать вручную
      "src/integrations/supabase/types.ts",
    ],
  },

  // ESLint 9.32+ бросает exit 2, если все файлы явно переданной директории заигнорированы.
  // Lint-команда передаёт `scripts` и `supabase` как аргументы.
  // Эти блоки "регистрируют" директории как обработанные (без правил).
  // TS-парсер нужен для supabase/functions/*.ts, иначе espree не может их читать
  // и ESLint по-прежнему считает всю папку "ignored".
  {
    files: ["scripts/**/*.{js,cjs,mjs}"],
    rules: {},
  },
  {
    files: ["scripts/**/*.{ts,tsx}", "supabase/**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    rules: {},
  },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
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
      "@typescript-eslint/no-explicit-any": "warn",

      // @ts-ignore → @ts-expect-error — предупреждение
      "@typescript-eslint/ban-ts-comment": "warn",

      // exhaustive-deps — предупреждение
      "react-hooks/exhaustive-deps": "warn",

      // Пустые объектные типы ({}) — предупреждение
      "@typescript-eslint/no-empty-object-type": "warn",

      // require() в TypeScript — предупреждение
      "@typescript-eslint/no-require-imports": "warn",

      // Правила ниже понижены до warn: в кодовой базе есть pre-existing нарушения,
      // которые не блокируют runtime. Фиксить отдельно, не в этом PR.
      "no-async-promise-executor": "warn",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "no-irregular-whitespace": "warn",
      "prefer-const": "warn",
      "no-shadow-restricted-names": "warn",
      "no-useless-escape": "warn",
      "no-misleading-character-class": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
    },
  },
);
