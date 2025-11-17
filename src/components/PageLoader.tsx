export const PageLoader = () => (
  <div className="flex min-h-[40vh] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <span>Загрузка...</span>
    </div>
  </div>
);

