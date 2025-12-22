import React from 'react';

export const DashboardSkeleton = React.memo(() => {
  return (
    <div className="min-h-screen bg-[#0f172a] p-6 md:p-10 font-sans pb-24 text-white selection:bg-indigo-500/30">
      <div className="max-w-[1370px] mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center mb-10">
          <div className="h-8 w-32 bg-indigo-500/10 border border-white/5 rounded-lg animate-pulse"></div>
        </div>

        {/* BENTO GRID Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Hero Card Skeleton */}
          <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 rounded-[2.5rem] bg-slate-900/40 border border-white/5 p-8 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent"></div>
            <div className="space-y-6 relative z-10">
              <div className="h-14 w-3/4 bg-white/5 rounded-2xl animate-pulse"></div>
              <div className="h-6 w-1/2 bg-white/5 rounded-xl animate-pulse"></div>
              <div className="flex justify-end pt-8">
                <div className="w-48 h-48 rounded-full bg-indigo-500/5 border border-indigo-500/10 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Daily Rewards Skeleton */}
          <div className="md:col-span-1 lg:col-span-1 lg:row-span-2 rounded-[2.5rem] bg-slate-900/40 border border-white/5 p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="h-6 w-32 bg-white/5 rounded-lg animate-pulse"></div>
              <div className="flex justify-center py-6">
                <div className="w-40 h-40 rounded-full border-4 border-white/5 border-t-indigo-500/20 animate-spin-slow"></div>
              </div>
            </div>
            <div className="h-14 w-full bg-white/5 rounded-2xl mt-auto animate-pulse"></div>
          </div>

          {/* Skily Chat Skeleton */}
          <div className="md:col-span-1 lg:col-span-1 lg:row-span-2 rounded-[2.5rem] bg-indigo-950/20 border border-indigo-500/10 p-8 flex flex-col items-center gap-8">
            <div className="w-40 h-40 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-pulse"></div>
            <div className="space-y-4 w-full">
              <div className="h-6 w-24 bg-white/5 rounded-lg mx-auto animate-pulse"></div>
              <div className="h-14 w-full bg-white/5 rounded-2xl animate-pulse"></div>
            </div>
          </div>

          {/* Exam Readiness Skeleton */}
          <div className="md:col-span-1 lg:col-span-1 rounded-[2.5rem] bg-slate-900/40 border border-white/5 p-8">
            <div className="space-y-6 flex flex-col items-center">
              <div className="h-6 w-32 bg-white/5 rounded-lg animate-pulse"></div>
              <div className="w-40 h-40 rounded-full border-8 border-white/5 border-l-indigo-500/20 animate-spin-slower"></div>
            </div>
          </div>

          {/* Premium Card Skeleton */}
          <div className="md:col-span-1 lg:col-span-1 rounded-[2.5rem] bg-zinc-950 border border-white/5 p-8">
            <div className="space-y-6">
              <div className="h-5 w-20 bg-white/5 rounded-full animate-pulse"></div>
              <div className="h-8 w-40 bg-indigo-500/10 rounded-xl animate-pulse"></div>
            </div>
          </div>

          {/* Audio Console Skeleton */}
          <div className="md:col-span-2 lg:col-span-2 rounded-[2.5rem] bg-slate-900/40 border border-white/5 p-7">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 bg-white/5 rounded-lg animate-pulse"></div>
              <div className="flex gap-3">
                <div className="w-14 h-14 bg-white/5 rounded-2xl animate-pulse"></div>
                <div className="w-14 h-14 bg-white/5 rounded-2xl animate-pulse"></div>
                <div className="w-14 h-14 bg-white/5 rounded-2xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

