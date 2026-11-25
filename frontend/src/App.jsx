import { supabase } from "./lib/supabase";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvitation from "./pages/AcceptInvitation";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Tenant from "./pages/Tenant";
import { getCurrentSession, loadAppData, signOut } from "./lib/appData";
import { hasStoredSession, useOnlineStatus } from "./lib/useOnlineStatus";
import { ConnectionBanner, OfflineScreen } from "./components/common/ConnectionStatus";
import { LoginSkeleton, PortalSkeleton } from "./components/common/Skeleton";
import {
  clearSnapshots,
  isConnectionError,
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
} from "./lib/offlineCache";

const EMPTY_APP_DATA = { profiles: {}, promotions: [] };

// App root
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const page =
    path === "/accept-invitation" ? <AcceptInvitation />
    : path === "/reset-password" ? <ResetPassword />
    : <WorkspaceApp />;
  return (
    <>
      <ConnectionBanner />
      {page}
    </>
  );
}

// Signed-in workspace loader
function WorkspaceApp() {
  const online = useOnlineStatus();
  const [showPortalSkeleton] = useState(hasStoredSession);
  const [session, setSession] = useState(null);
  const [appData, setAppData] = useState(null);
  const [loadError, setLoadError] = useState("");
  // Time of offline copy being shown
  const [offlineSavedAt, setOfflineSavedAt] = useState(null);
  const logout = async () => {
    clearSnapshots();
    await signOut().catch(() => {});
    setSession(null);
    setLoadError("");
    window.location.replace("/login");
  };

  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setAppData(EMPTY_APP_DATA);
      }
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    getCurrentSession()
      .then((currentSession) => {
        if (!currentSession) {
          setAppData(EMPTY_APP_DATA);
          return null;
        }
        setSession(currentSession);
        return loadAppData().then((loaded) => {
          saveWorkspaceSnapshot(loaded);
          setAppData(loaded);
        });
      })
      .catch((error) => {
        // Offline: show saved copy
        const saved = isConnectionError(error) && hasStoredSession() ? loadWorkspaceSnapshot() : null;
        if (saved?.data?.profiles?.tenant) {
          setSession({ role: "tenant", offline: true });
          setAppData(saved.data);
          setOfflineSavedAt(saved.savedAt);
          return;
        }
        setSession(null);
        setAppData(EMPTY_APP_DATA);
        setLoadError(error.message || "Unable to load tenant data.");
      });
  }, []);

  if (!appData) return showPortalSkeleton ? <PortalSkeleton /> : <LoginSkeleton />;
  if (loadError && !online) return <OfflineScreen />;
  if (loadError && !session)
    return (
      <WorkspaceError
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );
  const login = async (session) => {
    try {
      setLoadError("");
      const loaded = await loadAppData();
      saveWorkspaceSnapshot(loaded);
      setAppData(loaded);
      setSession(session);
    } catch (error) {
      await signOut();
      throw error;
    }
  };
  if (!session) return <Login onLogin={login} />;
  return (
    <Tenant
      onLogout={logout}
      profile={appData.profiles.tenant}
      promotions={appData.promotions}
      storeProfile={appData.storeProfile}
      offlineSavedAt={offlineSavedAt}
    />
  );
}

// Workspace load error screen
function WorkspaceError({ message, onRetry }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center text-slate-600"
      role="alert"
    >
      <p className="max-w-lg text-sm">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-medium text-white"
      >
        Retry
      </button>
    </div>
  );
}
