/** Static loading placeholders (prerender-safe: no request-time APIs). */

export function ShellFallback() {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-56 shrink-0 border-r md:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b px-4">
          <div className="h-5 w-32 rounded bg-muted" />
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </main>
        <div className="h-[52px] border-t md:hidden" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
