"use strict";
const router = require("express").Router();
const { Chat } = require("../models");
const { getLegalAdvice } = require("../services/legalAI");
const { recordStat } = require("../services/stats");
const { userGuard, optionalUserGuard } = require("../middleware/auth");
const {
  webLimitGuard,
  mobileLimitGuard,
  getUsageStats,
  checkAndIncrement,
} = require("../middleware/usageLimit");
const { notifyLimitReached } = require("./notifications");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const MAX_MESSAGES_PER_CHAT = 200; // Bitta chat sessiyasida maksimal xabar soni

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Faqat rasm yuklash mumkin (JPEG, PNG, WEBP, GIF)"));
  },
});

const LANG_INSTRUCTION = {
  uz: "Javobni faqat o'zbek tilida yozing.",
  ru: "Отвечайте только на русском языке.",
  en: "Respond only in English.",
};

function toObjectId(id) {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
}
function genSessionId(prefix, userId) {
  return `${prefix}_${userId}_${Date.now()}`;
}
function withLang(message, lang) {
  const instruction = LANG_INSTRUCTION[lang] || LANG_INSTRUCTION.uz;
  return `[${instruction}]\n\n${message}`;
}

/* ─────────────────────────────────────────────────────────────
   POST /api/chat  (web)
─────────────────────────────────────────────────────────────── */
router.post(
  "/",
  userGuard,
  webLimitGuard,
  upload.single("image"),
  async (req, res) => {
    try {
      const { message, sessionId: existingId, lang = "uz" } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res
          .status(400)
          .json({ error: "Xabar bo'sh bo'lishi mumkin emas" });
      }

      let imageBase64 = null;
      let imageMimeType = "image/jpeg";
      if (req.file) {
        imageBase64 = req.file.buffer.toString("base64");
        imageMimeType = req.file.mimetype;
      }

      const userId = toObjectId(req.authUser.id);
      const trimmed = message.trim().slice(0, 2000);

      // Frontend yuborgan sessionId ni DOIM ishlatamiz (yangi yoki mavjud)
      // Eski bug: topilmasa yangi ID generatsiya qilinar edi → 2 ta chat paydo bo'lardi
      const sessionId = existingId || genSessionId("web", req.authUser.id);

      let chat = await Chat.findOne({ sessionId, userId });
      if (!chat) {
        chat = new Chat({ sessionId, userId, source: "web", messages: [] });
      }

      const { answer, category } = await getLegalAdvice(
        trimmed,
        chat.messages,
        imageBase64,
        imageMimeType,
        lang,
      );

      const userContent = req.file ? `[Rasm] ${trimmed}` : trimmed;
      const userMsg = { role: "user", content: userContent };
      if (imageBase64) {
        // imageData DB ga saqlanmaydi (hajm muammosi)
        userMsg.imageMimeType = imageMimeType;
      }
      chat.messages.push(userMsg);
      chat.messages.push({ role: "assistant", content: answer });

      // Eski xabarlarni tozalash (limit oshsa)
      if (chat.messages.length > MAX_MESSAGES_PER_CHAT) {
        chat.messages = chat.messages.slice(-MAX_MESSAGES_PER_CHAT);
      }

      chat.category = category;
      await chat.save();

      recordStat("web", category).catch(() => {});

      const usage = await getUsageStats(req.authUser.id);
      return res.json({ answer, sessionId: chat.sessionId, category, usage });
    } catch (err) {
      console.error("chat POST error:", err.message);
      if (err.message?.includes("Faqat rasm")) {
        return res.status(400).json({ error: err.message });
      }
      return res
        .status(500)
        .json({ error: "Server xatosi. Qayta urinib ko'ring." });
    }
  },
);

