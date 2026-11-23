import { useEffect, useState } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "../../lib/useOnlineStatus";

// Full-page screen when the app can't load because there's no connection.
// Reloads by itself as soon as the connection comes back.
export function OfflineScreen() {
  const online = useOnlineStatus();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const reconnect = () => window.location.reload();
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, []);

  const retry = () => {
    setChecking(true);
    if (navigator.onLine) window.location.reload();
    else setTimeout(() => setChecking(false), 1200);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-100 via-slate-50 to-white p-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl shadow-sky-100">
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-200 opacity-40" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <WifiOff size={40} strokeWidth={1.75} />
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-800">You&rsquo;re offline</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          We can&rsquo;t reach NavAR right now. Check your Wi-Fi or mobile data,
          and we&rsquo;ll reconnect automatically as soon as you&rsquo;re back online.
        </p>
        <button
          type="button"
          onClick={retry}
          disabled={checking}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#5094fb] px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-70"
        >
          <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
          {checking ? "Checking connection…" : "Try again"}
        </button>
        {!online && (
          <p className="mt-4 text-xs text-slate-400">Waiting for a connection…</p>
        )}
      </div>
    </div>
  );
}

// Slim banner when the connection drops while the app is open, and a brief
// "Back online" note when it returns.
export function ConnectionBanner() {
  const online = useOnlineStatus();
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    let timer;
    const onOnline = () => {
      setBackOnline(true);
      clearTimeout(timer);
      timer = setTimeout(() => setBackOnline(false), 3000);
    };
    const onOffline = () => {
      clearTimeout(timer);
      setBackOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online && !backOnline) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4" role="status" aria-live="polite">
      {online ? (
        <div className="flex items-center gap-2 rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          <Wifi size={16} />
          You&rsquo;re back online
        </div>
      ) : (
        <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-800 px-5 py-2.5 text-sm text-white shadow-lg">
          <WifiOff size={16} className="text-amber-300" />
          <span>
            <b className="font-medium">No internet connection.</b>{" "}
            <span className="text-slate-300">Changes won&rsquo;t be saved until you reconnect.</span>
          </span>
        </div>
      )}
    </div>
  );
}
