/**
 * Утилиты для мониторинга производительности
 */

import { useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initObservers();
    }
  }

  private initObservers() {
    // Мониторинг Long Tasks (блокирующие задачи)
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('[Performance] Long Task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
            });
            this.recordMetric('long-task', entry.duration);
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (e) {
      // Long Task API может быть недоступен
    }

    // Мониторинг Navigation Timing
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordNavigationMetrics(navEntry);
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);
    } catch (e) {
      // Fallback для старых браузеров
    }

    // Мониторинг Resource Timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.duration > 1000) {
              console.warn('[Performance] Slow resource:', {
                name: resourceEntry.name,
                duration: resourceEntry.duration,
                type: resourceEntry.initiatorType,
              });
            }
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (e) {
      // Fallback
    }
  }

  private recordNavigationMetrics(nav: PerformanceNavigationTiming) {
    const metrics = {
      'dom-content-loaded': nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
      'load-complete': nav.loadEventEnd - nav.loadEventStart,
      'first-byte': nav.responseStart - nav.requestStart,
      'dns': nav.domainLookupEnd - nav.domainLookupStart,
      'tcp': nav.connectEnd - nav.connectStart,
      'ssl': nav.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.recordMetric(name, value);
      }
    });
  }

  recordMetric(name: string, value: number) {
    this.metrics.push({
      name,
      value,
      timestamp: performance.now(),
    });

    // Храним только последние 100 метрик
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      if (duration > 100) {
        console.warn(`[Performance] Slow function "${name}": ${duration.toFixed(2)}ms`);
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}-error`, duration);
      throw error;
    }
  }

  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      if (duration > 500) {
        console.warn(`[Performance] Slow async function "${name}": ${duration.toFixed(2)}ms`);
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}-error`, duration);
      throw error;
    }
  }

  getMetrics() {
    return [...this.metrics];
  }

  getAverageMetric(name: string): number {
    const filtered = this.metrics.filter((m) => m.name === name);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return sum / filtered.length;
  }

  getWebVitals() {
    if (typeof window === 'undefined') return null;

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!nav) return null;

    return {
      FCP: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
      LCP: 0, // Нужен специальный observer
      FID: 0, // Нужен специальный observer
      CLS: 0, // Нужен специальный observer
      TTFB: nav.responseStart - nav.requestStart,
      TTI: nav.domInteractive - nav.fetchStart,
    };
  }

  cleanup() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMonitor = typeof window !== 'undefined' ? new PerformanceMonitor() : null;

// React Hook для измерения производительности компонентов
export function usePerformanceMeasure(componentName: string) {
  useEffect(() => {
    // Только в браузере (не SSR)
    if (typeof window === 'undefined') return;
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (performanceMonitor) {
        performanceMonitor.recordMetric(`component-${componentName}`, duration);
      }
    };
  }, [componentName]);
}

// Утилита для измерения времени рендеринга
export function measureRenderTime(componentName: string) {
  if (typeof window === 'undefined') return () => { };

  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    if (performanceMonitor) {
      performanceMonitor.recordMetric(`render-${componentName}`, duration);
      if (duration > 16) { // Больше одного кадра (60fps = 16.67ms)
        console.warn(`[Performance] Slow render for "${componentName}": ${duration.toFixed(2)}ms`);
      }
    }
  };
}

