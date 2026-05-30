"use strict";
/**
 * Conversation Memory System
 * Suhbat tarixidan faqat dolzarb kontekstni chiqaradi.
 *
 * Saqlaydi:
 * - Huquqiy faktlar (topilgan kategoriya, da'vo mavzusi)
 * - Foydalanuvchi ma'lumotlari (ism, holat)
 * - Entity'lar (sanalar, summalar, tashkilotlar)
 * - Oldingi savol-javoblar (faqat relevanli)
 */

const MAX_HISTORY_MESSAGES = 6;  // maksimal xabar juftligi
const MAX_CONTENT_LENGTH   = 600; // har bir xabar uchun maksimal belgi

// ── Entity extraction ──────────────────────────────────────────
function extractEntities(text) {
  const entities = {};

  // Sanalar
  const datePattern = /\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})\b/g;
  const dates = [];
  let m;
  while ((m = datePattern.exec(text)) !== null) dates.push(m[0]);
  if (dates.length) entities.dates = dates;

  // Summalar (so'm, dollar, rubl)
  const amountPattern = /\b(\d[\d\s]*(?:000)?)\s*(so['']m|dollar|\$|usd|rubl|рубл|млн|mln|ming)\b/gi;
  const amounts = [];
  while ((m = amountPattern.exec(text)) !== null) amounts.push(m[0]);
  if (amounts.length) entities.amounts = amounts;

  // Tashkilotlar va muassasalar
  const orgPattern = /\b(OOO|MChJ|AJ|JSC|LLC|IP|ИП|ООО)\s+["«]?([A-Za-zА-Яа-яO'ʻ\s]{2,30})["»]?/gi;
  const orgs = [];
  while ((m = orgPattern.exec(text)) !== null) orgs.push(m[0].trim());
  if (orgs.length) entities.organizations = orgs;

  // Telefon raqamlari
  const phonePattern = /\+?998\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g;
  const phones = [];
  while ((m = phonePattern.exec(text)) !== null) phones.push(m[0]);
  if (phones.length) entities.phones = phones;

  return entities;
}

// ── Relevance scoring ─────────────────────────────────────────
function scoreRelevance(historicalMessage, currentMessage) {
  const hist    = String(historicalMessage.content || "").toLowerCase();
  const current = currentMessage.toLowerCase();

  // Umumiy so'zlar (4 harfdan uzun)
  const currentWords = current.split(/\s+/).filter((w) => w.length > 4);
  let matchCount = 0;
  for (const word of currentWords) {
    if (hist.includes(word)) matchCount++;
  }

  // Agar umumiy so'zlar bo'lsa — relevanli
  const score = currentWords.length > 0
    ? matchCount / currentWords.length
    : 0;

  return score;
}

// ── Kontekstni qurish ─────────────────────────────────────────
function buildConversationContext(history = [], currentMessage = "") {
  if (!history.length) return [];

  const current = String(currentMessage || "").toLowerCase();

  // Scorelash va filtrlash
  const scored = history.map((msg) => ({
    msg,
    score: scoreRelevance(msg, current),
  }));

  // Relevanlilik bo'yicha filtrlash (0.1 dan yuqori) + oxirgi xabarlar
  const filtered = scored
    .filter((item) => item.score > 0.05)
    .map((item) => item.msg);

  // Agar hech narsa topilmasa — oxirgi 4 xabarni olish
  const relevant = filtered.length > 0
    ? filtered.slice(-MAX_HISTORY_MESSAGES)
    : history.slice(-4);

  // Formatlash
  return relevant.map((msg) => ({
    role:    msg.role,
    content: String(msg.content || "").slice(0, MAX_CONTENT_LENGTH),
  }));
}

// ── Huquqiy faktlarni chiqarish ───────────────────────────────
function extractLegalFacts(history = []) {
  const facts = {
    mentionedCategories: new Set(),
    entities:            {},
    keyFacts:            [],
  };

  for (const msg of history) {
    const text = String(msg.content || "");

    // Kategoriya belgilari
    if (/mehnat|ish\s+haqi|ishdan\s+bo'sh/i.test(text)) facts.mentionedCategories.add("labor");
    if (/ajralish|aliment|nikoh/i.test(text))           facts.mentionedCategories.add("family");
    if (/jinoyat|politsiya|hibsga/i.test(text))         facts.mentionedCategories.add("criminal");
    if (/meros|vasiyat/i.test(text))                    facts.mentionedCategories.add("inheritance");

    // Entity'larni birlashtirish
    const ents = extractEntities(text);
    for (const [key, values] of Object.entries(ents)) {
      if (!facts.entities[key]) facts.entities[key] = [];
      facts.entities[key].push(...values);
    }
  }

  // Dublikatlarni olib tashlash
  for (const key of Object.keys(facts.entities)) {
    facts.entities[key] = [...new Set(facts.entities[key])];
  }

  facts.mentionedCategories = [...facts.mentionedCategories];
  return facts;
}

// ── Memory summary (LLM uchun) ────────────────────────────────
function buildMemorySummary(legalFacts) {
  const parts = [];

  if (legalFacts.mentionedCategories.length > 0) {
    parts.push(`Suhbat mavzulari: ${legalFacts.mentionedCategories.join(", ")}`);
  }

  if (legalFacts.entities.dates?.length > 0) {
    parts.push(`Sanalar: ${legalFacts.entities.dates.join(", ")}`);
  }

  if (legalFacts.entities.amounts?.length > 0) {
    parts.push(`Summalar: ${legalFacts.entities.amounts.join(", ")}`);
  }

  if (legalFacts.entities.organizations?.length > 0) {
    parts.push(`Tashkilotlar: ${legalFacts.entities.organizations.join(", ")}`);
  }

  return parts.length > 0 ? `[Suhbat konteksti: ${parts.join(" | ")}]` : "";
}

module.exports = {
  buildConversationContext,
  extractLegalFacts,
  buildMemorySummary,
  extractEntities,
};