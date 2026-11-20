import security from "./security.cjs";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

async function upstreamFailure(response, send, operation) {
  const error = await response.json().catch(() => ({}));
  // Log only the operation/code; never access tokens or row data.
  console.error(
    JSON.stringify({
      operation,
      status: response.status,
      code: error.code || "UPSTREAM_ERROR",
    }),
  );
  if (["PGRST202", "42883"].includes(error.code))
    return send(503, {
      code: "TENANT_SCHEMA_MISSING",
      message:
        "Your sign-in is valid, but the tenant data function is missing. Apply backend/database/37_tenant_contact_security.sql in Supabase, then reload this page.",
    });
  if (error.code === "42501" || response.status === 403)
    return send(403, {
      code: "TENANT_ACCESS_DENIED",
      message:
        "Your account does not have access to this tenant data. Ask your mall administrator to check your tenant assignment.",
    });
  return send(502, {
    code: "TENANT_DATA_UNAVAILABLE",
    message: "Tenant data is temporarily unavailable. Please try again.",
  });
}

// Forward the user's token with a public key so Supabase RLS stays in effect.
export function createHandler(env = process.env, request = fetch) {
  security.assertProductionOrigins(env, [
    env.FRONTEND_ORIGIN || "http://localhost:5175",
  ]);
  const secureRequest = security.createSecurity(env);
  const publicKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "";
  let role;
  try {
    role = JSON.parse(
      Buffer.from(publicKey.split(".")[1], "base64url").toString(),
    ).role;
  } catch {
    // Not a JWT (e.g. a publishable key), so there is no role to inspect.
  }
  if (publicKey.startsWith("sb_secret_") || role === "service_role")
    throw new Error("Tenant API requires a public Supabase key.");
  if (env.SUPABASE_URL && new URL(env.SUPABASE_URL).protocol !== "https:")
    throw new Error("Supabase must use HTTPS.");
  return async (req, res) => {
    if (!secureRequest(req, res)) return;
    const send = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const origin = env.FRONTEND_ORIGIN || "http://localhost:5175";
    res.setHeader("Vary", "Origin");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.headers.origin && req.headers.origin !== origin)
      return send(403, { message: "Origin not allowed." });
    if (req.headers.origin)
      res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    if (req.method !== "GET")
      return send(405, { message: "Method not allowed." });
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/health")
      return send(200, { status: "ok", service: "navar-tenant-backend" });
    const table = url.pathname.replace("/api/data/", "");
    if (
      !url.pathname.startsWith("/api/data/") ||
      !["app_user", "tenant", "store", "promotion"].includes(table)
    )
      return send(404, { message: "Not found." });
    const authorization = req.headers.authorization;
    if (
      (authorization || "").length > 8192 ||
      !/^Bearer \S+$/i.test(authorization || "")
    )
      return send(401, { message: "Sign in to continue." });
    const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
    if (!env.SUPABASE_URL || !key)
      return send(503, { message: "Supabase is not configured." });
    try {
      const headers = { apikey: key, Authorization: authorization };
      const auth = await request(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!auth.ok)
        return send(auth.status === 401 || auth.status === 403 ? 401 : 502, {
          message: "Unable to verify session.",
        });
      const user = await auth.json();
      if (!user.id || !user.email_confirmed_at)
        return send(403, { message: "Verify your email before signing in." });
      const membership = await request(
        `${env.SUPABASE_URL}/rest/v1/rpc/get_my_tenant_access`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: "{}",
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!membership.ok)
        return upstreamFailure(membership, send, "get_my_tenant_access");
      const assignments = await membership.json();
      if (!Array.isArray(assignments) || !assignments.length)
        return send(403, { message: "No active tenant access." });
      if (
        !assignments.every(
          (row) =>
            /^\d+$/.test(String(row.tenant_id)) &&
            /^\d+$/.test(String(row.store_id)),
        )
      )
        return send(502, { message: "Invalid tenant assignment." });
      // Compatibility identity, synthesized from the verified user; never expose app_user rows.
      if (table === "app_user")
        return send(200, [
          {
            user_auth_user_id: user.id,
            user_email: user.email,
            user_role: "tenant",
          },
        ]);
      const storeIds = [
        ...new Set(assignments.map((row) => String(row.store_id))),
      ];
      const requestedStore = url.searchParams.get("storeId");
      if (requestedStore !== null) {
        if (!/^\d{1,18}$/.test(requestedStore))
          return send(400, { message: "Invalid store ID." });
        if (!storeIds.includes(requestedStore))
          return send(403, { message: "Store access denied." });
      }
      const response = await request(
        `${env.SUPABASE_URL}/rest/v1/rpc/get_my_tenant_records`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ p_kind: table, p_store: requestedStore }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok)
        return upstreamFailure(response, send, "get_my_tenant_records");
      return send(200, await response.json());
    } catch {
      return send(502, { message: "Unable to reach Supabase." });
    }
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.PORT || 3002);
  createServer(createHandler()).listen(port, "localhost", () =>
    console.log(`Tenant backend: http://localhost:${port}`),
  );
}
