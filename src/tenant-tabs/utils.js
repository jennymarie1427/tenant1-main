import { useEffect, useState } from "react";

// Non-component helpers shared by the tenant tabs. Kept out of shared.jsx so
// that file only exports components (required for React fast refresh).

const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export const today = () => new Date().toISOString().slice(0, 10);

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

export function smooth(pts) {
  let d = `M${pts[0]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2;
    d += ` C${[p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]},${[p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]},${p2}`;
  }
  return d;
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setM(true), 30);
    return () => clearTimeout(id);
  }, []);
  return m;
}
