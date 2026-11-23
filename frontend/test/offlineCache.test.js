import test from "node:test";
import assert from "node:assert/strict";

// Minimal browser stand-ins for Node.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
// Object.keys(localStorage) should list stored keys, like in a browser.
globalThis.localStorage = new Proxy(globalThis.localStorage, {
  ownKeys: () => [...store.keys()],
  getOwnPropertyDescriptor: (target, k) =>
    store.has(k) ? { enumerable: true, configurable: true, value: store.get(k) } : Reflect.getOwnPropertyDescriptor(target, k),
});
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });

const {
  saveSnapshot, loadSnapshot, clearSnapshots, saveWorkspaceSnapshot, loadWorkspaceSnapshot,
  isConnectionError, formatSavedAt,
} = await import("../src/lib/offlineCache.js");

test("snapshots round-trip with a saved time and clear on sign-out", () => {
  saveSnapshot("insights.12.7", { totals: { visits: 14 } });
  const saved = loadSnapshot("insights.12.7");
  assert.equal(saved.data.totals.visits, 14);
  assert.ok(!Number.isNaN(new Date(saved.savedAt).getTime()));
  saveWorkspaceSnapshot({ profiles: { tenant: { store_id: 12 } }, promotions: [] });
  assert.equal(loadWorkspaceSnapshot().data.profiles.tenant.store_id, 12);
  store.set("unrelated", "keep");
  clearSnapshots();
  assert.equal(loadSnapshot("insights.12.7"), null);
  assert.equal(loadWorkspaceSnapshot(), null);
  assert.equal(store.get("unrelated"), "keep");
});

test("connection problems are recognised, real errors are not", () => {
  assert.equal(isConnectionError(new Error("Cannot reach the Tenant backend. Start it on port 3002 and try again.")), true);
  assert.equal(isConnectionError(new TypeError("Failed to fetch")), true);
  assert.equal(isConnectionError(Object.assign(new Error("Bad gateway"), { status: 502 })), true);
  assert.equal(isConnectionError(new Error("Store access denied.")), false);
  assert.equal(isConnectionError(new Error("No active tenant assignment is available.")), false);
  navigator.onLine = false;
  assert.equal(isConnectionError(new Error("Store access denied.")), true);
  navigator.onLine = true;
});

test("saved time is shown in a short readable form", () => {
  assert.match(formatSavedAt("2026-11-24T07:10:00Z"), /^Nov 2[45], \d{1,2}:10 (AM|PM)$/);
  assert.equal(formatSavedAt("not a date"), "earlier");
});
