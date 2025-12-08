/**
 * LightFallback - Легкий fallback для Suspense boundaries
 * Используется вместо PageLoader для предотвращения мерцаний
 * Показывает минимальный индикатор загрузки без полной перерисовки экрана
 */
export const LightFallback = () => (
  <div className="flex items-center justify-center py-8">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
  </div>
);

