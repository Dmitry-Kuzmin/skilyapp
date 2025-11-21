import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type ModalSkeletonVariant = 'default' | 'shop' | 'duelPass' | 'profile';

interface ModalSkeletonProps {
  variant?: ModalSkeletonVariant;
  className?: string;
}

/**
 * Единый компонент skeleton для всех модалок
 * Используется для показа состояния загрузки с фиксированной высотой
 */
export function ModalSkeleton({ variant = 'default', className }: ModalSkeletonProps) {
  const variants = {
    default: <DefaultSkeleton />,
    shop: <ShopSkeleton />,
    duelPass: <DuelPassSkeleton />,
    profile: <ProfileSkeleton />,
  };

  return (
    <div className={cn('space-y-6 px-6 py-6', className)}>
      {variants[variant]}
    </div>
  );
}

/**
 * Skeleton для магазина
 */
function ShopSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Skeleton className="h-10 w-24 rounded-t-lg" />
        <Skeleton className="h-10 w-24 rounded-t-lg" />
        <Skeleton className="h-10 w-24 rounded-t-lg" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Skeleton для Duel Pass
 */
function DuelPassSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-6 w-16 ml-auto" />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* SP Cards */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-lg" />
        ))}
      </div>

      {/* Premium Banner */}
      <Skeleton className="h-24 w-full rounded-xl" />

      {/* Rewards Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-muted/50 border-b">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="grid grid-cols-5 gap-2 px-4 py-3 border-b last:border-b-0">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-6 w-12 rounded" />
              <Skeleton className="h-8 w-20 rounded-lg mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Skeleton для профиля
 */
function ProfileSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2 p-4 border rounded-lg">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}

/**
 * Базовый skeleton по умолчанию
 */
function DefaultSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="space-y-3 pb-4 border-b">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Content */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}


