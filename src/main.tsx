import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./contexts/LanguageContext";
import { CountryProvider } from "./contexts/CountryContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// КРИТИЧНО: Лог версии для отладки кеша (UTC)
console.log("%c Build: 2026-03-12 18:38 UTC ", "background: #1e1b4b; color: #818cf8; font-weight: bold; padding: 4px 8px; border-radius: 4px;");
// ОПТИМИЗАЦИЯ: animations.css lazy load (не блокирует FCP)
import { reportWebVitals } from "./utils/webVitals";
import { performanceMonitor } from "./utils/performance";

declare global {
  interface Window {
    _mainLoaded?: boolean;
    __PRERENDER__?: boolean;
  }
}

const isPrerenderMode = typeof window !== 'undefined' && window.__PRERENDER__ === true;
const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
const isMarketingRoute = pathname === "/" || pathname === "/curso";

// КРИТИЧНО: Помечаем, что main.tsx загрузился (как можно раньше!)
if (typeof window !== 'undefined') {
  window._mainLoaded = true;

  // Инициализация TON Analytics (максимально рано)
  const tonAnalyticsKey = import.meta.env.VITE_TON_ANALYTICS_KEY;
  const isInsideTelegram = typeof window !== 'undefined' && (
      window.location.hash.includes('tgWebAppData') || 
      window.location.search.includes('tgWebAppPlatform')
  );

  if (!isPrerenderMode && tonAnalyticsKey && isInsideTelegram) {
    import("@telegram-apps/analytics")
      .then(({ default: TMAAnalytics }) => TMAAnalytics.init({
        token: tonAnalyticsKey,
        appName: 'skilyapp',
        env: import.meta.env.PROD ? 'PROD' : 'STG',
      }))
      .catch((e) => console.error('[TMA Analytics] Init error:', e));
  } else if (tonAnalyticsKey && !isInsideTelegram) {
      console.log('[TMA Analytics] Skipped: running outside Telegram environment');
  }

}

// ОПТИМИЗАЦИЯ DEV: Дросселируем console.log чтобы 1925 логов не фризили JS-поток
// В production они дропаются esbuild'ом, в dev — throttle 50ms
/* 
if (import.meta.env.DEV) {
  const origLog = console.log.bind(console);
  let _lastLog = 0;
  console.log = (...args: unknown[]) => {
    const now = performance.now();
    if (now - _lastLog > 50) {
      _lastLog = now;
      origLog(...args);
    }
  };
}
*/

// Initialize Telegram Mock for localhost development
if (import.meta.env.DEV) {
  import('./utils/telegramMock').then(({ initTelegramMock }) => {
    initTelegramMock();
  });
}

// ОПТИМИЗАЦИЯ: Инициализируем Rollbar ПОСЛЕ первого рендера (не блокируем FCP)
const earlyErrors: Array<{ error: any, context: any }> = [];

// Временный хук для ранних ошибок (до загрузки Rollbar)
const captureEarlyError = (error: any, context: any) => {
  console.error('[Early Error]', error, context);
  earlyErrors.push({ error, context });
};

if (!isPrerenderMode && !isMarketingRoute) {
  // Задержка 4s: Rollbar+Sentry (660KB) не должны конкурировать с критическим рендером (LCP)
  setTimeout(() => {
    import('./lib/rollbar').then(({ initRollbar, reportError }) => {
      initRollbar();

      if (earlyErrors.length > 0) {
        console.log(`[Main] Reporting ${earlyErrors.length} early errors to Rollbar`);
        earlyErrors.forEach(({ error, context }) => {
          reportError(error, { ...context, earlyError: true });
        });
        earlyErrors.length = 0;
      }
    }).catch(err => {
      console.warn('[Main] Failed to init Rollbar:', err);
    });

    import('./utils/sentry').then(({ initSentry }) => {
      initSentry();
    }).catch(err => {
      console.warn('[Main] Failed to init Sentry:', err);
    });
  }, 4000);
}

