import { Card, LineDots, PromoImg, Head } from "./shared";
import { ArrowRight, ArrowUp } from "lucide-react";
import { useStoreInsights } from "../lib/useStoreInsights";
import { formatDateRangeLong } from "./utils";
import { ChartSkeleton, StatCardsSkeleton } from "../components/common/Skeleton";
import { SavedCopyNote } from "../components/common/ConnectionStatus";

const EMPTY_VISITS = { data: [], max: 0, ticks: [], labels: [] };

// Dashboard tab
export function Dashboard({ promos, go, data, storeId }) {
  const { view, loading, error, savedAt } = useStoreInsights(storeId, 7);
  const stats = view?.dashboardStats || data?.stats || [];
  const visits = view?.visits || data?.visits || EMPTY_VISITS;
  const hasVisits = visits.data.some((v) => v > 0);
  const active = promos.filter((p) => p.active);
  return (
    <div className="tenant-dashboard">
      <Head title="Dashboard" />
      {savedAt && <SavedCopyNote savedAt={savedAt} />}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {loading && !view ? (
        <StatCardsSkeleton />
      ) : (
        <div className="mb-6 grid grid-cols-3 gap-6">
          {stats.map(([l, v, up, note]) => (
            <Card key={l} className="p-6">
              <p className="text-gray-500">{l}</p>
              <p className="my-1 text-4xl">{v}</p>
              {up ? (
                <p className="flex items-center gap-1 text-sm text-green-600">
                  <ArrowUp size={14} />
                  {up}
                </p>
              ) : (
                <p className="text-sm text-gray-500">{note}</p>
              )}
            </Card>
          ))}
        </div>
      )}
      <Card className="mb-6 p-6">
        <h3 className="mb-1 text-xl">Customer Visits (Last 7 Days)</h3>
        <p className="mb-6 text-sm text-gray-500">
          NavAR app users who chose your store as their navigation destination.
        </p>
        {loading && !view ? (
          <ChartSkeleton />
        ) : hasVisits ? (
          <LineDots data={visits.data} max={visits.max} ticks={visits.ticks} labels={visits.labels} />
        ) : (
          <p className="py-10 text-center text-sm text-gray-400">
            No customer visits in the last 7 days yet.
          </p>
        )}
      </Card>
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl">Active Promotions</h3>
          <button
            onClick={() => go("Promotions")}
            className="flex items-center gap-1 text-sm"
          >
            View All <ArrowRight size={14} />
          </button>
        </div>
        <div className="space-y-4">
          {active.length === 0 && (
            <p className="text-sm text-gray-400">No active promotions.</p>
          )}
          {active.map((p, i) => (
            <button
              type="button"
              key={p.id}
              onClick={() => go("Promotions")}
              className={`flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50 ${i % 2 ? "bg-slate-50" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-4">
                <PromoImg src={p.image} />
                <div className="min-w-0">
                  <p className="text-base font-medium">{p.title}</p>
                  <p className="text-sm text-gray-600">{p.desc}</p>
                  <p className="text-xs text-gray-500">
                    {formatDateRangeLong(p.start, p.end)}
                  </p>
                </div>
              </div>
              <div className="ml-6 w-44 shrink-0 text-right">
                <p className="whitespace-nowrap text-sm text-gray-500">Visits from email</p>
                <p className="text-xl">{(p.emailVisits ?? 0).toLocaleString()}</p>
                {p.emailed > 0 && (
                  <p className="whitespace-nowrap text-xs text-gray-500">
                    of {p.emailed.toLocaleString()} emailed
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
