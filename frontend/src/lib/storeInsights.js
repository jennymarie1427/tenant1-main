// Turns the get_my_store_analytics result into the shapes the Dashboard and
// Analytics charts expect. Pure functions, so they're unit-tested in
// test/analytics.test.js without a database.

export const ANALYTICS_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const AGE_GROUPS = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55+"];
const AGE_COLORS = ["#bfdbfe", "#93c5fd", "#5094fb", "#2563eb", "#1d4ed8", "#1e3a8a"];
const GENDER_COLORS = { Female: "#f472b6", Male: "#5094fb", Other: "#a78bfa" };

// Round, evenly spaced y-axis ticks for whole-number counts.
export function niceScale(maxValue, steps = 4) {
  const max = Math.max(0, Number(maxValue) || 0);
  if (max === 0) return { max: steps, ticks: [0, 1, 2, 3, 4].slice(0, steps + 1) };
  const raw = max / steps;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw));
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { max: top, ticks };
}

const parseDay = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
const month = (d) => d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

// "Nov 19"
export function formatDay(value) {
  const d = parseDay(value);
  return `${month(d)} ${d.getUTCDate()}`;
}

// "Nov 3–9" or "Oct 30–Nov 5"
function formatSpan(fromValue, toValue) {
  const from = parseDay(fromValue);
  const to = parseDay(toValue);
  if (from.getTime() === to.getTime()) return formatDay(fromValue);
  return month(from) === month(to)
    ? `${month(from)} ${from.getUTCDate()}–${to.getUTCDate()}`
    : `${formatDay(fromValue)}–${formatDay(toValue)}`;
}

// Daily points for 7 days; 5-day groups for 30 days; weekly groups for 90 days,
// so the x-axis labels stay readable.
export function buildVisitSeries(daily = [], rangeDays = 7) {
  const size = rangeDays <= 7 ? 1 : rangeDays <= 30 ? 5 : 7;
  const data = [];
  const labels = [];
  for (let i = 0; i < daily.length; i += size) {
    const group = daily.slice(i, i + size);
    data.push(group.reduce((sum, d) => sum + (Number(d.visits) || 0), 0));
    labels.push(size === 1 ? formatDay(group[0].date) : formatSpan(group[0].date, group.at(-1).date));
  }
  return { data, labels, ...niceScale(Math.max(0, ...data)) };
}

const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

// 24 hourly counts -> 12 two-hour bars ("2 PM" covers 2:00–3:59 PM).
export function buildPeakTimes(hourly = []) {
  const counts = Array.from({ length: 24 }, (_, h) =>
    Number(hourly.find((x) => Number(x.hour) === h)?.visits) || 0,
  );
  const data = [];
  const labels = [];
  const tips = [];
  for (let h = 0; h < 24; h += 2) {
    const value = counts[h] + counts[h + 1];
    data.push(value);
    labels.push(hourLabel(h));
    tips.push(`${hourLabel(h)}–${hourLabel((h + 2) % 24)}: ${value} ${value === 1 ? "visit" : "visits"}`);
  }
  return { data, labels, tips, ...niceScale(Math.max(0, ...data)) };
}

// Counts -> [label, percent, color] slices that add up to 100.
function toSlices(counts, order, colorFor) {
  const entries = order
    .map((label) => [label, Number(counts?.[label]) || 0])
    .filter(([, n]) => n > 0);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (!total) return [];
  const slices = entries.map(([label, n]) => [label, Math.round((n / total) * 100), colorFor(label)]);
  const drift = 100 - slices.reduce((sum, s) => sum + s[1], 0);
  if (drift) slices.reduce((a, b) => (b[1] > a[1] ? b : a))[1] += drift;
  return slices;
}

export function buildDemographics(demographics = {}) {
  const minGroup = demographics.min_group ?? 5;
  return {
    age: toSlices(demographics.age, AGE_GROUPS, (l) => AGE_COLORS[AGE_GROUPS.indexOf(l)]),
    gender: toSlices(demographics.gender, ["Female", "Male", "Other"], (l) => GENDER_COLORS[l]),
    ageNote: demographics.age ? "" : notEnough(demographics.age_known, minGroup, "age"),
    genderNote: demographics.gender ? "" : notEnough(demographics.gender_known, minGroup, "gender"),
  };
}

function notEnough(known = 0, minGroup = 5, field) {
  return `Shown once at least ${minGroup} visitors have their ${field} in their NavAR profile (currently ${known}). This keeps individual shoppers anonymous.`;
}

// Change vs the previous period of the same length, for the stat cards.
export function changeText(current, previous, days) {
  if (!previous) return { note: current ? `No visits in the previous ${days} days` : `Last ${days} days` };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { up: `${pct}% vs previous ${days} days` };
  if (pct === 0) return { note: `Same as previous ${days} days` };
  return { note: `${Math.abs(pct)}% fewer than previous ${days} days` };
}

const stat = (label, value, change) => [label, Number(value || 0).toLocaleString(), change.up, change.note];

export function buildAnalyticsView(result = {}) {
  const days = result.range_days || 7;
  const totals = result.totals || {};
  const visits = Number(totals.visits) || 0;
  const arrivals = Number(totals.arrivals) || 0;
  const promotions = result.promotions || [];
  const emailVisits = promotions.reduce((sum, p) => sum + (Number(p.email_visits) || 0), 0);
  const arrivalRate = visits ? Math.round((arrivals / visits) * 100) : 0;

  // [title, emailed, opened, visits from email]
  const perf = promotions
    .slice(0, 8)
    .map((p) => [p.title, Number(p.emailed) || 0, Number(p.opened) || 0, Number(p.email_visits) || 0]);
  const peak = buildPeakTimes(result.hourly);
  return {
    days,
    stats: [
      stat("Customer Visits", visits, changeText(visits, Number(totals.previous_visits) || 0, days)),
      stat("Arrivals", arrivals, { note: visits ? `${arrivalRate}% of visits reached your store` : "No visits yet" }),
      stat("Unique Visitors", totals.unique_visitors, { note: `Last ${days} days` }),
    ],
    dashboardStats: [
      stat("Customer Visits", visits, changeText(visits, Number(totals.previous_visits) || 0, days)),
      stat("Unique Visitors", totals.unique_visitors, { note: `Last ${days} days` }),
      stat("Visits from Email", emailVisits, { note: "Came within 7 days of a promotion email" }),
    ],
    visits: buildVisitSeries(result.daily, days),
    peak,
    pLabels: peak.labels,
    perf,
    performance: niceScale(Math.max(0, ...perf.flatMap(([, e, o, v]) => [e, o, v]))),
    ...buildDemographics(result.demographics),
  };
}