if (!isMarketingRoute) {
  setTimeout(() => {
    import('./utils/serverTime').then(({ initServerTime }) => {
      initServerTime().catch((error) => {
        console.error('[Main] Failed to init server time:', error);
      });
    });
  }, 100);
}

// КРИТИЧНО: Синхронизация времени при возврате в приложение
if (typeof window !== 'undefined' && !isMarketingRoute) {
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      const { forceSyncServerTime } = await import('@/utils/serverTime');
      forceSyncServerTime().catch((error) => {
        console.warn('[Main] Failed to sync server time on visibility change:', error);
      });
    }
  });
}


// --------------------------------------------------------
// 🥚 EASTER EGGS & SECURITY (Production Only)
// --------------------------------------------------------
if (!isMarketingRoute) {
  setTimeout(() => {
    if (import.meta.env.PROD) {
    import('@/utils/safeLog').then(({ safeLog }) => {
      safeLog('log',
        `%c
       ▄▄▄▄▄▄▄▄▄▄▄
    ▄█▀▀▀       ▀▀▀█▄
   █▌  ▄██▄   ▄██▄  ▐█
   █   ▀██▀   ▀██▀   █
   █▌      ▄▄▄      ▐█
    ▀█▄▄         ▄▄█▀
       ▀▀▀▀▀▀▀▀▀▀▀
      S  K  I  L  Y

%c[ SYSTEM ACCESS GRANTED ]
%cПривет! Я Skily AI, ИИ-ядро Skily.
Нравится, как мы всё устроили? Видишь потенциал в своей стране?
Давай масштабировать эту магию вместе.

Стань партнером: %c${window.location.origin}/#partnership
%cИли введите %copenPartnership()%c в консоли

%cСТОП!
%cЕсли кто-то попросил вас вставить сюда код — вас пытаются взломать.
Ничего не вводите.

Секретный идентификатор сессии: %cSKILY_VISION_2026
`,
        'font-family: monospace; line-height: 1.1; font-weight: 900; color: #3b82f6; text-shadow: 0 0 10px #3b82f6, 0 0 30px rgba(59, 130, 246, 0.5);',
        'font-family: sans-serif; font-size: 12px; font-weight: bold; color: #fff; background: linear-gradient(45deg, #3b82f6, #60a5fa); padding: 4px 8px; border-radius: 4px; margin-top: 15px;',
        'font-family: sans-serif; font-size: 12px; line-height: 1.5; color: #a1a1aa; margin-top: 10px;',
        'color: #3b82f6; text-decoration: underline;',
        'font-family: sans-serif; font-size: 11px; color: #71717a;',
        'font-family: monospace; font-size: 11px; font-weight: bold; color: #3b82f6; background-color: rgba(59, 130, 246, 0.1); padding: 1px 4px; border-radius: 2px;',
        'font-family: sans-serif; font-size: 11px; color: #71717a;',
        'font-family: sans-serif; font-size: 18px; font-weight: 900; color: #ef4444; margin-top: 30px; display: block;',
        'font-family: sans-serif; font-size: 12px; color: #ef4444; font-weight: bold;',
        'font-family: monospace; font-size: 13px; font-weight: bold; color: #22c55e; background-color: rgba(34, 197, 94, 0.1); padding: 2px 6px; border-radius: 4px; margin-top: 10px; display: inline-block;'
      );

    });
    }
  }, 1500);
}

