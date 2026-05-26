"use strict";
require("dotenv").config();
const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");

const { Admin, User, SiteContent } = require("./models");
const {
  inputSanitizer,
  pathTraversalGuard,
  securityHeaders,
  payloadSizeGuard,
  botGuard,
} = require("./middleware/security");

const app  = express();
const PORT = process.env.PORT || 3000;

/* ─── Trust proxy (Nginx, Docker orqasida ishlasa) ─── */
app.set("trust proxy", 1);

/* ─── Security headers ─── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", "data:", "https:"],
      connectSrc:  ["'self'", "http://localhost:5173", "http://localhost:5174"],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(securityHeaders);

/* ─── CORS ─── */
const defaultOrigins = ["http://localhost:5173", "http://localhost:5174"];
const frontendUrl = process.env.FRONTEND_URL;
const envOrigins = frontendUrl ? frontendUrl.split(",").map(s => s.trim()) : [];
// Merge env origins with default origins, removing duplicates
const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];
app.use(cors({
  origin: (origin, cb) => {
    // Mobile app yoki Postman (origin yo'q)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("CORS: ruxsat etilmagan manba"));
  },
  credentials: true,
  methods:     ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-app-platform"],
}));

/* ─── Body parsing (kichik limit) ─── */
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

/* ─── Xavfsizlik filterlari ─── */
// Admin login endpointlari uchun xavfsizlik middleware'larini istisno qilamiz
app.use((req, res, next) => {
  if (req.path === '/api/admin/login') {
    return next();
  }
  pathTraversalGuard(req, res, next);
});
app.use((req, res, next) => {
  if (req.path === '/api/admin/login') {
    return next();
  }
  payloadSizeGuard(req, res, next);
});
app.use((req, res, next) => {
  if (req.path === '/api/admin/login') {
    return next();
  }
  inputSanitizer(req, res, next);
});
// botGuard - faqat API endpointlari uchun, admin login ni istisno qilamiz
app.use((req, res, next) => {
  if (req.path === '/api/admin/login') {
    return next();
  }
  return botGuard(req, res, next);
});

/* ─── Logging ─── */
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

/* ─── Global rate limiting ─── */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 200,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => {
    return (
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  },
  message: { error: "Juda ko'p so'rov. 15 daqiqa kuting." },
});
app.use("/api/", (req, res, next) => {
  if (req.path === '/api/admin/login') {
    return next();
  }
  return globalLimiter(req, res, next);
});

/* ─── Chat rate limiting (spam oldini olish) ─── */
app.use("/api/chat", rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: 30,
  keyGenerator: (req) => req.authUser?.id || req.socket?.remoteAddress || "unknown",
  message: { error: "Bir daqiqada ko'pi bilan 30 ta so'rov yuborishingiz mumkin." },
}));

/* ─── Auth rate limiting (brute-force) ─── */
app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Juda ko'p login urinish. 15 daqiqa kuting." },
  standardHeaders: true,
  legacyHeaders:   false,
}));


app.use("/api/auth/register", rateLimit({
  windowMs: 60 * 60 * 1000, // 1 soat
  max: 5,
  message: { error: "Ro'yxatdan o'tish cheklandi. 1 soatdan keyin qayta urinib ko'ring." },
}));

/* ─── Routes ─── */
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/chat",    require("./routes/chat"));
app.use("/api/admin",   require("./routes/admin"));
app.use("/api/visitor", require("./routes/visitor"));
app.use("/api/site",    require("./routes/site"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/support", require("./routes/support"));

/* ─── Health check ─── */
app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date() }));

/* ─── 404 ─── */
app.use((_, res) => res.status(404).json({ error: "Endpoint topilmadi" }));

/* ─── Global error handler ─── */
app.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Rasm hajmi 5MB dan oshmasligi kerak" });
  }
  if (err.message?.includes("Faqat rasm")) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.startsWith("CORS")) {
    return res.status(403).json({ error: "Ruxsat yo'q" });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server xatosi" });
});

/* ─── googleId: null duplicate key tuzatish ─── */
async function fixUserNullFields() {
  const r1 = await User.updateMany(
    { $or: [{ googleId: null }, { googleId: "" }] },
    { $unset: { googleId: "" } }
  );
  const r2 = await User.updateMany(
    { $or: [{ telegramId: null }, { telegramId: "" }] },
    { $unset: { telegramId: "" } }
  );
  if (r1.modifiedCount || r2.modifiedCount) {
    console.log(`✅ Foydalanuvchi maydonlari tuzatildi (googleId: ${r1.modifiedCount}, telegramId: ${r2.modifiedCount})`);
  }
}

/* ─── Create default admin if none exists ─── */
async function ensureAdmin() {
  const count = await Admin.countDocuments();
  if (count === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    await Admin.create({ username, password });
    console.log(`✅ Default admin yaratildi: ${username} / ${password}`);
    console.log("⚠️  Iltimos parolni o'zgartiring!");
  }
}

/* ─── Create default site content if none exists ─── */
async function ensureSiteContent() {
  const count = await SiteContent.countDocuments();
  if (count === 0) {
    await SiteContent.create({});
    console.log("✅ Default site content yaratildi");
  }
}

/* ─── DB connect + start ─── */
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mening_huquqim", {
    serverSelectionTimeoutMS: 5000,
  })
  .then(async () => {
    console.log("✅ MongoDB ulandi");
    await fixUserNullFields();
    await ensureAdmin();
    await ensureSiteContent();

    // Start Telegram bot
    if (process.env.TELEGRAM_BOT_TOKEN) require("./telegram-bot");

    app.listen(PORT, () => console.log(`🚀 Server http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB ulanmadi:", err.message);
    process.exit(1);
  });
