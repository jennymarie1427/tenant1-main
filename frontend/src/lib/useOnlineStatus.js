import { useSyncExternalStore } from "react";

// True while the browser reports a network connection. Updates live when the
// connection drops or comes back.
function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

// Whether a Supabase sign-in is saved in this browser, so the loading screen
// can show the right skeleton (portal vs. login) before data arrives.
export function hasStoredSession() {
  try {
    return Object.keys(localStorage).some(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    );
  } catch {
    return false;
  }
}
