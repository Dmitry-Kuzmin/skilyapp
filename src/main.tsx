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

// Инициализируем Rollbar в начале приложения
initRollbar();

// КРИТИЧНО: Логирование сразу после импортов для диагностики
console.log('[Main] ✅ Script loaded and imports completed', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent.substring(0, 50),
  location: window.location.href,
  readyState: document.readyState,
});

// Инициализация Telegram WebApp теперь происходит в useInitTelegram hook в App.tsx
// Это гарантирует правильный порядок инициализации

// КРИТИЧНО: Регистрация Service Worker для кэширования и offline режима
// Включено для поддержки offline режима в тестах
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Сначала отключаем все существующие Service Workers
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        console.log('[SW] Unregistered old Service Worker:', success);
      });
    }
  });
  
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });
  });
}

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
