import { useState } from "react";
import { ArrowUp, Download } from "lucide-react";
import {
  Card,
  Btn,
  Head,
  Frame,
  LineDots,
  Bar,
  Pie,
  StyledSelect,
} from "./shared";
import { downloadCsv, useMounted, today } from "./utils";
import { ANALYTICS_RANGES } from "../lib/storeInsights";
import { useStoreInsights } from "../lib/useStoreInsights";
import { ChartSkeleton, Skeleton, StatCardsSkeleton } from "../components/common/Skeleton";

const EMPTY_SERIES = { data: [], max: 0, ticks: [], labels: [] };

const PieSkeleton = () => (
  <div className="flex flex-col items-center gap-4 py-4" aria-hidden="true">
    <Skeleton className="h-44 w-44 rounded-full" />
    <Skeleton className="h-4 w-40" />
  </div>
);

export function Analytics({ profile, data, storeId }) {
  const on = useMounted();
  const [range, setRange] = useState(ANALYTICS_RANGES[0].label);
  const days = ANALYTICS_RANGES.find((r) => r.label === range)?.days || 7;
  const { view, loading, error } = useStoreInsights(storeId, days);
  const analytics = view || data || {};
  const live = Boolean(storeId);
  const firstLoad = loading && !view;

  const stats = analytics.stats || [];
  const visits = analytics.visits || EMPTY_SERIES;
  const peak = analytics.peak || { data: [], max: 0, ticks: [], tips: [] };
  const pLabels = analytics.pLabels || peak.labels || [];
  const age = analytics.age || [];
  const gender = analytics.gender || [];
  const perf = analytics.perf || [];
  const performance = analytics.performance || { max: 0, ticks: [] };
  const hasVisits = visits.data.some((v) => v > 0);
  const hasPeak = peak.data.some((v) => v > 0);
  const hasPromoActivity = perf.some(([, e, o, v]) => e > 0 || o > 0 || v > 0);

  const exportCsv = () =>
    downloadCsv(`${profile?.name || "store"}-analytics-${today()}.csv`, [
      [`${profile?.name || "Store"} - Analytics Report`],
      ["Period", range],
      ["Exported", new Date().toLocaleString()],
      [],
      ["Summary"],
      ...stats.map(([label, value]) => [label, value]),
      [],
      ["Customer Visits Over Time"],
      ["Date", "Visits"],
      ...visits.labels.map((l, i) => [l, visits.data[i]]),
      [],
      ["Peak Visit Times"],
      ["Time", "Visits"],
      ...pLabels.map((l, i) => [l, peak.data[i]]),
      [],
      ["Age Distribution"],
      ["Age Group", "Percent", "Visitors"],
      ...age.map(([l, v, , n]) => [l, `${v}%`, n ?? ""]),
      [],
      ["Gender Distribution"],
      ["Gender", "Percent", "Visitors"],
      ...gender.map(([l, v, , n]) => [l, `${v}%`, n ?? ""]),
      [],
      ["Promotion Performance"],
      ["Promotion", "Emailed", "Opened (estimate)", "Visits from email"],
      ...perf.map(([n, e, o, v]) => [n, e || 0, o || 0, v || 0]),
    ]);

  const empty = (text) => <p className="py-10 text-center text-sm text-gray-400">{text}</p>;

  return (
    <>
      <Head
        title="Analytics"
        sub="Track your store performance and customer insights"
        right={
          <StyledSelect
            value={range}
            options={ANALYTICS_RANGES.map((r) => r.label)}
            onChange={setRange}
            className="w-40"
          />
        }
      />
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {firstLoad ? (
        <StatCardsSkeleton />
      ) : (
        <div className={`mb-6 grid grid-cols-3 gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {stats.map(([label, value, change, note]) => (
            <Card key={label} className="p-6">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="my-1 text-4xl">{value}</p>
              {change ? (
                <p className="flex items-center gap-1 text-sm text-green-600">
                  <ArrowUp size={14} />
                  {change}
                </p>
              ) : (
                <p className="text-sm text-gray-500">{note}</p>
              )}
            </Card>
          ))}
        </div>
      )}
      <Card className="mb-6 p-6">
        <h3 className="mb-1 text-xl">Customer Visits Over Time</h3>
        <p className="mb-6 text-sm text-gray-500">
          NavAR app users who chose your store as their navigation destination.
        </p>
        {firstLoad
          ? <ChartSkeleton />
          : hasVisits || !live
            ? <LineDots key={range} data={visits.data} max={visits.max} ticks={visits.ticks} labels={visits.labels} />
            : empty(`No customer visits in the ${range.toLowerCase()}.`)}
      </Card>
      <Card className="mb-6 p-6">
        <h3 className="mb-1 text-xl">Peak Visit Times</h3>
        <p className="mb-6 text-sm text-gray-500">When navigation to your store starts (Philippine time).</p>
        {firstLoad ? (
          <ChartSkeleton />
        ) : hasPeak || !live ? (
          <Frame ticks={peak.ticks} max={peak.max} labels={pLabels} h="h-64">
            <div className="absolute inset-0 flex">
              {peak.data.map((v, i) => (
                <div key={i} className="flex h-full flex-1 items-end justify-center">
                  <Bar
                    value={v}
                    max={peak.max}
                    on={on}
                    delay={i * 80}
                    tip={peak.tips?.[i] || `${pLabels[i] || ""}: ${v} visits`}
                  />
                </div>
              ))}
            </div>
          </Frame>
        ) : (
          empty("No visits to show yet.")
        )}
      </Card>
      <div className="mb-6 grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl">Age Distribution</h3>
          {firstLoad ? (
            <PieSkeleton />
          ) : (
            <>
              {analytics.ageBasis && <p className="text-sm text-gray-500">{analytics.ageBasis}</p>}
              {age.length || !analytics.ageNote ? <Pie slices={age} /> : empty(analytics.ageNote)}
            </>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="text-xl">Gender Distribution</h3>
          {firstLoad ? (
            <PieSkeleton />
          ) : (
            <>
              {analytics.genderBasis && <p className="text-sm text-gray-500">{analytics.genderBasis}</p>}
              {gender.length || !analytics.genderNote ? <Pie slices={gender} /> : empty(analytics.genderNote)}
            </>
          )}
        </Card>
      </div>
      <Card className="mb-6 p-6">
        <h3 className="mb-1 text-xl">Promotion Performance</h3>
        <p className="mb-6 text-sm text-gray-500">
          How your promotion emails did: inboxes reached, people who opened
          the email (an estimate), and people who navigated to your store in
          the NavAR app within 7 days of receiving it.
        </p>
        {firstLoad ? (
          <ChartSkeleton />
        ) : perf.length === 0 ? (
          empty("No promotions yet.")
        ) : (
          <>
            <Frame
              ticks={performance.ticks}
              max={performance.max}
              labels={perf.map((p) => p[0])}
              h="h-64"
              legend={
                <div className="mt-3 flex justify-center gap-5 text-sm">
                  <span className="flex items-center gap-2 text-gray-500">
                    <i className="h-3 w-3 bg-gray-300" />
                    emailed
                  </span>
                  <span className="flex items-center gap-2 text-sky-600">
                    <i className="h-3 w-3 bg-sky-300" />
                    opened (estimate)
                  </span>
                  <span className="flex items-center gap-2 text-[#2563eb]">
                    <i className="h-3 w-3 bg-[#2563eb]" />
                    visits from email
                  </span>
                </div>
              }
            >
              <div className="absolute inset-0 flex">
                {perf.map(([n, e, o, v], i) => (
                  <div key={`${n}-${i}`} className="flex h-full flex-1 items-end justify-center gap-1">
                    <Bar
                      value={e || 0}
                      max={performance.max}
                      on={on}
                      delay={i * 100}
                      width="w-1/5"
                      color="bg-gray-300"
                      tip={`${n}: emailed to ${Number(e || 0).toLocaleString()}`}
                    />
                    <Bar
                      value={o || 0}
                      max={performance.max}
                      on={on}
                      delay={i * 100 + 50}
                      width="w-1/5"
                      color="bg-sky-300"
                      tip={`${n}: about ${Number(o || 0).toLocaleString()} opened`}
                    />
                    <Bar
                      value={v || 0}
                      max={performance.max}
                      on={on}
                      delay={i * 100 + 100}
                      width="w-1/5"
                      color="bg-[#2563eb]"
                      tip={`${n}: ${Number(v || 0).toLocaleString()} visited within 7 days`}
                    />
                  </div>
                ))}
              </div>
            </Frame>
            {live && !hasPromoActivity && (
              <p className="mt-3 text-center text-sm text-gray-400">
                No promotion emails sent yet. Turn on &ldquo;Notify Registered
                Users&rdquo; when creating a promotion.
              </p>
            )}
          </>
        )}
      </Card>
      <Card className="flex items-center justify-between p-6">
        <p className="text-sm text-gray-500">
          Download all the data on this page as a CSV file.
        </p>
        <Btn onClick={exportCsv} className="py-2! text-sm">
          <Download size={16} />
          Export
        </Btn>
      </Card>
    </>
  );
}
