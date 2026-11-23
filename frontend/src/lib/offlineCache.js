// Offline mode: keeps a copy of the last data loaded while online, so the
// tenant portal can still show the store when the connection drops or is too
// slow (read-only). Stored in this browser only and cleared on sign-out.

const PREFIX = "navar.offline.";

function write(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: new Date().toISOString(), data }));
    return true;
  } catch {
    return false; // storage full or blocked
  }
}

export function saveSnapshot(key, data) {
  return write(key, data);
}

export function loadSnapshot(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSnapshots() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage unavailable */
  }
}

// Images are the largest part of the workspace data. If the full copy doesn't
// fit in browser storage, save it without them instead of not at all.
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

export function saveWorkspaceSnapshot(appData) {
  if (!write("workspace", appData)) write("workspace", withoutImages(appData));
}

export const loadWorkspaceSnapshot = () => loadSnapshot("workspace");

// True for failures caused by the connection (offline, slow, unreachable),
// not for real answers like "access denied".
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

// "Nov 24, 3:10 PM"
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
