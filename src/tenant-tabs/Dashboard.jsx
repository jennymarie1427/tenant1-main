import { Card, LineDots, PromoImg, Head } from "./shared";
import { ArrowRight, ArrowUp } from "lucide-react";

export function Dashboard({ promos, go, data }) {
  const active = promos.filter((p) => p.active);
  return (
    <div className="tenant-dashboard">
      <Head title="Dashboard" />
      <div className="mb-6 grid grid-cols-3 gap-6">
        {data.stats.map(([l, v, up, note]) => (
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
      <Card className="mb-6 p-6">
        <h3 className="mb-6 text-xl">Customer Visits (Last 7 Days)</h3>
        <LineDots
          data={data.visits.data}
          max={data.visits.max}
          ticks={data.visits.ticks}
          labels={data.visits.labels}
        />
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
          {active.map((p, i) => (
            <button
              type="button"
              key={p.id}
              onClick={() => go("Promotions")}
              className={`flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50 ${i % 2 ? "bg-slate-50" : ""}`}
            >
              <div className="flex items-center gap-4">
                <PromoImg src={p.image} />
                <div>
                  <p className="text-base font-medium">{p.title}</p>
                  <p className="text-sm text-gray-600">{p.desc}</p>
                  <p className="text-xs text-gray-500">
                    {p.start} - {p.end}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Clicks</p>
                <p className="text-xl">{p.clicks.toLocaleString()}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
