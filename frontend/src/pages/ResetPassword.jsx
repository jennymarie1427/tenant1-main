import { finishPasswordSetup } from "../lib/finishPasswordSetup";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { accountAccess } from "../lib/accountAccess";
import {
  readInvitationLink,
  verifyInvitationLink,
  invitationStorageKey,
} from "../lib/invitationLink";
import PasswordInput from "../components/common/PasswordInput";
import "../styles/login/login.css";

// Reset password page
export default function ResetPasswordPage() {
  const [link] = useState(() =>
    readInvitationLink(window.location, sessionStorage),
  );
  const verification = useRef(null),
    verified = useRef(null),
    progress = useRef({ passwordSaved: false, accepted: false });
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
        window.history.replaceState(null, "", "/reset-password");
        if (clean.type !== "recovery") {
          const info = await accountAccess("status", {
            id: clean.id,
            token: clean.token,
          });
          if (info.role !== "tenant")
            throw Error("This invitation is not for a tenant account.");
        }
      })();
    verification.current
      .then(() => {
        if (active) setReady(true);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [link, attempt]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ready || submitting) return;
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await finishPasswordSetup({
        auth: supabase.auth,
        link: verified.current,
        password,
        accountAccess,
        progress: progress.current,
      });
      sessionStorage.removeItem(invitationStorageKey);
      localStorage.removeItem("navar_demo_role");
      sessionStorage.setItem("navar-password-updated", "true");
      window.location.replace("/login");
    } catch (reason) {
      setError(
        reason.message || "Unable to save your password. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <img
        className="login-bg"
        src="/images/gradient.png"
        alt="Gradient Background"
      />

      <div className="login-content">
        <div className="login-brand">
          <img
            className="login-brand-icon"
            src="/icons/logo.svg"
            alt="NavAR Logo"
          />
          <img
            className="login-brand-wordmark"
            src="/images/title.svg"
            alt="NavAR Title"
          />
          <p className="login-tagline">Shop Smart. Move Smarter.</p>
        </div>

        <div className="login-form-panel">
          <h1 className="login-title">Set New Password</h1>
          <p className="login-subtitle">
            Please create a new password for your tenant account
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <PasswordInput
              className="login-input"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={!ready || submitting}
            />
            <PasswordInput
              className="login-input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={!ready || submitting}
            />

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            {!ready && error && (
              <button
                type="button"
                onClick={() => {
                  verification.current = null;
                  setError("");
                  setAttempt((value) => value + 1);
                }}
              >
                Retry verification
              </button>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={submitting || !ready}
            >
              {submitting
                ? "SAVING..."
                : !ready
                  ? "VERIFYING..."
                  : "SET PASSWORD"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
