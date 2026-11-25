// notify-promotion: email new promotion to mall visitors
// Body: { promotion_id } | { mode: "health" } | { mode: "preview", promotion_id }
// Secrets: SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS, SMTP_FROM

// @ts-ignore - npm specifiers are resolved by Deno in Supabase Edge Functions.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
// @ts-ignore - npm specifiers are resolved by Deno in Supabase Edge Functions.
import nodemailer from "npm:nodemailer@6.9.16";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMTP_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

type Recipient = { user_id: number; email: string; name: string | null; unsubscribe_token: string };
type Promotion = {
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
  image_base64: string | null;
};

// SMTP settings
function smtpSetup() {
  const missing = SMTP_KEYS.filter((key) => !Deno.env.get(key));
  const port = Number(Deno.env.get("SMTP_PORT") || 0);
  let problem = missing.length ? `Missing secrets: ${missing.join(", ")}` : "";
  if (!problem && (port === 25 || port === 587))
    problem = "SMTP_PORT must be 465: Supabase blocks outgoing ports 25 and 587.";
  return { missing, problem, port };
}

// Create SMTP transport
function createTransport(port: number) {
  return nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST"),
    port,
    secure: port === 465,
    auth: { user: Deno.env.get("SMTP_USER"), pass: Deno.env.get("SMTP_PASS") },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
  });
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Convert bytea hex to base64
function byteaHexToBase64(value: string | null) {
  if (!value || !value.startsWith("\\x")) return null;
  const hex = value.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// Detect image type
function imageType(base64: string) {
  if (base64.startsWith("/9j/")) return { ext: "jpg", type: "image/jpeg" };
  if (base64.startsWith("R0lG")) return { ext: "gif", type: "image/gif" };
  if (base64.startsWith("UklGR")) return { ext: "webp", type: "image/webp" };
  return { ext: "png", type: "image/png" };
}

type StoreLocation = {
  unit_label?: string | null;
  floor_label?: string | null;
  floor_num?: number | null;
} | null;

// First name for greeting
function firstName(name: string | null | undefined) {
  const first = String(name ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || first.includes("@")) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

// Parse date
function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Format promotion date range
function formatDateRange(startValue: string | null, endValue: string | null) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  if (start && end) {
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
    const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
    if (sameMonth)
      return `${fmt(start, { month: "short", day: "numeric" })} – ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
    if (sameYear)
      return `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`;
    return `${fmt(start, { month: "short", day: "numeric", year: "numeric" })} – ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  const only = start ?? end;
  return only ? fmt(only, { month: "short", day: "numeric", year: "numeric" }) : "";
}

// Format store location
function formatLocation(location: StoreLocation) {
  if (!location) return "";
  const floor = location.floor_label || (location.floor_num != null ? `Floor ${location.floor_num}` : "");
  const unit = location.unit_label ? `Unit ${location.unit_label}` : "";
  return [floor, unit].filter(Boolean).join(" · ");
}

// Build email HTML
function buildEmail(opts: {
  promotion: Promotion;
  storeName: string;
  mallName: string;
  location?: StoreLocation;
  recipientName?: string | null;
  unsubscribeUrl?: string;
  openPixel?: string;
}) {
  const { promotion, storeName, mallName, location, recipientName, unsubscribeUrl, openPixel } = opts;
  const name = firstName(recipientName);
  const greeting = name ? `Hi ${name}!` : "Hi there!";
  const dates = formatDateRange(promotion.start, promotion.end);
  const where = formatLocation(location ?? null);
  // Plain subject (avoid spam filters)
  const subject = `${storeName} at ${mallName}: ${promotion.title}`.slice(0, 250);
  const preheader = [dates && `Valid ${dates}`, where && `Find ${storeName} on the ${where}`]
    .filter(Boolean)
    .join(". ");
  const intro = `${storeName} at ${mallName} just launched a new promotion. Since you've visited the mall with NavAR, we thought you'd like to know.`;
  const findIt = `Open the NavAR app and search for ${storeName} to get directions${where ? " to the store" : ""}.`;
  const why = `You're receiving this email because you visited ${mallName} using the NavAR app and have promotion alerts turned on. We count when this email is opened to see how promotions perform.`;

  const text = [
    greeting,
    "",
    intro,
    "",
    promotion.title,
    dates ? `Valid: ${dates}` : "",
    promotion.description ? `\n${promotion.description}` : "",
    "",
    "Where to find it",
    storeName,
    where,
    mallName,
    "",
    findIt,
    "",
    "See you at the mall!",
    "The NavAR team",
    "",
    "--",
    why,
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : "",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  const image = promotion.image_base64 ? imageType(promotion.image_base64) : null;
  const font = "font-family:Arial,Helvetica,sans-serif";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;${font};color:#1e293b">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:28px 28px 8px;${font}">
              <p style="margin:0 0 12px;font-size:16px;font-weight:bold">${escapeHtml(greeting)}</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#475569">${escapeHtml(intro)}</p>
            </td></tr>
            <tr><td style="padding:20px 28px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
                ${image ? `<tr><td><img src="cid:promo-image" alt="${escapeHtml(promotion.title)}" width="502" style="display:block;width:100%;height:auto;border:0"></td></tr>` : ""}
                <tr><td style="padding:20px;${font}">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#94a3b8">${escapeHtml(storeName)}</p>
                  <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a">${escapeHtml(promotion.title)}</h1>
                  ${dates ? `<p style="margin:0 0 12px"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:13px;font-weight:bold">Valid ${escapeHtml(dates)}</span></p>` : ""}
                  ${promotion.description ? `<p style="margin:0;font-size:15px;line-height:1.6;color:#334155;white-space:pre-line">${escapeHtml(promotion.description)}</p>` : ""}                </td></tr>
              </table>
            </td></tr>
            <tr><td style="padding:0 28px 8px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px">
                <tr><td style="padding:16px 20px;${font}">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#94a3b8">Where to find it</p>
                  <p style="margin:0;font-size:15px;font-weight:bold;color:#0f172a">${escapeHtml(storeName)}</p>
                  ${where ? `<p style="margin:2px 0 0;font-size:14px;color:#475569">${escapeHtml(where)}</p>` : ""}
                  <p style="margin:2px 0 0;font-size:14px;color:#475569">${escapeHtml(mallName)}</p>
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="padding:16px 28px 28px;${font}">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569">${escapeHtml(findIt)}</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#334155">See you at the mall!<br>The NavAR team</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 8px;${font};font-size:12px;line-height:1.6;color:#94a3b8;text-align:center">
          ${escapeHtml(why)}
          ${unsubscribeUrl ? `<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b;text-decoration:underline">Unsubscribe from promotion emails</a>` : ""}
        </td></tr>
      </table>
      ${openPixel ? `<img src="${escapeHtml(openPixel)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">` : ""}
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject,
    text,
    html,
    attachments: image
      ? [{
          filename: `promotion.${image.ext}`,
          content: promotion.image_base64!,
          encoding: "base64",
          contentType: image.type,
          cid: "promo-image",
        }]
      : [],
    // One-click unsubscribe headers
    headers: unsubscribeUrl
      ? { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
      : undefined,
  };
}

// Unsubscribe link URL
const unsubscribeUrl = (token: string) =>
  `${SUPABASE_URL}/functions/v1/promotion-unsubscribe?token=${encodeURIComponent(token)}`;

// Open tracking pixel URL
const openPixelUrl = (promotionId: number, token: string) =>
  `${SUPABASE_URL}/functions/v1/promotion-open?p=${promotionId}&t=${encodeURIComponent(token)}`;

// Rate limit by key
async function throttle(key: string, seconds: number) {
  const { data, error } = await admin.rpc("edge_throttle", { p_key: key, p_seconds: seconds });
  if (error) throw error;
  return data === true;
}

// Health check
async function handleHealth() {
  const { missing, problem, port } = smtpSetup();
  const secrets = Object.fromEntries(SMTP_KEYS.map((key) => [key, !missing.includes(key)]));
  if (problem) return json({ secrets, smtp: "not checked", problem }, 200);
  if (!(await throttle("smtp-health", 30)))
    return json({ secrets, smtp: "not checked", problem: "Checked recently; try again in 30 seconds." }, 429);
  const transport = createTransport(port);
  try {
    await transport.verify();
    return json({ secrets, smtp: "ok" });
  } catch (error) {
    return json({ secrets, smtp: "failed", problem: (error as Error).message }, 502);
  } finally {
    transport.close();
  }
}

// Load promotion for preview
async function loadPromotionForPreview(promotionId: number) {
  const { data: promo, error } = await admin
    .from("promotion")
    .select("promotion_title, promotion_description, promotion_start_date, promotion_end_date, store_id, promotion_image")
    .eq("promotion_id", promotionId)
    .maybeSingle();
  if (error) throw error;
  if (!promo) return null;
  const { data: store } = await admin.from("store").select("store_name, mall_id").eq("store_id", promo.store_id).maybeSingle();
  const { data: mall } = store?.mall_id
    ? await admin.from("mall").select("mall_name").eq("mall_id", store.mall_id).maybeSingle()
    : { data: null };
  const { data: unit } = await admin.from("unit").select("unit_label, floor_id")
    .eq("store_id", promo.store_id).order("unit_id").limit(1).maybeSingle();
  const { data: storeFloor } = await admin.from("store").select("onboarding_floor_id")
    .eq("store_id", promo.store_id).maybeSingle();
  const floorId = storeFloor?.onboarding_floor_id ?? unit?.floor_id;
  const { data: floor } = floorId
    ? await admin.from("floor").select("floor_label, floor_num").eq("floor_id", floorId).maybeSingle()
    : { data: null };
  return {
    promotion: {
      title: promo.promotion_title,
      description: promo.promotion_description,
      start: promo.promotion_start_date,
      end: promo.promotion_end_date,
      image_base64: byteaHexToBase64(promo.promotion_image),
    } as Promotion,
    storeName: store?.store_name ?? "Your store",
    mallName: mall?.mall_name ?? "the mall",
    location: {
      unit_label: unit?.unit_label ?? null,
      floor_label: floor?.floor_label ?? null,
      floor_num: floor?.floor_num ?? null,
    } as StoreLocation,
  };
}

// Send preview email
async function handlePreview(promotionId: number) {
  const { problem, port } = smtpSetup();
  if (problem) return json({ error: problem }, 500);
  if (!(await throttle("smtp-preview", 120)))
    return json({ error: "A preview was sent recently; try again in 2 minutes." }, 429);
  const loaded = await loadPromotionForPreview(promotionId);
  if (!loaded) return json({ error: "Promotion not found." }, 404);
  const email = buildEmail({ ...loaded, recipientName: "Juan Dela Cruz" });
  const transport = createTransport(port);
  try {
    await transport.sendMail({
      from: Deno.env.get("SMTP_FROM"),
      to: Deno.env.get("SMTP_USER"),
      replyTo: Deno.env.get("SMTP_USER"),
      subject: `[Preview] ${email.subject}`,
      text: email.text,
      html: email.html,
      attachments: email.attachments,
    });
    return json({ sent_to: "the sending Gmail account (SMTP_USER)" });
  } catch (error) {
    return json({ error: `SMTP send failed: ${(error as Error).message}` }, 502);
  } finally {
    transport.close();
  }
}

// Send to all recipients
async function sendBlast(claim: {
  blast_id: number;
  store_name: string;
  mall_name: string;
  location?: StoreLocation;
  promotion: Promotion;
  recipients: Recipient[];
}, port: number, promotionId: number) {
  const transport = createTransport(port);
  const results: { email: string; ok: boolean; error?: string }[] = [];
  let subject = "";
  let body = "";
  try {
    const queue = [...claim.recipients];
    const worker = async () => {
      while (queue.length) {
        const recipient = queue.shift()!;
        const email = buildEmail({
          promotion: claim.promotion,
          storeName: claim.store_name,
          mallName: claim.mall_name,
          location: claim.location,
          recipientName: recipient.name,
          unsubscribeUrl: unsubscribeUrl(recipient.unsubscribe_token),
          openPixel: openPixelUrl(promotionId, recipient.unsubscribe_token),
        });
        subject ||= email.subject;
        body ||= email.text.replace(/Unsubscribe: \S+/, "Unsubscribe: <personal link>");
        try {
          await transport.sendMail({
            from: Deno.env.get("SMTP_FROM"),
            to: recipient.email,
            replyTo: Deno.env.get("SMTP_USER"),
            subject: email.subject,
            text: email.text,
            html: email.html,
            attachments: email.attachments,
            headers: email.headers,
          });
          results.push({ email: recipient.email, ok: true });
        } catch (error) {
          results.push({ email: recipient.email, ok: false, error: String((error as Error).message).slice(0, 500) });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  } finally {
    transport.close();
    const { error } = await admin.rpc("finish_promotion_email_blast", {
      p_blast_id: claim.blast_id,
      p_subject: subject || `New promotion: ${claim.promotion.title}`,
      p_body: body,
      p_results: results,
    });
    if (error) console.error("finish_promotion_email_blast failed", error.message);
    console.log(`blast ${claim.blast_id}: ${results.filter((r) => r.ok).length} sent, ${results.filter((r) => !r.ok).length} failed`);
  }
}

// Send promotion emails
async function handleSend(req: Request, promotionId: number) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth?.user) return json({ error: "Sign in as the store's tenant to send promotion emails." }, 401);

  const { problem, port } = smtpSetup();
  if (problem) return json({ error: `Email is not configured: ${problem}` }, 500);

  const { data: claim, error } = await admin.rpc("claim_promotion_email_blast", {
    p_promotion_id: promotionId,
    p_auth_user: auth.user.id,
  });
  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 409;
    return json({ error: error.message }, status);
  }
  const recipients = (claim?.recipients ?? []) as Recipient[];
  if (!claim?.blast_id || recipients.length === 0)
    return json({ queued: 0, mall_name: claim?.mall_name ?? null });

  // Respond now, send in background
  EdgeRuntime.waitUntil(sendBlast(claim, port, promotionId));
  return json({ queued: recipients.length, mall_name: claim.mall_name });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const promotionId = Number(body?.promotion_id);
    if (body?.mode === "health") return await handleHealth();
    if (!Number.isInteger(promotionId) || promotionId < 1)
      return json({ error: "promotion_id is required." }, 400);
    if (body?.mode === "preview") return await handlePreview(promotionId);
    return await handleSend(req, promotionId);
  } catch (error) {
    console.error("notify-promotion error", (error as Error).message);
    return json({ error: "Unable to send promotion emails right now." }, 500);
  }
});
