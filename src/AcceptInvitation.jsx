import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { accountAccess } from "./lib/accountAccess";
import {
  readInvitationLink,
  verifyInvitationLink,
  invitationStorageKey,
} from "./lib/invitationLink";
export default function AcceptInvitation() {
  const [link] = useState(() =>
    readInvitationLink(window.location, sessionStorage),
  );
  const verification = useRef(null),
    verified = useRef(null);
  const [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!verification.current)
      verification.current = (async () => {
        if (!supabase) throw Error("Account connection is not configured.");
        const clean = await verifyInvitationLink(
          supabase.auth,
          verified.current || link,
        );
        verified.current = clean;
        sessionStorage.setItem(invitationStorageKey, JSON.stringify(clean));
        window.history.replaceState(null, "", window.location.pathname);
        if (clean.type !== "recovery") {
          const info = await accountAccess("status", {
            id: clean.id,
            token: clean.token,
          });
          if (info.role !== "tenant")
            throw Error("Open this invitation in the Mall Admin website.");
        }
      })();
    verification.current
      .then(() => {
        if (active) window.location.replace("/reset-password");
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [link, attempt]);
  return (
    <main className="min-h-screen bg-sky-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-800">
          Verifying your email
        </h1>
        {error ? (
          <>
            <p role="alert" className="my-4 text-red-600">
              {error}
            </p>
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-white"
              onClick={() => {
                verification.current = null;
                setError("");
                setAttempt((value) => value + 1);
              }}
            >
              Retry
            </button>
          </>
        ) : (
          <p role="status" className="my-4">
            Opening password setup...
          </p>
        )}
      </section>
    </main>
  );
}
