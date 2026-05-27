"use strict";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.log("ℹ️ TELEGRAM_BOT_TOKEN topilmadi — Telegram bot o'chirilgan");
  module.exports = null;
  return;
}

const TelegramBot = require("node-telegram-bot-api");
const { getLegalAdvice } = require("./services/legalAI");
const { Chat, User } = require("./models");
const { recordStat } = require("./services/stats");

const { checkAndIncrement } = require("./middleware/usageLimit");
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const sessions  = new Map();
const userLang  = new Map();

// telegramUserId -> { userId, username }
const verifiedUsers = new Map();

const SITE_URL = process.env.SITE_URL || "https://huquq-ai-rose.vercel.app/";

const LANG_INSTRUCTION = {
  uz: "Javobni faqat o'zbek tilida yozing.",
  ru: "Отвечайте только на русском языке.",
  en: "Respond only in English.",
};

// ── TRANSLATIONS ─────────────────────────────────────────────
const tg = {
  uz: {
    welcome: `🏛️ Mening Huquqim botiga xush kelibsiz!\n\nMen O'zbekiston qonunchiligi bo'yicha AI maslahatchi botman.\n\nHuquqiy muammongizni yozing — javob beraman! ✅`,
    not_registered: `🏛️ <b>Mening Huquqim</b> — AI Huquqiy Maslahat\n\n🔓 <b>Bepul foydalanish uchun ro'yxatdan o'ting!</b>\n\n✅ Kuniga ${20} ta bepul savol\n✅ Barcha suhbatlar saqlanadi\n✅ O'zbek, Rus, Ingliz tillarida\n✅ 24/7 ishlaydi\n\n👇 Quyidagi tugmani bosib ro'yxatdan o'ting:`,
    new_ready: "✅ Yangi savol uchun tayyor!",
    new_prompt: "✅ Yangi savol! Muammongizni yozing.",
    about: `🏛️ Mening Huquqim\n\nO'zbekiston qonunchiligi bo'yicha AI maslahatchi.\n\n🌐 Sayt: ${SITE_URL}\n⚠️ Muhim ishlarda advokat bilan maslahatlashing.`,
    analyzing: "⏳ Tahlil qilinmoqda...",
    limit: "❗️ Xatolik yuz berdi, iltimos keyinroq urinib ko'ring",
    help: `ℹ️ Yordam\n\n/start — Boshlash\n/yangi — Yangi savol\n/lang — Til tanlash\n\nHuquqiy muammongizni oddiy tilda yozing.\n\n🌐 Sayt: ${SITE_URL}`,
    lang_choose: "🌐 Tilni tanlang / Choose language / Выберите язык:",
    lang_set: "✅ Til o'zgartirildi: O'zbek",
    categories: {
      "💼 Mehnat huquqi": "Mehnat bo'yicha savolingizni yozing.\nMasalan: Maosh 2 oy berilmadi",
      "👨‍👩‍👧 Oila huquqi": "Oila masalasi bo'yicha yozing.\nMasalan: Aliment olish uchun nima qilaman?",
      "🏠 Meros va mulk": "Meros bo'yicha yozing.\nMasalan: Otam vafot etdi, uyni qanday olamiz?",
      "🌾 Yer masalalari": "Yer masalasi bo'yicha yozing.\nMasalan: Yerimni noqonuniy olishmoqda",
      "🛒 Iste'molchi": "Iste'molchi huquqi bo'yicha yozing.\nMasalan: Sifatsiz telefon sotishdi",
      "⚖️ Jinoyat huquqi": "Jinoyat bo'yicha yozing.\nMasalan: Menga firibgarlik qilishdi",
    },
    btn_new: "🔄 Yangi savol",
    btn_about: "ℹ️ Bot haqida",
    register_btn: `🌐 Ro'yxatdan o'tish → ${SITE_URL}/register`,
    linked: "✅ Hisobingiz muvaffaqiyatli bog'landi! Endi AI maslahatdan foydalanishingiz mumkin.\n\nSavolingizni yozing!",
  },
  ru: {
    welcome: `🏛️ Добро пожаловать в бот Мои Права!\n\nЯ AI советник по законодательству Узбекистана.\n\nОпишите вашу юридическую проблему — отвечу! ✅`,
    not_registered: `🏛️ <b>Мои Права</b> — AI Юридическая Консультация\n\n🔓 <b>Зарегистрируйтесь для бесплатного доступа!</b>\n\n✅ ${20} бесплатных вопросов в день\n✅ История сохраняется\n✅ На узбекском, русском, английском\n✅ Работает 24/7\n\n👇 Нажмите кнопку ниже для регистрации:`,
    new_ready: "✅ Готов к новому вопросу!",
    new_prompt: "✅ Новый вопрос! Опишите вашу проблему.",
    about: `🏛️ Мои Права\n\nAI советник по законодательству Узбекистана.\n\n🌐 Сайт: ${SITE_URL}\n⚠️ По сложным делам консультируйтесь с адвокатом.`,
    analyzing: "⏳ Анализируем...",
    limit: "❗️ Произошла ошибка, попробуйте позже",
    help: `ℹ️ Помощь\n\n/start — Начать\n/yangi — Новый вопрос\n/lang — Сменить язык\n\nОпишите юридическую проблему простыми словами.\n\n🌐 Сайт: ${SITE_URL}`,
    lang_choose: "🌐 Tilni tanlang / Choose language / Выберите язык:",
    lang_set: "✅ Язык изменён: Русский",
    categories: {
      "💼 Mehnat huquqi": "Напишите вопрос по трудовому праву.\nНапример: 2 месяца не платят зарплату",
      "👨‍👩‍👧 Oila huquqi": "Напишите по семейному праву.\nНапример: Как получить алименты?",
      "🏠 Meros va mulk": "Напишите по наследству.\nНапример: Отец умер, как поделить имущество?",
      "🌾 Yer masalalari": "Напишите по земельному вопросу.\nНапример: Незаконно забирают мой участок",
      "🛒 Iste'molchi": "Напишите по правам потребителей.\nНапример: Продали некачественный телефон",
      "⚖️ Jinoyat huquqi": "Напишите по уголовному праву.\nНапример: Меня обманули мошенники",
    },
    btn_new: "🔄 Новый вопрос",
    btn_about: "ℹ️ О боте",
    linked: "✅ Аккаунт успешно привязан! Теперь вы можете использовать AI консультант.\n\nЗадайте вопрос!",
  },
  en: {
    welcome: `🏛️ Welcome to My Rights bot!\n\nI am an AI advisor on Uzbekistan legislation.\n\nDescribe your legal issue — I'll answer! ✅`,
    not_registered: `🏛️ <b>My Rights</b> — AI Legal Consultation\n\n🔓 <b>Register for free access!</b>\n\n✅ ${20} free questions per day\n✅ All chats saved\n✅ Uzbek, Russian, English\n✅ Available 24/7\n\n👇 Press the button below to register:`,
    new_ready: "✅ Ready for a new question!",
    new_prompt: "✅ New question! Describe your problem.",
    about: `🏛️ My Rights\n\nAI advisor on Uzbekistan legislation.\n\n🌐 Website: ${SITE_URL}\n⚠️ Consult a lawyer for complex cases.`,
    analyzing: "⏳ Analyzing...",
    limit: "❗️ An error occurred, please try again later",
    help: `ℹ️ Help\n\n/start — Start\n/yangi — New question\n/lang — Change language\n\nDescribe your legal issue in plain language.\n\n🌐 Website: ${SITE_URL}`,
    lang_choose: "🌐 Tilni tanlang / Choose language / Выберите язык:",
    lang_set: "✅ Language changed: English",
    categories: {
      "💼 Mehnat huquqi": "Write your labor law question.\nE.g.: Salary not paid for 2 months",
      "👨‍👩‍👧 Oila huquqi": "Write your family law question.\nE.g.: How do I get alimony?",
      "🏠 Meros va mulk": "Write your inheritance question.\nE.g.: Father passed away, how to divide the estate?",
      "🌾 Yer masalalari": "Write your land question.\nE.g.: My land plot is being illegally seized",
      "🛒 Iste'molchi": "Write your consumer rights question.\nE.g.: I was sold a defective phone",
      "⚖️ Jinoyat huquqi": "Write your criminal law question.\nE.g.: I was defrauded",
    },
    btn_new: "🔄 New question",
    btn_about: "ℹ️ About bot",
    linked: "✅ Account successfully linked! You can now use the AI advisor.\n\nAsk a question!",
  },
};

