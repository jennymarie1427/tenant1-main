// Skeleton placeholders: soft grey blocks shaped like the real content that
// pulse while data loads.

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

export function StatCardsSkeleton({ count = 3 }) {
  return (
    <div className={`mb-6 grid gap-6 ${count === 4 ? "grid-cols-4" : "grid-cols-3"}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-9 w-16" />
          <Skeleton className="mt-3 h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

// A placeholder chart: y-axis ticks plus bars of varying heights.
export function ChartSkeleton({ height = "h-64" }) {
  const bars = [35, 55, 25, 70, 45, 85, 30];
  return (
    <div className={`flex ${height} items-end gap-4 border-b border-l border-slate-200 px-4 pt-4`} aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-md bg-slate-200/80"
          style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 2 }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 px-4 py-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-3 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
          <Skeleton className="h-10 w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// Whole tenant portal while the signed-in workspace loads.
export function PortalSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50" role="status" aria-live="polite" aria-label="Loading your store">
      <aside className="flex h-screen w-64 shrink-0 flex-col bg-sky-100/70">
        <div className="border-b border-sky-200 px-6 py-5">
          <Skeleton className="h-6 w-32 bg-sky-200/80" />
        </div>
        <div className="flex-1 space-y-2 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-3">
              <Skeleton className="h-5 w-5 bg-sky-200/80" />
              <Skeleton className="h-4 w-28 bg-sky-200/80" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-sky-200 p-4">
          <Skeleton className="h-10 w-10 rounded-full bg-sky-200/80" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 bg-sky-200/80" />
            <Skeleton className="mt-2 h-3 w-20 bg-sky-200/80" />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <StatCardsSkeleton />
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <Skeleton className="mb-2 h-5 w-56" />
          <Skeleton className="mb-6 h-3 w-80" />
          <ChartSkeleton />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <Skeleton className="mb-5 h-5 w-40" />
          <ListSkeleton />
        </div>
        <span className="sr-only">Loading your store…</span>
      </main>
    </div>
  );
}

// Login card while the app checks whether you're signed in.
export function LoginSkeleton() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-400 via-sky-200 to-white to-70% p-8"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex w-full max-w-5xl items-center gap-16">
        <div className="hidden flex-1 flex-col items-center gap-6 md:flex">
          <Skeleton className="h-32 w-32 rounded-3xl bg-white/60" />
          <Skeleton className="h-12 w-64 bg-sky-100" />
          <Skeleton className="h-5 w-56 bg-sky-100" />
        </div>
        <div className="w-full max-w-md flex-1">
          <Skeleton className="h-12 w-56 bg-white/60" />
          <Skeleton className="mt-3 h-4 w-64 bg-white/60" />
          <Skeleton className="mt-8 h-16 w-full rounded-2xl border border-sky-200 bg-sky-50" />
          <Skeleton className="mt-5 h-16 w-full rounded-2xl border border-sky-200 bg-sky-50" />
          <Skeleton className="mt-8 h-14 w-full rounded-2xl bg-sky-200" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
