import { supabase } from "./supabase";

export async function readData(table, params = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Sign in to continue.");
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const send = (session) =>
    fetch(`${base}/api/data/${table}?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: AbortSignal.timeout(35000),
    });
  let response;
  try {
    response = await send(data.session);
    if (response.status === 401) {
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.data.session) response = await send(refreshed.data.session);
    }
  } catch {
    throw new Error(
      "Cannot reach the Tenant backend. Start it on port 3002 and try again.",
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw Object.assign(
      new Error(body?.message || "Unable to load tenant data."),
      { code: body?.code, status: response.status },
    );
  if (!Array.isArray(body))
    throw new Error("The Tenant backend returned an invalid response.");
  return body;
}
