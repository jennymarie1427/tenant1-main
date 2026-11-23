import { useEffect, useState } from "react";
import { loadStoreAnalytics } from "./appData";
import { buildAnalyticsView } from "./analytics";

// Loads store analytics for the Dashboard and Analytics pages.
// Returns { view, loading, error }. While a new range loads, the previous
// view stays on screen so the charts don't flash empty.
export function useStoreAnalytics(storeId, days = 7) {
  const key = storeId ? `${storeId}:${days}` : "";
  const [state, setState] = useState({ key: "", view: null, error: "" });

  useEffect(() => {
    if (!storeId) return undefined;
    let active = true;
    loadStoreAnalytics(storeId, days)
      .then((result) => {
        if (active) setState({ key, view: buildAnalyticsView(result), error: "" });
      })
      .catch((error) => {
        if (active)
          setState((current) => ({
            key,
            view: current.view,
            error: error.message || "Unable to load analytics.",
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
  };
}
