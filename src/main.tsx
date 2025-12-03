import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/ThemeProvider";
import { UserProvider } from "./contexts/UserContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
// Импортируем animations.css - Vite оптимизирует его автоматически
import "./components/lumi/animations.css";
import { reportWebVitals } from "./utils/webVitals";
import { initRollbar, reportError, reportWarning } from "./lib/rollbar";
import { performanceMonitor } from "./utils/performance";
import { initServerTime } from "./utils/serverTime";
import { registerSW } from 'virtual:pwa-register';

// Инициализируем Rollbar в начале приложения
initRollbar();

// КРИТИЧНО: Регистрация PWA Service Worker для offline-first режима
// autoUpdate гарантирует, что пользователи всегда получают последнюю версию
if (import.meta.env.PROD) {
  console.log('[PWA] Starting Service Worker registration...');
  console.log('[PWA] Environment:', {
    prod: import.meta.env.PROD,
    mode: import.meta.env.MODE,
    userAgent: navigator.userAgent.substring(0, 100),
  });
  
  const updateSW = registerSW({
    immediate: true, // КРИТИЧНО: Регистрируем SW немедленно
    onNeedRefresh() {
      console.log('[PWA] 🔄 New version available - updating...');
      // Автоматически обновляемся (autoUpdate)
      updateSW(true);
    },
    onOfflineReady() {
      console.log('[PWA] ✅ App ready to work offline!');
      console.log('[PWA] Cache initialized, you can now use the app without internet');
    },
    onRegistered(registration) {
      console.log('[PWA] ✅ Service Worker registered successfully');
      console.log('[PWA] Registration:', registration);
      
      // Проверяем, что SW действительно активен
      if (registration) {
        console.log('[PWA] Active SW:', registration.active);
        console.log('[PWA] Installing SW:', registration.installing);
        console.log('[PWA] Waiting SW:', registration.waiting);
      }
    },
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] ✅ Service Worker registered at:', swUrl);
      console.log('[PWA] Scope:', registration?.scope);
    },
    onRegisterError(error) {
      console.error('[PWA] ❌ Service Worker registration failed:', error);
      console.error('[PWA] This might happen in:', {
        telegramWebView: navigator.userAgent.includes('Telegram'),
        private: window.navigator.userAgent.includes('Private'),
        incognito: !window.indexedDB,
      });
    },
  });
} else {
  console.log('[PWA] Development mode - Service Worker disabled');
}

// КРИТИЧНО: Инициализация Server Time Offset для защиты от неверного времени на устройстве
initServerTime().catch((error) => {
  console.error('[Main] Failed to init server time:', error);
});

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
console.log('[Main] ✅ Script loaded and imports completed', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent.substring(0, 50),
  location: window.location.href,
  readyState: document.readyState,
});

// Инициализация Telegram WebApp теперь происходит в useInitTelegram hook в App.tsx
// Это гарантирует правильный порядок инициализации

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

// КРИТИЧНО: Обработка глобальных ошибок для диагностики белого экрана
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
  
  // Отправляем в Rollbar, если это реальная ошибка
  if (event.error) {
    reportError(event.error, {
      type: 'uncaught_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  } else {
    // Если нет объекта error, отправляем как строку
    reportError(event.message, {
      type: 'uncaught_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const errorData = {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack,
    url: window.location.href,
  };
  
  console.error('[Unhandled Promise Rejection]', errorData);
  
  // Отправляем в Rollbar
  const error = event.reason instanceof Error 
    ? event.reason 
    : new Error(String(event.reason));
    
  reportError(error, {
    type: 'unhandled_promise_rejection',
    reason: String(event.reason),
  });
});

// КРИТИЧНО: Проверка существования root элемента перед рендерингом
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('[CRITICAL] Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;"><h1>Ошибка инициализации</h1><p>Элемент #root не найден в DOM</p></div>';
  throw new Error('Root element not found');
}

console.log('[Main] Starting React app initialization...');

try {
  const root = createRoot(rootElement);
  console.log('[Main] React root created successfully');
  
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <UserProvider>
            <LanguageProvider>
              <App />
            </LanguageProvider>
          </UserProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  );
  
  console.log('[Main] React app rendered successfully');
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
