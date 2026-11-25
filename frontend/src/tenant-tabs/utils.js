import { useEffect, useState } from "react";

const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export const today = () => new Date().toISOString().slice(0, 10);

// Download rows as CSV
export function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


// Brand logo source
export function logoSource(brand, fallback) {
  if (brand?.brand_logo_base64)
    return `data:image/png;base64,${brand.brand_logo_base64}`;
  return brand?.brand_logo_path || fallback;
}

export const STORE_PROFILE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const EMPTY_CATEGORIES = {};

// Format long date
export function formatLongDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const formatDateRangeLong = (start, end) =>
  [formatLongDate(start), formatLongDate(end)].filter(Boolean).join(" - ");

// Smooth line path
export function smooth(pts) {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0]}`;
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++)
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${pts[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const step = dx[i] / 3;
    d += ` C${[x0 + step, y0 + m[i] * step]},${[x1 - step, y1 - m[i + 1] * step]},${pts[i + 1]}`;
  }
  return d;
}

// Mounted flag hook
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setM(true), 30);
    return () => clearTimeout(id);
  }, []);
  return m;
}