/* ─────────────────────────────────────────────────────────────
   POST /api/chat/send  (mobile ilovasi)
─────────────────────────────────────────────────────────────── */
router.post("/send", optionalUserGuard, mobileLimitGuard, async (req, res) => {
  try {
    const { message, sessionId: existingId, lang = "uz" } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res
        .status(400)
        .json({ error: "Xabar bo'sh bo'lishi mumkin emas" });
    }

    const trimmed = message.trim().slice(0, 2000);
    const userId = req.authUser ? toObjectId(req.authUser.id) : null;

    let sessionId = existingId || genSessionId("mobile", userId || "guest");

    let chat = null;
    if (existingId) {
      const q = { sessionId: existingId };
      if (userId) q.userId = userId;
      chat = await Chat.findOne(q);
      if (!chat) sessionId = genSessionId("mobile", userId || "guest");
    }

    if (!chat) {
      chat = new Chat({
        sessionId,
        userId: userId || undefined,
        source: "mobile",
        messages: [],
      });
    }

    const { answer, category } = await getLegalAdvice(
      trimmed,
      chat.messages,
      null,
      null,
      lang,
    );

    chat.messages.push({ role: "user", content: trimmed });
    chat.messages.push({ role: "assistant", content: answer });

    // Eski xabarlarni tozalash (limit oshsa)
    if (chat.messages.length > MAX_MESSAGES_PER_CHAT) {
      chat.messages = chat.messages.slice(-MAX_MESSAGES_PER_CHAT);
    }

    chat.category = category;
    await chat.save();

    recordStat("mobile", category).catch(() => {});

    // Usage limit check
    let remaining = null;
    let unblockAt = null;
    let timeLeft = null;
    if (userId) {
      try {
        const usage = await getUsageStats(userId);
        remaining = usage.remaining;
        unblockAt = usage.unblockAt || null;
        timeLeft = usage.timeLeft || null;
      } catch {}
    }

    return res.json({
      reply: answer,
      sessionId: chat.sessionId,
      category,
      remaining,
      unblockAt,
      timeLeft,
    });
  } catch (err) {
    console.error("chat/send POST error:", err.message);
    return res
      .status(500)
      .json({ error: "Server xatosi. Qayta urinib ko'ring." });
  }
});

/* GET /api/chat/usage */
router.get("/usage", userGuard, async (req, res) => {
  try {
    const usage = await getUsageStats(req.authUser.id);
    return res.json(usage);
  } catch {
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* GET /api/chat/history  (mobile) */
router.get("/history", userGuard, async (req, res) => {
  try {
    const chats = await Chat.find({
      userId: toObjectId(req.authUser.id),
      source: "mobile",
    })
      .sort({ updatedAt: -1 })
      .select("sessionId category createdAt updatedAt messages")
      .lean();

    const result = chats.map((c) => ({
      sessionId: c.sessionId,
      category: c.category,
      messageCount: c.messages.length,
      firstQuestion:
        c.messages.find((m) => m.role === "user")?.content?.slice(0, 80) || "",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return res.json({ sessions: result });
  } catch (err) {
    console.error("history error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* GET /api/chat/sessions (web) */
router.get("/sessions", userGuard, async (req, res) => {
  try {
    const chats = await Chat.find({
      userId: toObjectId(req.authUser.id),
      source: "web",
    })
      .sort({ updatedAt: -1 })
      .select("sessionId category createdAt updatedAt messages")
      .lean();

    const result = chats.map((c) => ({
      sessionId: c.sessionId,
      category: c.category,
      messageCount: c.messages.length,
      firstQuestion:
        c.messages.find((m) => m.role === "user")?.content?.slice(0, 80) || "",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return res.json({ sessions: result });
  } catch (err) {
    console.error("sessions error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* GET /api/chat/session/:sessionId  (mobile) */
router.get("/session/:sessionId", userGuard, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      sessionId: req.params.sessionId,
      userId: toObjectId(req.authUser.id),
    }).lean();

    if (!chat) return res.status(404).json({ error: "Suhbat topilmadi" });
    return res.json({
      sessionId: chat.sessionId,
      messages: chat.messages,
      category: chat.category,
      createdAt: chat.createdAt,
    });
  } catch (err) {
    console.error("get session error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* GET /api/chat/:sessionId */
router.get("/:sessionId", userGuard, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      sessionId: req.params.sessionId,
      userId: toObjectId(req.authUser.id),
    }).lean();

    if (!chat) return res.status(404).json({ error: "Suhbat topilmadi" });
    return res.json({
      sessionId: chat.sessionId,
      messages: chat.messages,
      category: chat.category,
      createdAt: chat.createdAt,
    });
  } catch (err) {
    console.error("get chat error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* DELETE /api/chat/session/:sessionId  (mobile) */
router.delete("/session/:sessionId", userGuard, async (req, res) => {
  try {
    await Chat.deleteOne({
      sessionId: req.params.sessionId,
      userId: toObjectId(req.authUser.id),
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* DELETE /api/chat/:sessionId */
router.delete("/:sessionId", userGuard, async (req, res) => {
  try {
    await Chat.deleteOne({
      sessionId: req.params.sessionId,
      userId: toObjectId(req.authUser.id),
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
