/**
 * Утилита для мониторинга Web Vitals метрик
 * Отслеживает производительность приложения
 */

import { useEffect } from 'react';

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

type ReportHandler = (metric: WebVitalsMetric) => void;

// Функция для отправки метрик на сервер (опционально)
const sendToAnalytics = (metric: WebVitalsMetric) => {
  // Можно отправить в Supabase, Google Analytics, или другой сервис
  if (import.meta.env.PROD) {
    // Пример отправки в Supabase
    // supabase.from('web_vitals').insert({
    //   name: metric.name,
    //   value: metric.value,
    //   rating: metric.rating,
    //   user_id: profileId,
    //   url: window.location.href,
    // });
    
    // Логируем в консоль для отладки
    console.log('[Web Vitals]', metric.name, {
      value: metric.value,
      rating: metric.rating,
      url: window.location.href,
    });
    
    // Отправляем плохие метрики в Rollbar как предупреждение
    if (metric.rating === 'poor') {
      import('@/lib/rollbar')
        .then(({ getRollbar, reportWarning }) => {
          const rollbar = getRollbar();
          if (rollbar) {
            rollbar.info(
              `Web Vitals ${metric.name} is poor`,
              {
                metric: metric.name,
                value: metric.value,
                rating: metric.rating,
                url: window.location.href,
                navigationType: metric.navigationType,
              },
              { level: 'warning' }
            );
          } else {
            reportWarning(`Web Vitals ${metric.name} is poor: ${metric.value}ms`, {
              metric: metric.name,
              value: metric.value,
              rating: metric.rating,
              url: window.location.href,
            });
          }
        })
        .catch(() => {
          console.warn('[WebVitals] Rollbar not available to report metric', metric.name);
        });
    }
  }
};

// Функция для получения рейтинга метрики
const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],
    FID: [100, 300],
    FCP: [1800, 3000],
    LCP: [2500, 4000],
    TTFB: [800, 1800],
    INP: [200, 500],
  };

  const [good, poor] = thresholds[name] || [0, Infinity];
  
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
};

// Функция для измерения метрик
export const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    // LCP - Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
        renderTime?: number;
        loadTime?: number;
      };
      
      const value = lastEntry.renderTime || lastEntry.loadTime || 0;
      const metric: WebVitalsMetric = {
        name: 'LCP',
        value,
        rating: getRating('LCP', value),
        delta: value,
        id: `lcp-${Date.now()}`,
        navigationType: 'navigate',
      };
      
      onPerfEntry(metric);
      sendToAnalytics(metric);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID - First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        const value = entry.processingStart - entry.startTime;
        const metric: WebVitalsMetric = {
          name: 'FID',
          value,
          rating: getRating('FID', value),
          delta: value,
          id: `fid-${Date.now()}`,
          navigationType: 'navigate',
        };
        
        onPerfEntry(metric);
        sendToAnalytics(metric);
      });
    }).observe({ entryTypes: ['first-input'] });

    // CLS - Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      const metric: WebVitalsMetric = {
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        delta: clsValue,
        id: `cls-${Date.now()}`,
        navigationType: 'navigate',
      };
      
      onPerfEntry(metric);
      sendToAnalytics(metric);
    }).observe({ entryTypes: ['layout-shift'] });

    // FCP - First Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          const value = entry.startTime;
          const metric: WebVitalsMetric = {
            name: 'FCP',
            value,
            rating: getRating('FCP', value),
            delta: value,
            id: `fcp-${Date.now()}`,
            navigationType: 'navigate',
          };
          
          onPerfEntry(metric);
          sendToAnalytics(metric);
        }
      });
    }).observe({ entryTypes: ['paint'] });

    // TTFB - Time to First Byte
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.responseStart > 0) {
          const value = entry.responseStart - entry.requestStart;
          const metric: WebVitalsMetric = {
            name: 'TTFB',
            value,
            rating: getRating('TTFB', value),
            delta: value,
            id: `ttfb-${Date.now()}`,
            navigationType: 'navigate',
          };
          
          onPerfEntry(metric);
          sendToAnalytics(metric);
        }
      });
    }).observe({ entryTypes: ['navigation'] });
  }
};

// Хук для использования в компонентах
export const useWebVitals = () => {
  useEffect(() => {
    reportWebVitals((metric) => {
      // Можно добавить логику обработки метрик
      console.log('[Web Vitals]', metric);
    });
  }, []);
};


