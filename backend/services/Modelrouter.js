"use strict";
/**
 * Model Router — savolning murakkabligiga qarab eng mos modelni tanlaydi.
 *
 * Simple questions   → llama-3.1-8b-instant  (tez, arzon)
 * Complex legal      → llama-3.3-70b-versatile (kuchli)
 * Document/Image     → Gemini (vision qobiliyati)
 * Long documents     → Gemini (katta kontekst)
 */

const MODELS = {
  FAST:    "llama-3.1-8b-instant",
  STRONG:  "llama-3.3-70b-versatile",
  GEMINI:  "gemini-2.0-flash",
};

const COMPLEX_CATEGORIES = new Set([
  "criminal",
  "inheritance",
  "business",
  "tax",
  "immigration",
]);

const COMPLEX_KEYWORDS = [
  // Uzbekcha
  "sud","jinoyat","qamoq","hibsga","o'lim","qotillik","zo'ravonlik",
  "shartnoma","meros","vasiyat","mulk","soliq","bank","kredit","qarz",
  "ajralish","aliment","bola","ota-onalik","fuqarolik","da'vo",
  // Ruscha
  "суд","тюрьма","убийство","насилие","договор","наследство","налог",
  "развод","алименты","иск","арест",
  // English
  "court","prison","murder","violence","contract","inheritance","tax",
  "divorce","alimony","lawsuit","arrest","criminal",
];

/**
 * Javob berish uchun eng mos modelni tanlaydi.
 * @returns {{ model: string, provider: "groq"|"gemini", reason: string }}
 */
function selectModel({ userMessage, category, hasImage, historyLength = 0 }) {
  // Rasm bor → Gemini (vision)
  if (hasImage) {
    return { model: MODELS.GEMINI, provider: "gemini", reason: "image_analysis" };
  }

  // Uzun xabar (500+ belgi) → kuchli model
  if (userMessage && userMessage.length > 500) {
    return { model: MODELS.STRONG, provider: "groq", reason: "long_message" };
  }

  // Murakkab kategoriya → kuchli model
  if (COMPLEX_CATEGORIES.has(category)) {
    return { model: MODELS.STRONG, provider: "groq", reason: `complex_category:${category}` };
  }

  // Murakkab kalit so'zlar → kuchli model
  const msgLow = String(userMessage || "").toLowerCase();
  const isComplex = COMPLEX_KEYWORDS.some((kw) => msgLow.includes(kw));
  if (isComplex) {
    return { model: MODELS.STRONG, provider: "groq", reason: "complex_keywords" };
  }

  // Hujjat so'rovi → kuchli model (professional hujjat kerak)
  const isDocument = /ariza|shikoyat|da'vo|sudga|aliment|shartnoma|petitsiya|хужжат|document/i.test(msgLow);
  if (isDocument) {
    return { model: MODELS.STRONG, provider: "groq", reason: "document_generation" };
  }

  // Oddiy savol → tez model
  return { model: MODELS.FAST, provider: "groq", reason: "simple_question" };
}

module.exports = { selectModel, MODELS };