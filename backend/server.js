"use strict";
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { Admin, User, SiteContent } = require("./models");
const {
  inputSanitizer,
  pathTraversalGuard,
  securityHeaders,
  payloadSizeGuard,
  botGuard,
} = require("./middleware/security");

const app = express();
const PORT = process.env.PORT || 3000;

/* ───── TRUST PROXY ───── */
app.set("trust proxy", 1);

/* ───── BASIC ROUTES ───── */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "API ishlayapti 🚀",
    status: "ok",
  });
});

app.get("/health", (_, res) =>
  res.json({ status: "ok", timestamp: new Date() }),
);

/* ───── SECURITY HEADERS ───── */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(securityHeaders);

/* ───── CORS ───── */
const defaultOrigins = ["http://localhost:5173", "http://localhost:5174", "https://huquq-ai-fpa2.onrender.com"];
const frontendUrl = process.env.FRONTEND_URL;

const allowedOrigins = [
  ...new Set([
    ...(frontendUrl ? frontendUrl.split(",").map((s) => s.trim()) : []),
    ...defaultOrigins,
  ]),
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS blocked"));
    },
    credentials: true,
  }),
);

/* ───── BODY LIMIT ───── */
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

/* ───── SECURITY MIDDLEWARE ───── */
app.use((req, res, next) => {
  if (req.path === "/api/admin/login") return next();
  pathTraversalGuard(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === "/api/admin/login") return next();
  payloadSizeGuard(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === "/api/admin/login") return next();
  inputSanitizer(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === "/api/admin/login") return next();
  botGuard(req, res, next);
});

/* ───── LOGGING ───── */
app.use(
  process.env.NODE_ENV === "production" ? morgan("combined") : morgan("dev"),
);

/* ───── RATE LIMIT ───── */
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: "Juda ko'p so'rov" },
  }),
);

/* ───── ROUTES ───── */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/visitor", require("./routes/visitor"));
app.use("/api/site", require("./routes/site"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/support", require("./routes/support"));

/* ───── 404 ───── */
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint topilmadi" });
});

/* ───── ERROR HANDLER ───── */
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.message?.includes("CORS")) {
    return res.status(403).json({ error: "CORS blocked" });
  }

  res.status(500).json({ error: "Server xatosi" });
});

/* ───── DB + START ───── */
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mening_huquqim",
    {
      serverSelectionTimeoutMS: 5000,
    },
  )
  .then(async () => {
    console.log("✅ MongoDB ulandi");

    await User.updateMany(
      { $or: [{ googleId: null }, { googleId: "" }] },
      { $unset: { googleId: "" } },
    );

    await User.updateMany(
      { $or: [{ telegramId: null }, { telegramId: "" }] },
      { $unset: { telegramId: "" } },
    );

    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "admin123",
      });
      console.log("✅ Default admin yaratildi");
    }

    const contentCount = await SiteContent.countDocuments();
    if (contentCount === 0) {
      await SiteContent.create({});
      console.log("✅ Site content yaratildi");
    }

    if (process.env.TELEGRAM_BOT_TOKEN) {
      require("./telegram-bot");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });