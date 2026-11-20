// Keep copies in all four backends synchronized. Never trust forwarded headers by default.
const { randomUUID, createHash, randomBytes } = require("node:crypto");
function createSecurity(env = process.env, log = (line) => console.info(line)) {
  const trusted = new Set(
    (env.TRUSTED_PROXY_IPS || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  );
  const buckets = new Map();
  const salt = randomBytes(16).toString("hex");
  return (req, res) => {
    const address = req.socket.remoteAddress || "unknown";
    const secure =
      !!req.socket.encrypted ||
      (trusted.has(address) && req.headers["x-forwarded-proto"] === "https");
    const requestId = randomUUID();
    res.setHeader("X-Request-ID", requestId);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
    res.once("finish", () => {
      if (
        res.statusCode >= 400 ||
        /^\/api\/(auth|account-access)(\/|$)/.test(req.url || "")
      ) {
        log(
          JSON.stringify({
            event: "http_security",
            requestId,
            method: req.method,
            status: res.statusCode,
            peer: createHash("sha256")
              .update(salt + address)
              .digest("hex")
              .slice(0, 16),
          }),
        );
      }
    });
    const reject = (status, message) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message }));
      return false;
    };
    if (env.NODE_ENV === "production" && !secure)
      return reject(426, "HTTPS is required.");
    const now = Date.now();
    for (const [key, item] of buckets)
      if (item.until <= now) buckets.delete(key);
    // Socket peer is deliberate. Apply per-client rate limits at the trusted ingress too.
    let bucket = buckets.get(address);
    if (!bucket) {
      if (buckets.size >= 10000) return reject(429, "Too many requests.");
      bucket = { count: 0, until: now + 60000 };
      buckets.set(address, bucket);
    }
    if (++bucket.count > 300) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((bucket.until - now) / 1000)),
      );
      return reject(429, "Too many requests. Please try again shortly.");
    }
    return true;
  };
}
function assertProductionOrigins(env, origins) {
  if (env.NODE_ENV !== "production") return;
  if (
    !origins.length ||
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return (
          url.protocol !== "https:" ||
          url.origin !== origin ||
          url.username ||
          url.password
        );
      } catch {
        return true;
      }
    })
  )
    throw new Error("Production frontend origins must be exact HTTPS origins.");
}
module.exports = { createSecurity, assertProductionOrigins };
