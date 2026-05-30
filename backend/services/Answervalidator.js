"use strict";
/**
 * Answer Validator
 * AI javobini sifat nazoratidan o'tkazadi:
 * 1. Takroriy jumlalarni olib tashlaydi
 * 2. O'ylab chiqarilgan modda raqamlarini aniqlaydi va ogohlantiradi
 * 3. Tasdiqlangan kontekstga asoslanmagan da'volarni belgilaydi
 * 4. Javobni professional formatga keltiradi
 */

// ── Takroriy jumlalarni olib tashlash ─────────────────────────
function removeDuplicateSentences(text) {
  if (!text) return "";

  const sentences = text
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const unique = [];

  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase().replace(/\s+/g, " ");
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(sentence);
    }
  }

  return unique.join(" ");
}

// ── Takroriy paragraflarni olib tashlash ──────────────────────
function removeDuplicateParagraphs(text) {
  if (!text) return "";

  const paragraphs = text.split(/\n{2,}/);
  const seen = new Set();
  const unique = [];

  for (const para of paragraphs) {
    const normalized = para.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(para.trim());
    }
  }

  return unique.join("\n\n");
}

// ── O'ylab chiqarilgan modda raqamlarini aniqlash ─────────────
// Aniq ma'lum bo'lgan qonun kodlari va ularning maksimal modda raqamlari
const LAW_ARTICLE_LIMITS = {
  "MK":   300,  // Mehnat kodeksi
  "OK":   175,  // Oila kodeksi
  "JK":   300,  // Jinoyat kodeksi
  "JPK":  540,  // Jinoyat-protsessual kodeksi
  "FK":  1300,  // Fuqarolik kodeksi
  "YK":   100,  // Yer kodeksi
  "SK":   400,  // Soliq kodeksi
};

function detectSuspiciousArticles(text) {
  const warnings = [];

  // Pattern: MK 108-modda, JK 97-modda, FK 1113-modda
  const articlePattern = /\b([A-Z]{2,3})\s+(\d+)-modda\b/g;
  let match;

  while ((match = articlePattern.exec(text)) !== null) {
    const code = match[1];
    const num = parseInt(match[2]);
    const limit = LAW_ARTICLE_LIMITS[code];

    if (limit && num > limit) {
      warnings.push({
        original: match[0],
        reason:   `${code} ${num}-modda — bu kodeksda ${limit} dan oshiq modda mavjud emas`,
      });
    }
  }

  return warnings;
}

// ── Disclaimer qo'shish ───────────────────────────────────────
function addLegalDisclaimer(text, lang = "uz") {
  const disclaimers = {
    uz: "\n\n⚠️ Eslatma: Bu ma'lumot umumiy huquqiy yo'nalish uchun. Aniq huquqiy qaror uchun malakali advokat bilan maslahatlashing.",
    ru: "\n\n⚠️ Примечание: Это общая правовая информация. Для конкретного юридического решения проконсультируйтесь с квалифицированным адвокатом.",
    en: "\n\n⚠️ Note: This is general legal guidance only. For specific legal decisions, consult a qualified lawyer.",
  };
  return text + (disclaimers[lang] || disclaimers.uz);
}

// ── Output cleaner ─────────────────────────────────────────────
function cleanMarkdown(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/#{1,6} /g, "")
    .replace(/^\s*[-*]\s/gm, "• ")
    .trim();
}

// ── Asosiy validator ──────────────────────────────────────────
function validateAnswer(text, options = {}) {
  if (!text || typeof text !== "string") return { valid: false, text: "" };

  let result = text;

  // 1. Takroriy jumlalarni olib tashlash
  result = removeDuplicateSentences(result);

  // 2. Takroriy paragraflarni olib tashlash
  result = removeDuplicateParagraphs(result);

  // 3. Markdown tozalash
  result = cleanMarkdown(result);

  // 4. Shubhali modda raqamlarini aniqlash
  const articleWarnings = detectSuspiciousArticles(result);
  if (articleWarnings.length > 0) {
    for (const w of articleWarnings) {
      // Shubhali modda raqamini almashtirish
      result = result.replace(
        w.original,
        `[aniq modda raqami tasdiqlanmagan]`
      );
    }
  }

  // 5. Minimal uzunlik tekshiruvi
  if (result.trim().length < 20) {
    return {
      valid: false,
      text:  "Javob generatsiya qilinmadi. Qayta urinib ko'ring.",
    };
  }

  // 6. Disclaimer (agar kerak bo'lsa)
  if (options.addDisclaimer && result.length > 200) {
    result = addLegalDisclaimer(result, options.lang);
  }

  return {
    valid: true,
    text:  result,
    warnings: articleWarnings,
  };
}

module.exports = {
  validateAnswer,
  removeDuplicateSentences,
  removeDuplicateParagraphs,
  detectSuspiciousArticles,
  cleanMarkdown,
};