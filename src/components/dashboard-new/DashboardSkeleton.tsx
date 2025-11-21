import React from 'react';

export const DashboardSkeleton = React.memo(() => {
  return (
    <div className="min-h-screen bg-[#0f172a] p-6 md:p-10 font-sans pb-24 text-white">
      <div className="max-w-[1370px] mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center mb-6">
          <div className="h-8 w-32 bg-slate-700 rounded-lg animate-pulse"></div>
        </div>

        {/* BENTO GRID Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Hero Card Skeleton */}
          <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 rounded-[2.5rem] bg-slate-800/50 p-8 md:p-10 animate-pulse">
            <div className="space-y-4">
              <div className="h-12 w-64 bg-slate-700 rounded-lg"></div>
              <div className="h-6 w-48 bg-slate-700 rounded-lg"></div>
              <div className="flex justify-end">
                <div className="w-40 h-40 rounded-full bg-slate-700"></div>
              </div>
            </div>
          </div>

          {/* Daily Rewards Skeleton */}
          <div className="md:col-span-1 lg:col-span-1 lg:row-span-2 rounded-[2.5rem] bg-slate-800/50 p-8 animate-pulse">
            <div className="space-y-6">
              <div className="h-6 w-32 bg-slate-700 rounded"></div>
              <div className="flex justify-center">
                <div className="w-40 h-40 rounded-full bg-slate-700"></div>
              </div>
              <div className="h-10 w-full bg-slate-700 rounded-2xl"></div>
            </div>
          </div>

          {/* Skily Chat Skeleton */}
          <div className="md:col-span-1 lg:col-span-1 lg:row-span-2 rounded-[2.5rem] bg-slate-800/50 p-8 animate-pulse">
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-36 h-36 rounded-full bg-slate-700"></div>
              </div>
              <div className="h-6 w-24 bg-slate-700 rounded mx-auto"></div>
              <div className="h-12 w-full bg-slate-700 rounded-xl"></div>
            </div>
          </div>

          {/* Exam Readiness Skeleton */}
          <div className="md:col-span-1 lg:col-span-1 rounded-[2.5rem] bg-slate-800/50 p-8 animate-pulse">
            <div className="space-y-6">
              <div className="h-6 w-32 bg-slate-700 rounded mx-auto"></div>
              <div className="flex justify-center">
                <div className="w-48 h-48 rounded-full bg-slate-700"></div>
              </div>
            </div>
          </div>

          {/* Premium Card Skeleton */}
          <div className="md:col-span-1 lg:col-span-1 rounded-[2.5rem] bg-slate-950 p-8 animate-pulse">
            <div className="space-y-4">
              <div className="h-6 w-24 bg-slate-700 rounded"></div>
              <div className="h-8 w-40 bg-slate-700 rounded"></div>
            </div>
          </div>

          {/* Audio Console Skeleton */}
          <div className="md:col-span-2 lg:col-span-2 rounded-[2.5rem] bg-slate-800/50 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 bg-slate-700 rounded"></div>
              <div className="flex gap-2">
                <div className="w-12 h-12 bg-slate-700 rounded-xl"></div>
                <div className="w-12 h-12 bg-slate-700 rounded-xl"></div>
                <div className="w-12 h-12 bg-slate-700 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

