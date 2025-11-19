import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function LearningMapSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-4 pb-8 lg:pt-6 lg:pb-10 space-y-8">
        {/* Hero Section Skeleton */}
        <section className="flex flex-col gap-6 lg:gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            {/* Left side - Title */}
            <div className="space-y-3 md:max-w-2xl">
              <Skeleton className="h-6 w-48 rounded-full" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-5 w-full max-w-lg" />
            </div>

            {/* Right side - Progress Cards */}
            <div className="w-full md:max-w-2xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Radial Progress Card */}
                <Card className="rounded-2xl border border-border bg-card px-4 py-5 flex items-center gap-4 shadow-sm">
                  <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </Card>

                {/* Linear Progress Card */}
                <Card className="rounded-2xl border border-border bg-card px-4 py-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </Card>
              </div>

              {/* CTA Button */}
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          </div>
        </section>

        {/* Modules Skeleton */}
        <div className="space-y-10">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="relative overflow-hidden rounded-2xl border border-border bg-card/80 dark:bg-card/90 backdrop-blur-sm px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5"
            >
              <div className="relative space-y-3 sm:space-y-4">
                {/* Header */}
                <div className="relative rounded-xl overflow-hidden p-2.5 sm:p-3 md:p-4 lg:p-5 flex flex-col gap-2.5 sm:gap-3 md:flex-row md:items-center md:justify-between min-h-[120px] sm:min-h-[140px] md:min-h-[160px]">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                      <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-full max-w-xs" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full max-w-2xl" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:items-center md:justify-end w-full sm:w-auto">
                    <Skeleton className="h-16 sm:h-14 w-full sm:w-32 rounded-lg sm:rounded-xl" />
                    <Skeleton className="h-10 w-full sm:w-24 rounded-lg sm:rounded-xl" />
                  </div>
                </div>

                {/* Sections Skeleton */}
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2].map((j) => (
                    <div
                      key={j}
                      className="rounded-lg sm:rounded-xl border border-border bg-muted/30 p-2.5 sm:p-3 md:p-4 space-y-2 sm:space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-4 w-8" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[1, 2, 3].map((k) => (
                          <Skeleton key={k} className="h-20 rounded-lg sm:rounded-xl" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


