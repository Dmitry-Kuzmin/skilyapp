# Observability — план настройки

Файлы готовы к интеграции, но требуют установки npm-зависимостей.
Это нужно делать вручную (`package.json` защищён `.cursorrules`).

## 1. Sentry (error tracking)

### Установка
```bash
npm install -E @sentry/react
```

### Setup
В `src/main.tsx` (или новый `src/lib/sentry.ts`):

```typescript
import * as Sentry from '@sentry/react';
import { attachSink } from '@/lib/logger';

const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn && import.meta.env.PROD) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
  });

  // Подключаем как sink к нашему logger'у
  attachSink((level, event, ctx) => {
    if (level === 'error' && ctx.error_message) {
      Sentry.captureException(new Error(String(ctx.error_message)), {
        tags: { event },
        extra: ctx,
      });
    } else if (level === 'warn') {
      Sentry.captureMessage(event, { level: 'warning', extra: ctx });
    } else {
      Sentry.addBreadcrumb({ category: event, level, data: ctx });
    }
  });
}
```

### ENV
В Vercel + `.env.local`:
```
VITE_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project_id>
```

## 2. Vitest (unit tests)

### Установка
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom msw
```

### Конфиг `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/integrations/supabase/types.ts', 'src/__tests__/**'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### Скрипты в `package.json`
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Минимальный setup `src/__tests__/setup.ts`
```typescript
import '@testing-library/jest-dom';
```

### Приоритетные тесты (план Phase 3)
1. `src/__tests__/russia-exam-logic.test.ts` — handleMainQuestionAnswer и handleExtraQuestionAnswer (граничные случаи: 1/2 ошибки в блоке, 2/3 общих)
2. `src/__tests__/test-completion.test.ts` — расчёт score, mastery rollover
3. `src/__tests__/answer-validation.test.ts` — handleAnswer и server-submit fallback
4. `supabase/functions/test-manager/__tests__/gameplay.test.ts` — мок Supabase, проверка correct_option_ids логики

### Добавить в CI
В `.github/workflows/ci.yml`:
```yaml
- name: Tests
  run: npm run test:run
```

## 3. Health checks

Уже есть `supabase/functions/test-health/` — расширить чтобы проверял:
- DB writable (insert + delete fake row в `test_sessions`)
- RPC reachable (вызов `check_ai_usage_limit` с no-op)
- Edge Functions ms < 1000

Cron каждые 5 минут в `.github/workflows/health-check.yml`.

## 4. Метрики бизнеса (PostHog или встроенный logger)

Для funnel-аналитики (test_started → test_completed → premium):
- Лёгкий вариант: `analytics_events` таблица + INSERT в Edge Functions
- Полный вариант: PostHog SDK (`npm install posthog-js`)
