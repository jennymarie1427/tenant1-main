import { useEffect, useState } from "react";
import { requestPasswordReset, signIn } from "../lib/appData";
import PasswordInput from "../components/common/PasswordInput";
import { AlertModal } from "../tenant-tabs/shared";
import "../styles/login/login.css";

const ErrorText = ({ children }) =>
  children ? (
    <p className="mt-2 pl-2 text-sm text-red-600" role="alert">
      {children}
    </p>
  ) : null;

// onLogin receives the role: "super_admin" | "mall_admin" | "tenant"
export default function Login({ onLogin }) {
  const [resetSuccess, setResetSuccess] = useState(
    () => sessionStorage.getItem("navar-password-updated") === "true",
  );
  useEffect(() => {
    sessionStorage.removeItem("navar-password-updated");
  }, []);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [errors, setErrors] = useState({}); // { user, pass, reset, form }
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clearError = (key) => setErrors((c) => ({ ...c, [key]: "", form: "" }));

  const submit = async (e) => {
    e.preventDefault();
    if (forgotPassword) {
      if (!resetEmail.trim())
        return setErrors({ reset: "Enter your email address." });
      setSubmitting(true);
      setErrors({});
      try {
        await requestPasswordReset(resetEmail);
        setResetSent(true);
      } catch (err) {
        setErrors({
          reset: err.message || "Unable to send the password reset email.",
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const next = {};
    if (!user.trim()) next.user = "Enter your email or username.";
    if (!pass) next.pass = "Enter your password.";
    if (Object.keys(next).length) return setErrors(next);

    setErrors({});
    try {
      const session = await signIn(user.trim(), pass);
      await onLogin(session);
      window.location.replace("/dashboard");
    } catch (err) {
      const message = err.message || "Unable to sign in.";
      const m = message.toLowerCase();
      if (m.includes("password")) setErrors({ pass: message });
      else if (
        m.includes("email") ||
        m.includes("username") ||
        m.includes("user")
      )
        setErrors({ user: message });
      else setErrors({ form: message });
    }
  };

  const input =
    "w-full rounded-2xl border bg-sky-50/80 px-6 py-5 text-gray-800 outline-none placeholder:text-gray-500";
  const inputClass = (hasError) =>
    `${input} ${hasError ? "border-red-400 focus:border-red-500" : "border-sky-200 focus:border-sky-400"}`;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-400 via-sky-200 to-white to-70% p-8">
      <div className="grid w-full max-w-6xl items-center gap-16 md:grid-cols-2">
        <div className="flex flex-col items-center">
          <img src="/navar-logo.png" alt="NavAR" className="w-95" />
          <p className="mt-6 text-3xl text-neutral-600">
            Shop Smart. Move Smarter.
          </p>
        </div>

        <form onSubmit={submit} className="max-w-md" noValidate>
          {resetSuccess && (
            <AlertModal
              message="Password updated successfully. Sign in with your new password."
              variant="success"
              onClose={() => {
                sessionStorage.removeItem("navar-password-updated");
                setResetSuccess(false);
              }}
            />
          )}
          <h1 className="text-6xl font-bold text-neutral-800">
            {forgotPassword ? "Reset Password" : "Welcome!"}
          </h1>
          <p className="mb-10 mt-1 text-xl text-neutral-600">
            {forgotPassword
              ? "Enter your email to receive a reset link"
              : "Please enter your sign in details"}
          </p>
          {forgotPassword ? (
            <>
              {resetSent ? (
                <p className="login-success" role="status">
                  You will receive a password reset link shortly.
                </p>
              ) : (
                <div className="mb-4">
                  <input
                    className={inputClass(errors.reset)}
                    type="email"
                    autoComplete="email"
                    placeholder="Email address"
                    aria-invalid={Boolean(errors.reset)}
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      clearError("reset");
                    }}
                    disabled={submitting}
                  />
                  <ErrorText>{errors.reset}</ErrorText>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-4">
                <input
                  className={inputClass(errors.user)}
                  placeholder="Email address or username"
                  aria-invalid={Boolean(errors.user)}
                  value={user}
                  onChange={(e) => {
                    setUser(e.target.value);
                    clearError("user");
                  }}
                />
                <ErrorText>{errors.user}</ErrorText>
              </div>
              <div>
                <PasswordInput
                  className={`${inputClass(errors.pass)} pr-14`}
                  autoComplete="current-password"
                  placeholder="Password"
                  aria-invalid={Boolean(errors.pass)}
                  value={pass}
                  onChange={(e) => {
                    setPass(e.target.value);
                    clearError("pass");
                  }}
                />
                <ErrorText>{errors.pass}</ErrorText>
              </div>
              <div className="login-forgot-row">
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => {
                    setForgotPassword(true);
                    setErrors({});
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}
          {errors.form && (
            <p
              className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
              role="alert"
            >
              {errors.form}
            </p>
          )}
          {!resetSent && (
            <button
              disabled={submitting}
              className="login-submit-button w-full rounded-2xl bg-sky-500 py-5 text-sm font-medium tracking-wide text-white shadow-md hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "SENDING..."
                : forgotPassword
                  ? "SEND RESET LINK"
                  : "LOGIN"}
            </button>
          )}
          {forgotPassword && (
            <button
              type="button"
              className="login-back-link"
              onClick={() => {
                setForgotPassword(false);
                setResetSent(false);
                setErrors({});
              }}
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