function getLang(userId) {
  return userLang.get(userId) || "uz";
}
function tr(userId) {
  return tg[getLang(userId)] || tg.uz;
}

// ── CHECK IF USER IS REGISTERED ON WEBSITE ──────────────────
// Yangi logika: telegramId bo'yicha YOKI saytda ro'yxatdan o'tgan
// bo'lsa, Telegram ID ni avtomatik bog'laydi
async function findOrLinkUser(telegramUserId, telegramUsername) {
  const tgId = String(telegramUserId);

  // 1. In-memory cache
  if (verifiedUsers.has(tgId)) return verifiedUsers.get(tgId);

  // 2. DB da telegramId bilan bog'langan user bormi?
  try {
    let user = await User.findOne({ telegramId: tgId, emailVerified: true });
    if (user) {
      verifiedUsers.set(tgId, user._id);
      return user._id;
    }
  } catch (err) {
    console.error("DB check error:", err.message);
  }

  return null;
}

// ── KEYBOARDS ──────────────────────────────────────────────────
function mainMenu(userId) {
  const lang = getLang(userId);
  const labels = {
    uz: [["💼 Mehnat huquqi","👨‍👩‍👧 Oila huquqi"],["🏠 Meros va mulk","🌾 Yer masalalari"],["🛒 Iste'molchi","⚖️ Jinoyat huquqi"],["🔄 Yangi savol","ℹ️ Bot haqida"]],
    ru: [["💼 Mehnat huquqi","👨‍👩‍👧 Oila huquqi"],["🏠 Meros va mulk","🌾 Yer masalalari"],["🛒 Iste'molchi","⚖️ Jinoyat huquqi"],["🔄 Новый вопрос","ℹ️ О боте"]],
    en: [["💼 Mehnat huquqi","👨‍👩‍👧 Oila huquqi"],["🏠 Meros va mulk","🌾 Yer masalalari"],["🛒 Iste'molchi","⚖️ Jinoyat huquqi"],["🔄 New question","ℹ️ About bot"]],
  };
  return { reply_markup: { keyboard: labels[lang] || labels.uz, resize_keyboard: true } };
}

