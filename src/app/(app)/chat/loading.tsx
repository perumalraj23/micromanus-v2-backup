export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 py-10">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground shadow-sm" aria-live="polite">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
        <span>Connecting to MicroManus...</span>
      </div>
    </div>
  );
}
