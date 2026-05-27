"use strict";
/**
 * Kunlik AI savol limitini tekshiradi.
 * Limit oshganda foydalanuvchi keyingi kun 00:00 UTC da ochiladi.
 */
const { UsageLog, User } = require("../models");

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getUnblockTime() {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

function msUntilUnblock(unblockTime) {
  return Math.max(0, new Date(unblockTime) - Date.now());
}

/**
 * Qolgan vaqtni 3 tilda formatlaydi
 * lang: "uz" | "ru" | "en"
 */
function formatTimeLeft(ms, lang = "uz") {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);

  if (lang === "ru") {
    if (h > 0) return `${h} ч ${m} мин`;
    return `${m} мин`;
  }
  if (lang === "en") {
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  // uz (default)
  if (h > 0) return `${h} soat ${m} daqiqa`;
  return `${m} daqiqa`;
}

/**
 * unblockAt vaqtini mahalliy ko'rinishda formatlaydi
 * Masalan: "ertaga 03:00" yoki "07:30"
 */
function formatUnblockAt(unblockTime, lang = "uz") {
  const now = new Date();
  const dt = new Date(unblockTime);

  // Toshkent: UTC+5
  const offsetMs = 5 * 60 * 60 * 1000;
  const localNow = new Date(now.getTime() + offsetMs);
  const localDt = new Date(dt.getTime() + offsetMs);

  const hh = String(localDt.getUTCHours()).padStart(2, "0");
  const mm = String(localDt.getUTCMinutes()).padStart(2, "0");
  const timeStr = `${hh}:${mm}`;

  const isTomorrow = localDt.getUTCDate() !== localNow.getUTCDate();

  if (lang === "ru")
    return isTomorrow ? `завтра в ${timeStr}` : `сегодня в ${timeStr}`;
  if (lang === "en")
    return isTomorrow ? `tomorrow at ${timeStr}` : `today at ${timeStr}`;
  return isTomorrow ? `ertaga ${timeStr} da` : `bugun ${timeStr} da`;
}

/**
 * Limit oshganda { limitExceeded, used, limit, unblockAt, timeLeft, unblockAtStr } qaytaradi.
 * Muvaffaqiyatli bo'lsa null qaytaradi.
 */
async function checkAndIncrement(userId) {
  const date = todayStr();
  const user = await User.findById(userId).select("dailyLimit").lean();
  const limit = user?.dailyLimit ?? 20;

  const log = await UsageLog.findOneAndUpdate(
    { userId, date },
    { $inc: { count: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (log.count > limit) {
    await UsageLog.updateOne({ userId, date }, { $inc: { count: -1 } });

    const unblockAt = getUnblockTime();
    const msLeft = msUntilUnblock(unblockAt);

    return {
      limitExceeded: true,
      used: limit,
      limit,
      unblockAt,
      msLeft,
      // har 3 tilda tayyor stringlar
      timeLeft: {
        uz: formatTimeLeft(msLeft, "uz"),
        ru: formatTimeLeft(msLeft, "ru"),
        en: formatTimeLeft(msLeft, "en"),
      },
      unblockAtStr: {
        uz: formatUnblockAt(unblockAt, "uz"),
        ru: formatUnblockAt(unblockAt, "ru"),
        en: formatUnblockAt(unblockAt, "en"),
      },
    };
  }

  return null;
}

/**
 * Express middleware — web chat uchun
 */
async function webLimitGuard(req, res, next) {
  try {
    const userId = req.authUser?.id;
    if (!userId)
      return res.status(401).json({ error: "Avtorizatsiya talab qilinadi" });

    const result = await checkAndIncrement(userId);
    if (result) {
      return res.status(429).json({
        error: `Kunlik limit tugadi (${result.limit} ta savol). ${result.unblockAtStr.uz} ochiladi.`,
        limitExceeded: true,
        used: result.used,
        limit: result.limit,
        unblockAt: result.unblockAt,
        timeLeft: result.timeLeft.uz,
        unblockAtStr: result.unblockAtStr,
      });
    }
    next();
  } catch (err) {
    console.error("usageLimit error:", err.message);
    next();
  }
}

/**
 * Mobile limit guard
 */
async function mobileLimitGuard(req, res, next) {
  try {
    const userId = req.authUser?.id;
    if (!userId) return next();

    const result = await checkAndIncrement(userId);
    if (result) {
      return res.status(429).json({
        error: `Kunlik limit tugadi (${result.limit} ta savol). ${result.unblockAtStr.uz} ochiladi.`,
        limitExceeded: true,
        used: result.used,
        limit: result.limit,
        unblockAt: result.unblockAt,
        timeLeft: result.timeLeft.uz,
        unblockAtStr: result.unblockAtStr,
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
  const log = await UsageLog.findOne({ userId, date }).lean();
  const user = await User.findById(userId).select("dailyLimit").lean();
  const limit = user?.dailyLimit ?? 20;
  const used = log?.count || 0;

  if (used >= limit) {
    const unblockAt = getUnblockTime();
    const msLeft = msUntilUnblock(unblockAt);
    return {
      used,
      limit,
      remaining: 0,
      unblockAt,
      timeLeft: {
        uz: formatTimeLeft(msLeft, "uz"),
        ru: formatTimeLeft(msLeft, "ru"),
        en: formatTimeLeft(msLeft, "en"),
      },
      unblockAtStr: {
        uz: formatUnblockAt(unblockAt, "uz"),
        ru: formatUnblockAt(unblockAt, "ru"),
        en: formatUnblockAt(unblockAt, "en"),
      },
    };
  }

  return { used, limit, remaining: Math.max(0, limit - used) };
}

module.exports = {
  webLimitGuard,
  mobileLimitGuard,
  checkAndIncrement,
  getUsageStats,
};
