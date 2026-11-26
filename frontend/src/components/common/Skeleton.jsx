
import { readTheme } from "../../lib/theme";

// Loading placeholder block
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

// Stat cards placeholder
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

// Chart placeholder
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

// List placeholder
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

// Portal placeholder
export function PortalSkeleton() {
  let collapsed = false;
  try {
    collapsed = localStorage.getItem("tenant-sidebar-collapsed") === "1";
  } catch {
    // No storage: expanded
  }
  return (
    <div className={`tenant-portal flex min-h-screen bg-slate-50 ${readTheme() === "dark" ? "theme-dark" : ""}`} role="status" aria-live="polite" aria-label="Loading your store">
      <aside
        className={`tenant-sidebar sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div
          className={`flex h-[73px] items-center gap-2 border-b border-slate-200 ${
            collapsed ? "justify-center px-3" : "pl-6 pr-3"
          }`}
        >
          {!collapsed && <Skeleton className="h-6 flex-1" />}
          <Skeleton className="h-9 w-9 shrink-0" />
        </div>
        <div className={`flex-1 space-y-1 ${collapsed ? "p-3" : "p-4"}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg py-3 ${collapsed ? "justify-center" : "px-4"}`}
            >
              <Skeleton className="h-5 w-5 shrink-0" />
              {!collapsed && <Skeleton className="h-4 w-28" />}
            </div>
          ))}
        </div>
        <div
          className={`flex items-center gap-2 border-t border-slate-200 ${
            collapsed ? "flex-col p-3" : "p-4"
          }`}
        >
          <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? "" : "min-w-0 flex-1"}`}>
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-3 w-28" />
              </div>
            )}
          </div>
          <Skeleton className="h-9 w-9 shrink-0" />
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

// Login placeholder
export function LoginSkeleton() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-linear-to-b from-sky-400 via-sky-200 to-white to-70% p-8"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="grid w-full max-w-6xl items-center gap-16 md:grid-cols-2">
        <div className="hidden flex-col items-center md:flex">
          <Skeleton className="h-40 w-95 rounded-3xl bg-white/50" />
          <Skeleton className="mt-6 h-8 w-80 bg-white/60" />
        </div>
        <div className="w-full max-w-md">
          <Skeleton className="h-14 w-60 bg-white/60" />
          <Skeleton className="mb-10 mt-3 h-6 w-72 bg-white/60" />
          <Skeleton className="mb-4 h-16 w-full rounded-2xl border border-sky-200 bg-sky-50/80" />
          <Skeleton className="h-16 w-full rounded-2xl border border-sky-200 bg-sky-50/80" />
          <div className="mb-6 mt-3.5 flex justify-end">
            <Skeleton className="h-4 w-32 bg-sky-100" />
          </div>
          <Skeleton className="h-15 w-full rounded-2xl bg-sky-300/70" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
