import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // КРИТИЧНО: Автоматическая перезагрузка при ошибке загрузки чанка (Deploy update)
    // ALIGN WITH INDEX.HTML PROTECTION LOGIC
    if (
      error.message.includes('Importing a module script failed') ||
      error.message.includes('text/html') ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.name === 'ChunkLoadError'
    ) {
      console.error('[ErrorBoundary] Chunk load error detected. Attempting recovery...', error);

      const storageKey = 'module_reload_count';
      const timeKey = 'module_reload_time';

      const count = parseInt(localStorage.getItem(storageKey) || '0');
      const lastTime = parseInt(localStorage.getItem(timeKey) || '0');
      const now = Date.now();

      // Сбрасываем счетчик, если прошло больше 60 секунд
      const currentCount = (now - lastTime > 60000) ? 0 : count;

      if (currentCount < 3) {
        localStorage.setItem(storageKey, (currentCount + 1).toString());
        localStorage.setItem(timeKey, now.toString());

        console.log(`[ErrorBoundary] Reloading page (Attempt ${currentCount + 1}/3)...`);
        window.location.reload();
        return;
      } else {
        console.error('[ErrorBoundary] Reload limit exceeded. Showing error UI without auto-reload.');
        // Не вызываем reload(), позволяем React отрисовать Fallback UI ниже
      }
    }

    // Отправляем ошибку в Rollbar
    import('@/lib/rollbar')
      .then(({ reportError }) => {
        reportError(error, {
          type: 'react_boundary',
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      })
      .catch(() => {
        // fallback: тихо логируем в консоль, чтобы не ломать рендер
        console.warn('[ErrorBoundary] Rollbar not available, skipped reporting');
      });

    // Отправляем в Sentry
    import('@/utils/sentry').then(({ default: Sentry }) => {
      Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }).catch(() => {
      // Sentry not available
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // АРХИТЕКТУРА: Премиальный UI для Error Boundary (уровень Linear/Vercel/Stripe)
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6 text-center">
            {/* Иконка ошибки */}
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Заголовок */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">
                Ой, сбой системы! 🤖
              </h1>
              <p className="text-sm text-zinc-400">
                Что-то пошло не так. Не волнуйтесь, мы уже знаем об этом.
              </p>
            </div>

            {/* Сообщение об ошибке */}
            {this.state.error?.message && (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Детали ошибки
                </p>
                <p className="text-sm text-zinc-300 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
                className="w-full h-12 px-4 bg-white text-black font-semibold rounded-xl hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all duration-200 hover:scale-[1.01]"
              >
                Повторить попытку
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.href = '/';
                }}
                className="w-full h-12 px-4 bg-zinc-900 text-zinc-300 font-semibold rounded-xl border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all duration-200"
              >
                Вернуться на главную
              </button>
            </div>

            {/* Дополнительная информация (только в dev) */}
            {import.meta.env.DEV && this.state.error?.stack && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 mb-2">
                  Stack trace (dev only)
                </summary>
                <pre className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-auto max-h-64 font-mono">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