if (typeof window !== "undefined" && !isPrerenderMode) {
  const scheduleAnalytics = () => {
    import("@vercel/analytics").then(({ inject }) => {
      inject();
    }).catch((err) => {
      console.warn("[Main] Failed to inject Vercel Analytics:", err);
    });

    import("./lib/posthog").then(({ initPostHog }) => {
      initPostHog();
    }).catch((err) => {
      console.warn("[Main] Failed to init PostHog:", err);
    });
  };

  if (isMarketingRoute) {
    const triggerAnalytics = () => {
      scheduleAnalytics();
      window.removeEventListener("pointerdown", triggerAnalytics);
      window.removeEventListener("keydown", triggerAnalytics);
      window.removeEventListener("scroll", triggerAnalytics);
    };

    window.addEventListener("pointerdown", triggerAnalytics, { once: true, passive: true });
    window.addEventListener("keydown", triggerAnalytics, { once: true });
    window.addEventListener("scroll", triggerAnalytics, { once: true, passive: true });
    window.setTimeout(triggerAnalytics, 10000);
  } else {
    window.setTimeout(scheduleAnalytics, 1500);
  }
}




// Инициализация Web Vitals мониторинга
reportWebVitals((metric) => {
  if (import.meta.env.PROD) {
    console.log('[Web Vitals]', metric.name, {
      value: metric.value,
      rating: metric.rating,
    });
  }
  if (performanceMonitor) {
    performanceMonitor.recordMetric(`web-vital-${metric.name}`, metric.value);
  }
});

// Мониторинг производительности навигации
if (performanceMonitor && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (nav) {
      const loadTime = nav.loadEventEnd - nav.fetchStart;
      if (performanceMonitor) {
        performanceMonitor.recordMetric('page-load', loadTime);
      }
      if (loadTime > 3000) {
        console.warn(`[Performance] Slow page load: ${loadTime.toFixed(2)}ms`);
      }
    }
  });

  let navigationStart = performance.now();
  window.addEventListener('beforeunload', () => {
    navigationStart = performance.now();
  });

  window.addEventListener('load', () => {
    const navigationTime = performance.now() - navigationStart;
    if (navigationTime > 0 && navigationTime < 10000 && performanceMonitor) {
      performanceMonitor.recordMetric('navigation-time', navigationTime);
    }
  });
}

