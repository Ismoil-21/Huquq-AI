"use strict";
/**
 * Kuchli xavfsizlik middleware to'plami
 * - XSS, SQL/NoSQL injection himoya
 * - Brute-force himoya
 * - Shubhali so'rovlarni bloklash
 * - Input sanitizatsiya
 * - Security headers
 */

// ── In-memory brute-force tracker ────────────────────────────
// ESLATMA: Bu in-memory — server restart da tozalanadi.
// Production da Redis ishlatish tavsiya etiladi.
const loginAttempts = new Map(); // ip -> { count, resetAt }
const blockedIPs = new Map(); // ip -> unblockAt

// Eskirgan yozuvlarni tozalash (xotira tejash uchun)
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, unblockAt] of blockedIPs.entries()) {
      if (now > unblockAt) {
        blockedIPs.delete(ip);
        loginAttempts.delete(ip);
      }
    }
    for (const [ip, entry] of loginAttempts.entries()) {
      if (now > entry.resetAt) loginAttempts.delete(ip);
    }
  },
  5 * 60 * 1000,
); // har 5 daqiqada

const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 daqiqa
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 daqiqa

// ── IP bloklash ──────────────────────────────────────────────
function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function isIPBlocked(ip) {
  const entry = blockedIPs.get(ip);
  if (!entry) return false;
  if (Date.now() > entry) {
    blockedIPs.delete(ip);
    loginAttempts.delete(ip);
    return false;
  }
  return true;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || {
    count: 0,
    resetAt: now + ATTEMPT_WINDOW_MS,
  };

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + ATTEMPT_WINDOW_MS;
  } else {
    entry.count++;
  }

  loginAttempts.set(ip, entry);

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    blockedIPs.set(ip, now + BLOCK_DURATION_MS);
    loginAttempts.delete(ip);
    return true; // blocked
  }
  return false;
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
  blockedIPs.delete(ip);
}

// ── Brute-force guard (login endpoint uchun) ─────────────────
function bruteForceGuard(req, res, next) {
  const ip = getClientIp(req);

  if (isIPBlocked(ip)) {
    const unblockAt = blockedIPs.get(ip);
    const minutesLeft = Math.ceil((unblockAt - Date.now()) / 60000);
    return res.status(429).json({
      error: `Juda ko'p urinish. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.`,
      blockedUntil: unblockAt,
    });
  }
  next();
}

// ── Input sanitizatsiya (XSS, NoSQL injection) ───────────────
const NOSQL_DANGEROUS =
  /(\$where|\$gt|\$lt|\$ne|\$in|\$nin|\$regex|\$exists|\$or|\$and|\$not|\$nor)/i;

function sanitizeValue(val) {
  if (typeof val === "string") {
    // Oddiy XSS himoya
    return val
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }
  if (typeof val === "object" && val !== null) {
    return sanitizeObject(val);
  }
  return val;
}

function sanitizeObject(obj) {
  if (Array.isArray(obj)) return obj.map(sanitizeValue);
  const clean = {};
  for (const key of Object.keys(obj)) {
    // MongoDB operator kalitlarini olib tashlash
    if (key.startsWith("$")) continue;
    clean[key] = sanitizeValue(obj[key]);
  }
  return clean;
}

function inputSanitizer(req, res, next) {
  // Body tekshiruvi
  if (req.body && typeof req.body === "object") {
    const bodyStr = JSON.stringify(req.body);
    if (NOSQL_DANGEROUS.test(bodyStr)) {
      return res.status(400).json({ error: "Noto'g'ri so'rov formati" });
    }
    req.body = sanitizeObject(req.body);
  }

  // Query params tekshiruvi
  if (req.query) {
    const queryStr = JSON.stringify(req.query);
    if (NOSQL_DANGEROUS.test(queryStr)) {
      return res.status(400).json({ error: "Noto'g'ri so'rov parametrlari" });
    }
  }

  // Shubhali User-Agent
  const ua = req.headers["user-agent"] || "";
  const suspiciousUA =
    /sqlmap|nikto|nmap|masscan|burpsuite|dirbuster|hydra|medusa|acunetix|nessus|openvas/i;
  if (suspiciousUA.test(ua)) {
    return res.status(403).json({ error: "Ruxsat yo'q" });
  }

  next();
}

// ── Path traversal himoya ─────────────────────────────────────
function pathTraversalGuard(req, res, next) {
  const url = req.url || "";
  if (
    url.includes("../") ||
    url.includes("..\\") ||
    url.includes("%2e%2e") ||
    url.includes("%252e")
  ) {
    return res.status(400).json({ error: "Noto'g'ri so'rov" });
  }
  next();
}

// ── Content-type enforcement ──────────────────────────────────
function contentTypeGuard(req, res, next) {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const ct = req.headers["content-type"] || "";
    if (
      !ct.includes("application/json") &&
      !ct.includes("multipart/form-data")
    ) {
      return res
        .status(415)
        .json({ error: "Qo'llab-quvvatlanmaydigan media turi" });
    }
  }
  next();
}

// ── Security headers (Helmet ga qo'shimcha) ───────────────────
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  res.removeHeader("X-Powered-By");
  next();
}

// ── Payload hajm tekshiruvi ───────────────────────────────────
function payloadSizeGuard(req, res, next) {
  const contentLength = parseInt(req.headers["content-length"] || "0");
  const MAX_SIZE = 1 * 1024 * 1024; // 1MB
  if (contentLength > MAX_SIZE) {
    return res.status(413).json({ error: "So'rov hajmi juda katta" });
  }
  next();
}

// ── Bot/scraper tekshiruvi ────────────────────────────────────
function botGuard(req, res, next) {
  // API endpointlariga browser bo'lmagan so'rovlar uchun
  if (req.path.startsWith("/api/")) {
    const ua = req.headers["user-agent"] || "";
    // Ruxsat etilgan bot agentlari (mobile app, postman testing)
    const allowedBots = /expo|okhttp|axios|mobile|android|iphone|ipad|postman/i;
    const isBotAttack =
      /python-requests|go-http|curl\/[0-9]|wget|scrapy|phantom/i;
    if (isBotAttack.test(ua) && !allowedBots.test(ua)) {
      console.warn(
        `⚠️ Shubhali agent bloklandi: ${ua} - IP: ${getClientIp(req)}`,
      );
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }
  }
  next();
}

module.exports = {
  bruteForceGuard,
  inputSanitizer,
  pathTraversalGuard,
  contentTypeGuard,
  securityHeaders,
  payloadSizeGuard,
  botGuard,
  recordFailedLogin,
  clearLoginAttempts,
  getClientIp,
};
