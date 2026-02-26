export function PageSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center p-10 min-h-[50vh] w-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/5 border-t-indigo-500 animate-spin" />
      </div>
    </div>
  );
}
