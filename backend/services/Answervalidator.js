"use strict";
/**
 * Answer Validator
 * 1. Takroriy jumlalarni olib tashlaydi
 * 2. O'ylab chiqarilgan modda raqamlarini bloklaydi
 * 3. Xabardan tashqari kiritilgan shaxslar/qurbonlarni olib tashlaydi
 * 4. Inglizcha bo'limlari o'zbek javobiga aralashmasligi uchun filtr
 */

// ── Tasdiqlangan qonun kodlari va modda chegaralari ───────────
const LAW_LIMITS = {
  MK: 490, OK: 175, JK: 300, JPK: 540,
  FK: 1300, YK: 100, SK: 400, MhK: 200,
};

// ── Inglizcha section headinglarni olib tashlash ──────────────
const EN_HEADINGS = [
  /^(situation|legal analysis|what to do|conclusion|steps?|important|note)\s*:/im,
  /^(📌\s*situation|⚖️\s*legal analysis|✅\s*what to do|📍\s*conclusion)\s*/im,
];

function removeEnglishHeadings(text, lang) {
  if (lang !== "uz" && lang !== "ru") return text;
  let result = text;
  for (const pat of EN_HEADINGS) {
    result = result.replace(pat, "");
  }
  return result;
}

// ── Takroriy jumlalarni olib tashlash ─────────────────────────
function removeDuplicateSentences(text) {
  if (!text) return "";
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  return sentences.filter(s => {
    const key = s.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(" ");
}

// ── Takroriy paragraflarni olib tashlash ─────────────────────
function removeDuplicateParagraphs(text) {
  if (!text) return "";
  const paras = text.split(/\n{2,}/);
  const seen = new Set();
  return paras.filter(p => {
    const key = p.trim().toLowerCase().slice(0, 80);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join("\n\n");
}

// ── Shubhali modda raqamlarini aniqlash ───────────────────────
function removeSuspiciousArticles(text) {
  let result = text;
  const pat = /\b([A-ZА-Я][a-zA-Zа-яА-Яo'ʻ]{0,3}[K]?)\s+(\d+)-modda\b/g;
  let m;
  while ((m = pat.exec(text)) !== null) {
    const code = m[1].toUpperCase();
    const num = parseInt(m[2]);
    const limit = LAW_LIMITS[code];
    if (limit && num > limit) {
      result = result.replace(m[0], "[modda raqami tasdiqlanmagan]");
    }
  }
  return result;
}

// ── Xabardan tashqari kiritilgan ob'ektlarni tekshirish ───────
// userMessage da yo'q bo'lsa, javobda "bola", "farzand" so'zlari bo'lmasin
function removeHallucinatedEntities(responseText, userMessage) {
  const userLow = userMessage.toLowerCase();
  let result = responseText;

  // "bola" faqat agar user aytgan bo'lsa
  const userMentionsChild = /\b(bola|farzand|o'g'il|qiz|voyaga yetmagan|minor)\b/i.test(userLow);
  if (!userMentionsChild) {
    // Javobda bola haqida gap bo'lsa — olib tashlash emas, lekin warn
    // (chunki "u bolani" = o'sha odam, bola emas)
    result = result
      .replace(/voyaga yetmagan\s+[a-zA-Zo'ʻа-яА-Я]+/gi, "")
      .replace(/\b(minor|child victim|underage)\b/gi, "");
  }

  // User inglizcha yozmagan bo'lsa — inglizcha katta bo'laklar olib tashlansin
  const userIsUzbek = !/[a-zA-Z]{4,}/.test(userLow.replace(/[0-9]/g, ""));
  if (userIsUzbek) {
    // Inglizcha sarlavhalar olib tashlash
    result = result
      .replace(/\b(Legal Analysis|What to do|Situation|Conclusion|Important|Steps|Note)\s*:/g, "")
      .replace(/\b(Based on Uzbekistan law|According to the law|Under Uzbek law)\b/gi, "O'zbekiston qonunchiligiga ko'ra");
  }

  return result.trim();
}

// ── Markdown tozalash ─────────────────────────────────────────
function cleanMarkdown(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/#{1,6} /g, "")
    .replace(/^\s*[-*•]\s/gm, "• ")
    .trim();
}

// ── Asosiy validator ──────────────────────────────────────────
function validateAnswer(text, options = {}) {
  if (!text || typeof text !== "string") return { valid: false, text: "" };

  const lang        = options.lang || "uz";
  const userMessage = options.userMessage || "";

  let result = text;

  result = removeEnglishHeadings(result, lang);
  result = removeDuplicateSentences(result);
  result = removeDuplicateParagraphs(result);
  result = removeSuspiciousArticles(result);
  result = removeHallucinatedEntities(result, userMessage);
  result = cleanMarkdown(result);

  if (result.trim().length < 15) {
    return { valid: false, text: "Javob yaratilmadi. Qayta urinib ko'ring." };
  }

  return { valid: true, text: result.trim() };
}

module.exports = {
  validateAnswer,
  removeDuplicateSentences,
  removeDuplicateParagraphs,
  removeSuspiciousArticles,
  removeHallucinatedEntities,
  cleanMarkdown,
};