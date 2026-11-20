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
  downloadCsv,
  useMounted,
  today,
} from "./shared";

export function Analytics({ profile, data }) {
  const analytics = data || {};
  const on = useMounted();
  const [range, setRange] = useState(analytics.rangeOptions?.[0] || "");
  const pLabels = analytics.pLabels || [];
  const age = analytics.age || [];
  const gender = analytics.gender || [];
  const perf = analytics.perf || [];
  const visits = analytics.visits || {
    data: [],
    max: 0,
    ticks: [],
    labels: [],
  };
  const peak = analytics.peak || { data: [], max: 0, ticks: [] };
  const performance = analytics.performance || { max: 0, ticks: [] };

  const exportCsv = () =>
    downloadCsv(`${profile?.name || "store"}-analytics-${today()}.csv`, [
      [`${profile?.name || "Store"} - Analytics Report`],
      ["Period", range],
      ["Exported", new Date().toLocaleString()],
      [],
      ["Summary"],
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
      ["Age Group", "Percent"],
      ...age.map(([l, v]) => [l, `${v}%`]),
      [],
      ["Gender Distribution"],
      ["Gender", "Percent"],
      ...gender.map(([l, v]) => [l, `${v}%`]),
      [],
      ["Promotion Performance"],
      ["Promotion", "Views", "Clicks"],
      ...perf,
    ]);

  return (
    <>
      <Head
        title="Analytics"
        sub="Track your store performance and customer insights"
        right={
          <StyledSelect
            value={range}
            options={analytics.rangeOptions}
            onChange={setRange}
            className="w-40"
          />
        }
      />
      <div className="mb-6 grid grid-cols-3 gap-6">
        {(analytics.stats || []).map(([label, value, change, note]) => (
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
      <Card className="mb-6 p-6">
        <h3 className="mb-6 text-xl">Customer Visits Over Time</h3>
        <LineDots
          data={visits.data}
          max={visits.max}
          ticks={visits.ticks}
          labels={visits.labels}
        />
      </Card>
      <Card className="mb-6 p-6">
        <h3 className="mb-6 text-xl">Peak Visit Times</h3>
        <Frame ticks={peak.ticks} max={peak.max} labels={pLabels} h="h-64">
          <div className="absolute inset-0 flex">
            {peak.data.map((v, i) => (
              <div
                key={i}
                className="flex h-full flex-1 items-end justify-center"
              >
                <Bar
                  value={v}
                  max={peak.max}
                  on={on}
                  delay={i * 80}
                  tip={`${pLabels[i] || ""}: ${v} visits`}
                />
              </div>
            ))}
          </div>
        </Frame>
      </Card>
      <div className="mb-6 grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl">Age Distribution</h3>
          <Pie slices={age} />
        </Card>
        <Card className="p-6">
          <h3 className="text-xl">Gender Distribution</h3>
          <Pie slices={gender} />
        </Card>
      </div>
      <Card className="mb-6 p-6">
        <h3 className="mb-6 text-xl">Promotion Performance</h3>
        <Frame
          ticks={performance.ticks}
          max={performance.max}
          labels={perf.map((p) => p[0])}
          h="h-64"
          legend={
            <div className="mt-3 flex justify-center gap-5 text-sm">
              <span className="flex items-center gap-2 text-gray-400">
                <i className="h-3 w-3 bg-gray-300" />
                views
              </span>
              <span className="flex items-center gap-2 text-[#5094fb]">
                <i className="h-3 w-3 bg-[#5094fb]" />
                clicks
              </span>
            </div>
          }
        >
          <div className="absolute inset-0 flex">
            {perf.map(([n, v, c], i) => (
              <div
                key={n}
                className="flex h-full flex-1 items-end justify-center gap-1"
              >
                <Bar
                  value={v}
                  max={performance.max}
                  on={on}
                  delay={i * 100}
                  width="w-1/4"
                  color="bg-gray-300"
                  tip={`${n}: ${Number(v || 0).toLocaleString()} views`}
                />
                <Bar
                  value={c}
                  max={performance.max}
                  on={on}
                  delay={i * 100 + 50}
                  width="w-1/4"
                  tip={`${n}: ${Number(c || 0).toLocaleString()} clicks`}
                />
              </div>
            ))}
          </div>
        </Frame>
      </Card>
      <Card className="flex items-center justify-between p-6">
        <p className="text-sm text-gray-500">
          Download all the data on this page as a CSV file.
        </p>
        <Btn onClick={exportCsv} className="!py-2 text-sm">
          <Download size={16} />
          Export
        </Btn>
      </Card>
    </>
  );
}