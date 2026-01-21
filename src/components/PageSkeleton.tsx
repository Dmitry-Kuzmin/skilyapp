import { StartupCurtain } from "@/components/StartupCurtain";

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <StartupCurtain />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-zinc-800/50 rounded-lg w-1/3 animate-pulse" />
          <div className="h-4 bg-zinc-800/30 rounded-lg w-2/3 animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 animate-pulse"
            >
              <div className="h-6 bg-zinc-800/50 rounded w-3/4" />
              <div className="h-4 bg-zinc-800/30 rounded w-full" />
              <div className="h-4 bg-zinc-800/30 rounded w-5/6" />
              <div className="h-10 bg-zinc-800/50 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
