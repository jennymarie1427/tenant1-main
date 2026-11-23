// promotion-open: invisible 1x1 image at the bottom of promotion emails.
//
//   GET /functions/v1/promotion-open?p=<promotion_id>&t=<recipient token>
//
// When the recipient's email client loads it, the open is counted once per
// person per promotion (only if that promotion was emailed to them). It always
// returns the same transparent GIF, so a bad or repeated request looks the same.
// Deployed with JWT verification off: the image is loaded by email clients.
// Opens are an estimate: Apple Mail preloads images and some people block them.

// @ts-ignore - npm specifiers are resolved by Deno in Supabase Edge Functions.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Transparent 1x1 GIF.
const PIXEL = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));
const pixel = () =>
  new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });

Deno.serve(async (req) => {
  if (req.method !== "GET") return pixel();
  const url = new URL(req.url);
  const promotionId = Number(url.searchParams.get("p"));
  const token = url.searchParams.get("t") || "";
  if (Number.isInteger(promotionId) && promotionId > 0 && UUID.test(token)) {
    const { error } = await admin.rpc("record_promotion_email_open", {
      p_promotion_id: promotionId,
      p_token: token,
    });
    if (error) console.error("record_promotion_email_open failed", error.message);
  }
  return pixel();
});
