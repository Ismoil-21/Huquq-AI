"use strict";
/**
 * Push bildirishnomalar API
 * Expo Push Notifications ishlatiladi
 */
const router = require("express").Router();
const { User } = require("../models");
const { userGuard, adminGuard } = require("../middleware/auth");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/* ── Push token saqlash ── */
router.post("/register-token", userGuard, async (req, res) => {
  try {
    const { token: pushToken, platform } = req.body;
    if (!pushToken || typeof pushToken !== "string") {
      return res.status(400).json({ error: "Push token kerak" });
    }

    // Token formatini tekshirish (Expo format: ExponentPushToken[...])
    if (!pushToken.startsWith("ExponentPushToken[") && !pushToken.startsWith("ExpoPushToken[")) {
      return res.status(400).json({ error: "Noto'g'ri push token formati" });
    }

    await User.updateOne(
      { _id: req.authUser.id },
      {
        $set: {
          pushToken,
          pushPlatform: platform || "unknown",
          pushTokenUpdatedAt: new Date(),
        },
      }
    );

    return res.json({ success: true, message: "Push token saqlandi" });
  } catch (err) {
    console.error("register-token error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* ── Push token o'chirish (logout da) ── */
router.delete("/register-token", userGuard, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.authUser.id },
      { $unset: { pushToken: "", pushPlatform: "", pushTokenUpdatedAt: "" } }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* ── Test bildirishnoma (faqat admin) ── */
router.post("/send-test", adminGuard, async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    if (!userId) return res.status(400).json({ error: "userId kerak" });

    const user = await User.findById(userId).select("pushToken").lean();
    if (!user?.pushToken) return res.status(404).json({ error: "Foydalanuvchi push token ga ega emas" });

    const result = await sendPushNotification(user.pushToken, title || "Huquq AI", body || "Test bildirishnoma", data);
    return res.json({ success: true, result });
  } catch (err) {
    console.error("send-test error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* ── Ommaviy bildirishnoma (admin) ── */
router.post("/broadcast", adminGuard, async (req, res) => {
  try {
    const { title, body, data } = req.body;
    if (!title || !body) return res.status(400).json({ error: "title va body kerak" });

    const users = await User.find({ pushToken: { $exists: true, $ne: null } })
      .select("pushToken")
      .lean();

    if (!users.length) return res.json({ success: true, sent: 0, message: "Push tokeni bor foydalanuvchi yo'q" });

    const tokens = users.map((u) => u.pushToken).filter(Boolean);
    const chunks = chunkArray(tokens, 100); // Expo 100 ta limitida

    let totalSent = 0;
    for (const chunk of chunks) {
      try {
        await sendBatchNotifications(chunk, title, body, data);
        totalSent += chunk.length;
      } catch (err) {
        console.error("Batch send error:", err.message);
      }
    }

    return res.json({ success: true, sent: totalSent, total: tokens.length });
  } catch (err) {
    console.error("broadcast error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* ── Yordam funksiyalar ── */

/**
 * Bitta foydalanuvchiga push bildirishnoma yuborish
 */
async function sendPushNotification(token, title, body, data = {}) {
  if (!token) return null;

  const message = {
    to:    token,
    sound: "default",
    title,
    body,
    data,
    badge: 1,
    priority: "high",
  };

  try {
    const resp = await fetchWithTimeout(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Accept":       "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }, 10000);

    if (!resp.ok) {
      console.error("Expo push error:", resp.status);
      return null;
    }

    const result = await resp.json();
    return result;
  } catch (err) {
    console.error("sendPushNotification error:", err.message);
    return null;
  }
}

/**
 * Ko'p foydalanuvchiga bir vaqtda push yuborish
 */
async function sendBatchNotifications(tokens, title, body, data = {}) {
  const messages = tokens.map((token) => ({
    to:    token,
    sound: "default",
    title,
    body,
    data,
    badge: 1,
    priority: "high",
  }));

  const resp = await fetchWithTimeout(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Accept":       "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  }, 30000);

  if (!resp.ok) throw new Error(`Expo push batch error: ${resp.status}`);
  return await resp.json();
}

/**
 * Limit tugagan foydalanuvchiga bildirishnoma (internal funksiya)
 */
async function notifyLimitReached(userId, timeLeft) {
  try {
    const user = await User.findById(userId).select("pushToken").lean();
    if (!user?.pushToken) return;

    await sendPushNotification(
      user.pushToken,
      "⚠️ Kunlik limit tugadi",
      `Bugungi ${timeLeft} dan so'ng AI maslahatdan foydalanishingiz mumkin.`,
      { type: "limit_reached", timeLeft }
    );
  } catch (err) {
    console.error("notifyLimitReached error:", err.message);
  }
}

/**
 * Limit ochilganda (keyingi kun) bildirishnoma
 * Cron job yoki scheduler bilan chaqiriladi
 */
async function notifyLimitReset(userId) {
  try {
    const user = await User.findById(userId).select("pushToken").lean();
    if (!user?.pushToken) return;

    await sendPushNotification(
      user.pushToken,
      "✅ Limit yangilandi!",
      "Bugungi savollaringiz qayta tiklandi. Huquqiy maslahat olishingiz mumkin!",
      { type: "limit_reset" }
    );
  } catch (err) {
    console.error("notifyLimitReset error:", err.message);
  }
}

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

module.exports = router;
module.exports.sendPushNotification  = sendPushNotification;
module.exports.notifyLimitReached    = notifyLimitReached;
module.exports.notifyLimitReset      = notifyLimitReset;