function registerKeyboard(lang) {
  const url = `${SITE_URL}/register`;
  const labels = {
    uz: `✅ Bepul ro'yxatdan o'tish →`,
    ru: `✅ Зарегистрироваться бесплатно →`,
    en: `✅ Register for free →`,
  };
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: labels[lang] || labels.uz, url }],
        [{ text: "🌐 Sayt haqida ko'proq", url: SITE_URL }],
      ],
    },
  };
}

const langKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "🇺🇿 O'zbek",  callback_data: "lang_uz" }],
      [{ text: "🇷🇺 Русский", callback_data: "lang_ru" }],
      [{ text: "🇬🇧 English", callback_data: "lang_en" }],
    ],
  },
};

// ── HELPERS ────────────────────────────────────────────────────
function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { messages: [], sessionId: `tg_${userId}_${Date.now()}` });
  }
  return sessions.get(userId);
}

async function safeSend(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, { parse_mode: "HTML", ...options });
  } catch (err) {
    if (err.response?.body?.error_code === 403) {
      console.log(`🚫 User blocked bot: ${chatId}`);
      return;
    }
    try {
      return await bot.sendMessage(chatId, text.replace(/<[^>]*>/g, ""), options);
    } catch {
      console.error("Telegram send error:", err.message);
    }
  }
}

async function sendNotRegistered(chatId, tgUserId) {
  const lang = getLang(tgUserId);
  const T = tg[lang] || tg.uz;
  await safeSend(chatId, T.not_registered, registerKeyboard(lang));
}

// ── /start ─────────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const tgUserId  = msg.from.id;
  const chatId    = msg.chat.id;
  const tgUsername = msg.from.username || null;
  sessions.delete(tgUserId);

  if (!userLang.has(tgUserId)) {
    await safeSend(chatId, tg.uz.lang_choose, langKeyboard);
    return;
  }

  const userId = await findOrLinkUser(tgUserId, tgUsername);
  if (!userId) {
    await sendNotRegistered(chatId, tgUserId);
    return;
  }

  await safeSend(chatId, tr(tgUserId).welcome, mainMenu(tgUserId));
});

// ── /yangi ─────────────────────────────────────────────────────
bot.onText(/\/yangi/, async (msg) => {
  const tgUserId = msg.from.id;
  const chatId   = msg.chat.id;

  const userId = await findOrLinkUser(tgUserId, msg.from.username);
  if (!userId) {
    await sendNotRegistered(chatId, tgUserId);
    return;
  }

  sessions.delete(tgUserId);
  await safeSend(chatId, tr(tgUserId).new_ready, mainMenu(tgUserId));
});

