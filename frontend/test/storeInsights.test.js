import test from "node:test";
import assert from "node:assert/strict";
import {
  niceScale,
  buildVisitSeries,
  buildPeakTimes,
  buildDemographics,
  changeText,
  buildAnalyticsView,
} from "../src/lib/storeInsights.js";

const days = (from, values) =>
  values.map((visits, i) => {
    const d = new Date(`${from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), visits, arrivals: visits };
  });

test("niceScale gives whole-number ticks that cover the max", () => {
  assert.deepEqual(niceScale(0), { max: 4, ticks: [0, 1, 2, 3, 4] });
  assert.deepEqual(niceScale(3), { max: 3, ticks: [0, 1, 2, 3] });
  const big = niceScale(14);
  assert.ok(big.max >= 14);
  assert.ok(big.ticks.every(Number.isInteger));
});

test("7-day series is daily with day labels", () => {
  const series = buildVisitSeries(days("2026-11-16", [0, 0, 0, 4, 0, 10, 0]), 7);
  assert.deepEqual(series.data, [0, 0, 0, 4, 0, 10, 0]);
  assert.equal(series.labels[3], "Nov 19");
  assert.ok(series.max >= 10);
});

test("30-day series groups into 5-day spans and keeps the total", () => {
  const values = Array.from({ length: 30 }, (_, i) => i % 3);
  const series = buildVisitSeries(days("2026-10-24", values), 30);
  assert.equal(series.data.length, 6);
  assert.equal(series.data.reduce((a, b) => a + b, 0), values.reduce((a, b) => a + b, 0));
  assert.equal(series.labels[0], "Oct 24–28");
  assert.equal(series.labels[2], "Nov 3–7");
});

test("peak times use two-hour buckets", () => {
  const peak = buildPeakTimes([{ hour: 16, visits: 6 }, { hour: 17, visits: 1 }, { hour: 0, visits: 2 }]);
  assert.equal(peak.data.length, 12);
  assert.equal(peak.data[8], 7);
  assert.equal(peak.labels[8], "4 PM");
  assert.equal(peak.tips[8], "4 PM–6 PM: 7 visits");
  assert.equal(peak.labels[0], "12 AM");
});

test("a single visitor shows as 100% with the visitor count", () => {
  const one = buildDemographics({ gender: { Female: 1 }, age: { "18-24": 1 } });
  assert.deepEqual(one.gender, [["Female", 100, "#f472b6", 1]]);
  assert.equal(one.age[0][1], 100);
  assert.equal(one.genderBasis, "Based on 1 visitor with a gender in their NavAR profile");
  assert.equal(one.genderNote, "");
});

test("no demographic data shows a note instead of a chart", () => {
  const none = buildDemographics({ age: null, gender: null });
  assert.deepEqual(none.age, []);
  assert.match(none.ageNote, /No visitors have their age/);
  assert.equal(none.ageBasis, "");
});

test("demographic slices are percentages that add up to 100", () => {
  const shown = buildDemographics({ gender: { Female: 2, Male: 1 }, age: { "18-24": 1, "25-34": 1, "35-44": 1 } });
  assert.equal(shown.gender.reduce((s, x) => s + x[1], 0), 100);
  assert.equal(shown.genderBasis, "Based on 3 visitors with a gender in their NavAR profile");
  assert.equal(shown.age.reduce((s, x) => s + x[1], 0), 100);
  assert.equal(shown.gender[0][0], "Female");
  assert.equal(shown.genderNote, "");
});

test("changeText compares with the previous period", () => {
  assert.deepEqual(changeText(14, 0, 7), { note: "No visits in the previous 7 days" });
  assert.deepEqual(changeText(15, 10, 7), { up: "50% vs previous 7 days" });
  assert.deepEqual(changeText(5, 10, 7), { note: "50% fewer than previous 7 days" });
});

test("buildAnalyticsView assembles stats, charts and promotion performance", () => {
  const view = buildAnalyticsView({
    range_days: 7,
    totals: { visits: 14, arrivals: 7, unique_visitors: 1, previous_visits: 0 },
    daily: days("2026-11-16", [0, 0, 0, 4, 0, 10, 0]),
    hourly: [{ hour: 16, visits: 6 }],
    demographics: { min_group: 5, age_known: 1, gender_known: 1 },
    promotions: [{ title: "Holiday Weekend Sale", emailed: 10, opened: 6, email_visits: 3 }],
  });
  assert.equal(view.stats[0][1], "14");
  assert.equal(view.stats[1][3], "50% of visits reached your store");
  assert.equal(view.dashboardStats[2][0], "Visits from Email");
  assert.equal(view.dashboardStats[2][1], "3");
  assert.deepEqual(view.perf, [["Holiday Weekend Sale", 10, 6, 3]]);
  assert.ok(view.performance.max >= 10);
  assert.equal(view.visits.data.length, 7);
});
