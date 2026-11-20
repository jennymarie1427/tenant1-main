import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

let keyRole;
try {
  keyRole = JSON.parse(
    atob((key || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
  ).role;
} catch {
  // Not a JWT (e.g. a publishable key), so there is no role to inspect.
}
if ((key || "").startsWith("sb_secret_") || keyRole === "service_role")
  throw new Error("Only a public Supabase key may be used in the browser.");

export const supabase = url && key ? createClient(url, key) : null;