bot.onText(/\/help/, async (msg) => {
  await safeSend(msg.chat.id, tr(msg.from.id).help);
});

bot.onText(/\/lang/, async (msg) => {
  await safeSend(msg.chat.id, tg.uz.lang_choose, langKeyboard);
});

// ── LANGUAGE CALLBACK ──────────────────────────────────────────
bot.on("callback_query", async (query) => {
  const tgUserId = query.from.id;
  const data     = query.data;
  const chatId   = query.message.chat.id;

  const langMap = { lang_uz: "uz", lang_ru: "ru", lang_en: "en" };
  if (langMap[data]) {
    const lang = langMap[data];
    userLang.set(tgUserId, lang);
    await bot.answerCallbackQuery(query.id);
    await safeSend(chatId, tg[lang].lang_set);

    const userId = await findOrLinkUser(tgUserId, query.from.username);
    if (!userId) return sendNotRegistered(chatId, tgUserId);
    return safeSend(chatId, tg[lang].welcome, mainMenu(tgUserId));
  }
});

// ── MESSAGES ───────────────────────────────────────────────────
bot.on("message", async (msg) => {
  if (!msg.text && !msg.photo && !msg.document) return;
  if (msg.text?.startsWith("/")) return;

  const chatId     = msg.chat.id;
  const tgUserId   = msg.from.id;
  const tgUsername = msg.from.username || null;
  const text       = msg.text || msg.caption || "Ushbu rasmni tahlil qilib, huquqiy maslahat bering.";
  const T          = tr(tgUserId);

  // Navigation buttons
  if (["🔄 Yangi savol","🔄 Новый вопрос","🔄 New question"].includes(text)) {
    const userId = await findOrLinkUser(tgUserId, tgUsername);
    if (!userId) return sendNotRegistered(chatId, tgUserId);
    sessions.delete(tgUserId);
    return safeSend(chatId, T.new_prompt, mainMenu(tgUserId));
  }

  if (["ℹ️ Bot haqida","ℹ️ О боте","ℹ️ About bot"].includes(text)) {
    return safeSend(chatId, T.about, mainMenu(tgUserId));
  }

  // Category buttons
  if (T.categories[text]) {
    const userId = await findOrLinkUser(tgUserId, tgUsername);
    if (!userId) return sendNotRegistered(chatId, tgUserId);
    return safeSend(chatId, T.categories[text]);
  }

  // ── MAIN GUARD ──
  const userId = await findOrLinkUser(tgUserId, tgUsername);
  if (!userId) {
    return sendNotRegistered(chatId, tgUserId);
  }

  // ── AI ANSWER ──
  // Limit tekshiruvi
  const limitResult = await checkAndIncrement(userId);
  if (limitResult) {
    const lang = getLang(tgUserId);
    const timeLeft   = (limitResult.timeLeft?.[lang]   || limitResult.timeLeft?.uz   || "24 soat");
    const unblockStr = (limitResult.unblockAtStr?.[lang] || limitResult.unblockAtStr?.uz || "");
    const limitMsgs = {
      uz: `⏳ <b>Kunlik limitingiz tugadi</b>\n\n📊 Bugun: <b>${limitResult.limit} ta</b> savol ishlatildi\n🔒 Ochilishi: <b>${unblockStr}</b> (${timeLeft} qoldi)\n\n🌐 <a href="${SITE_URL}">Ko'proq ma'lumot</a>`,
      ru: `⏳ <b>Дневной лимит исчерпан</b>\n\n📊 Сегодня: <b>${limitResult.limit}</b> вопросов использовано\n🔒 Откроется: <b>${unblockStr}</b> (осталось ${timeLeft})\n\n🌐 <a href="${SITE_URL}">Подробнее</a>`,
      en: `⏳ <b>Daily limit reached</b>\n\n📊 Today: <b>${limitResult.limit}</b> questions used\n🔒 Opens: <b>${unblockStr}</b> (${timeLeft} left)\n\n🌐 <a href="${SITE_URL}">More info</a>`,
    };
    return safeSend(chatId, limitMsgs[lang] || limitMsgs.uz, mainMenu(tgUserId));
  }

  const loader = await safeSend(chatId, T.analyzing);
  const sess   = getSession(tgUserId);

  // Rasm yuklash (agar yuborilgan bo'lsa)
  let imageBase64 = null;
  let imageMimeType = "image/jpeg";
  try {
    if (msg.photo && msg.photo.length > 0) {
      // Eng katta o'lchamdagi rasmni olish
      const photoId = msg.photo[msg.photo.length - 1].file_id;
      const fileInfo = await bot.getFile(photoId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
      const https = require("https");
      imageBase64 = await new Promise((resolve, reject) => {
        https.get(fileUrl, (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
          res.on("error", reject);
        });
      });
      imageMimeType = "image/jpeg";
    }
  } catch (imgErr) {
    console.error("Rasm yuklash xatosi:", imgErr.message);
    // Rasm yuklanmasa ham davom etamiz
  }

  try {
    const lang   = getLang(tgUserId);
    const prompt = `[${LANG_INSTRUCTION[lang]}]\n\n${text}`;
    const { answer, category } = await getLegalAdvice(prompt, sess.messages, imageBase64, imageMimeType);

    const userContent = imageBase64 ? `[📎 Rasm] ${text}` : text;
    sess.messages.push({ role: "user",      content: userContent });
    sess.messages.push({ role: "assistant", content: answer });
    if (sess.messages.length > 20) sess.messages = sess.messages.slice(-20);

    // MongoDB save — userId bilan bog'lash
    try {
      let chat = await Chat.findOne({ sessionId: sess.sessionId });
      if (!chat) {
        chat = new Chat({
          sessionId:        sess.sessionId,
          userId:           userId,
          source:           "telegram",
          telegramUserId:   String(tgUserId),
          telegramUsername: tgUsername,
          messages:         [],
        });
      }
      const tgUserMsg = { role: "user", content: imageBase64 ? `[📎 Rasm] ${text}` : text };
      if (imageBase64) {
        tgUserMsg.imageData     = imageBase64;
        tgUserMsg.imageMimeType = imageMimeType;
      }
      chat.messages.push(tgUserMsg);
      chat.messages.push({ role: "assistant", content: answer });
      chat.category = category;
      await chat.save();
    } catch (dbErr) {
      console.error("Mongo save error:", dbErr.message);
    }

    recordStat("telegram", category).catch(() => {});

    if (loader?.message_id) {
      await bot.deleteMessage(chatId, loader.message_id).catch(() => {});
    }

    const chunks = answer.match(/[\s\S]{1,4000}/g) || [];
    for (const chunk of chunks) {
      await safeSend(chatId, chunk, mainMenu(tgUserId));
    }
  } catch (err) {
    console.error("Telegram AI error:", err);
    if (loader?.message_id) {
      await bot.deleteMessage(chatId, loader.message_id).catch(() => {});
    }
    await safeSend(chatId, T.limit, mainMenu(tgUserId));
  }
});

// ── DEEP LINK: /start link_<token> ─────────────────────────────
// Saytdagi "Telegramni bog'lash" tugmasidan keladi.
// User token bilan botga keladi — Telegram ID saqlanadi.
bot.onText(/\/start link_([a-f0-9]+)/, async (msg, match) => {
  const tgUserId   = msg.from.id;
  const tgUsername = msg.from.username || null;
  const chatId     = msg.chat.id;
  const token      = match[1];

  try {
    const user = await User.findOne({
      otpCode:    `tglink_${token}`,
      otpExpires: { $gt: new Date() },
    });

    if (!user) {
      return safeSend(chatId, "❌ Token noto'g'ri yoki muddati tugagan.\n\nSaytdan qayta urinib ko'ring.");
    }

    // Ushbu Telegram ID boshqa hisobda ishlatilayaptimi?
    const conflict = await User.findOne({
      telegramId: String(tgUserId),
      _id: { $ne: user._id },
    });
    if (conflict) {
      return safeSend(chatId, "⚠️ Bu Telegram hisob allaqachon boshqa akkountga bog'langan.");
    }

    user.telegramId       = String(tgUserId);
    user.telegramUsername = tgUsername;
    user.telegramVerified = true;
    user.otpCode          = null;
    user.otpExpires       = null;
    await user.save();

    // Cache yangilash
    verifiedUsers.set(String(tgUserId), user._id);

    const lang = getLang(tgUserId);
    const T    = tg[lang] || tg.uz;
    await safeSend(chatId, T.linked || tg.uz.linked, mainMenu(tgUserId));
  } catch (err) {
    console.error("Deep link error:", err.message);
    await safeSend(chatId, "❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
  }
});

bot.on("polling_error", (err) => {
  console.error("Telegram polling error:", err.message);
});

// ── EXPORT ──
module.exports = { bot, verifiedUsers };
