"use strict";
/**
 * Kunlik AI savol limitini tekshiradi.
 * Limit oshganda foydalanuvchi 24 SOAT BLOKLANADI.
 * 24 soatdan keyin avtomatik ochiladi.
 */
const { UsageLog, User } = require("../models");

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "2025-05-22"
}

/**
 * Limit oshganda foydalanuvchi qachon unblock bo'lishini hisoblaydi.
 * Har kun 00:00 UTC da yangilanadi (24 soat emas, keyingi kun boshida).
 * Lekin agar bugun limit tugagan bo'lsa — ertaning 00:00 UTC gacha kutadi.
 */
function getUnblockTime() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

function msUntilUnblock(unblockTime) {
  return Math.max(0, new Date(unblockTime) - Date.now());
}

function formatTimeLeft(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h} soat ${m} daqiqa`;
  return `${m} daqiqa`;
}

/**
 * Limit oshganda { limitExceeded: true, used, limit, unblockAt } qaytaradi.
 * Muvaffaqiyatli bo'lsa null qaytaradi.
 * Limit barcha platformalar (web, mobile, telegram) uchun umumiy.
 */
async function checkAndIncrement(userId) {
  const date  = todayStr();
  const user  = await User.findById(userId).select("dailyLimit").lean();
  const limit = user?.dailyLimit ?? 20;

  // upsert: count ni 1 ga oshir (source ga qarab emas, umumiy)
  const log = await UsageLog.findOneAndUpdate(
    { userId, date },
    { $inc: { count: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (log.count > limit) {
    // ortiqcha increment ni qaytarib ol
    await UsageLog.updateOne({ userId, date }, { $inc: { count: -1 } });

    const unblockAt = getUnblockTime();
    const msLeft    = msUntilUnblock(unblockAt);

    return {
      limitExceeded: true,
      used:          limit,
      limit,
      unblockAt,
      timeLeft:      formatTimeLeft(msLeft),
    };
  }

  return null; // ruxsat berildi
}

/**
 * Express middleware — web chat uchun
 */
async function webLimitGuard(req, res, next) {
  try {
    const userId = req.authUser?.id;
    if (!userId) return res.status(401).json({ error: "Avtorizatsiya talab qilinadi" });

    const result = await checkAndIncrement(userId);
    if (result) {
      return res.status(429).json({
        error: `Kunlik limit tugadi (${result.limit} ta savol). ${result.timeLeft} dan so'ng ochiladi.`,
        limitExceeded: true,
        used:          result.used,
        limit:         result.limit,
        unblockAt:     result.unblockAt,
        timeLeft:      result.timeLeft,
      });
    }
    next();
  } catch (err) {
    console.error("usageLimit error:", err.message);
    next(); // limit xatosi bo'lsa ham davom etamiz
  }
}

/**
 * Mobile limit guard — /api/chat/send uchun
 */
async function mobileLimitGuard(req, res, next) {
  try {
    const userId = req.authUser?.id;
    if (!userId) return next(); // Guest foydalanuvchi — limitni tekshirmaymiz

    const result = await checkAndIncrement(userId);
    if (result) {
      return res.status(429).json({
        error: `Kunlik limit tugadi (${result.limit} ta savol). ${result.timeLeft} dan so'ng ochiladi.`,
        limitExceeded: true,
        used:          result.used,
        limit:         result.limit,
        unblockAt:     result.unblockAt,
        timeLeft:      result.timeLeft,
      });
    }
    next();
  } catch (err) {
    console.error("mobileLimitGuard error:", err.message);
    next();
  }
}

/**
 * Foydalanuvchining bugungi foydalanish statistikasini qaytaradi
 */
async function getUsageStats(userId) {
  const date = todayStr();
  const log  = await UsageLog.findOne({ userId, date }).lean();
  const user = await User.findById(userId).select("dailyLimit").lean();
  const limit = user?.dailyLimit ?? 20;
  const used  = log?.count || 0;
  const unblockAt = used >= limit ? getUnblockTime() : null;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    ...(unblockAt ? { unblockAt, timeLeft: formatTimeLeft(msUntilUnblock(unblockAt)) } : {}),
  };
}

module.exports = { webLimitGuard, mobileLimitGuard, checkAndIncrement, getUsageStats };
