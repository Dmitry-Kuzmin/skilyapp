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

// Инициализация Telegram WebApp теперь происходит в useInitTelegram hook в App.tsx
// Это гарантирует правильный порядок инициализации

// Регистрация Service Worker для кэширования
// ВРЕМЕННО ОТКЛЮЧЕНО для диагностики белого экрана
// Раскомментируйте после исправления проблемы
if ('serviceWorker' in navigator && import.meta.env.PROD && false) {
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
});

// КРИТИЧНО: Обработка глобальных ошибок для диагностики белого экрана
window.addEventListener('error', (event) => {
  console.error('[Global Error]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack,
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
