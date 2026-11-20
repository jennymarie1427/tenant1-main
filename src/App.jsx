import { supabase } from "./lib/supabase";
import ResetPassword from "./ResetPassword";
import AcceptInvitation from "./AcceptInvitation";
import { useEffect, useState } from "react";
import Login from "./Login";
import Tenant from "./Tenant";
//import TenantApp from "./TenantApp";
import { getCurrentSession, loadAppData, signOut } from "./lib/appData";

const EMPTY_APP_DATA = { profiles: {}, promotions: [] };

//main app

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/accept-invitation") return <AcceptInvitation />;
  if (path === "/reset-password") return <ResetPassword />;
  return <WorkspaceApp />;
}

//demo

// export default function App() {
//   return <TenantApp />;
// }

function WorkspaceApp() {
  const [session, setSession] = useState(null);
  const [appData, setAppData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const logout = async () => {
    await signOut();
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
        return loadAppData().then(setAppData);
      })
      .catch((error) => {
        setSession(null);
        setAppData(EMPTY_APP_DATA);
        setLoadError(error.message || "Unable to load tenant data.");
      });
  }, []);

  if (!appData) return <WorkspaceLoader />;
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
    />
  );
}

function WorkspaceLoader() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-slate-600"
      role="status"
      aria-live="polite"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
      <span className="text-sm font-medium">Loading</span>
    </div>
  );
}

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
