import { useEffect, useState } from "react";
import { loadStoreAnalytics } from "./appData";
import { buildAnalyticsView } from "./storeInsights";
import { isConnectionError, loadSnapshot, saveSnapshot } from "./offlineCache";

// Load store analytics (falls back to offline copy)
export function useStoreInsights(storeId, days = 7) {
  const key = storeId ? `${storeId}:${days}` : "";
  const [state, setState] = useState({ key: "", view: null, error: "", savedAt: null });

  useEffect(() => {
    if (!storeId) return undefined;
    let active = true;
    const cacheKey = `insights.${storeId}.${days}`;
    loadStoreAnalytics(storeId, days)
      .then((result) => {
        saveSnapshot(cacheKey, result);
        if (active) setState({ key, view: buildAnalyticsView(result), error: "", savedAt: null });
      })
      .catch((error) => {
        if (!active) return;
        const saved = isConnectionError(error) ? loadSnapshot(cacheKey) : null;
        if (saved?.data) {
          setState({ key, view: buildAnalyticsView(saved.data), error: "", savedAt: saved.savedAt });
          return;
        }
        setState((current) => ({
          key,
          view: current.view,
          error: isConnectionError(error)
            ? "Can't load analytics without an internet connection, and there's no saved copy for this period yet."
            : error.message || "Unable to load analytics.",
          savedAt: null,
        }));
      });
    return () => {
      active = false;
    };
  }, [storeId, days, key]);

  return {
    view: state.view,
    loading: Boolean(key) && state.key !== key,
    error: state.key === key ? state.error : "",
    savedAt: state.key === key ? state.savedAt : null,
  };
}
