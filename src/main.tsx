import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
// ОПТИМИЗАЦИЯ: animations.css lazy load (не блокирует FCP)
// Загружаем только когда нужно (при использовании Lumi компонентов)
// Это уменьшает initial CSS bundle на ~10-20 KB
// import "./components/lumi/animations.css"; // Lazy loaded when needed
import { reportWebVitals } from "./utils/webVitals";
import { performanceMonitor } from "./utils/performance";
// ⚠️ ОТКЛЮЧЕНО: Service Worker вызывает проблемы с кэшированием старого кода
// import { registerSW } from 'virtual:pwa-register';
// import { initPWAVersionCheck } from "./utils/pwaVersionCheck";

// ОПТИМИЗАЦИЯ: Инициализируем Rollbar ПОСЛЕ первого рендера (не блокируем FCP)
// ВАЖНО: Ранние ошибки (до загрузки Rollbar) логируются в консоль
// но могут не попасть в Rollbar - это осознанный trade-off для скорости FCP
const earlyErrors: Array<{ error: any, context: any }> = [];

// Временный хук для ранних ошибок (до загрузки Rollbar)
const captureEarlyError = (error: any, context: any) => {
  console.error('[Early Error]', error, context);
  earlyErrors.push({ error, context });
};

setTimeout(() => {
  import('./lib/rollbar').then(({ initRollbar, reportError }) => {
    initRollbar();
    console.log('[Main] Rollbar initialized (deferred)');

    // Отправляем накопленные ранние ошибки
    if (earlyErrors.length > 0) {
      console.log(`[Main] Reporting ${earlyErrors.length} early errors to Rollbar`);
      earlyErrors.forEach(({ error, context }) => {
        reportError(error, { ...context, earlyError: true });
      });
      earlyErrors.length = 0; // Очищаем массив
    }
  }).catch(err => {
    console.warn('[Main] Failed to init Rollbar:', err);
  });
}, 0);

// ⚠️ ОТКЛЮЧЕНО: Service Worker вызывает проблемы с кэшированием старого кода
// КРИТИЧНО: PWA Version Check для автоматического обновления
// initPWAVersionCheck();

// ОПТИМИЗАЦИЯ: Инициализация Server Time ПОСЛЕ первого рендера (не блокируем FCP)
setTimeout(() => {
  import('./utils/serverTime').then(({ initServerTime }) => {
    initServerTime().catch((error) => {
      console.error('[Main] Failed to init server time:', error);
    });
  });
}, 100); // Небольшая задержка чтобы React успел отрендерить skeleton

// КРИТИЧНО: Синхронизация времени при возврате в приложение (защита от смены часового пояса/времени)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    // Когда пользователь возвращается в приложение - синхронизируем время
    if (!document.hidden) {
      const { forceSyncServerTime } = await import('@/utils/serverTime');
      forceSyncServerTime().catch((error) => {
        console.warn('[Main] Failed to sync server time on visibility change:', error);
      });
    }
  });
}

// КРИТИЧНО: Логирование сразу после импортов для диагностики
// ВАЖНО: Этот лог должен появиться ПЕРВЫМ в консоли
console.log('[Main] ✅✅✅ Script loaded and imports completed ✅✅✅', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent.substring(0, 50),
  location: window.location.href,
  readyState: document.readyState,
  hasReact: typeof React !== 'undefined',
  hasCreateRoot: typeof createRoot !== 'undefined',
});

// --------------------------------------------------------
// 🥚 EASTER EGGS FOR GEEKS
// --------------------------------------------------------
console.log(
  '%c СТОП! %c Ты зашел на территорию разработчиков. %c',
  'background: #ef4444; color: white; font-size: 24px; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'background: #1f2937; color: white; font-size: 24px; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;',
  'background: transparent;'
);

console.log(
  '%cНравится копаться под капотом? 🔧 %cПрисоединяйся к нам в Skily!',
  'font-size: 16px; color: #fbbf24; font-weight: bold;',
  'font-size: 14px; color: #94a3b8; font-weight: normal;'
);
// --------------------------------------------------------

// КРИТИЧНО: Помечаем, что main.tsx загрузился (для проверки в index.html)
if (typeof window !== 'undefined') {
  window._mainLoaded = true;
}

// Инициализация Telegram WebApp теперь происходит через TelegramProvider в App.tsx
// Это гарантирует правильный порядок инициализации и предотвращает множественные вызовы

// ⚠️ ОТКЛЮЧЕНО: Service Worker отключен из-за проблем с кэшированием старого кода
// КРИТИЧНО: PWA Service Worker регистрируется автоматически через vite-plugin-pwa
// Это обеспечивает offline-first архитектуру для Telegram Mini App
// См. vite.config.ts для настроек кэширования

// Инициализация Web Vitals мониторинга
reportWebVitals((metric) => {
  // В production можно отправлять метрики на сервер
  if (import.meta.env.PROD) {
    console.log('[Web Vitals]', metric.name, {
      value: metric.value,
      rating: metric.rating,
    });
  }

  // Записываем метрики в performance monitor
  if (performanceMonitor) {
    performanceMonitor.recordMetric(`web-vital-${metric.name}`, metric.value);
  }
});

