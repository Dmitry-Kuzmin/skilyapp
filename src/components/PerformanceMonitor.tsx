import { useState, useEffect } from 'react';
import { performanceMonitor } from '@/utils/performance';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Activity } from 'lucide-react';

/**
 * Компонент для отображения метрик производительности (только в dev режиме)
 */
export function PerformanceMonitor() {
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen || !performanceMonitor) return;

    const interval = setInterval(() => {
      const allMetrics = performanceMonitor.getMetrics();
      const grouped: Record<string, number[]> = {};

      allMetrics.forEach((m) => {
        if (!grouped[m.name]) {
          grouped[m.name] = [];
        }
        grouped[m.name].push(m.value);
      });

      const averages: Record<string, number> = {};
      Object.entries(grouped).forEach(([name, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        averages[name] = Math.round(avg * 100) / 100;
      });

      setMetrics(averages);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Показываем только в dev режиме
  if (import.meta.env.PROD) return null;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 rounded-full w-12 h-12 p-0 shadow-lg"
        variant="outline"
        size="icon"
      >
        <Activity className="w-5 h-5" />
      </Button>
    );
  }

  const webVitals = performanceMonitor?.getWebVitals();

  return (
    <Card className="fixed bottom-20 right-4 z-50 w-80 max-h-96 overflow-auto shadow-2xl">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">Performance Monitor</h3>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
            className="h-6 w-6"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {webVitals && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Web Vitals</h4>
            <div className="text-xs space-y-1">
              <div>TTFB: {webVitals.TTFB.toFixed(0)}ms</div>
              <div>TTI: {webVitals.TTI.toFixed(0)}ms</div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Metrics</h4>
          <div className="text-xs space-y-1 max-h-48 overflow-auto">
            {Object.entries(metrics)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 20)
              .map(([name, value]) => (
                <div key={name} className="flex justify-between">
                  <span className="truncate">{name}</span>
                  <span className="ml-2 font-mono">
                    {value > 1000 ? `${(value / 1000).toFixed(1)}s` : `${value.toFixed(0)}ms`}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

















