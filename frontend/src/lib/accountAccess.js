import { supabase } from "./supabase";

export async function accountAccess(action, body) {
  const { data } = await supabase.auth.getSession();
  const base =
    import.meta.env.VITE_ACCOUNT_ACCESS_API_URL || "http://localhost:3001";
  let response;
  try {
    response = await fetch(`${base}/api/account-access/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token || ""}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw Error(
      "Cannot connect to the account service. Check the Mall Admin backend, then retry.",
    );
  }
  const result = await response.json();
  if (!response.ok)
    throw Error(
      result.error?.message ||
        result.message ||
        "Unable to complete account setup.",
    );
  return result;
}