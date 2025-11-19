import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function SubtopicDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-full max-w-md" />
          </div>
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
      </div>

      {/* Navigation Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>

      {/* Material Content Skeleton */}
      <Card className="p-6 md:p-8">
        <div className="space-y-6">
          {/* Title */}
          <Skeleton className="h-8 w-full max-w-2xl" />

          {/* Content paragraphs */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}

          {/* Image placeholder */}
          <Skeleton className="h-64 w-full rounded-lg" />

          {/* More content */}
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </Card>

      {/* Language Terms Skeleton */}
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 border border-border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}



