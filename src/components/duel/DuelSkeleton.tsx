import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function DuelSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-6">
        <Card className="p-6 md:p-8 space-y-6">
          {/* Header skeleton */}
          <div className="space-y-3 text-center">
            <Skeleton className="w-12 h-12 mx-auto rounded-xl" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>

          {/* Code skeleton */}
          <div className="py-4">
            <div className="bg-muted/50 p-6 rounded-xl border-2 border-muted">
              <Skeleton className="h-12 w-32 mx-auto mb-2" />
              <Skeleton className="h-3 w-24 mx-auto" />
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>

          {/* Stats skeleton */}
          <div className="flex items-center justify-center gap-3">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>

          {/* Loading skeleton */}
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>

          <Skeleton className="h-11 w-full" />
        </Card>
      </div>
    </div>
  );
}

export default DuelSkeleton;

