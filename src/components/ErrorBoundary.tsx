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
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // Отправляем ошибку в Rollbar
    import('@/lib/rollbar')
      .then(({ reportError }) => {
        reportError(error, {
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

      return (
        <div style={{
          padding: '20px',
          color: '#dc2626',
          backgroundColor: '#fef2f2',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
            Произошла ошибка
          </h1>
          <p style={{ marginBottom: '16px' }}>
            {this.state.error?.message || 'Неизвестная ошибка'}
          </p>
          {this.state.error?.stack && (
            <details style={{ marginTop: '16px', width: '100%', maxWidth: '800px' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                Детали ошибки
              </summary>
              <pre style={{
                background: '#f5f5f5',
                padding: '12px',
                overflow: 'auto',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