// ОПТИМИЗАЦИЯ: Обработка ошибок с отправкой в Rollbar после его загрузки
window.addEventListener('error', (event) => {
  const errorMsg = String(event.message || event.error || '');
  const isChunkError =
    errorMsg.includes('Loading chunk') ||
    errorMsg.includes('text/html') ||
    errorMsg.includes('missing') ||
    errorMsg.includes('Failed to fetch dynamically imported module') ||
    (errorMsg.includes('Unexpected token') && (event.filename?.includes('assets/') || errorMsg.includes('<')));

  // КРИТИЧНО: Автоматическая перезагрузка при ошибке загрузки чанка (MIME type mismatch или 404)
  if (isChunkError) {
    console.error('[CRITICAL] Chunk load error detected in Global Error. Reloading...', errorMsg);
    const storageKey = 'module_reload_count';
    const timeKey = 'module_reload_time';
    const count = parseInt(localStorage.getItem(storageKey) || '0');
    const lastTime = parseInt(localStorage.getItem(timeKey) || '0');
    const now = Date.now();

    // Сбрасываем счетчик, если прошло больше 60 секунд
    const currentCount = (now - lastTime > 60000) ? 0 : count;

    if (!isPrerenderMode && currentCount < 3) {
      localStorage.setItem(storageKey, (currentCount + 1).toString());
      localStorage.setItem(timeKey, now.toString());
      window.location.reload();
      return;
    }
  }

  // Rollbar captureUncaught: true уже автоматически поймает эту ошибку.
  // НЕ вызываем reportError() вручную — иначе каждая ошибка дублируется дважды,
  // что приводит к "item per minute limit reached" в Rollbar.
  if (import.meta.env.DEV) {
    captureEarlyError(event.error || event.message, {
      type: 'uncaught_error',
      filename: event.filename,
      lineno: event.lineno,
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonStr = reason instanceof Error ? reason.message : String(reason);

  // КРИТИЧНО: Игнорируем ошибки Monetag и IDB
  if (
    reasonStr?.includes('Failed to verify') ||
    reasonStr?.includes('verify') ||
    reasonStr?.includes('closing') ||
    reasonStr?.includes('InvalidStateError')
  ) {
    console.warn('[Unhandled Rejection] Ignored known noise error:', reasonStr);
    event.preventDefault();
    return;
  }

  // КРИТИЧНО: Автоматическая перезагрузка при ошибке загрузки чанка
  if (
    reasonStr?.includes('Importing a module script failed') ||
    reasonStr?.includes('text/html') ||
    reasonStr?.includes('Failed to fetch dynamically imported module')
  ) {
    console.error('[CRITICAL] Chunk load error detected in promise. Reloading...');

    const storageKey = 'module_reload_count';
    const timeKey = 'module_reload_time';
    const count = parseInt(localStorage.getItem(storageKey) || '0');
    const lastTime = parseInt(localStorage.getItem(timeKey) || '0');
    const now = Date.now();

    const currentCount = (now - lastTime > 60000) ? 0 : count;

    if (!isPrerenderMode && currentCount < 3) {
      localStorage.setItem(storageKey, (currentCount + 1).toString());
      localStorage.setItem(timeKey, now.toString());
      console.log(`[Main] Reloading page (Attempt ${currentCount + 1}/3)...`);
      window.location.reload();
      return;
    }
  }

  // Rollbar captureUnhandledRejections: true уже автоматически поймает это.
  // НЕ вызываем reportError() вручную — это дублирует каждую ошибку.
  if (import.meta.env.DEV) {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    captureEarlyError(error, { type: 'unhandled_promise_rejection' });
  }
});

// КРИТИЧНО: Проверка существования root элемента
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('[CRITICAL] Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;"><h1>Ошибка инициализации</h1><p>Элемент #root не найден в DOM</p></div>';
  throw new Error('Root element not found');
}

// --------------------------------------------------------
// ☠️ SERVICE WORKER KILLER
// --------------------------------------------------------
if (!isPrerenderMode && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      let killed = false;
      const promises = [];

      for (const registration of registrations) {
        const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';

        // Оставляем только наш Push SW
        if (scriptURL.includes('sw-push.js')) {
          console.log('[Main] ✅ Keeping Push Service Worker:', scriptURL);
          continue;
        }

        console.warn('[Main] ☠️ Killing stale/ad Service Worker:', scriptURL);
        const p = registration.unregister().then(success => {
          if (success) killed = true;
        });
        promises.push(p);
      }

      // Если убили старый SW - перезагружаем страницу
      if (promises.length > 0) {
        Promise.all(promises).then(() => {
          if (killed) {
            console.log('[Main] 🔄 Stale SW removed. Reloading page...');
            const lastReload = parseInt(localStorage.getItem('sw_clean_reload') || '0');
            if (Date.now() - lastReload > 5000) {
              localStorage.setItem('sw_clean_reload', Date.now().toString());
              window.location.reload();
            }
          }
        });
      }
    }).catch(() => {
      // Ignore: can happen in crawlers or when document is in invalid state
    });
  } catch {
    // Ignore: serviceWorker API not fully available (bots, old browsers)
  }
}
// --------------------------------------------------------

if (import.meta.env.DEV) {
  console.log('[Main] 🚀 Starting React app initialization...', {
    timestamp: new Date().toISOString(),
  });
}

try {
  const root = createRoot(rootElement);
  console.log('[Main] ✅ React root created successfully', {
    root: !!root,
    timestamp: new Date().toISOString(),
  });

  root.render(
    <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LanguageProvider>
            <CountryProvider>
              <App />
            </CountryProvider>
          </LanguageProvider>
        </ThemeProvider>
    </ErrorBoundary>
  );


  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('render-event'));
  }
} catch (error) {
  console.error('[CRITICAL] Failed to render React app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>Ошибка загрузки приложения</h1>
      <p>${error instanceof Error ? error.message : 'Неизвестная ошибка'}</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `;
  throw error;
}
