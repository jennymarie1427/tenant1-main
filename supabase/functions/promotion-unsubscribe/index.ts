// promotion-unsubscribe: turn off promotion emails

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reply = (message: string, status = 200) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") return reply("Method not allowed.", 405);
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!UUID.test(token)) return reply("This unsubscribe link is not valid.", 400);

  const { data, error } = await admin.rpc("unsubscribe_promotion_emails", { p_token: token });
  if (error) {
    console.error("unsubscribe failed", error.message);
    return reply("Something went wrong. Please try the link again later.", 500);
  }
  if (!data) return reply("This unsubscribe link is not valid.", 404);
  return reply(
    "You're unsubscribed. You won't receive NavAR promotion emails anymore.\n\n" +
      "You can turn promotion alerts back on in the NavAR app's notification settings.",
  );
});
