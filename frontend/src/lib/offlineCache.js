// Offline cache (localStorage)

const PREFIX = "navar.offline.";

// Write to storage
function write(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: new Date().toISOString(), data }));
    return true;
  } catch {
    return false; // storage full or blocked
  }
}

// Save snapshot
export function saveSnapshot(key, data) {
  return write(key, data);
}

// Load snapshot
export function loadSnapshot(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Clear all snapshots
export function clearSnapshots() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage unavailable */
  }
}

// Strip images to save space
function withoutImages(appData) {
  const store = appData.storeProfile;
  return {
    ...appData,
    promotions: (appData.promotions || []).map((p) => ({ ...p, image: null })),
    storeProfile: store
      ? { ...store, brand: store.brand ? { ...store.brand, brand_logo_base64: null } : store.brand }
      : store,
    profiles: {
      ...appData.profiles,
      tenant: appData.profiles?.tenant
        ? {
            ...appData.profiles.tenant,
            logo: String(appData.profiles.tenant.logo || "").startsWith("data:")
              ? null
              : appData.profiles.tenant.logo,
          }
        : appData.profiles?.tenant,
    },
  };
}

// Save workspace snapshot
export function saveWorkspaceSnapshot(appData) {
  if (!write("workspace", appData)) write("workspace", withoutImages(appData));
}

export const loadWorkspaceSnapshot = () => loadSnapshot("workspace");

// True for connection failures
export function isConnectionError(error) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const message = String(error?.message || error || "");
  return (
    error?.name === "TypeError" ||
    error?.name === "AbortError" ||
    error?.name === "TimeoutError" ||
    Number(error?.status) >= 500 ||
    /cannot reach|failed to fetch|networkerror|network request failed|load failed|timed? ?out|timeout|fetch failed/i.test(message)
  );
}

// Format saved time
export function formatSavedAt(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "earlier";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
