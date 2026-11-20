import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHandler } from "./server.js";

test("health, authentication, origin checks, and user-scoped forwarding", async () => {
  const calls = [];
  const upstream = async (url, options) => {
    calls.push({ url, ...options });
    return new Response(
      JSON.stringify(
        url.includes("/auth/")
          ? { id: "user", email_confirmed_at: "2026-01-01" }
          : url.includes("/rpc/get_my_tenant_access")
            ? [{ tenant_id: 1, store_id: 12 }]
            : [{ store_id: 12 }],
      ),
    );
  };
  const server = createServer(
    createHandler(
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "public-test-key",
      },
      upstream,
    ),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + "/api/health")).status, 200);
    assert.equal((await fetch(base + "/api/data/store")).status, 401);
    assert.equal(
      (
        await fetch(base + "/api/data/store", {
          headers: { Origin: "http://localhost:5174" },
        })
      ).status,
      403,
    );
    assert.equal((await fetch(base + "/api/data/secrets")).status, 404);
    assert.equal(calls.length, 0);
    const response = await fetch(base + "/api/data/promotion?storeId=12", {
      headers: {
        Authorization: "Bearer user-token",
        Origin: "http://localhost:5175",
      },
    });
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "http://localhost:5175",
    );
    assert.deepEqual(await response.json(), [{ store_id: 12 }]);
    assert.equal(calls.length, 3);
    assert.equal(calls[2].headers.Authorization, "Bearer user-token");
    assert.equal(calls[2].headers.apikey, "public-test-key");
    assert.deepEqual(JSON.parse(calls[2].body), {
      p_kind: "promotion",
      p_store: "12",
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("invalid sessions never query the database", async () => {
  let calls = 0;
  const server = createServer(
    createHandler(
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "public-test-key",
      },
      async () => {
        calls++;
        return new Response("{}", { status: 401 });
      },
    ),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/data/store`,
      { headers: { Authorization: "Bearer invalid" } },
    );
    assert.equal(response.status, 401);
    assert.equal(calls, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("cross-store requests and revoked memberships fail before data reads", async () => {
  for (const assignments of [[{ tenant_id: 1, store_id: 12 }], []]) {
    const calls = [];
    const server = createServer(
      createHandler(
        {
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_PUBLISHABLE_KEY: "public-test",
        },
        async (url) => {
          calls.push(url);
          return new Response(
            JSON.stringify(
              url.includes("/auth/")
                ? { id: "user", email_confirmed_at: "2026-01-01" }
                : assignments,
            ),
          );
        },
      ),
    );
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/data/promotion?storeId=99`,
        { headers: { Authorization: "Bearer valid" } },
      );
      assert.equal(response.status, 403);
      assert.equal(calls.length, 2);
      assert.ok(!calls.some((url) => url.includes("/rest/v1/promotion")));
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
});
test("rejects secret keys and untrusted forwarded HTTPS", async () => {
  assert.throws(
    () => createHandler({ SUPABASE_ANON_KEY: "sb_secret_example" }),
    /public Supabase key/,
  );
  const server = createServer(
    createHandler({
      NODE_ENV: "production",
      FRONTEND_ORIGIN: "https://tenant.example.test",
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/health`,
      { headers: { "X-Forwarded-Proto": "https" } },
    );
    assert.equal(response.status, 426);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("missing tenant RPC is identified without exposing credentials or bypassing membership", async () => {
  const server = createServer(
    createHandler(
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "public-test",
      },
      async (url) => {
        if (url.includes("/auth/"))
          return Response.json({
            id: "user",
            email_confirmed_at: "2026-01-01",
          });
        if (url.includes("get_my_tenant_access"))
          return Response.json([{ tenant_id: 1, store_id: 12 }]);
        return Response.json(
          { code: "PGRST202", message: "Missing function" },
          { status: 404 },
        );
      },
    ),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/data/store`,
      { headers: { Authorization: "Bearer valid" } },
    );
    assert.equal(response.status, 503);
    const error = await response.json();
    assert.equal(error.code, "TENANT_SCHEMA_MISSING");
    assert.match(error.message, /37_tenant_contact_security/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});