// Мониторинг производительности навигации
if (performanceMonitor && typeof window !== 'undefined') {
  // Отслеживаем время загрузки страницы
  window.addEventListener('load', () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (nav) {
      const loadTime = nav.loadEventEnd - nav.fetchStart;
      performanceMonitor.recordMetric('page-load', loadTime);

      if (loadTime > 3000) {
        console.warn(`[Performance] Slow page load: ${loadTime.toFixed(2)}ms`);
      }
    }
  });

  // Отслеживаем время перехода между страницами
  let navigationStart = performance.now();
  window.addEventListener('beforeunload', () => {
    navigationStart = performance.now();
  });

  window.addEventListener('load', () => {
    const navigationTime = performance.now() - navigationStart;
    if (navigationTime > 0 && navigationTime < 10000) { // Игнорируем первичную загрузку
      performanceMonitor.recordMetric('navigation-time', navigationTime);
    }
  });
}

// ОПТИМИЗАЦИЯ: Обработка ошибок с отправкой в Rollbar после его загрузки
window.addEventListener('error', (event) => {
  const errorData = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack,
    url: window.location.href,
  };

  console.error('[Global Error]', errorData);

  const errorContext = {
    type: 'uncaught_error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  };

  // Пытаемся отправить в Rollbar асинхронно
  import('./lib/rollbar').then(({ reportError }) => {
    const errorToReport = event.error || event.message;
    reportError(errorToReport, errorContext);
  }).catch(() => {
    // Rollbar ещё не загрузился - сохраняем для отправки позже
    captureEarlyError(event.error || event.message, errorContext);
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonStr = reason instanceof Error ? reason.message : String(reason);

  // КРИТИЧНО: Игнорируем ошибки Monetag "Failed to verify" - это нормально для Interstitial
  if (reasonStr?.includes('Failed to verify') || reasonStr?.includes('verify')) {
    console.warn('[Unhandled Rejection] Monetag verification error (ignored):', reasonStr);
    event.preventDefault(); // Предотвращаем вывод в консоль как ошибку
    return;
  }

  const errorData = {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack,
    url: window.location.href,
  };

  console.error('[Unhandled Promise Rejection]', errorData);

  const error = event.reason instanceof Error
    ? event.reason
    : new Error(String(event.reason));

  const errorContext = {
    type: 'unhandled_promise_rejection',
    reason: String(event.reason),
  };

  // Пытаемся отправить в Rollbar асинхронно
  import('./lib/rollbar').then(({ reportError }) => {
    reportError(error, errorContext);
  }).catch(() => {
    // Rollbar ещё не загрузился - сохраняем для отправки позже
    captureEarlyError(error, errorContext);
  });
});

// КРИТИЧНО: Проверка существования root элемента перед рендерингом
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('[CRITICAL] Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;"><h1>Ошибка инициализации</h1><p>Элемент #root не найден в DOM</p></div>';
  throw new Error('Root element not found');
}

// --------------------------------------------------------
// ☠️ SERVICE WORKER KILLER
// Этот код принудительно удаляет старые кэши PWA
// КРИТИЧНО: Должен быть перед ReactDOM.createRoot для исправления проблем с кэшированием в Telegram
// --------------------------------------------------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    let unregisterPromises = [];
    for (let registration of registrations) {
      console.log('💀 Killing Service Worker:', registration);
      unregisterPromises.push(registration.unregister());
    }

    // Если нашли и убили SW, перезагружаем страницу, чтобы взять свежий код с сервера
    if (registrations.length > 0) {
      Promise.all(unregisterPromises).then(() => {
        console.log('🔄 Service Worker killed. Reloading page...');
        window.location.reload();
      });
    }
  });

  // Очистка кэша хранилища
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (let name of names) {
        caches.delete(name);
      }
    });
  }
}
// --------------------------------------------------------

console.log('[Main] 🚀🚀🚀 Starting React app initialization... 🚀🚀🚀', {
  rootElement: !!rootElement,
  rootElementId: rootElement?.id,
  timestamp: new Date().toISOString(),
});

try {
  const root = createRoot(rootElement);
  console.log('[Main] ✅ React root created successfully', {
    root: !!root,
    timestamp: new Date().toISOString(),
  });

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  );

  console.log('[Main] ✅✅✅ React app rendered successfully ✅✅✅', {
    timestamp: new Date().toISOString(),
    readyState: document.readyState,
  });

  // КРИТИЧНО: Удаляем skeleton из DOM после монтирования React
  // Это гарантирует что он не мешает взаимодействию и не перекрывает контент
  setTimeout(() => {
    const skeleton = document.querySelector('.app-skeleton');
    if (skeleton) {
      skeleton.remove();
      console.log('[Main] Skeleton removed from DOM');
    }

    // SSG: Отправляем событие для prerender плагина
    // Это сигнализирует, что React приложение полностью отрендерилось
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('render-event'));
    }
  }, 100); // Небольшая задержка чтобы React успел отрендерить первый кадр
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
