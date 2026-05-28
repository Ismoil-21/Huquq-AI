"use strict";
const router   = require("express").Router();
const jwt      = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { User, LoginLog } = require("../models");
const { bruteForceGuard, recordFailedLogin, clearLoginAttempts, getClientIp } = require("../middleware/security");
const { generateOTP, sendOTPEmail } = require("../services/emailService");
const parseDevice = require("../middleware/parseDevice");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, type: "user" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function userPublic(user) {
  return { id: user._id, username: user.username, fullName: user.fullName, email: user.email };
}

async function logLogin(req, userId, source = "web") {
  try {
    const userAgent = req.headers["user-agent"] || "";
    const ip = getClientIp(req);
    const { device, os, browser } = parseDevice(userAgent);
    // Detect mobile from user agent or source header
    const isMobile = req.headers["x-app-platform"] === "mobile" || 
                     (userAgent && /mobile|android|iphone|ipad/i.test(userAgent));
    const finalSource = isMobile ? "mobile" : source;
    await LoginLog.create({ userId, ip, userAgent, device, os, browser, source: finalSource });
  } catch (e) {
    console.error("Login log xatosi:", e.message);
  }
}

/* ─────────────────────────────────────────
   POST /api/auth/register
───────────────────────────────────────── */
router.post("/register", async (req, res) => {
  try {
    const { username, password, fullName, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: "Username, email va parol kerak" });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: "Username 3-30 belgidan iborat bo'lsin" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Parol kamida 6 ta belgi bo'lsin" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email manzil noto'g'ri formatda" });
    }

    const existingUsername = await User.findOne({ username: username.trim().toLowerCase() });
    if (existingUsername) return res.status(409).json({ error: "Bu username band, boshqasini tanlang" });

    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) return res.status(409).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });

    const otp     = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.deleteOne({
      email: email.trim().toLowerCase(),
      emailVerified: false,
      authProvider: "local",
    });

    const crypto = require("crypto");
    const tgToken   = crypto.randomBytes(20).toString("hex");
    const tgExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 kun

    const user = await User.create({
      username:      username.trim().toLowerCase(),
      password,
      fullName:      fullName?.trim() || "",
      email:         email.trim().toLowerCase(),
      emailVerified: true,
      authProvider:  "local",
      otpCode:       `tglink_${tgToken}`,
      otpExpires:    tgExpires,
    });

    const verifySource = req.headers["x-app-platform"] === "mobile" ? "mobile" : "web";
    await logLogin(req, user._id, verifySource);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "mening_huquqlarim_bot";
    const botUrl = `https://t.me/${botUsername}?start=link_${tgToken}`;

    const token = signToken(user);
    return res.status(201).json({
      message: "Ro'yxatdan muvaffaqiyatli o'tdingiz!",
      token,
      user: userPublic(user),
      botUrl,
    });
  } catch (err) {
    console.error("register error:", err.message);
    if (err.code === 11000) {
      if (err.keyPattern?.username) return res.status(409).json({ error: "Bu username band, boshqasini tanlang" });
      if (err.keyPattern?.email)    return res.status(409).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
      if (err.keyPattern?.googleId) {
        await User.updateMany({ googleId: null }, { $unset: { googleId: "" } });
        return res.status(500).json({ error: "Texnik xatolik tuzatildi. Qayta ro'yxatdan o'ting." });
      }
    }
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* ─────────────────────────────────────────
   POST /api/auth/verify-otp
───────────────────────────────────────── */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email va tasdiqlash kodi kerak" });
    }

    const user = await User.findOne({
      email:         email.trim().toLowerCase(),
      emailVerified: false,
      authProvider:  "local",
    });

    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi yoki allaqachon tasdiqlangan" });
    }
    if (!user.otpCode || !user.otpExpires) {
      return res.status(400).json({ error: "Tasdiqlash kodi topilmadi. Qayta ro'yxatdan o'ting" });
    }
    if (new Date() > user.otpExpires) {
      return res.status(400).json({ error: "Tasdiqlash kodining muddati tugagan. Qayta ro'yxatdan o'ting" });
    }
    if (user.otpCode !== String(otp).trim()) {
      return res.status(400).json({ error: "Tasdiqlash kodi noto'g'ri" });
    }

    user.emailVerified = true;
    user.otpCode       = null;
    user.otpExpires    = null;
    user.lastLogin     = new Date();
    await user.save();

    const verifySource = req.headers["x-app-platform"] === "mobile" ? "mobile" : "web";
    await logLogin(req, user._id, verifySource);

    const token = signToken(user);
    return res.json({
      message: "Email muvaffaqiyatli tasdiqlandi!",
      token,
      user: userPublic(user),
    });
  } catch (err) {
    console.error("verify-otp error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* ─────────────────────────────────────────
   POST /api/auth/resend-otp
───────────────────────────────────────── */
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email kerak" });

    const user = await User.findOne({
      email:         email.trim().toLowerCase(),
      emailVerified: false,
      authProvider:  "local",
    });

    if (!user) {
      return res.status(404).json({ error: "Tasdiqlanmagan hisob topilmadi" });
    }

    const otp     = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.otpCode    = otp;
    user.otpExpires = expires;
    await user.save();

    await sendOTPEmail(user.email, otp, user.fullName || user.username);

    return res.json({ message: "Yangi tasdiqlash kodi yuborildi" });
  } catch (err) {
    console.error("resend-otp error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* ─────────────────────────────────────────
   POST /api/auth/login
───────────────────────────────────────── */
router.post("/login", bruteForceGuard, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username va parol kerak" });
    }

    const query = username.includes("@")
      ? { email: username.trim().toLowerCase() }
      : { username: username.trim().toLowerCase() };

    const ip = getClientIp(req);
    const user = await User.findOne(query);
    if (!user) {
      recordFailedLogin(ip);
      return res.status(401).json({ error: "Username yoki parol noto'g'ri" });
    }
    if (user.isBlocked) return res.status(403).json({ error: "Sizning hisobingiz bloklangan. Admin bilan bog'laning." });
    if (user.authProvider === "google") {
      return res.status(400).json({ error: "Bu hisob Google orqali yaratilgan. Google bilan kiring." });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      const blocked = recordFailedLogin(ip);
      if (blocked) {
        return res.status(429).json({ error: "Juda ko'p noto'g'ri urinish. 15 daqiqa kuting." });
      }
      return res.status(401).json({ error: "Username yoki parol noto'g'ri" });
    }

    // Muvaffaqiyatli login — urinishlarni tozalash
    clearLoginAttempts(ip);

    user.lastLogin = new Date();
    await user.save();

    await logLogin(req, user._id, "web");

    const token = signToken(user);
    return res.json({ token, user: userPublic(user) });
  } catch (err) {
    console.error("login error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* ─────────────────────────────────────────
   POST /api/auth/google
───────────────────────────────────────── */
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Google credential kerak" });
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google login hozircha sozlanmagan" });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: "Google token noto'g'ri yoki muddati tugagan" });
    }

    const { sub: googleId, email, name, given_name } = payload;
    if (!email) return res.status(400).json({ error: "Google hisobida email topilmadi" });

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({ error: "Sizning hisobingiz bloklangan" });
      }
      if (!user.googleId) {
        user.googleId      = googleId;
        user.authProvider  = "google";
        user.emailVerified = true;
      }
    } else {
      let baseUsername = (given_name || name || email.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 20) || "user";
      if (baseUsername.length < 3) baseUsername = "user" + baseUsername;

      let username = baseUsername;
      let counter  = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter++}`;
      }

      const cryptoG = require("crypto");
      const tgTokenG   = cryptoG.randomBytes(20).toString("hex");
      const tgExpiresG = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      user = await User.create({
        username,
        password:      "",
        fullName:      name || "",
        email:         email.toLowerCase(),
        emailVerified: true,
        googleId,
        authProvider:  "google",
        otpCode:       `tglink_${tgTokenG}`,
        otpExpires:    tgExpiresG,
      });

      user._tgToken = tgTokenG; // temp, DB ga saqlanmaydi
    }

    user.lastLogin = new Date();
    await user.save();

    await logLogin(req, user._id, "google");

    const botUsernameG = process.env.TELEGRAM_BOT_USERNAME || "mening_huquqlarim_bot";
    const botUrlG = user.otpCode?.startsWith("tglink_")
      ? `https://t.me/${botUsernameG}?start=link_${user.otpCode.replace("tglink_", "")}`
      : null;

    const token = signToken(user);
    return res.json({ token, user: userPublic(user), botUrl: botUrlG });
  } catch (err) {
    console.error("google auth error:", err.message);
    if (err.code === 11000) {
      if (err.keyPattern?.googleId) return res.status(409).json({ error: "Bu Google hisob allaqachon bog'langan" });
      if (err.keyPattern?.email)    return res.status(409).json({ error: "Bu email boshqa hisobda ishlatilmoqda" });
    }
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* GET /api/auth/me */
router.get("/me", require("../middleware/auth").userGuard, async (req, res) => {
  try {
    const userId = String(req.authUser.id);

    // Admin bu userni o'chirganda darhol 401 qaytaramiz
    const { deletedUserIds } = require("./admin");
    if (deletedUserIds?.has(userId)) {
      return res.status(401).json({ error: "Akkaunt o'chirildi", deleted: true });
    }

    const user = await User.findById(userId).select("-password -otpCode -otpExpires").lean();
    if (!user) return res.status(401).json({ error: "Foydalanuvchi topilmadi", deleted: true });
    return res.json({ user });
  } catch {
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* PUT /api/auth/profile */
router.put("/profile", require("../middleware/auth").userGuard, async (req, res) => {
  try {
    const { fullName, username } = req.body;
    const user = await User.findById(req.authUser.id);
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

    if (username && username !== user.username) {
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ error: "Username 3-30 belgidan iborat bo'lsin" });
      }
      if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
        return res.status(400).json({ error: "Username faqat harf, raqam va _ belgisidan iborat bo'lsin" });
      }
      const exists = await User.findOne({ username: username.toLowerCase(), _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ error: "Bu username band, boshqasini tanlang" });
      user.username = username.toLowerCase();
    }

    if (fullName !== undefined) {
      user.fullName = fullName.trim().slice(0, 100);
    }

    await user.save();
    return res.json({
      message: "Profil muvaffaqiyatli yangilandi",
      user: { id: user._id, username: user.username, fullName: user.fullName, email: user.email },
    });
  } catch (err) {
    console.error("profile update error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* PUT /api/auth/change-password */
router.put("/change-password", require("../middleware/auth").userGuard, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Joriy parol va yangi parol kerak" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Yangi parol kamida 6 ta belgi bo'lsin" });
    }

    const user = await User.findById(req.authUser.id);
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({ error: "Google orqali kirgan hisobda parol o'zgartirib bo'lmaydi" });
    }

    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ error: "Joriy parol noto'g'ri" });

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (err) {
    console.error("change-password error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;

/* ─────────────────────────────────────────
   POST /api/auth/telegram-link-token
   Saytda login qilgan user uchun bir martalik
   token yaratadi — bot orqali Telegram bog'lash uchun
───────────────────────────────────────── */
router.post("/telegram-link-token", require("../middleware/auth").userGuard, async (req, res) => {
  try {
    const crypto = require("crypto");
    const { telegramUsername } = req.body;
    const token  = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 daqiqa

    const user = await User.findById(req.authUser.id);
    if (!user) return res.status(404).json({ error: "Topilmadi" });

    user.otpCode    = `tglink_${token}`;
    user.otpExpires = expires;
    if (telegramUsername) {
      const normalizedUsername = telegramUsername.replace("@", "").trim();
      user.pendingTelegramUsername = normalizedUsername;
      console.log(`💾 Saved pendingTelegramUsername for user ${user.username}: ${normalizedUsername}`);
    }
    await user.save();

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "mening_huquqlarim_bot";
    const botUrl = `https://t.me/${botUsername}?start=link_${token}`;

    return res.json({ token, botUrl, expiresIn: 900 });
  } catch (err) {
    console.error("telegram-link-token error:", err.message);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

/* GET /api/auth/telegram-status */
router.get("/telegram-status", require("../middleware/auth").userGuard, async (req, res) => {
  try {
    const user = await User.findById(req.authUser.id).select("telegramId telegramVerified telegramUsername").lean();
    if (!user) return res.status(404).json({ error: "Topilmadi" });
    return res.json({
      telegramId:       user.telegramId,
      telegramVerified: user.telegramVerified,
      telegramUsername: user.telegramUsername,
    });
  } catch {
    return res.status(500).json({ error: "Server xatosi" });
  }
});