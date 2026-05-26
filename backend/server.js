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

/* ─── Trust proxy ─── */
app.set("trust proxy", 1);

/* ─── Root endpoint (FIX) ─── */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "🚀 Backend ishlayapti",
  });
});

/* ─── Health check ─── */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

/* ─── Security headers ─── */
app.use(helmet());
app.use(securityHeaders);

/* ─── CORS ─── */
const defaultOrigins = ["http://localhost:5173", "http://localhost:5174"];
const frontendUrl = process.env.FRONTEND_URL;

const envOrigins = frontendUrl
  ? frontendUrl.split(",").map((s) => s.trim())
  : [];

const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS: ruxsat etilmagan manba"));
    },
    credentials: true,
  })
);

/* ─── Body parsing ─── */
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

/* ─── Security middleware ─── */
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
  return botGuard(req, res, next);
});

/* ─── Logging ─── */
app.use(process.env.NODE_ENV === "production" ? morgan("combined") : morgan("dev"));

/* ─── Routes ─── */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/visitor", require("./routes/visitor"));
app.use("/api/site", require("./routes/site"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/support", require("./routes/support"));

/* ─── 404 ─── */
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint topilmadi" });
});

/* ─── DB + SERVER START (ONLY ONCE) ─── */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB ulandi");

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